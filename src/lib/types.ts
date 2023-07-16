import type { RequestEvent } from '@sveltejs/kit';
import type { TRPCError, initTRPC } from '@trpc/server';
import type { HTTPResponse } from '@trpc/server/dist/http/internals/types';
import type { resolveHTTPResponse } from '@trpc/server/http';
import type { TRPC } from './server.js';
export type { HTTPResponse };
/*
 *
 *
 *
 *
 *
 *
 *
 * Utility types
 */

export type FunctionType = (...args: any) => any;

export type AsyncFunctionType = (...args: any) => Promise<any>;

export type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;

export type AsyncReturnType<T extends AsyncFunctionType> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: never;

export type EndpointReturnType<T extends AsyncFunctionType> = AsyncReturnType<T>;

export type Prettify<Obj> = Obj extends object ? { [Key in keyof Obj]: Obj[Key] } : Obj;

export type EmptyObject = { [key: string]: never };

export type Combine<T1, T2> = T2 extends EmptyObject
	? T1
	: T1 extends EmptyObject
	? T2
	: Prettify<T1 & T2>;

export type Union<T1, T2> = T2 extends EmptyObject
	? T1
	: T1 extends EmptyObject
	? T2
	: Prettify<T1 | T2>;

export type FirstNotEmpty<T1 extends {} = {}, T2 extends {} = {}> = T1 extends EmptyObject
	? T2 extends EmptyObject
		? T2
		: T2
	: T1;

// type test = Combine<FirstNotEmpty<{ one: 1 }, { two: 2 }>, { three: 3 }>;

// from https://stackoverflow.com/questions/40510611/typescript-interface-require-one-of-two-properties-to-exist
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
	{
		[K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>;
	}[Keys];
// from https://stackoverflow.com/questions/40510611/typescript-interface-require-one-of-two-properties-to-exist
export type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
	{
		[K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
	}[Keys];

export type RequireAllOrNone<ObjectType, KeysType extends keyof ObjectType = never> = (
	| Required<Pick<ObjectType, KeysType>>
	| Partial<Record<KeysType, never>>
) &
	Omit<ObjectType, KeysType>;

export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

export type ToPromiseUnion<T> = Promise<T> | T;
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
export type KeyValue = Record<string, any>;

type handleFetchBypassOpts = RequireAllOrNone<
	{
		origin: string;
		bypassOrigin: string;
	},
	'origin' | 'bypassOrigin'
>;

type resolveOptions = ArgumentTypes<typeof resolveHTTPResponse>[0];
type createOptions = ArgumentTypes<typeof initTRPC.create>[0];

export type createContextType<Ctx extends KeyValue> = (
	event?: RequestEvent,
	pipe?: false | KeyValue
) => Promise<Ctx>;

type beforeResolve = (arg: {
	dotPath: string;
	event: RequestEvent;
	pipe: KeyValue;
}) => Promise<void | HTTPResponse>;
type beforeResponse = (arg: {
	dotPath: string;
	event: RequestEvent;
	pipe: KeyValue;
	result: HTTPResponse;
}) => Promise<void | HTTPResponse>;

type LocalsAllowedOptions = 'always' | 'callable' | undefined;

type LocalsAllowed<L> = L extends LocalsAllowedOptions ? L : LocalsAllowedOptions;

export type TRPCOpts<Ctx extends KeyValue, LocalsKey, LocalsType> = Prettify<
	{
		path?: string;
		context?: createContextType<Ctx>;
		resolveOptions?: resolveOptions;
		createOptions?: createOptions;
		locals?: LocalsAllowed<LocalsType>;
		localsKey?: StringLiteral<LocalsKey>;
		beforeResolve?: beforeResolve;
		beforeResponse?: beforeResponse;
	} & handleFetchBypassOpts
>;

export type TRPCErrorOpts = ConstructorParameters<typeof TRPCError>[0];

export type TRPCInner<Ctx extends KeyValue> = ReturnType<
	ReturnType<typeof initTRPC.context<Ctx>>['create']
>;

/*
 *
 *
 *
 *
 *
 *
 *
 *  TRPC Locals types
 */
type RoutesType = { createCaller: FunctionType };

type DefaultOrSetKey<T extends TRPC<any, any, any>> = T['options']['localsKey'] extends undefined
	? 'TRPC'
	: T['options']['localsKey'];

type CallerKey<T extends TRPC<any, any, any>> = T['options']['localsKey'] extends undefined
	? T extends TRPC<any, any, infer X>
		? X extends 'always' | 'callable'
			? DefaultOrSetKey<T>
			: never
		: never
	: T['options']['localsKey'];

type CallerType<T extends TRPC<any, any, any>, Caller extends RoutesType> = T extends TRPC<
	any,
	any,
	infer X
>
	? X extends 'always'
		? ReturnType<Caller['createCaller']>
		: X extends 'callable'
		? () => Promise<ReturnType<Caller['createCaller']>>
		: T['options']['localsKey'] extends undefined
		? never
		: ReturnType<Caller['createCaller']>
	: never;

export type TRPCLocalCreate<tRPC extends TRPC<any, any, any>, routes extends RoutesType> = {
	[key in CallerKey<tRPC>]: CallerType<tRPC, routes>;
};
