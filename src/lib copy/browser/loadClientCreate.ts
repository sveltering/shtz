import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

import type { loadClientOpt, loadCC } from './types';

function loadClientCreate<T extends AnyRouter>(options: loadClientOpt): loadCC<T> {
	const { url, batchLinkOptions } = options;
	return function ({ fetch }) {
		//@ts-ignore
		return createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
		});
	};
}

export { loadClientCreate };
