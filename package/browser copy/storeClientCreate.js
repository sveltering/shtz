import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { get, writable } from 'svelte/store';
function storeClientCreate(options) {
    const { url, batchLinkOptions } = options;
    if (typeof window === 'undefined') {
        return pseudoOuterProxy();
    }
    return outerProxy(
    //@ts-ignore
    createTRPCProxyClient({
        links: [httpBatchLink({ ...batchLinkOptions, url })]
    }), [], options);
}
function outerProxy(callback, path, options) {
    const proxy = new Proxy(noop, {
        get(_obj, key) {
            if (typeof key !== 'string') {
                return undefined;
            }
            return outerProxy(callback, [...path, key], options);
        },
        apply(_1, _2, args) {
            let endpoint = callback;
            let method = '';
            for (let i = 0, iLen = path.length; i < iLen - 1; i++) {
                endpoint = endpoint[path[i]];
                method = path[i + 1];
            }
            const hasArguments = !!args.length;
            const is$once = method === '$once';
            const is$revisable = method === '$revisable';
            const is$multiple = method === '$multiple';
            let is$multipleObject = false, is$multipleEntriesArray = false, is$multipleArray = false, $multipleGetKeyFn = undefined, $multipleGetEntryFn = undefined, $multipleHasLoading = false, $multipleHasRemove = false;
            if (is$multiple) {
                is$multipleObject = hasArguments && !!args[0]?.hasOwnProperty?.('key');
                is$multipleEntriesArray =
                    hasArguments && (typeof args[0] === 'function' || !!args[0]?.hasOwnProperty?.('entry'));
                is$multipleArray = !is$multipleObject && !is$multipleEntriesArray;
                $multipleGetKeyFn = is$multipleObject ? args[0]?.key : undefined;
                $multipleGetEntryFn = is$multipleEntriesArray ? args[0]?.entry || args[0] : undefined;
                $multipleHasLoading = hasArguments && args?.[0]?.loading === true;
                $multipleHasRemove = hasArguments && args?.[0]?.remove === true;
            }
            return storeClientMethods[method]({
                method,
                endpoint,
                args,
                options,
                path: path.slice(0, -1),
                is$once,
                is$revisable,
                is$multiple,
                is$multipleArray,
                is$multipleEntriesArray,
                is$multipleObject,
                $multipleGetKeyFn,
                $multipleGetEntryFn,
                $multipleHasLoading,
                $multipleHasRemove
            });
        }
    });
    return proxy;
}
function noop() { }
function pseudoOuterProxy(path = []) {
    return new Proxy(noop, {
        get(_obj, key) {
            if (typeof key !== 'string') {
                return undefined;
            }
            return pseudoOuterProxy([...path, key]);
        },
        apply: (_1, _2, args) => {
            const method = path[path.length - 1];
            const hasArguments = !!args.length;
            const is$multiple = method === '$multiple';
            if (is$multiple) {
                const is$multipleObject = is$multiple && hasArguments && !!args[0]?.hasOwnProperty?.('key');
                const $multipleHasLoading = is$multiple && hasArguments && args?.[0]?.loading === true;
                return writable({
                    ...($multipleHasLoading ? { loading: true } : {}),
                    responses: is$multipleObject ? {} : [],
                    call: () => undefined
                });
            }
            return writable({
                loading: true,
                success: false,
                error: false,
                response: undefined,
                call: () => undefined
            });
        }
    });
}
function callEndpoint(opts) {
    const { endpoint, options, path, is$once, is$revisable, is$multiple, is$multipleArray, is$multipleEntriesArray, is$multipleObject, $multipleGetKeyFn, $multipleGetEntryFn, $multipleHasLoading, $multipleHasRemove, endpointArgs, store } = opts;
    let track$multiple = {};
    let $multipleRemoveFn = {};
    if (is$revisable) {
        let storeInner = get(store);
        storeInner = {
            response: undefined,
            loading: true,
            error: false,
            success: false,
            call: storeInner.call
        };
        store.set(storeInner);
    } //
    else if (is$multiple) {
        let storeInner = get(store);
        if ($multipleHasLoading) {
            storeInner.loading = true;
        }
        if ($multipleHasRemove) {
            $multipleRemoveFn = { remove: removeResponse(store, track$multiple, is$multipleObject) };
        }
        if (is$multipleObject) {
            track$multiple.index = $multipleGetKeyFn(endpointArgs[0]);
        } //
        else {
            track$multiple.index = storeInner.responses.length;
        }
        const loadingResponse = {
            response: undefined,
            loading: true,
            error: false,
            success: false,
            ...$multipleRemoveFn,
            track$multiple
        };
        if (is$multipleEntriesArray) {
            const entry = $multipleGetEntryFn(endpointArgs[0]);
            storeInner.responses.push([entry, loadingResponse]);
        } //
        else if (is$multipleArray) {
            storeInner.responses.push(loadingResponse);
        } //
        else if (is$multipleObject) {
            storeInner.responses[track$multiple.index] = loadingResponse;
        }
        store.set(storeInner);
    }
    endpoint(...endpointArgs)
        .then(async (response) => {
        if (options?.interceptResponse) {
            response = await options.interceptResponse(response, [...path].slice(0, -1).join('.'));
        }
        let successResponse = {};
        if (is$once) {
            successResponse = { loading: false, response, error: false, success: true };
        } //
        else if (is$revisable) {
            successResponse = { loading: false, response, error: false, success: true };
            successResponse.call = get(store).call;
        } //
        else if (is$multiple) {
            successResponse = get(store);
            const individualSuccessResponse = {
                loading: false,
                response,
                error: false,
                success: true,
                ...$multipleRemoveFn,
                track$multiple
            };
            if (is$multipleEntriesArray) {
                successResponse.responses[track$multiple.index][1] = individualSuccessResponse;
            } //
            else {
                successResponse.responses[track$multiple.index] = individualSuccessResponse;
            }
            if ($multipleHasLoading) {
                let allResponses = successResponse.responses;
                let loading = false;
                if (is$multipleArray) {
                    for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
                        if (allResponses[i].loading) {
                            loading = true;
                            break;
                        }
                    }
                } //
                else if (is$multipleEntriesArray) {
                    for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
                        if (allResponses[i][1].loading) {
                            loading = true;
                            break;
                        }
                    }
                } //
                else {
                    for (let key in allResponses) {
                        if (allResponses[key].loading) {
                            loading = true;
                            break;
                        }
                    }
                }
                successResponse.loading = loading;
            }
        }
        store.set(successResponse);
    })
        .catch(async (error) => {
        if (options?.interceptError) {
            error = await options.interceptError(error, [...path].slice(0, -1).join('.'));
        }
        let errorResponse = {};
        if (is$once) {
            errorResponse = { loading: false, response: undefined, error, success: true };
        } //
        else if (is$revisable) {
            errorResponse = { loading: false, response: undefined, error, success: true };
            errorResponse.call = get(store).call;
        } //
        else if (is$multiple) {
            errorResponse = get(store);
            const individualErrorResponse = {
                loading: false,
                response: undefined,
                error,
                success: true,
                ...$multipleRemoveFn,
                track$multiple
            };
            if (is$multipleEntriesArray) {
                errorResponse.responses[track$multiple.index][1] = individualErrorResponse;
            } //
            else {
                errorResponse.responses[track$multiple.index] = individualErrorResponse;
            }
            if ($multipleHasLoading) {
                let allResponses = errorResponse.responses;
                let loading = false;
                if (is$multipleArray) {
                    for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
                        if (allResponses[i].loading) {
                            loading = true;
                            break;
                        }
                    }
                } //
                else if (is$multipleEntriesArray) {
                    for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
                        if (allResponses[i][1].loading) {
                            loading = true;
                            break;
                        }
                    }
                } //
                else {
                    for (let key in allResponses) {
                        if (allResponses[key].loading) {
                            loading = true;
                            break;
                        }
                    }
                }
                errorResponse.loading = loading;
            }
        }
        store.set(errorResponse);
    });
}
function removeResponse(from, track$multiple, isObject) {
    return function () {
        let storeInner = get(from);
        const index = track$multiple.index;
        if (isObject && storeInner.responses.hasOwnProperty(index)) {
            delete storeInner.responses[index];
        } //
        else if (!!storeInner.responses?.[index]) {
            let allResponses = storeInner.responses;
            const isEntry = Array.isArray(allResponses.splice(index, 1));
            if (isEntry) {
                for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
                    const response = allResponses[i][1];
                    response.track$multiple.index = i;
                    response.remove = removeResponse(from, response.track$multiple, isObject);
                }
            } //
            else {
                for (let i = 0, iLen = allResponses.length; i < iLen; i++) {
                    const response = allResponses[i];
                    response.track$multiple.index = i;
                    response.remove = removeResponse(from, response.track$multiple, isObject);
                }
            }
        }
        from.set(storeInner);
    };
}
const storeClientMethods = {
    $once: function (opts) {
        let store = writable({
            response: undefined,
            loading: true,
            error: false,
            success: false
        });
        callEndpoint({ ...opts, endpointArgs: opts?.args, store });
        return store;
    },
    $revisable: function (opts) {
        let store = writable({
            response: undefined,
            loading: true,
            error: false,
            success: false,
            call: (...endpointArgs) => {
                callEndpoint({ ...opts, endpointArgs, store });
            }
        });
        return store;
    },
    $multiple: function (opts) {
        const { $multipleHasLoading, is$multipleObject } = opts;
        let store = writable({
            ...($multipleHasLoading ? { loading: true } : {}),
            responses: is$multipleObject ? {} : [],
            call: (...endpointArgs) => {
                callEndpoint({ ...opts, endpointArgs, store });
            }
        });
        return store;
    }
};
export { storeClientCreate };
