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

import deepmerge from "deepmerge";

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
            let hasLoading = false;
            let hasRemove = false;
            let hasAbort = false;
            let hasAbortOnRemove = false;
            let beforeCallFn = undefined;
            let beforeRemoveInputFn = undefined;
            let beforeRemoveResponseFn = undefined;
            let beforeRemoveErrorFn = undefined;
            let methodsFns: any = {};

            const storeOptArg = hasArguments ? args[0] : false;
            if (isBrowser && storeOptArg && has$call) {
                hasRemove = !!storeOptArg?.remove;
                beforeCallFn = storeOptArg?.beforeCall;
                beforeRemoveInputFn = storeOptArg?.beforeRemoveInput;
                beforeRemoveResponseFn = storeOptArg?.beforeRemoveResponse;
                beforeRemoveErrorFn = storeOptArg?.beforeRemoveError;
                methodsFns = storeOptArg?.methods;

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
                hasLoading,
                hasRemove,
                hasAbort,
                hasAbortOnRemove,
                beforeCallFn,
                beforeRemoveInputFn,
                beforeRemoveResponseFn,
                beforeRemoveErrorFn,
                methodsFns,
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

type CallEndpointOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
    endpointArgs: any[];
    prefillHandle?: AsyncFunctionType;
    _tracker: CallTracker;
};

function callEndpoint(o: CallEndpointOpts) {
    const { store, opts, endpointArgs, prefillHandle, _tracker } = o;
    const { endpoint, is$many, has$call, entryFn, hasLoading, hasRemove, hasAbort, hasAbortOnRemove, beforeCallFn, methodsFns } = opts;

    if (has$call) {
        const storeInner = get(store as any) as any;

        const responseInner: any = {
            _tracker,
            loading: true,
            success: false,
            error: false,
            data: undefined,
            entry: {},
        };
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
                responseInner.remove = removeCallFn({ store, opts, _tracker, input: endpointArgs?.[0] });
            }
            if (entryFn) {
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
            store.set(storeInner);
        }
    }

    if (!isBrowser) {
        return;
    }

    if (prefillHandle) {
        prefillHandle().then(endpointSuccess({ store, opts, _tracker })).catch(endpointError({ store, opts, _tracker }));
    } //
    else if (beforeCallFn) {
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

type AddResponseMethodsOpts = {
    responseInner: any;
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
};

async function reponseMethodCall(o: AddResponseMethodsOpts, key: string) {
    const { store, opts, _tracker } = o;
    let { storeInner, responseInner, allResponses } = getResponseInner(o);
    if (responseInner === null) {
        return;
    }
    const { methodsFns, is$many } = opts;
    let response = await methodsFns[key](responseInner, mergeResponse(_tracker, responseInner));
    if (response === false) {
        return;
    }
    if (response === true) {
        console.log("HERE TRUE");
        console.log(responseInner);
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

function mergeResponse(_tracker: CallTracker, responseInner: any) {
    return function (newResponse: any, mergeDeep: boolean = false, mergeOpts?: {}) {
        if (typeof newResponse === undefined) {
            return;
        }
        if (mergeDeep) {
            responseInner = deepmerge(responseInner, newResponse, mergeOpts);
        } else {
            Object.assign(responseInner, newResponse);
        }
        if (responseInner === undefined) {
            return;
        }
        responseInner._tracker = _tracker;
        return responseInner;
    };
}

type RemoveCallFnOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    data?: any;
    error?: Error;
    input?: any;
};
async function removeCall(o: RemoveCallFnOpts) {
    const { store, opts, _tracker, data, error, input } = o;
    const { is$many, beforeRemoveInputFn, beforeRemoveResponseFn, beforeRemoveErrorFn } = opts;

    const { storeInner, responseInner, allResponses } = getResponseInner(o);

    if (responseInner === null) {
        return;
    }

    let remove = true;
    let newResponse: any = {};

    const isSuccess = responseInner.success;
    const isError = responseInner.error;

    if (isSuccess && beforeRemoveResponseFn) {
        remove =
            (await beforeRemoveResponseFn(data, (replaceResponse: any) => {
                newResponse.value = replaceResponse;
            })) === true
                ? true
                : false;
    } //
    else if (isError && beforeRemoveErrorFn) {
        remove = (await beforeRemoveErrorFn(error as Error)) === true ? true : false;
    } //
    else if (!(isSuccess || isError) && beforeRemoveInputFn) {
        remove = (await beforeRemoveInputFn(input)) === true ? true : false;
    }

    if (remove) {
        abortCallFn({ store, opts, _tracker, fromRemove: true })();
        _tracker.skip = true;
    } //
    else {
        if (newResponse.hasOwnProperty("value")) {
            responseInner.data = newResponse.value;
            store.set(responseInner);
        }
        return;
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
    return async function () {
        await removeCall(o);
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

type EndpointSuccessError = { store: AnyStore; opts: AnyStoreOpts; _tracker: CallTracker };
function endpointSuccess(o: EndpointSuccessError) {
    return async function (data: any) {
        const { store, opts, _tracker } = o;
        await endpointReponse({ isSuccess: true, isError: false, store, opts, _tracker, data });
    };
}
function endpointError(o: EndpointSuccessError) {
    return async function (error: any) {
        const { store, opts, _tracker } = o;
        await endpointReponse({ isSuccess: false, isError: true, store, opts, _tracker, error });
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
    const { error, isError, _tracker, prefillSSR } = o;

    if (_tracker?.skip) {
        _tracker.skip = false;
        return;
    }
    if (isError && (error?.cause as any)?.name === "ObservableAbortError") {
        return;
    }

    const { isSuccess, store, opts, data } = o;
    const { is$once, is$multiple, hasRemove, entrySuccessFn, methodsFns } = opts;

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
        responseInner.remove = isBrowser ? removeCallFn({ store, opts, _tracker, data, error }) : noop;
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
