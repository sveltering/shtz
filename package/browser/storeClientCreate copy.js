import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import { get, writable } from "svelte/store";
import { browser as isBrowser } from "$app/environment";
import equal from "fast-deep-equal";
function storeClientCreate(options) {
    const { url, batchLinkOptions, transformer } = options;
    const proxyClient = isBrowser
        ? createTRPCProxyClient({
            links: [httpBatchLink({ ...batchLinkOptions, url })],
            transformer: transformer,
        })
        : pseudoProxyClient();
    return outerProxy(proxyClient, [], options);
}
function noop() { }
function pseudoProxyClient() {
    return new Proxy(noop, {
        get: (_1, _2) => pseudoProxyClient(),
        apply: (_1, _2, _3) => undefined,
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
            let hasLoading = false;
            let hasRemove = false;
            let hasAbort = false;
            let hasAbortOnRemove = false;
            let beforeCallFn = undefined;
            let methodsFns = {};
            const uniqueTracker = [];
            const storeOptArg = hasArguments ? args[0] : false;
            if (isBrowser && storeOptArg && has$call) {
                hasRemove = !!storeOptArg?.remove;
                beforeCallFn = storeOptArg?.beforeCall;
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
                    uniqueFn = storeOptArg?.unique;
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
                hasLoading,
                hasRemove,
                hasAbort,
                hasAbortOnRemove,
                beforeCallFn,
                methodsFns,
                uniqueTracker,
            };
            return storeClientMethods[method](storeOpts);
        },
    });
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
                    callEndpoint({ store, opts, endpointArgs, _tracker });
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
                    callEndpoint({ store, opts, endpointArgs, _tracker });
                }
                : noop,
        });
        handlePrefill(store, opts);
        return store;
    },
};
function handlePrefill(store, opts) {
    const { prefillData, prefillFn, is$many, is$multiple, hasLoading } = opts;
    if (!prefillData && !prefillFn) {
        return;
    }
    if (prefillData === undefined && !isBrowser) {
        return;
    }
    if (!isBrowser && is$many && prefillData) {
        const _tracker = {};
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
    if (!isBrowser && is$multiple && prefillData) {
        const storeInner = get(store);
        const startingIndex = storeInner.responses.length;
        const data = Array.isArray(prefillData) ? prefillData : [prefillData];
        for (let i = 0, iLen = data.length; i < iLen; i++) {
            const _tracker = { index: startingIndex + i };
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
        const storeInner = get(store);
        if (hasLoading) {
            storeInner.loading = true;
            store.set(storeInner);
        }
        const prefillFunction = prefillFn ? callAsync(prefillFn) : async () => prefillData;
        prefillFunction()
            .then(function (data) {
            data = Array.isArray(data) ? data : [data];
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
    const { store, opts, endpointArgs, prefillHandle } = o;
    const { endpoint, is$many, has$call, entryFn, hasLoading, hasRemove, hasAbort, hasAbortOnRemove, beforeCallFn, uniqueFn, uniqueTracker, } = opts;
    let { _tracker } = o;
    let trackerFound = false;
    if (typeof uniqueFn === "function") {
        const uniqueKey = uniqueFn(endpointArgs?.[0], undefined);
        if (uniqueKey) {
            const find_tracker = findUniqueTracker(uniqueKey, uniqueTracker);
            if (find_tracker) {
                _tracker = find_tracker;
                trackerFound = true;
            } //
            else {
                uniqueTracker.push([uniqueKey, _tracker]);
            }
            _tracker.uniqueKey = uniqueKey;
        }
    }
    if (has$call) {
        const responseInner = {
            _tracker,
            loading: true,
            success: false,
            error: false,
            data: undefined,
            entry: {},
        };
        const storeInner = get(store);
        //ADD METHODS TO RESPONSE
        if (!trackerFound) {
            addResponseMethods({ responseInner, store, opts, _tracker });
        }
        if (!prefillHandle) {
            if (hasAbort || hasAbortOnRemove) {
                _tracker.abortController = new AbortController();
                endpointArgs[0] = endpointArgs?.[0];
                endpointArgs[1] = endpointArgs.hasOwnProperty(1) ? endpointArgs[1] : {};
                endpointArgs[1].signal = _tracker.abortController.signal;
            }
            if (hasAbort) {
                responseInner.aborted = false;
                if (!trackerFound) {
                    responseInner.abort = abortCallFn({ store, opts, _tracker, fromRemove: false });
                }
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
            if (trackerFound) {
                Object.assign(storeInner.responses[_tracker.index], responseInner);
            } //
            else {
                _tracker.index = storeInner.responses.length;
                storeInner.responses.push(responseInner);
            }
            store.set(storeInner);
        }
    }
    if (!isBrowser) {
        return;
    }
    if (prefillHandle) {
        prefillHandle().then(endpointSuccess({ store, opts, _tracker })).catch(endpointError({ store, opts, _tracker }));
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
}
function getResponseInner(o) {
    const { store, opts, _tracker } = o;
    const { is$multiple, is$many } = opts;
    const storeInner = get(store);
    const allResponses = is$multiple ? storeInner.responses : undefined;
    const responseInner = is$many ? storeInner : allResponses.hasOwnProperty(_tracker.index) ? allResponses[_tracker.index] : null;
    return { storeInner, responseInner, allResponses };
}
const removeObj = { remove: "REMOVE" };
const removeFn = () => removeObj;
async function reponseMethodCall(o, key) {
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
        }
        else {
            allResponses[_tracker.index] = response;
            store.set(storeInner);
        }
    }
}
function addResponseMethods(o) {
    const { opts: { methodsFns }, responseInner, } = o;
    for (let key in methodsFns) {
        if (typeof methodsFns[key] !== "function")
            continue;
        if (methodsFns[key]?.constructor?.name === "AsyncFunction") {
            responseInner[key] = async function () {
                await reponseMethodCall(o, key);
            };
        }
        else {
            responseInner[key] = function () {
                reponseMethodCall(o, key);
            };
        }
    }
}
function removeCall(o) {
    const { store, opts, _tracker } = o;
    const { is$many } = opts;
    const { storeInner, responseInner, allResponses } = getResponseInner(o);
    if (_tracker.removed === true) {
        console.log("removed", o);
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
        store.set(Object.assign(responseInner, {
            loading: false,
            success: false,
            error: false,
            data: undefined,
        }));
    } //
    else if (typeof _tracker.index === "number") {
        let removed = allResponses.splice(_tracker.index, 1)?.[0];
        for (let key in removed) {
            delete removed[key];
        }
        _tracker.index = null;
        for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
            const response = allResponses[i];
            response._tracker.index = i;
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
    _tracker.abortController?.abort();
    delete _tracker.abortController;
    _tracker.skip = true;
    if (is$many) {
        const responseInner = get(store);
        store.set(Object.assign(responseInner, {
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
        storeInner.responses[_tracker.index].aborted = true;
        storeInner.responses[_tracker.index].loading = false;
        store.set(storeInner);
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
        await endpointReponse({ isSuccess: true, isError: false, data, ...o });
    };
}
function endpointError(o) {
    return async function (error) {
        await endpointReponse({ isSuccess: false, isError: true, error, ...o });
    };
}
async function endpointReponse(o) {
    const { error, isError, prefillSSR } = o;
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
    const { is$once, is$multiple, hasRemove, entrySuccessFn, methodsFns, uniqueFn, uniqueTracker } = opts;
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
            const find_tracker = findUniqueTracker(newKey, uniqueTracker);
            if (find_tracker && find_tracker !== _tracker) {
                removeCall({ store, opts, _tracker });
                console.log(Object.assign(storeInner.responses[find_tracker.index], responseInner));
                // storeInner.responses[find_tracker.index] = Object.assign(storeInner.responses[find_tracker.index], responseInner);
                // storeInner.responses[find_tracker.index]._tracker.index = find_tracker.index;
            } //
            else if (previousKey && !equal(newKey, previousKey)) {
                removeUniqueTracker(previousKey, uniqueTracker);
                uniqueTracker.push([newKey, _tracker]);
                _tracker.uniqueKey = newKey;
            } //
            else {
                uniqueTracker.push([newKey, _tracker]);
                _tracker.uniqueKey = newKey;
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
