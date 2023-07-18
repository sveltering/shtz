import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import type { loadClientOpt, loadCC } from './types.js';
import type { ServerLoadEvent, LoadEvent } from '@sveltejs/kit';

function loadClientCreate<T extends AnyRouter>(options: loadClientOpt): loadCC<T> {
	const { url, batchLinkOptions, transformer } = options;
	return function (event: ServerLoadEvent | LoadEvent) {
		const { fetch } = event;
		return createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url, fetch: fetch })],
			transformer: transformer
		});
	};
}

export { loadClientCreate };
