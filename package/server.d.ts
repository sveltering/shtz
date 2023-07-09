import type { RequestEvent } from '@sveltejs/kit';
import type { TRPCOpts, TRPCContextFn, TRPCInner, TRPCErrorOpts } from './types';
import { TRPCError, type AnyRouter } from '@trpc/server';
export declare class TRPC<T extends object> {
    options: TRPCOpts<T> & TRPCContextFn<T>;
    tRPCInner: TRPCInner<T>;
    _routes?: AnyRouter;
    constructor(options: TRPCOpts<T>);
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
    get context(): import("./types").createContextType<T>;
    error(message: string | TRPCErrorOpts, code?: TRPCErrorOpts['code']): TRPCError;
    set routes(routes: AnyRouter);
    hook(router: AnyRouter): (event: RequestEvent) => Promise<false | Response>;
    handleFetch(): (request: Request) => Request;
}
export declare const asyncServerClientCreate: <R extends AnyRouter>(t: TRPC<any>) => (event: RequestEvent) => Promise<ReturnType<R["createCaller"]>>;
export declare const syncServerClientCreate: <R extends AnyRouter>(t: TRPC<any>) => (event: RequestEvent) => ReturnType<R["createCaller"]>;
