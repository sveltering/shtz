import type { AnyRouter } from "@trpc/server";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { get, writable } from "svelte/store";

import type { ArgumentTypes, AsyncFunctionType, FunctionType } from "../types.js";
import type { StoreClientOpt, StoreCC } from "./types.js";

import type {
    StoreOpts,
    AnyStoreOpts,
    $OnceStoreOpts,
    $ManyStoreOpts,
    $MultipleStoreOpts,
    AnyOnceStore,
    AnyManyStore,
    AnyMultipleStore,
    CallTracker,
    AnyStore,
} from "./storeClientCreate.types.js";
import { browser as isBrowser } from "$app/environment";

import equal from "fast-deep-equal";

function storeClientCreate<Router extends AnyRouter>(options: StoreClientOpt): StoreCC<Router> {
    const { url, batchLinkOptions, transformer } = options;

    const proxyClient = isBrowser
        ? createTRPCProxyClient<Router>({
              links: [httpBatchLink({ ...batchLinkOptions, url })],
              transformer: transformer,
          })
        : pseudoProxyClient();

    return outerProxy(proxyClient, [], options) as StoreCC<Router>;
}

function noop() {}

function pseudoProxyClient(): any {
    return new Proxy(noop, {
        get: (_1, _2) => pseudoProxyClient(),
        apply: (_1, _2, _3) => undefined,
    });
}

function outerProxy(callback: any, path: string[], options: StoreClientOpt): any {
    return new Proxy(noop, {
        get(_obj, key) {
            if (typeof key !== "string") {
                return undefined;
            }
            return outerProxy(callback, [...path, key], options);
        },
        apply(_1, _2, args) {
            let method = "" as "call" | "$once" | "$many" | "$multiple";
            let endpoint: AsyncFunctionType = callback;
            for (let i = 0, iLen = path.length; i < iLen - 1; i++) {
                method = path[i + 1] as any;
                endpoint = endpoint[path[i] as keyof typeof endpoint];
            }

            if (method === "call") {
                if (!isBrowser) {
                    return;
                }
                return endpoint(...args);
            }

            const dotPath = path.slice(0, -2).join(".");

            if (!(method in storeClientMethods)) {
                if (console?.warn) {
                    console.warn(`"${method}" is not a valid store method for ${dotPath}`);
                }
                return;
            }

            const hasArguments = !!args.length;

            const is$once = method === "$once";
            const is$many = method === "$many";
            const is$multiple = method === "$multiple";
            const has$call = is$many || is$multiple;

            let prefillData = undefined;
            let prefillFn = undefined;
            let entryFn = undefined;
            let entrySuccessFn = undefined;
            let uniqueFn = undefined;
            let uniqueMethod = undefined;
            let hasLoading = false;
            let hasRemove = false;
            let hasAbort = false;
            let hasAbortOnRemove = false;
            let beforeCallFn = undefined;
            let methodsFns: any = {};
            let zod = undefined;
            let change = undefined;
            const uniqueTracker: any[] = [];

            const storeOptArg = hasArguments ? args[0] : false;
            if (isBrowser && storeOptArg && has$call) {
                hasRemove = !!storeOptArg?.remove;
                zod = typeof storeOptArg?.zod?.safeParse === "function" ? storeOptArg.zod : undefined;
                beforeCallFn = storeOptArg?.beforeCall;
                methodsFns = storeOptArg?.methods;
                change = typeof change === "number" ? change : undefined;

                const prefillType = typeof storeOptArg?.prefill;
                if (prefillType === "function") {
                    prefillFn = storeOptArg.prefill;
                } //
                else if (prefillType !== "undefined") {
                    prefillData = storeOptArg.prefill;
                }
                if (is$multiple) {
                    hasLoading = !!storeOptArg?.loading;
                    entryFn = storeOptArg?.entry;
                    entrySuccessFn = storeOptArg?.entrySuccess;
                    uniqueFn = storeOptArg?.unique;
                    uniqueMethod = storeOptArg?.uniqueMethod === "replace" ? "replace" : "remove";
                }

                hasAbort = !!storeOptArg?.abort;
                if (storeOptArg?.abortOnRemove) {
                    hasRemove = true;
                    hasAbortOnRemove = true;
                }
            }

            if (!isBrowser && storeOptArg && has$call) {
                hasRemove = !!storeOptArg?.remove;
                const prefillType = typeof storeOptArg?.prefill;
                if (prefillType !== "function" && prefillType !== "undefined") {
                    prefillData = storeOptArg.prefill; // delete prefill data once store made
                }
                if (is$multiple) {
                    hasLoading = !!storeOptArg?.loading;
                    entrySuccessFn = storeOptArg?.entrySuccess;
                    uniqueFn = storeOptArg?.unique;
                }
                if (storeOptArg?.abortOnRemove) {
                    hasRemove = true;
                }
                if (storeOptArg?.methods) {
                    for (let key in storeOptArg?.methods) {
                        methodsFns[key] = noop;
                    }
                }
            }

            const storeOpts: StoreOpts = {
                method,
                endpoint,
                args,
                dotPath,
                is$once,
                is$many,
                is$multiple,
                has$call,

                prefillData,
                prefillFn,
                entryFn,
                entrySuccessFn,
                uniqueFn,
                uniqueMethod,
                hasLoading,
                hasRemove,
                hasAbort,
                hasAbortOnRemove,
                beforeCallFn,
                methodsFns,
                uniqueTracker,
                zod,
                change,
            };

            return storeClientMethods[method](storeOpts as any);
        },
    });
}

