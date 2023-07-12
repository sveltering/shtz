import type { RequestEvent } from '@sveltejs/kit';
import type { TRPCError, initTRPC } from '@trpc/server';
import type { HTTPResponse } from '@trpc/server/dist/http/internals/types';
import type { resolveHTTPResponse } from '@trpc/server/http';

/*
 *
 *
 *
 *
 *
 *
 *
 * Functional types
 */

export type FunctionType = (...args: any) => any;

export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

export type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;

export type Prettify<Obj> = Obj extends object ? { [Key in keyof Obj]: Obj[Key] } : Obj;

type MaxOne<T> = {
	[K in keyof T]: Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>>;
}[keyof T] extends infer O
	? { [K in keyof O]: O[K] }
	: never;
export type RequireAllOrNone<ObjectType, KeysType extends keyof ObjectType = never> = (
	| Required<Pick<ObjectType, KeysType>>
	| Partial<Record<KeysType, never>>
) &
	Omit<ObjectType, KeysType>;

/*
 *
 *
 *
 *
 *
 *
 *
 *  TRPC types
 */
export type pipeType = { [key: string]: any };

export type contextPipeType = false | pipeType;

export type createContextType<T> = (event?: RequestEvent, pipe?: contextPipeType) => Promise<T> | T;

type handleFetchBypassOpts = RequireAllOrNone<
	{
		origin: string;
		bypassOrigin: string;
	},
	'origin' | 'bypassOrigin'
>;

type beforeResolve<R> = (arg: { path: string; event: RequestEvent; pipe: pipeType }) => R;
type beforeResponse<R> = (arg: {
	path: string;
	event: RequestEvent;
	pipe: pipeType;
	result: HTTPResponse;
}) => R;

export type TRPCOpts<T> = Prettify<
	{
		path: string;
		context?: createContextType<T>;
		resolveOptions?: ArgumentTypes<typeof resolveHTTPResponse>[0];
		createOptions?: ArgumentTypes<typeof initTRPC.create>[0];
		locals?: 'always' | 'callable';
		localsKey?: string;
	} & handleFetchBypassOpts &
		MaxOne<{
			beforeResolveSync?: beforeResolve<void | HTTPResponse>;
			beforeResolve?: beforeResolve<Promise<void | HTTPResponse>>;
		}> &
		MaxOne<{
			beforeResponseSync?: beforeResponse<void | HTTPResponse>;
			beforeResponse?: beforeResponse<Promise<void | HTTPResponse>>;
		}>
>;

export type TRPCContextFn<T> = {
	context: createContextType<T>;
};

export type TRPCErrorOpts = ConstructorParameters<typeof TRPCError>[0];

export type TRPCInner<T extends {}> = ReturnType<ReturnType<typeof initTRPC.context<T>>['create']>;
