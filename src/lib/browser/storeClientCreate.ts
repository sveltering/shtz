import type { AnyRouter } from "@trpc/server";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { get, writable } from "svelte/store";

import type { ArgumentTypes, AsyncFunctionType, FunctionType } from "../types.js";
import type { storeClientOpt, storeCC } from "./types.js";

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

function storeClientCreate<Router extends AnyRouter>(options: storeClientOpt): storeCC<Router> {
    const { url, batchLinkOptions, transformer } = options;

    // if (typeof window === 'undefined') {
    // 	return pseudoOuterProxy([]) as storeCC<Router>;
    // }

    return outerProxy(
        createTRPCProxyClient<Router>({
            links: [httpBatchLink({ ...batchLinkOptions, url })],
            transformer: transformer,
        }),
        [],
        options
    ) as storeCC<Router>;
}

function noop() {}
function pseudoOuterProxy(path: string[]): any {
    return new Proxy(noop, {
        get(_obj, key) {
            if (typeof key !== "string") {
                return undefined;
            }
            return pseudoOuterProxy([...path, key]);
        },
        apply: (_1, _2, args) => {
            return writable({});
        },
    });
}

const generateKey = () => Math.random().toString(36).substring(2, 12);

function outerProxy(callback: any, path: string[], options: storeClientOpt): any {
    const proxy: unknown = new Proxy(noop, {
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

            const storeOptArg = hasArguments ? args[0] : false;
            if (storeOptArg && has$call) {
                if (typeof storeOptArg === "function") {
                    if (is$multiple) {
                        entryFn = storeOptArg;
                    }
                } //
                else {
                    hasRemove = !!storeOptArg?.remove;
                    beforeRemoveInputFn = storeOptArg?.beforeRemoveInput;
                    beforeRemoveResponseFn = storeOptArg?.beforeRemoveResponse;
                    beforeRemoveErrorFn = storeOptArg?.beforeRemoveError;
                    beforeCallFn = storeOptArg?.beforeCall;

                    const prefillType = typeof storeOptArg?.prefill;
                    if (prefillType === "function") {
                        prefillFn = storeOptArg.prefill;
                    } //
                    else if (typeof prefillType !== "undefined") {
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
            }

            if (typeof window === "undefined") {
                hasRemove = false;
                hasAbort = false;
                hasAbortOnRemove = false;
                entryFn = undefined;
                beforeCallFn = undefined;
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
            };

            return storeClientMethods[method](storeOpts as any);
        },
    });
    return proxy;
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
        callEndpoint({ store, opts, endpointArgs: opts.args, _tracker });
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
            call: (...endpointArgs: any[]) => {
                const _tracker: CallTracker = {} as CallTracker;
                callEndpoint({ store, opts, endpointArgs, _tracker });
            },
        });
        handlePrefill(store, opts);
        return store;
    },
    $multiple: function (opts: $MultipleStoreOpts) {
        const { hasLoading } = opts;
        const store: AnyMultipleStore = writable({
            ...(hasLoading ? { loading: false } : {}),
            responses: [],
            call: (...endpointArgs: any[]) => {
                const _tracker: CallTracker = {} as CallTracker;
                callEndpoint({ store, opts, endpointArgs, _tracker });
            },
        });
        handlePrefill(store, opts);
        return store;
    },
};