const storeClientMethods = {
    $once: function (opts: $OnceStoreOpts) {
        const _tracker: CallTracker = {} as CallTracker;
        const store: AnyOnceStore = writable({
            data: undefined,
            loading: true,
            error: false,
            success: false,
        });
        if (isBrowser) {
            callEndpoint({ store, opts, endpointArgs: opts.args, _tracker });
        }
        return store;
    },
    $many: function (opts: $ManyStoreOpts) {
        const { hasAbort } = opts;
        const store: AnyManyStore = writable({
            data: undefined,
            entry: {},
            loading: false,
            error: false,
            success: false,
            ...(hasAbort ? { aborted: false } : {}),
            call: isBrowser
                ? (...endpointArgs: any[]) => {
                      const _tracker: CallTracker = {} as CallTracker;
                      callEndpoint({ store, opts, endpointArgs, _tracker });
                  }
                : noop,
        });
        handlePrefill(store, opts);
        return store;
    },
    $multiple: function (opts: $MultipleStoreOpts) {
        const { hasLoading } = opts;
        const store: AnyMultipleStore = writable({
            ...(hasLoading ? { loading: false } : {}),
            responses: [],
            call: isBrowser
                ? (...endpointArgs: any[]) => {
                      const _tracker: CallTracker = {} as CallTracker;
                      callEndpoint({ store, opts, endpointArgs, _tracker });
                  }
                : noop,
        });
        handlePrefill(store, opts);
        return store;
    },
};

function handlePrefill(store: AnyStore, opts: AnyStoreOpts) {
    const { prefillData, prefillFn, is$many, is$multiple, hasLoading } = opts;

    if (!prefillData && !prefillFn) {
        return;
    }

    if (prefillData === undefined && !isBrowser) {
        return;
    }

    if (!isBrowser && is$many && prefillData) {
        const _tracker: CallTracker = {} as CallTracker;
        endpointReponse({
            prefillSSR: true,
            isSuccess: true,
            isError: false,
            store,
            opts,
            _tracker,
            data: prefillData,
        });
        //@ts-ignore
        delete opts.prefillData;
        return;
    }

    if (isBrowser && is$many) {
        const _tracker: CallTracker = { isLastPrefill: true } as CallTracker;
        callEndpoint({
            store,
            opts,
            endpointArgs: [],
            _tracker,
            prefillHandle: prefillFn ? callAsync(prefillFn) : async () => prefillData,
        });
        return;
    }

    if (!isBrowser && is$multiple && prefillData) {
        const storeInner: any = get(store as any);
        const startingIndex = storeInner.responses.length;
        const data = Array.isArray(prefillData) ? prefillData : [prefillData];
        for (let i = 0, iLen = data.length; i < iLen; i++) {
            const _tracker: CallTracker = { index: startingIndex + i } as CallTracker;
            storeInner.responses.push({
                _tracker,
                loading: true,
                success: false,
                error: false,
                data: undefined,
                entry: {},
            });
            endpointReponse({
                prefillSSR: true,
                isSuccess: true,
                isError: false,
                store,
                opts,
                _tracker,
                data: data[i],
            });
            //@ts-ignore
            delete opts.prefillData;
        }
        return;
    }

    if (isBrowser && is$multiple) {
        const storeInner = get(store as any) as any;
        if (hasLoading) {
            storeInner.loading = true;
            store.set(storeInner);
        }
        const prefillFunction = prefillFn ? callAsync(prefillFn) : async () => prefillData;
        prefillFunction()
            .then(function (data: any) {
                data = Array.isArray(data) ? data : [data];
                for (let i = 0, iLen = data.length; i < iLen; i++) {
                    const _tracker: CallTracker = {} as CallTracker;
                    if (i === iLen - 1) {
                        _tracker.isLastPrefill = true;
                    }
                    callEndpoint({
                        store,
                        opts,
                        endpointArgs: [],
                        _tracker,
                        prefillHandle: async () => data[i],
                    });
                }
            })
            .catch(function (error: Error) {
                storeInner.prefillError = error;
                store.set(storeInner);
            });
        return;
    }
}

