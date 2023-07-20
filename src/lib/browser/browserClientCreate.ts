import type { AnyRouter } from "@trpc/server";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

import type { BrowserClientOpt, BrowserClientOptF, BrowserACC, BrowserOCC } from "./types.js";

function browserClientCreate<T extends AnyRouter>(options: BrowserClientOptF): BrowserACC<T>; //browser and server
function browserClientCreate<T extends AnyRouter>(options: BrowserClientOpt): BrowserOCC<T>; //browser only
function browserClientCreate<T extends AnyRouter>(options: BrowserClientOpt) {
    const { url, batchLinkOptions, browserOnly, transformer } = options;

    if (browserOnly !== false && typeof window === "undefined") {
        return browserPseudoClient();
    }
    return createTRPCProxyClient<T>({
        links: [httpBatchLink({ ...batchLinkOptions, url })],
        transformer: transformer,
    });
}

function noop() {}

function browserPseudoClient(): any {
    return new Proxy(noop, { get: () => browserPseudoClient(), apply: noop });
}

export { browserClientCreate };
