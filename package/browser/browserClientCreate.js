import { building } from "$app/environment";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";
function browserClientCreate(options) {
    if (building) {
        return undefined;
    }
    const { url, batchLinkOptions, transformer } = options;
    let browserOnly = options?.browserOnly === false ? false : true;
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