const callAsync = function <Fn extends FunctionType>(fn: FunctionType) {
    if (fn?.constructor?.name === "AsyncFunction") {
        return fn;
    }
    return async function (...args: ArgumentTypes<Fn>) {
        try {
            return await fn(...args);
        } catch (e) {
            throw e;
        }
    };
};

function findUniqueTracker(key: any, keys: [any, CallTracker][]) {
    for (let i = 0, iLen = keys.length; i < iLen; i++) {
        if (equal(key, keys[i][0])) {
            return keys[i][1];
        }
    }
    return false;
}
function removeUniqueTracker(key: any, keys: [any, CallTracker][]) {
    if (key === undefined) {
        return;
    }
    for (let i = 0, iLen = keys.length; i < iLen; i++) {
        if (equal(key, keys[i][0])) {
            keys.splice(i, 1);
            break;
        }
    }
}

type CallEndpointOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
    endpointArgs: any[];
    prefillHandle?: AsyncFunctionType;
    _tracker: CallTracker;
};

function callEndpoint(o: CallEndpointOpts) {
    const { store, opts, endpointArgs, prefillHandle } = o;
    const {
        endpoint,
        is$many,
        has$call,
        entryFn,
        hasLoading,
        hasRemove,
        hasAbort,
        hasAbortOnRemove,
        beforeCallFn,
        uniqueFn,
        uniqueMethod,
        uniqueTracker,
        zod,
    } = opts;

    let { _tracker } = o;

    // if (typeof uniqueFn === "function") {
    //     const uniqueKey = uniqueFn(endpointArgs?.[0], undefined);
    //     if (uniqueKey) {
    //         const find_tracker = findUniqueTracker(uniqueKey, uniqueTracker);
    //         if (find_tracker) {
    //             _tracker = find_tracker;
    //             trackerFound = true;
    //         } //
    //         else {
    //             uniqueTracker.push([uniqueKey, _tracker]);
    //         }
    //         _tracker.uniqueKey = uniqueKey;
    //     }
    // }

    if (has$call) {
        const responseInner: any = {
            _tracker,
            loading: true,
            success: false,
            error: false,
            data: undefined,
            entry: {},
        };

        const storeInner = get(store as any) as any;

        //ADD METHODS TO RESPONSE

        addResponseMethods({ responseInner, store, opts, _tracker });
        if (!prefillHandle) {
            if (hasAbort || hasAbortOnRemove) {
                _tracker.abortController = new AbortController();
                endpointArgs[0] = endpointArgs?.[0];
                endpointArgs[1] = endpointArgs.hasOwnProperty(1) ? endpointArgs[1] : {};
                endpointArgs[1].signal = _tracker.abortController.signal;
            }
            if (hasAbort) {
                responseInner.aborted = false;
                responseInner.abort = abortCallFn({ store, opts, _tracker, fromRemove: false });
            }
            if (hasRemove) {
                responseInner.remove = removeCallFn({ store, opts, _tracker });
            }
            if (typeof entryFn === "function") {
                responseInner.entry = entryFn(endpointArgs?.[0]);
            }
        }
        // UPDATE STORES
        if (is$many) {
            Object.assign(storeInner, responseInner);
            store.set(storeInner);
        } // is$multiple
        else {
            if (hasLoading) {
                storeInner.loading = true;
            }
            _tracker.index = storeInner.responses.length;
            storeInner.responses.push(responseInner);

            if (typeof uniqueFn === "function") {
                const uniqueKey = uniqueFn(endpointArgs?.[0], undefined);
                if (uniqueKey) {
                    const trackerFound = findUniqueTracker(uniqueKey, uniqueTracker);
                    _tracker.uniqueKey = uniqueKey;
                    if (trackerFound) {
                        if (uniqueMethod === "remove") {
                            removeCall({ store, opts, _tracker: trackerFound });
                            uniqueTracker.push([uniqueKey, _tracker]);
                        } //
                        else {
                            const oldIndex = trackerFound.index;
                            removeCall({ store, opts, _tracker: trackerFound });
                            const responseInner = storeInner.responses.splice(_tracker.index, 1);
                            storeInner.responses.splice(oldIndex, 0, responseInner[0]);
                            for (let i = oldIndex, iLen = storeInner.responses.length; i < iLen; i++) {
                                storeInner.responses[i]._tracker.index = i;
                            }
                        }
                    } //
                    else {
                        uniqueTracker.push([uniqueKey, _tracker]);
                    }
                }
            }

            store.set(storeInner);
        }
        if (zod) {
            const parse = zod.safeParse(endpointArgs?.[0]);
            if (parse?.error) {
                endpointReponse({
                    isSuccess: false,
                    isError: true,
                    store,
                    opts,
                    _tracker,
                    error: parse.error,
                });
                return;
            }
        }
    }

    if (!isBrowser) {
        return;
    }

    if (prefillHandle) {
        prefillHandle().then(endpointSuccess({ store, opts, _tracker })).catch(endpointError({ store, opts, _tracker }));
    } //
    else if (typeof beforeCallFn === "function") {
        callAsync(beforeCallFn)(endpointArgs?.[0], function (newInput: any) {
            endpointArgs[0] = newInput;
        })
            .then(function (continueCall: boolean | void) {
                if (continueCall === false) {
                    return;
                }
                endpoint(...endpointArgs)
                    .then(endpointSuccess({ store, opts, _tracker }))
                    .catch(endpointError({ store, opts, _tracker }));
            })
            .catch(endpointError({ store, opts, _tracker }));
    } //
    else {
        endpoint(...endpointArgs)
            .then(endpointSuccess({ store, opts, _tracker }))
            .catch(endpointError({ store, opts, _tracker }));
    }
}

type GetResponseInnerOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
};
function getResponseInner(o: GetResponseInnerOpts) {
    const { store, opts, _tracker } = o;
    const { is$multiple, is$many } = opts;
    const storeInner = get(store as any) as any;
    const allResponses = is$multiple ? storeInner.responses : undefined;
    const responseInner = is$many ? storeInner : allResponses.hasOwnProperty(_tracker.index) ? allResponses[_tracker.index] : null;
    return { storeInner, responseInner, allResponses };
}

function responseChanged(o: GetResponseInnerOpts) {
    const {
        opts: { change },
    } = o;
    if (!change) {
        return;
    }
    const { store, opts, _tracker } = o;
    const { is$multiple, is$many } = opts;
    const { storeInner, responseInner, allResponses } = getResponseInner(o);
    if (_tracker.timeout) {
        clearTimeout(_tracker.timeout);
    }
    responseInner.changed = true;
    if (is$many) {
        store.set();
    }
    _tracker.timeout = setTimeout(function () {}, change);
    /*
     *
     *
     *
     *
     *
     */
}

type AddResponseMethodsOpts = {
    responseInner: any;
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
};

const removeObj = { remove: "REMOVE" as const };
const removeFn = () => removeObj;
async function reponseMethodCall(o: AddResponseMethodsOpts, key: string) {
    const { store, opts, _tracker } = o;
    let { storeInner, responseInner, allResponses } = getResponseInner(o);
    if (responseInner === null) {
        return;
    }
    const { methodsFns, is$many } = opts;
    let response = await methodsFns[key](responseInner, removeFn);
    if (response === removeObj) {
        removeCall(o);
        return;
    }
    if (response === false) {
        return;
    }
    if (response === true) {
        store.set(storeInner);
        return;
    }
    if (response !== undefined) {
        if (is$many) {
            store.set(response);
        } else {
            allResponses[_tracker.index] = response;
            store.set(storeInner);
        }
    }
}

