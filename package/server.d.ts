import type { RequestEvent } from '@sveltejs/kit';
import { initTRPC, TRPCError, type AnyRouter } from '@trpc/server';
import { resolveHTTPResponse } from '@trpc/server/http';
import type { HTTPResponse } from '@trpc/server/dist/http/internals/types';
type keyValueType = {
    [key: string]: any;
};
type pipeType = false | keyValueType;
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
type SyncReturnType<T extends Function> = T extends (...args: any) => infer R ? R : any;
type createContextType<T> = (event?: RequestEvent, pipe?: pipeType) => Promise<T> | T;
type TRPCErrorOpts = ConstructorParameters<typeof TRPCError>[0];
interface TRPCOptions_I<T> {
    path: string;
    origin?: string;
    bypassOrigin?: string;
    context?: createContextType<T>;
    beforeResolve?: (event: RequestEvent, pipe: pipeType) => any;
    resolveError?: (event: RequestEvent, pipe: pipeType) => any;
    beforeResponse?: (event: RequestEvent, pipe: pipeType, result: HTTPResponse) => any;
    resolveOptions?: ArgumentTypes<typeof resolveHTTPResponse>[0];
    createOptions?: ArgumentTypes<typeof initTRPC.create>[0];
    locals?: 'always' | 'callable' | 'never';
    localsKey?: string;
}
interface TRPCOptionsFinal_I<T> {
    context: createContextType<T>;
}
export declare class TRPC<T extends object> {
    options: TRPCOptions_I<T> & TRPCOptionsFinal_I<T>;
    tRPCInner: SyncReturnType<SyncReturnType<typeof initTRPC.context<T>>['create']>;
    _routes?: AnyRouter;
    constructor(options: TRPCOptions_I<T>);
    get router(): <TProcRouterRecord extends import("@trpc/server").ProcedureRouterRecord>(procedures: TProcRouterRecord) => import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["ctx"] : object;
        meta: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["meta"] : object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, TProcRouterRecord>;
    get middleware(): <TNewParams extends import("@trpc/server").ProcedureParams<import("@trpc/server").AnyRootConfig, unknown, unknown, unknown, unknown, unknown, unknown>>(fn: import("@trpc/server").MiddlewareFunction<{
        _config: import("@trpc/server").RootConfig<{
            ctx: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["ctx"] : object;
            meta: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["meta"] : object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _ctx_out: {};
        _input_out: unknown;
        _input_in: unknown;
        _output_in: unknown;
        _output_out: unknown;
        _meta: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["meta"] : object;
    }, TNewParams>) => import("@trpc/server").MiddlewareBuilder<{
        _config: import("@trpc/server").RootConfig<{
            ctx: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["ctx"] : object;
            meta: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["meta"] : object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _ctx_out: {};
        _input_out: unknown;
        _input_in: unknown;
        _output_in: unknown;
        _output_out: unknown;
        _meta: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["meta"] : object;
    }, TNewParams>;
    get procedure(): import("@trpc/server").ProcedureBuilder<{
        _config: import("@trpc/server").RootConfig<{
            ctx: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["ctx"] : object;
            meta: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<T>;
            }>["meta"] : object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _ctx_out: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["ctx"] : object;
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
        _meta: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<T>;
        }>["meta"] : object;
    }>;
    get context(): createContextType<T>;
    error(message: string | TRPCErrorOpts, code?: TRPCErrorOpts['code']): TRPCError;
    set routes(routes: AnyRouter);
    hook(router: AnyRouter): (event: RequestEvent) => Promise<false | Response>;
    handleFetch(): (request: Request) => Request;
}
export declare const asyncServerClientCreate: <R extends AnyRouter>(t: TRPC<any>) => (event: RequestEvent) => Promise<ReturnType<R["createCaller"]>>;
export declare const syncServerClientCreate: <R extends AnyRouter>(t: TRPC<any>) => (event: RequestEvent) => ReturnType<R["createCaller"]>;
export {};
