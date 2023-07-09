import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
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
function noop() { }
function browserPseudoClient() {
    return new Proxy(noop, { get: () => browserPseudoClient() });
}
export { browserClientCreate };
