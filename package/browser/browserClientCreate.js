import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
function browserClientCreate(options) {
    const { url, batchLinkOptions, browserOnly, transformer } = options;
    if (browserOnly !== false && typeof window === "undefined") {
        return browserPseudoClient();
    }
    return createTRPCProxyClient({
        links: [httpBatchLink({ ...batchLinkOptions, url })],
        transformer: transformer,
    });
}
function noop() { }
function browserPseudoClient() {
    return new Proxy(noop, { get: () => browserPseudoClient(), apply: noop });
}
export { browserClientCreate };
