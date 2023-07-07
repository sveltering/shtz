import type { Writable } from 'svelte/store';
import type { Resolver } from '@trpc/client';
import type { BuildProcedure } from '@trpc/server/src/core/internals/procedureBuilder';
import type { OverwriteKnown } from '@trpc/server/src/core/internals/utils';

type Prettify<Obj> = Obj extends object ? { [Key in keyof Obj]: Obj[Key] } : Obj;
type FunctionType = (...args: any) => any;
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;

export type $onceStore<V> = Writable<
	| {
			//Loading
			loading: true;
			success: false;
			error: false;
			response: undefined;
	  }
	| {
			//Load Successfull
			loading: false;
			success: true;
			error: false;
			response: V;
	  }
	| {
			//Loading Error
			loading: false;
			success: false;
			error: unknown;
			response: undefined;
	  }
>;

export type $manyStore<V, A extends any[]> = Writable<{
	//Loading
	loading: true;
	success: false;
	error: false;
	response: undefined;
	call: (...args: A) => undefined;
}>;

type $multipleResponses<V, K> = K extends string
	? Writable<{ [key: string]: $onceStore<V> }>
	: K extends number
	? Writable<$onceStore<V>[]>
	: never;

export type $multipleStore<V, A extends any[], K> = Writable<{
	loading: true;
	responses: $multipleResponses<V, K>;
	call: (...args: A) => undefined;
}>;

/*
 *
 *
 *
 *
 *
 *
 *
 * Standard
 */

type FunctionTypeArg<T> = (arg: T) => string;

type NewStoreProcedures<Fn extends FunctionType, Obj extends object> = Prettify<{
	$once: (...args: ArgumentTypes<Fn>) => $onceStore<AsyncReturnType<Fn>>;
	$many: () => $manyStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
	$multiple: (
		keyFn?: FunctionTypeArg<Obj['query']['_input_in']>
	) => $multipleStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>, number>;
}>;

type ChangeQueriesType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? NewStoreProcedures<Obj[Key], Obj>
	: ChangeAllProcedures<Obj[Key]>;

type ChangeMutatesType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? NewStoreProcedures<Obj[Key], Obj>
	: ChangeAllProcedures<Obj[Key]>;

type ChangeProceduresType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? [Key] extends ['query']
		? ChangeQueriesType<Obj, Key>
		: [Key] extends ['mutate']
		? ChangeMutatesType<Obj, Key>
		: ChangeAllProcedures<Obj[Key]>
	: ChangeAllProcedures<Obj[Key]>;

type RemoveSubscribeProcedures<
	Obj extends object,
	Key extends keyof Obj
> = Obj[Key] extends FunctionType ? ([Key] extends ['subscribe'] ? never : Key) : Key;

type ChangeAllProcedures<Obj> = Obj extends object
	? {
			[Key in keyof Obj as RemoveSubscribeProcedures<Obj, Key>]: ChangeProceduresType<Obj, Key>;
	  }
	: Obj;

export type EndpointsToStore<T extends object> = ChangeAllProcedures<T>;
/*
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 *
 */
// type help = {
// 	query: Resolver<
// 		BuildProcedure<
// 			'query',
// 			{
// 				_config: RootConfig<{
// 					ctx: {
// 						welcome: string;
// 						isSignedIn: boolean | undefined;
// 					};
// 					meta: object;
// 					errorShape: DefaultErrorShape;
// 					transformer: DefaultDataTransformer;
// 				}>;
// 				_meta: object;
// 				_ctx_out: {
// 					welcome: string;
// 					isSignedIn: boolean | undefined;
// 				};
// 				_input_in: {
// 					name: string;
// 				};
// 				_input_out: {
// 					name: string;
// 				};
// 				_output_in: typeof unsetMarker;
// 				_output_out: typeof unsetMarker;
// 			},
// 			string
// 		>
// 	>;
// };
type extractResolver<Type> = Type extends Resolver<infer X> ? X : never;
type extractBuild<Type> = Type extends BuildProcedure<'query', infer X, unknown> ? X : never;
type extractoverWrite<Type> = Type extends OverwriteKnown<infer X, unknown> ? X : never;

type NewStoreProcedures2<Fn extends FunctionType, Obj extends object> = Prettify<{
	$once: (...args: ArgumentTypes<Fn>) => $onceStore<AsyncReturnType<Fn>>;
	$many: () => $manyStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
	$multiple: (
		keyFn?: FunctionTypeArg<Obj['query']['_input_in']>
	) => $multipleStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>, number>;
}>;

type ChangeQueriesType2<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? extractoverWrite<extractBuild<extractResolver<Obj[Key]>>>['_input_in']
	: ChangeAllProcedures2<Obj[Key]>;

type ChangeMutatesType2<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? NewStoreProcedures2<Obj[Key], Obj>
	: ChangeAllProcedures2<Obj[Key]>;

type ChangeProceduresType2<
	Obj extends object,
	Key extends keyof Obj
> = Obj[Key] extends FunctionType
	? [Key] extends ['query']
		? ChangeQueriesType2<Obj, Key>
		: [Key] extends ['mutate']
		? ChangeMutatesType2<Obj, Key>
		: ChangeAllProcedures2<Obj[Key]>
	: ChangeAllProcedures2<Obj[Key]>;

type ChangeAllProcedures2<Obj> = Obj extends object
	? {
			[Key in keyof Obj as RemoveSubscribeProcedures<Obj, Key>]: ChangeProceduresType2<Obj, Key>;
	  }
	: Obj;
export type EndpointsToStore2<T extends object> = ChangeAllProcedures2<T>;
