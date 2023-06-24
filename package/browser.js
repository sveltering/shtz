import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
export const browserClientCreate = function (options) {
    const { url, batchLinkOptions } = options;
    //@ts-ignore
    return createTRPCProxyClient({
        links: [httpBatchLink({ ...batchLinkOptions, url })]
    });
};
export const loadClientCreate = function (options) {
    const { url, batchLinkOptions } = options;
    return function ({ fetch }) {
        //@ts-ignore
        return createTRPCProxyClient({
            links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
        });
    };
};
