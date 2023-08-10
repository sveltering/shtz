import type { RequestEvent, ServerLoadEvent } from "@sveltejs/kit";
import type { TRPCOpts, TRPCInner, TRPCErrorOpts, CreateContextType, KeyValueObject } from "./types.js";
import { TRPCError, type AnyRouter } from "@trpc/server";
export declare class TRPC<Ctx extends KeyValueObject, LocalsKey, LocalsType> {
    options: TRPCOpts<Ctx, LocalsKey, LocalsType> & {
        path: string;
        context: CreateContextType<Ctx>;
        localsKey: string;
    };
    _routes?: AnyRouter;
    tRPCInner: TRPCInner<Ctx>;
    localsKeySet: boolean;
    constructor(options?: TRPCOpts<Ctx, LocalsKey, LocalsType>);
    get router(): <TProcRouterRecord extends import("@trpc/server").ProcedureRouterRecord>(procedures: TProcRouterRecord) => import("@trpc/server").CreateRouterInner<import("@trpc/server").RootConfig<{
        ctx: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["ctx"] : object;
        meta: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["meta"] : object;
        errorShape: import("@trpc/server").DefaultErrorShape;
        transformer: import("@trpc/server").DefaultDataTransformer;
    }>, TProcRouterRecord>;
    get middleware(): <TNewParams extends import("@trpc/server").ProcedureParams<import("@trpc/server").AnyRootConfig, unknown, unknown, unknown, unknown, unknown, unknown>>(fn: import("@trpc/server").MiddlewareFunction<{
        _config: import("@trpc/server").RootConfig<{
            ctx: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["ctx"] : object;
            meta: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
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
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["meta"] : object;
    }, TNewParams>) => import("@trpc/server").MiddlewareBuilder<{
        _config: import("@trpc/server").RootConfig<{
            ctx: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["ctx"] : object;
            meta: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
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
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["meta"] : object;
    }, TNewParams>;
    get procedure(): import("@trpc/server").ProcedureBuilder<{
        _config: import("@trpc/server").RootConfig<{
            ctx: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["ctx"] : object;
            meta: import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
                ctx: import("@trpc/server").Unwrap<Ctx>;
            }>["meta"] : object;
            errorShape: import("@trpc/server").DefaultErrorShape;
            transformer: import("@trpc/server").DefaultDataTransformer;
        }>;
        _ctx_out: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["ctx"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["ctx"] : object;
        _input_in: typeof import("@trpc/server").unsetMarker;
        _input_out: typeof import("@trpc/server").unsetMarker;
        _output_in: typeof import("@trpc/server").unsetMarker;
        _output_out: typeof import("@trpc/server").unsetMarker;
        _meta: import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["meta"] extends object ? import("@trpc/server").FlatOverwrite<object, {
            ctx: import("@trpc/server").Unwrap<Ctx>;
        }>["meta"] : object;
    }>;
    get context(): CreateContextType<Ctx>;
    error(message: TRPCErrorOpts): TRPCError;
    error(message: string, code?: TRPCErrorOpts["code"]): TRPCError;
    issue(message: string, path?: string | string[], code?: string): TRPCError;
    issues(issues: {
        message: string;
        path?: string | string[];
        code?: string;
    }[]): TRPCError;
    hookCreate(router: AnyRouter): (event: RequestEvent) => Promise<false | Response>;
    handleFetchCreate(): (request: Request) => Request;
}
export declare const serverClientCreate: <R extends AnyRouter>(t: TRPC<any, any, any>) => (event: RequestEvent | ServerLoadEvent) => Promise<ReturnType<R["createCaller"]>>;
