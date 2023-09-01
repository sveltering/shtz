import { building } from "$app/environment";
import type { AnyRouter } from "@trpc/server";
import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";

import type { LoadClientOpt, LoadCC } from "./types.js";
import type { ServerLoadEvent, LoadEvent } from "@sveltejs/kit";

function loadClientCreate<T extends AnyRouter>(
	options: LoadClientOpt
): LoadCC<T> {
	if (building) {
		return undefined as any as LoadCC<T>;
	}
	const { url, batchLinkOptions, transformer } = options;
	return function (event: ServerLoadEvent | LoadEvent) {
		const { fetch } = event;
		return createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url, fetch })],
			transformer,
		});
	};
}

export { loadClientCreate };
