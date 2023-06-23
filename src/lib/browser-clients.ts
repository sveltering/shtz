import type { LoadEvent } from '@sveltejs/kit';
import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

interface ClientOptions_I {
	url: string;
	transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
}

export const browserClientCreate = function <T extends AnyRouter>(options: ClientOptions_I) {
	const { url, batchLinkOptions } = options;

	//@ts-ignore
	return createTRPCProxyClient<T>({
		links: [httpBatchLink({ ...batchLinkOptions, url })]
	});
};

interface LClientOptions_I extends ClientOptions_I {
	batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
}

export const loadClientCreate = function <T extends AnyRouter>(options: LClientOptions_I) {
	const { url, batchLinkOptions } = options;

	return function ({ fetch }: LoadEvent) {
		//@ts-ignore
		return createTRPCProxyClient<T>({
			links: [httpBatchLink({ ...batchLinkOptions, url, fetch })]
		});
	};
};
