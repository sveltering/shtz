import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import { writable } from 'svelte/store';
function browserClientCreate(options) {
    const { url, batchLinkOptions, browserOnly } = options;
    if (browserOnly !== false && typeof window === 'undefined') {
        return browserPseudoClient();
    }
    //@ts-ignore
    return createTRPCProxyClient({
        links: [httpBatchLink({ ...batchLinkOptions, url })]
    });
}
function loadClientCreate(options) {
    const { url, batchLinkOptions } = options;
    return function ({ fetch }) {
        //@ts-ignore
        return createTRPCProxyClient({
            links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
        });
    };
}
function storeClientCreate(options) {
    const { url, batchLinkOptions, always = false } = options;
    if (typeof window === 'undefined') {
        return storePseudoClient(always);
    }
    return outerProxy(
    //@ts-ignore
    createTRPCProxyClient({
        links: [httpBatchLink({ ...batchLinkOptions, url })]
    }), [], options);
}
function noop() { }
function browserPseudoClient() {
    return new Proxy(noop, { get: () => browserPseudoClient() });
}
function storePseudoClient(always) {
    if (always) {
        return new Proxy(noop, {
            get: () => storePseudoClient(always),
            apply: () => writable({
                loading: true,
                error: false,
                success: false,
                response: undefined,
                message: undefined
            })
        });
    }
    return new Proxy(noop, {
        get: () => storePseudoClient(always),
        apply: () => writable({ loading: true, error: false, success: false })
    });
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
            for (let i = 0, iLen = path.length; i < iLen; i++) {
                endpoint = endpoint[path[i]];
            }
            if (options?.always === true) {
                let store = writable({
                    loading: true,
                    error: false,
                    success: false,
                    response: undefined,
                    message: undefined
                });
                endpoint(...args)
                    .then(async (response) => {
                    if (options?.interceptResponse) {
                        response = await options.interceptResponse(response, [...path].slice(0, -1).join('.'));
                    }
                    store.set({
                        loading: false,
                        response,
                        error: false,
                        success: true,
                        message: undefined
                    });
                })
                    .catch(async (message) => {
                    if (options?.interceptError) {
                        message = await options.interceptError(message, [...path].slice(0, -1).join('.'));
                    }
                    store.set({
                        loading: false,
                        error: true,
                        message,
                        success: false,
                        response: undefined
                    });
                });
                return store;
            }
            let store = writable({
                loading: true,
                error: false,
                success: false
            });
            endpoint(...args)
                .then(async (response) => {
                if (options?.interceptResponse) {
                    response = await options.interceptResponse(response, [...path].slice(0, -1).join('.'));
                }
                store.set({ loading: false, response, error: false, success: true });
            })
                .catch(async (message) => {
                if (options?.interceptError) {
                    message = await options.interceptError(message, [...path].slice(0, -1).join('.'));
                }
                store.set({ loading: false, error: true, message, success: false });
            });
            return store;
        }
    });
    return proxy;
}
export { browserClientCreate, storeClientCreate, loadClientCreate };
