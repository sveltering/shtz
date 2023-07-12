import type { CreateTRPCProxyClient, createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import type { LoadEvent } from '@sveltejs/kit';
import type { MakeStoreType } from './storeClientCreate.types';
import type { TRPCClientError } from '@trpc/client';
export type Prettify<Obj> = Obj extends object ? {
    [Key in keyof Obj]: Obj[Key];
} : Obj;
export type FunctionType = (...args: any) => any;
export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
export type EndpointReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;
export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any;
type ReplaceFunctionReturnOrUndefined<Fn> = Fn extends (...a: infer A) => Promise<infer R> ? (...a: A) => Promise<R | undefined> : Fn;
type RecursiveReplaceFunctionReturnsOrUndefined<Obj extends object> = {
    [Key in keyof Obj]: Obj[Key] extends Function ? ReplaceFunctionReturnOrUndefined<Obj[Key]> : Obj[Key] extends {
        [Key2: string]: any;
    } ? RecursiveReplaceFunctionReturnsOrUndefined<Obj[Key]> : Obj[Key];
};
export type browserClientOpt = {
    url: string;
    browserOnly?: boolean;
    transformer?: ArgumentTypes<typeof createTRPCProxyClient>[0]['transformer'];
    batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url'>;
};
export type browserClientOptF = browserClientOpt & {
    browserOnly: false;
};
export type browserOCC<T extends AnyRouter> = RecursiveReplaceFunctionReturnsOrUndefined<CreateTRPCProxyClient<T>>;
export type browserFCC<T extends AnyRouter> = CreateTRPCProxyClient<T>;
export interface loadClientOpt extends Omit<browserClientOpt, 'browserOnly'> {
    batchLinkOptions?: Omit<ArgumentTypes<typeof httpBatchLink>[0], 'url' | 'fetch'>;
}
export type loadCC<T extends AnyRouter> = (event: LoadEvent) => CreateTRPCProxyClient<T>;
export type storeClientOpt = Omit<browserClientOpt, 'browserOnly'> & {
    interceptData?: (data: any, path: string) => Promise<{}> | {};
    interceptError?: (error: TRPCClientError<any>, path: string) => Promise<{}> | {};
};
export type storeCC<T extends AnyRouter> = MakeStoreType<CreateTRPCProxyClient<T>>;
export {};
