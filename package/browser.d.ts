import type { LoadEvent } from '@sveltejs/kit';
import type { AnyRouter } from '@trpc/server';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
type ReplaceFunctionReturn<Fn> = Fn extends (...a: infer A) => Promise<infer R> ? (...a: A) => Promise<R | undefined> : Fn;
type RecursiveReplaceFunctionReturns<Obj extends object> = {
    [Key in keyof Obj]: Obj[Key] extends Function ? ReplaceFunctionReturn<Obj[Key]> : Obj[Key] extends {
        [Key2: string]: any;
    } ? RecursiveReplaceFunctionReturns<Obj[Key]> : Obj[Key];
};
export type EndpointReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;
interface ClientOptions_I {
    url: string;
    browserOnly?: boolean;
    transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
    batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
}
interface ClientOptions_I_not_browserOnly extends ClientOptions_I {
    browserOnly: false;
}
type browserOnlyClientCreateType<T extends AnyRouter> = RecursiveReplaceFunctionReturns<ReturnType<typeof createTRPCProxyClient<T>>>;
type browserClientCreateType<T extends AnyRouter> = ReturnType<typeof createTRPCProxyClient<T>>;
declare function browserClientCreate<T extends AnyRouter>(options: ClientOptions_I_not_browserOnly): browserClientCreateType<T>;
declare function browserClientCreate<T extends AnyRouter>(options: ClientOptions_I): browserOnlyClientCreateType<T>;
export { browserClientCreate };
interface LClientOptions_I extends Omit<ClientOptions_I, 'browserOnly'> {
    batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
}
export declare const loadClientCreate: <T extends AnyRouter>(options: LClientOptions_I) => ({ fetch }: LoadEvent) => import("@trpc/client").CreateTRPCProxyClient<T>;