function handlePrefill(store: AnyStore, opts: AnyStoreOpts) {
    const { prefillData, prefillFn, is$many, is$multiple } = opts;
    if (!prefillData && !prefillFn) {
        return;
    }
    const isBrowser = typeof window !== "undefined";

    if (prefillFn && !isBrowser) {
        return;
    }
    const _tracker: CallTracker = {} as CallTracker;

    if (!isBrowser && is$many && prefillData) {
        endpointReponse({
            isSuccess: true,
            isError: false,
            store,
            opts,
            _tracker,
            data: prefillData,
        });
        return;
    }

    if (isBrowser && is$many) {
        callEndpoint({
            store,
            opts,
            endpointArgs: [],
            _tracker,
            prefillHandle: prefillFn ? callAsync(prefillFn) : async () => prefillData,
        });
    }

    if (!isBrowser && is$multiple && prefillData) {
        const storeInner = get(store as any) as any;
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
                isSuccess: true,
                isError: false,
                store,
                opts,
                _tracker,
                data: data[i],
            });
        }

        return;
    }
    if (isBrowser && is$multiple) {
        const storeInner = get(store as any) as any;
        storeInner.loading = true;
        store.set(storeInner);
        const prefillFunction = prefillFn ? callAsync(prefillFn) : async () => prefillData;
        prefillFunction()
            .then(function (data) {
                data = Array.isArray(data) ? data : [data];
                const startingIndex = storeInner.responses.length;
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
                        isSuccess: true,
                        isError: false,
                        store,
                        opts,
                        _tracker,
                        data: data[i],
                    });
                }
            })
            .catch(function (error) {
                storeInner.prefillError = error;
                storeInner.loading = false;
                store.set(storeInner);
            });
    }
}

const callAsync = function <Fn extends FunctionType>(fn: FunctionType) {
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
    const { endpoint, is$many, has$call, entryFn, hasLoading, hasRemove, hasAbort, hasAbortOnRemove, beforeCallFn } = opts;

    if (has$call) {
        const storeInner = get(store as any) as any;

        const responseInner = {
            _tracker,
            loading: true,
            success: false,
            error: false,
            data: undefined,
            entry: {},
        };
        //ADD METHODS TO RESPONSE
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

    if (typeof window === "undefined") {
        return;
    }

    if (prefillHandle) {
        prefillHandle().then(endpointSuccess({ store, opts, _tracker })).catch(endpointError({ store, opts, _tracker }));
    } else if (beforeCallFn) {
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

type RemoveCallFnOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    data?: any;
    error?: Error;
    input?: any;
};
function removeCallFn(o: RemoveCallFnOpts) {
    return async function () {
        const { store, opts, _tracker, data, error, input } = o;
        const { is$many, is$multiple, beforeRemoveInputFn, beforeRemoveResponseFn, beforeRemoveErrorFn } = opts;

        const storeInner = get(store as any) as any;
        const allResponses = is$multiple ? storeInner.responses : undefined;
        const responseInner = is$many ? storeInner : allResponses[_tracker.index];

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
            remove = (await beforeRemoveErrorFn(error)) === true ? true : false;
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
            allResponses.splice(_tracker.index, 1)?.[0];
            _tracker.index = null;
            for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
                const response = allResponses[i];
                response._tracker.index = i;
            }
            store.set(storeInner as any);
            checkForLoading({ store, opts });
        }
    };
}

type AbortCallFnOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    fromRemove: boolean;
};
function abortCallFn(o: AbortCallFnOpts) {
    return function () {
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
    };
}
type CheckForLoadingOpts = {
    store: AnyStore;
    opts: AnyStoreOpts;
};
function checkForLoading(o: CheckForLoadingOpts) {
    const {
        store,
        opts: { hasLoading },
    } = o;
    if (!hasLoading) {
        return;
    }
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
    isSuccess: true;
    isError: false;
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    data: any;
    error?: undefined;
};
type EndpointErrorOpts = {
    isSuccess: false;
    isError: true;
    store: AnyStore;
    opts: AnyStoreOpts;
    _tracker: CallTracker;
    data?: undefined;
    error: Error;
};
type EndpointResponseOpts = {
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
    const { error, isError, _tracker } = o;

    if (_tracker?.skip) {
        _tracker.skip = false;
        return;
    }
    if (isError && error?.cause?.name === "ObservableAbortError") {
        return;
    }

    const { isSuccess, store, opts, data } = o;
    const { is$once, is$many, is$multiple, hasRemove, entrySuccessFn } = opts;

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

    const storeInner = get(store as any) as any;
    const responseInner = is$many ? storeInner : storeInner?.responses?.[_tracker.index];

    delete responseInner?.abort;
    delete _tracker?.abortController;

    if (hasRemove) {
        responseInner.remove = removeCallFn({ store, opts, _tracker, data, error });
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

    if (is$multiple) {
        checkForLoading({ store, opts });
    }
}

export { storeClientCreate };