function addResponseMethods(o: AddResponseMethodsOpts) {
    const {
        opts: { methodsFns },
        responseInner,
    } = o;
    for (let key in methodsFns) {
        if (typeof methodsFns[key] !== "function") continue;
        if (!isBrowser) {
            methodsFns[key] = noop;
            continue;
        }
        if (methodsFns[key]?.constructor?.name === "AsyncFunction") {
            responseInner[key] = async function () {
                await reponseMethodCall(o, key);
            };
        } else {
            responseInner[key] = function () {
                reponseMethodCall(o, key);
            };
        }
    }
}

type RemoveCallFnOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
};
function removeCall(o: RemoveCallFnOpts) {
    const { store, opts, _tracker } = o;
    const { is$many } = opts;

    const { storeInner, responseInner, allResponses } = getResponseInner(o);

    if (_tracker.removed === true) {
        return;
    }
    abortCallFn({ store, opts, _tracker, fromRemove: true })();
    _tracker.removed = true;

    if (_tracker?.uniqueKey) {
        const { uniqueTracker } = opts;
        removeUniqueTracker(_tracker?.uniqueKey, uniqueTracker);
        delete _tracker?.uniqueKey;
    }
    if (is$many) {
        store.set(
            Object.assign(responseInner, {
                loading: false,
                success: false,
                error: false,
                data: undefined,
            })
        );
    } //
    else if (typeof _tracker.index === "number") {
        let removed = allResponses.splice(_tracker.index, 1)?.[0];
        for (let key in removed) {
            delete removed[key];
        }
        _tracker.index = null as any;
        for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
            const response = allResponses[i];
            response._tracker.index = i;
        }
        store.set(storeInner as any);
        checkForLoading({ store, opts });
    }
}

function removeCallFn(o: RemoveCallFnOpts) {
    return function () {
        removeCall(o);
    };
}

type AbortCallFnOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    fromRemove: boolean;
};
function abortCall(o: AbortCallFnOpts) {
    const {
        _tracker,
        fromRemove,
        opts: { hasAbortOnRemove },
    } = o;

    if (fromRemove && !hasAbortOnRemove) {
        return;
    }

    if (!_tracker?.abortController) {
        return;
    }

    const { store, opts } = o;
    const { is$many, is$multiple, hasAbort } = opts;

    _tracker.abortController?.abort();
    delete _tracker.abortController;
    _tracker.skip = true;

    if (is$many) {
        const responseInner = get(store as any) as any;
        store.set(
            Object.assign(responseInner, {
                loading: false,
                success: false,
                error: false,
                data: undefined,
                ...(hasAbort ? { aborted: true } : {}),
            })
        );
        return;
    }

    if (fromRemove) {
        return;
    }

    if (is$multiple) {
        const storeInner = get(store as any) as any;
        storeInner.responses[_tracker.index].aborted = true;
        storeInner.responses[_tracker.index].loading = false;
        store.set(storeInner);
        checkForLoading({ store, opts });
    }
}
function abortCallFn(o: AbortCallFnOpts) {
    return function () {
        abortCall(o);
    };
}
type CheckForLoadingOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
};
function checkForLoading(o: CheckForLoadingOpts) {
    if (!o.opts.hasLoading) {
        return;
    }
    const { store } = o;
    const storeInner = get(store as any) as any;
    const responses = storeInner.responses;
    let loading = false;
    for (let i = 0, iLen = responses.length || 0; i < iLen; i++) {
        if (responses[i].loading) {
            loading = true;
            break;
        }
    }
    storeInner.loading = loading;
    store.set(storeInner);
}

