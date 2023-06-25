import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
function browserClientCreate(options) {
    const { url, batchLinkOptions, browserOnly } = options;
    let onlyBrowser = browserOnly === false ? false : true;
    if (onlyBrowser && typeof window === 'undefined') {
        return new Proxy({}, handlers);
    }
    //@ts-ignore
    return createTRPCProxyClient({
        links: [httpBatchLink({ ...batchLinkOptions, url })]
    });
}
export { browserClientCreate };
export const loadClientCreate = function (options) {
    const { url, batchLinkOptions } = options;
    return function ({ fetch }) {
        //@ts-ignore
        return createTRPCProxyClient({
            links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
        });
    };
};
const handlers = {
    get: (target, name) => {
        const prop = target[name];
        return new Proxy(function () {
            return undefined;
        }, handlers);
    }
};
