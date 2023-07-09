import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
function loadClientCreate(options) {
    const { url, batchLinkOptions } = options;
    return function ({ fetch }) {
        //@ts-ignore
        return createTRPCProxyClient({
            links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
        });
    };
}
export { loadClientCreate };
