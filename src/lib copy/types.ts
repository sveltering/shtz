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
export type pipeType = false | { [key: string]: any };
export type FnsArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
export type SyncFnsReturnType<T extends Function> = T extends (...args: any) => infer R ? R : any;

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
export type createContextType<T> = (event?: RequestEvent, pipe?: pipeType) => Promise<T> | T;

type handleFetchBypassOpts = RequireAllOrNone<
	{
		origin: string;
		bypassOrigin: string;
	},
	'origin' | 'bypassOrigin'
>;

export type TRPCOpts<T> = {
	path: string;
	context?: createContextType<T>;
	beforeResolve?: (event: RequestEvent, pipe: pipeType) => any;
	resolveError?: (event: RequestEvent, pipe: pipeType) => any;
	beforeResponse?: (event: RequestEvent, pipe: pipeType, result: HTTPResponse) => any;
	resolveOptions?: FnsArgumentTypes<typeof resolveHTTPResponse>[0];
	createOptions?: FnsArgumentTypes<typeof initTRPC.create>[0];
	locals?: 'always' | 'callable';
	localsKey?: string;
} & handleFetchBypassOpts;

export type TRPCContextFn<T> = {
	context: createContextType<T>;
};

export type TRPCErrorOpts = ConstructorParameters<typeof TRPCError>[0];

export type TRPCInner<T extends {}> = SyncFnsReturnType<
	SyncFnsReturnType<typeof initTRPC.context<T>>['create']
>;