type EndpointSuccessOrError = { store: AnyStore; opts: AnyStoreOpts; _tracker: CallTracker };
function endpointSuccess(o: EndpointSuccessOrError) {
    return async function (data: any) {
        await endpointReponse({ isSuccess: true, isError: false, data, ...o });
    };
}
function endpointError(o: EndpointSuccessOrError) {
    return async function (error: any) {
        await endpointReponse({ isSuccess: false, isError: true, error, ...o });
    };
}

type EndpointSuccessOpts = {
    prefillSSR?: boolean;
    isSuccess: true;
    isError: false;
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    data: any;
    error?: undefined;
};
type EndpointErrorOpts = {
    prefillSSR?: boolean;
    isSuccess: false;
    isError: true;
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    data?: undefined;
    error: Error;
};
type EndpointResponseOpts = {
    prefillSSR?: boolean;
    isSuccess: boolean;
    isError: boolean;
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    data?: any;
    error?: Error;
};
async function endpointReponse(o: EndpointSuccessOpts): Promise<void>;
async function endpointReponse(o: EndpointErrorOpts): Promise<void>;
async function endpointReponse(o: EndpointResponseOpts): Promise<void> {
    const { error, isError, prefillSSR } = o;
    let { _tracker } = o;

    if (_tracker?.removed) {
        return;
    }
    if (_tracker?.skip) {
        _tracker.skip = false;
        return;
    }
    if (isError && (error?.cause as any)?.name === "ObservableAbortError") {
        return;
    }

    const { isSuccess, store, opts, data } = o;
    const { is$once, is$multiple, hasRemove, entrySuccessFn, methodsFns, uniqueFn, uniqueMethod, uniqueTracker } = opts;

    if (is$once) {
        const responseInner = get(store as any) as any;
        store.set(
            Object.assign(responseInner, {
                loading: false,
                success: isSuccess,
                error: isError ? error : false,
                data: isSuccess ? data : undefined,
            })
        );
        return;
    }

    const { storeInner, responseInner } = getResponseInner(o);

    if (responseInner === null) {
        return;
    }

    delete responseInner?.abort;
    delete _tracker?.abortController;

    if (prefillSSR === true) {
        for (let key in methodsFns) {
            responseInner[key] = noop;
        }
    }

    if (hasRemove) {
        responseInner.remove = isBrowser ? removeCallFn({ store, opts, _tracker }) : noop;
    }

    if (isSuccess && entrySuccessFn) {
        responseInner.entry = entrySuccessFn(data);
    }

    Object.assign(responseInner, {
        loading: false,
        success: isSuccess,
        error: isError ? error : false,
        data: isSuccess ? data : undefined,
    });

    if (isSuccess && typeof uniqueFn === "function") {
        const newKey = uniqueFn(undefined, data);
        if (newKey) {
            const previousKey = _tracker?.uniqueKey;
            const trackerFound = findUniqueTracker(newKey, uniqueTracker);

            _tracker.uniqueKey = newKey;
            if (trackerFound && trackerFound !== _tracker) {
                if (uniqueMethod === "remove") {
                    removeCall({ store, opts, _tracker: trackerFound });
                    uniqueTracker.push([newKey, _tracker]);
                } //
                else {
                    const oldIndex = trackerFound.index;
                    removeCall({ store, opts, _tracker: trackerFound });
                    const responseInner = storeInner.responses.splice(_tracker.index, 1);
                    storeInner.responses.splice(oldIndex, 0, responseInner[0]);
                    for (let i = oldIndex, iLen = storeInner.responses.length; i < iLen; i++) {
                        storeInner.responses[i]._tracker.index = i;
                    }
                }
            } //
            else if (previousKey && !equal(newKey, previousKey)) {
                removeUniqueTracker(previousKey, uniqueTracker);
                uniqueTracker.push([newKey, _tracker]);
            } //
            else {
                uniqueTracker.push([newKey, _tracker]);
            }
        }
    }

    store.set(storeInner);

    if (_tracker?.isLastPrefill) {
        delete _tracker?.isLastPrefill;
        //@ts-ignore
        delete o?.opts?.prefillData;
        //@ts-ignore
        delete o?.opts?.prefillFn;
    }
    if (is$multiple) {
        checkForLoading({ store, opts });
    }
}

export { storeClientCreate };
