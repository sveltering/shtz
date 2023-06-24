import type { LoadEvent } from '@sveltejs/kit';
import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
interface ClientOptions_I {
    url: string;
    transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
    batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
}
export declare const browserClientCreate: <T extends AnyRouter>(options: ClientOptions_I) => import("@trpc/client").CreateTRPCProxyClient<T>;
interface LClientOptions_I extends ClientOptions_I {
    batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
}
export declare const loadClientCreate: <T extends AnyRouter>(options: LClientOptions_I) => ({ fetch }: LoadEvent) => import("@trpc/client").CreateTRPCProxyClient<T>;
export {};
