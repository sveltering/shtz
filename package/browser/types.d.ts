import type { CreateTRPCProxyClient, createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AnyRouter } from "@trpc/server";
import type { ServerLoadEvent, LoadEvent } from "@sveltejs/kit";
import type { MakeStoreType } from "./storeClientCreate.types.js";
import type { TRPCClientError } from "@trpc/client";
import type { ArgumentTypes } from "../types.js";
type TransformerOpts = ArgumentTypes<typeof createTRPCProxyClient>[0]["transformer"];
type BatchLinkOptions = Omit<ArgumentTypes<typeof httpBatchLink>[0], "url">;
type AllClientOpts = {
    url: string;
    transformer?: TransformerOpts;
    batchLinkOptions?: BatchLinkOptions;
};
type ReplaceFunctionReturnOrUndefined<Fn> = Fn extends (...a: infer A) => Promise<infer R> ? (...a: A) => Promise<R | undefined> : Fn;
type ChangeReturns<Obj extends object> = {
    [Key in keyof Obj]: Obj[Key] extends Function ? ReplaceFunctionReturnOrUndefined<Obj[Key]> : Obj[Key] extends {
        [Key2: string]: any;
    } ? ChangeReturns<Obj[Key]> : Obj[Key];
};
export type BrowserClientOpt = AllClientOpts & {
    browserOnly?: boolean;
};
export type BrowserClientOptF = AllClientOpts & {
    browserOnly: false;
};
export type BrowserOCC<T extends AnyRouter> = ChangeReturns<CreateTRPCProxyClient<T>>;
export type BrowserACC<T extends AnyRouter> = CreateTRPCProxyClient<T>;
type LoadBatchLinkOptions = Omit<ArgumentTypes<typeof httpBatchLink>[0], "url" | "fetch">;
export type LoadClientOpt = AllClientOpts & {
    batchLinkOptions?: LoadBatchLinkOptions;
};
export type LoadCC<T extends AnyRouter> = (event: ServerLoadEvent | LoadEvent) => CreateTRPCProxyClient<T>;
export type StoreClientOpt = AllClientOpts & {
    interceptData?: (data: any, path: string) => Promise<{}> | {};
    interceptError?: (error: TRPCClientError<any>, path: string) => Promise<{}> | {};
};
export type StoreCC<T extends AnyRouter> = MakeStoreType<CreateTRPCProxyClient<T>>;
export {};
