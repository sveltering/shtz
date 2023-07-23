import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
function browserClientCreate(options) {
    const { url, batchLinkOptions, browserOnly, transformer } = options;
    if (browserOnly === true && !isBrowser) {
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
