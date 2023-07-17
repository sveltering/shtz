import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import type { loadClientOpt, loadCC } from './types.js';

function loadClientCreate<T extends AnyRouter>(options: loadClientOpt): loadCC<T> {
	const { url, batchLinkOptions, transformer } = options;
	return function ({ fetch }) {
		return createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url, fetch })],
			transformer: transformer
		});
	};
}

export { loadClientCreate };
