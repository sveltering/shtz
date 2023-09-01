import { building } from "$app/environment";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { get, writable } from "svelte/store";
import equal from "fast-deep-equal";
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
function storeClientCreate(options) {
    if (building) {
        return undefined;
    }
    const { url, batchLinkOptions, transformer } = options;
    const proxyClient = isBrowser
        ? createTRPCProxyClient({
            links: [httpBatchLink({ ...batchLinkOptions, url })],
            transformer,
        })
        : pseudoProxyClient();
    return outerProxy(proxyClient, [], options);
}
function noop() { }
function pseudoProxyClient() {
    return new Proxy(noop, {
        get: () => pseudoProxyClient(),
        apply: noop,
    });
}
function outerProxy(callback, path, options) {
    return new Proxy(noop, {
        get(_obj, key) {
            if (typeof key !== "string") {
                return undefined;
            }
            return outerProxy(callback, [...path, key], options);
        },
        apply(_1, _2, args) {
            let method = "";
            let endpoint = callback;
            for (let i = 0, iLen = path.length; i < iLen - 1; i++) {
                method = path[i + 1];
                endpoint = endpoint[path[i]];
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
            let uniqueResponse = undefined;
            let addResponse = undefined;
            let hasLoading = false;
            let hasRemove = false;
            let hasAbort = false;
            let hasAbortOnRemove = false;
            let beforeCallFn = undefined;
            let methodsFns = {};
            let zod = undefined;
            let changeTimer = undefined;
            const uniqueTracker = [];
            const storeOptArg = hasArguments ? args[0] : false;
            if (isBrowser && storeOptArg && has$call) {
                hasRemove = storeOptArg?.remove === true ? true : false;
                zod =
                    typeof storeOptArg?.zod?.safeParse === "function"
                        ? storeOptArg.zod
                        : undefined;
                beforeCallFn =
                    typeof storeOptArg?.beforeCall === "function"
                        ? storeOptArg.beforeCall
                        : undefined;
                methodsFns =
                    typeof storeOptArg?.methods === "object" ? storeOptArg.methods : {};
                changeTimer =
                    typeof storeOptArg.changeTimer === "number"
                        ? storeOptArg.changeTimer
                        : undefined;
                entryFn =
                    typeof storeOptArg?.entry === "function"
                        ? storeOptArg.entry
                        : undefined;
                entrySuccessFn =
                    typeof storeOptArg?.entrySuccess === "function"
                        ? storeOptArg.entrySuccess
                        : undefined;
                hasAbort = storeOptArg?.abort === true ? true : false;
                const prefillType = typeof storeOptArg?.prefill;
                if (prefillType === "function") {
                    prefillFn = storeOptArg.prefill;
                } //
                else if (prefillType !== "undefined") {
                    prefillData = storeOptArg.prefill;
                }
                if (is$multiple) {
                    hasLoading = storeOptArg?.loading === true ? true : false;
                    uniqueFn =
                        typeof storeOptArg?.unique === "function"
                            ? storeOptArg.unique
                            : undefined;
                    uniqueResponse =
                        storeOptArg?.uniqueResponse === "replace"
                            ? "replace"
                            : "remove";
                    addResponse =
                        storeOptArg?.addResponse === "start"
                            ? "start"
                            : "end";
                }
                if (storeOptArg?.abortOnRemove === true) {
                    hasRemove = true;
                    hasAbortOnRemove = true;
                }
            }
            if (!isBrowser && storeOptArg && has$call) {
                hasRemove = storeOptArg?.remove === true ? true : false;
                const prefillType = typeof storeOptArg?.prefill;
                if (prefillType !== "function" && prefillType !== "undefined") {
                    prefillData = storeOptArg.prefill;
                }
                if (is$multiple) {
                    hasLoading = storeOptArg?.loading === true ? true : false;
                    entrySuccessFn =
                        typeof storeOptArg?.entrySuccess === "function"
                            ? storeOptArg.entrySuccess
                            : undefined;
                }
                if (storeOptArg?.abortOnRemove === true) {
                    hasRemove = true;
                }
                // Methods not required for ssr from tests
                // Commented for now unless behaviour changes
                // if (typeof storeOptArg?.methods === "object") {
                //     for (let key in storeOptArg?.methods) {
                //         methodsFns[key] = noop;
                //     }
                // }
            }
            const storeOpts = {
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
                uniqueResponse,
                addResponse,
                hasLoading,
                hasRemove,
                hasAbort,
                hasAbortOnRemove,
                beforeCallFn,
                methodsFns,
                uniqueTracker,
                zod,
                changeTimer,
            };
            return storeClientMethods[method](storeOpts);
        },
    });
}
function callNoop() {
    return {
        get: noop,
        remove: noop,
        update: noop,
    };
}
const storeClientMethods = {
    $once: function (opts) {
        const _tracker = {};
        const store = writable({
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
    $many: function (opts) {
        const { hasAbort } = opts;
        const store = writable({
            data: undefined,
            entry: {},
            loading: false,
            error: false,
            success: false,
            ...(hasAbort ? { aborted: false } : {}),
            call: isBrowser
                ? (...endpointArgs) => {
                    const _tracker = {};
                    const o = callEndpoint({
                        store,
                        opts,
                        endpointArgs,
                        _tracker,
                    });
                    return {
                        get: () => getCall(o),
                        remove: () => removeCall(o),
                        update: () => updateCall(o),
                    };
                }
                : callNoop,
            fill: isBrowser
                ? (data) => {
                    handlePrefill(store, opts, data);
                }
                : noop,
        });
        handlePrefill(store, opts);
        return store;
    },
    $multiple: function (opts) {
        const { hasLoading } = opts;
        const store = writable({
            ...(hasLoading ? { loading: false } : {}),
            responses: [],
            call: isBrowser
                ? (...endpointArgs) => {
                    const _tracker = {};
                    const o = callEndpoint({
                        store,
                        opts,
                        endpointArgs,
                        _tracker,
                    });
                    return {
                        get: () => getCall(o),
                        remove: () => removeCall(o),
                        update: () => updateCall(o),
                    };
                }
                : callNoop,
            fill: isBrowser
                ? (data) => {
                    handlePrefill(store, opts, data);
                }
                : noop,
        });
        handlePrefill(store, opts);
        return store;
    },
};
function handlePrefill(store, opts, prefillDataOrFn) {
    const { is$many, is$multiple, hasLoading } = opts;
    let { prefillData, prefillFn } = opts;
    if (prefillData === undefined && !isBrowser) {
        return;
    }
    if (typeof prefillDataOrFn !== "undefined") {
        if (typeof prefillDataOrFn === "function") {
            prefillFn = prefillDataOrFn;
        }
        else {
            prefillData = prefillDataOrFn;
        }
    } //
    else {
        if (!prefillData && !prefillFn) {
            return;
        }
    }
    if (!isBrowser && is$many) {
        const _tracker = { isLastPrefill: true };
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
        const _tracker = { isLastPrefill: true };
        callEndpoint({
            store,
            opts,
            endpointArgs: [],
            _tracker,
            prefillHandle: prefillFn ? callAsync(prefillFn) : async () => prefillData,
        });
        return;
    }
    if (!isBrowser && is$multiple) {
        const storeInner = get(store);
        const startingIndex = storeInner.responses.length;
        const data = Array.isArray(prefillData) ? prefillData : [prefillData];
        for (let i = 0, iLen = data.length; i < iLen; i++) {
            const _tracker = {
                index: startingIndex + i,
            };
            if (i === iLen - 1) {
                _tracker.isLastPrefill = true;
            }
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
        }
        //@ts-ignore
        delete opts.prefillData;
        return;
    }
    if (isBrowser && is$multiple) {
        const storeInner = get(store);
        if (hasLoading) {
            storeInner.loading = true;
            store.set(storeInner);
        }
        const prefillFunction = prefillFn
            ? callAsync(prefillFn)
            : async () => prefillData;
        prefillFunction()
            .then(function (data) {
            data = Array.isArray(data) ? data : [data];
            if (hasLoading && !data.length) {
                storeInner.loading = false;
                store.set(storeInner);
            }
            for (let i = 0, iLen = data.length; i < iLen; i++) {
                const _tracker = {};
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
            .catch(function (error) {
            storeInner.prefillError = error;
            store.set(storeInner);
        });
        return;
    }
}
const callAsync = function (fn) {
    if (fn?.constructor?.name === "AsyncFunction") {
        return fn;
    }
    return async function (...args) {
        try {
            return await fn(...args);
        }
        catch (e) {
            throw e;
        }
    };
};
function findUniqueTracker(key, keys) {
    for (let i = 0, iLen = keys.length; i < iLen; i++) {
        if (equal(key, keys[i][0])) {
            return keys[i][1];
        }
    }
    return false;
}
function removeUniqueTracker(key, keys) {
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
function callEndpoint(o) {
    if (!isBrowser) {
        return;
    }
    const { store, opts, endpointArgs, prefillHandle } = o;
    let { _tracker } = o;
    const { endpoint, is$many, has$call, entryFn, hasLoading, hasRemove, hasAbort, hasAbortOnRemove, beforeCallFn, uniqueFn, uniqueResponse, addResponse, uniqueTracker, zod, } = opts;
    let _responseInner;
    if (has$call) {
        const responseInner = (_responseInner = {
            _tracker,
            loading: true,
            success: false,
            error: false,
            data: undefined,
            entry: {},
        });
        const storeInner = get(store);
        //ADD METHODS TO RESPONSE
        addResponseMethods({ responseInner, store, opts, _tracker });
        if (!prefillHandle) {
            if (hasAbort || hasAbortOnRemove) {
                _tracker.abortController = new AbortController();
                endpointArgs[0] = endpointArgs?.[0];
                endpointArgs[1] = endpointArgs.hasOwnProperty(1) ? endpointArgs[1] : {};
                endpointArgs[1].signal = _tracker.abortController.signal;
            }
            if (typeof entryFn === "function") {
                responseInner.entry = entryFn(endpointArgs?.[0]);
            }
        }
        if (hasAbort) {
            responseInner.aborted = false;
            responseInner.abort = abortCallFn({
                store,
                opts,
                _tracker,
                fromRemove: false,
            });
        }
        if (hasRemove) {
            responseInner.remove = removeCallFn({ store, opts, _tracker });
        }
        // UPDATE STORES
        if (is$many) {
            responseChanged(o, Object.assign(storeInner, responseInner));
        } // is$multiple
        else {
            if (hasLoading) {
                storeInner.loading = true;
            }
            let pushResponse = true;
            if (typeof uniqueFn === "function") {
                const uniqueKey = uniqueFn(endpointArgs?.[0], undefined);
                if (uniqueKey !== undefined) {
                    const trackerFound = findUniqueTracker(uniqueKey, uniqueTracker);
                    _tracker.uniqueKey = uniqueKey;
                    if (trackerFound) {
                        if (uniqueResponse === "remove") {
                            removeCall({ store, opts, _tracker: trackerFound });
                        } //
                        else {
                            pushResponse = false;
                            const oldIndex = trackerFound.index;
                            removeCall({ store, opts, _tracker: trackerFound });
                            storeInner.responses.splice(oldIndex, 0, responseInner);
                            for (let i = oldIndex, iLen = storeInner.responses.length; i < iLen; i++) {
                                storeInner.responses[i]._tracker.index = i;
                            }
                        }
                    } //
                    uniqueTracker.push([uniqueKey, _tracker]);
                }
            }
            if (pushResponse) {
                if (addResponse === "start") {
                    _tracker.index = 0;
                    storeInner.responses.unshift(responseInner);
                    for (let i = 0, iLen = storeInner.responses.length; i < iLen; i++) {
                        storeInner.responses[i]._tracker.index = i;
                    }
                } //
                else {
                    _tracker.index = storeInner.responses.length;
                    storeInner.responses.push(responseInner);
                }
            }
            responseChanged(o, responseInner);
        }
    }
    if (!prefillHandle && zod) {
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
    if (prefillHandle) {
        prefillHandle()
            .then(endpointSuccess({ store, opts, _tracker }))
            .catch(endpointError({ store, opts, _tracker }));
    } //
    else if (typeof beforeCallFn === "function") {
        callAsync(beforeCallFn)(endpointArgs?.[0], function (newInput) {
            endpointArgs[0] = newInput;
        })
            .then(function (continueCall) {
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
    return {
        responseInner: _responseInner,
        store,
        opts,
        _tracker,
    };
}
function getResponseInner(o) {
    const { store, opts, _tracker } = o;
    const { is$multiple, is$many } = opts;
    const storeInner = get(store);
    const allResponses = is$multiple ? storeInner.responses : undefined;
    const responseInner = is$many
        ? storeInner
        : allResponses.hasOwnProperty(_tracker.index)
            ? allResponses[_tracker.index]
            : null;
    return { storeInner, responseInner, allResponses };
}
function responseChanged(o, responseInner) {
    const { store, opts } = o;
    const { is$many, changeTimer } = opts;
    const storeInner = is$many ? undefined : get(store);
    if (!isBrowser || !changeTimer) {
        store.set(is$many ? responseInner : storeInner);
        return;
    }
    const { _tracker } = o;
    if (_tracker?.timeout !== null) {
        clearTimeout(_tracker?.timeout);
    }
    responseInner.changed = true;
    store.set(is$many ? responseInner : storeInner);
    _tracker.timeout = setTimeout(function () {
        responseInner.changed = false;
        store.set(is$many ? responseInner : storeInner);
        _tracker.timeout = null;
    }, changeTimer);
}
function addResponseMethods(o) {
    const { opts: { methodsFns }, responseInner, } = o;
    for (let key in methodsFns) {
        if (typeof methodsFns[key] !== "function")
            continue;
        if (methodsFns[key]?.constructor?.name === "AsyncFunction") {
            responseInner[key] = async () => await reponseMethodCall(o, key);
        }
        else {
            responseInner[key] = () => reponseMethodCall(o, key);
        }
    }
}
const getCall = (o) => {
    let { responseInner } = getResponseInner(o);
    return responseInner;
};
const updateCall = (o) => {
    let { responseInner, allResponses } = getResponseInner(o);
    const { opts: { is$many }, _tracker, } = o;
    if (is$many) {
        responseChanged(o, responseInner);
    }
    else {
        allResponses[_tracker.index] = responseInner;
        responseChanged(o, responseInner);
    }
};
function reponseMethodCall(o, key) {
    let { responseInner } = getResponseInner(o);
    if (responseInner === null) {
        return;
    }
    const { methodsFns } = o.opts;
    return methodsFns[key](responseInner, {
        remove: () => removeCall(o),
        update: () => updateCall(o),
    });
}
function removeCall(o) {
    const { store, opts, _tracker } = o;
    const { is$many } = opts;
    const { storeInner, responseInner, allResponses } = getResponseInner(o);
    if (_tracker.removed === true) {
        return;
    }
    abortCall({ store, opts, _tracker, fromRemove: true });
    _tracker.removed = true;
    delete _tracker?.abortController;
    if (_tracker?.timeout) {
        clearTimeout(_tracker?.timeout);
    }
    if (_tracker?.uniqueKey) {
        const { uniqueTracker } = opts;
        removeUniqueTracker(_tracker?.uniqueKey, uniqueTracker);
        delete _tracker?.uniqueKey;
    }
    if (is$many) {
        responseChanged(o, Object.assign(responseInner, {
            loading: false,
            success: false,
            error: false,
            data: undefined,
            entry: {},
        }));
    } //
    else if (typeof _tracker.index === "number") {
        const responseIndex = _tracker.index;
        let response = allResponses?.splice(_tracker.index, 1)?.[0] || {};
        for (let key in response) {
            response[key] = null;
            delete response[key];
        }
        _tracker.index = null;
        for (let i = responseIndex, iLen = allResponses.length; i < iLen; i++) {
            allResponses[i]._tracker.index = i;
        }
        store.set(storeInner);
        checkForLoading({ store, opts });
    }
}
function removeCallFn(o) {
    return function () {
        removeCall(o);
    };
}
function abortCall(o) {
    const { _tracker, fromRemove, opts: { hasAbortOnRemove }, } = o;
    if (fromRemove && !hasAbortOnRemove) {
        return;
    }
    if (!_tracker?.abortController) {
        return;
    }
    const { store, opts } = o;
    const { is$many, is$multiple, hasAbort } = opts;
    _tracker.abortController?.abort?.();
    delete _tracker.abortController;
    _tracker.skip = true;
    if (is$many) {
        const responseInner = get(store);
        responseChanged(o, Object.assign(responseInner, {
            loading: false,
            success: false,
            error: false,
            data: undefined,
            ...(hasAbort ? { aborted: true } : {}),
        }));
        return;
    }
    if (fromRemove) {
        return;
    }
    if (is$multiple) {
        const storeInner = get(store);
        const responseInner = storeInner.responses[_tracker.index];
        responseInner.aborted = true;
        responseInner.loading = false;
        responseChanged(o, responseInner);
        checkForLoading({ store, opts });
    }
}
function abortCallFn(o) {
    return function () {
        abortCall(o);
    };
}
function checkForLoading(o) {
    if (!o.opts.hasLoading) {
        return;
    }
    const { store } = o;
    const storeInner = get(store);
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
function endpointSuccess(o) {
    return async function (data) {
        endpointReponse({ isSuccess: true, isError: false, data, ...o });
    };
}
function endpointError(o) {
    return async function (error) {
        endpointReponse({ isSuccess: false, isError: true, error, ...o });
    };
}
function endpointReponse(o) {
    const { error, isError } = o;
    let { _tracker } = o;
    if (_tracker?.removed) {
        return;
    }
    if (_tracker?.skip) {
        _tracker.skip = false;
        return;
    }
    if (isError && error?.cause?.name === "ObservableAbortError") {
        return;
    }
    const { isSuccess, store, opts, data } = o;
    const { is$once, is$multiple, entrySuccessFn, uniqueFn, uniqueResponse, uniqueTracker, } = opts;
    if (is$once) {
        const responseInner = get(store);
        store.set(Object.assign(responseInner, {
            loading: false,
            success: isSuccess,
            error: isError ? error : false,
            data: isSuccess ? data : undefined,
        }));
        return;
    }
    const { storeInner, responseInner } = getResponseInner(o);
    if (responseInner === null) {
        return;
    }
    delete responseInner?.abort;
    delete _tracker?.abortController;
    // Methods not required for ssr from tests
    // Commented for now unless behaviour changes
    // if (prefillSSR === true) {
    //     for (let key in methodsFns) {
    //         responseInner[key] = noop;
    //     }
    // }
    if (isSuccess && entrySuccessFn) {
        responseInner.entry = entrySuccessFn(data, responseInner?.entry);
    }
    Object.assign(responseInner, {
        loading: false,
        success: isSuccess,
        error: isError ? error : false,
        data: isSuccess ? data : undefined,
    });
    if (isBrowser && isSuccess && typeof uniqueFn === "function") {
        const newKey = uniqueFn(undefined, data);
        if (newKey !== undefined) {
            const previousKey = _tracker?.uniqueKey;
            const trackerFound = findUniqueTracker(newKey, uniqueTracker);
            _tracker.uniqueKey = newKey;
            if (trackerFound && trackerFound !== _tracker) {
                if (uniqueResponse === "remove") {
                    removeCall({ store, opts, _tracker: trackerFound });
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
            if (!equal(newKey, previousKey)) {
                removeUniqueTracker(previousKey, uniqueTracker);
                uniqueTracker.push([newKey, _tracker]);
            }
        }
    }
    responseChanged(o, responseInner);
    if (_tracker?.isLastPrefill) {
        delete _tracker?.isLastPrefill;
        //@ts-ignore
        delete o?.opts?.prefillData;
        //@ts-ignore
        delete o?.opts?.prefillFn;
    }
    if (isBrowser && is$multiple) {
        checkForLoading({ store, opts });
    }
}
export { storeClientCreate };
