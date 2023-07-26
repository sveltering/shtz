import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
function loadClientCreate(options) {
    const { url, batchLinkOptions, transformer } = options;
    return function (event) {
        const { fetch } = event;
        return createTRPCProxyClient({
            links: [httpBatchLink({ ...batchLinkOptions, url, fetch })],
            transformer,
        });
    };
}
export { loadClientCreate };
