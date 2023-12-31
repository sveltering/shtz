import { building } from "$app/environment";
import type { AnyRouter } from "@trpc/server";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

import type {
	BrowserClientOpt,
	BrowserClientOptF,
	BrowserACC,
	BrowserOCC,
} from "./types.js";

const isBrowser =
	typeof window !== "undefined" && typeof window.document !== "undefined";

function browserClientCreate<T extends AnyRouter>(
	options: BrowserClientOptF
): BrowserACC<T>; //browser and server
function browserClientCreate<T extends AnyRouter>(
	options: BrowserClientOpt
): BrowserOCC<T>; //browser only
function browserClientCreate<T extends AnyRouter>(options: BrowserClientOpt) {
	if (building) {
		return undefined as any as BrowserACC<T>;
	}
	const { url, batchLinkOptions, transformer } = options;
	let browserOnly = options?.browserOnly === false ? false : true;
	if (browserOnly === true && !isBrowser) {
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
