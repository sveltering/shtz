import type { Writable } from 'svelte/store';

import type { Resolver } from '@trpc/client';
import type { BuildProcedure } from '@trpc/server/src/core/internals/procedureBuilder';
import type { OverwriteKnown } from '@trpc/server/src/core/internals/utils';

type Flatten<T> = T extends object ? { [K in keyof T]: Flatten<T[K]> } : T;
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

export type $revisableStore<V, A extends any[]> = Writable<{
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
type ExtractResolver<Type> = Type extends Resolver<infer X> ? X : never;
type ExtractBuild<Type> = Type extends BuildProcedure<'query', infer X, unknown> ? X : never;
type ExtractoverWrite<Type> = Type extends OverwriteKnown<infer X, unknown> ? X : never;

type ProcedureHasInput<T> = T extends Symbol ? never : T;

type ProcedureInput<Obj extends object> = ProcedureHasInput<
	ExtractoverWrite<ExtractBuild<ExtractResolver<Obj>>>['_input_in']
>;

type Prettify<Obj> = Obj extends object ? { [Key in keyof Obj]: Obj[Key] } : Obj;
type FunctionType = (...args: any) => any;
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;

type NewStoreProcedures2<Fn extends FunctionType, Obj extends object> = Prettify<{
	$once: (...args: ArgumentTypes<Fn>) => $onceStore<AsyncReturnType<Fn>>;
	$revisable: () => $revisableStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
	$multiple: (
		keyFn?: FunctionType
	) => $multipleStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>, number>;
}>;

type ChangeQueriesType2<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? ProcedureInput<Obj[Key]>
	: ChangeAllProcedures2<Obj[Key]>;

type ChangeMutatesType2<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? ProcedureInput<Obj[Key]>
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

type RemoveSubscribeProcedures<
	Obj extends object,
	Key extends keyof Obj
> = Obj[Key] extends FunctionType ? ([Key] extends ['subscribe'] ? never : Key) : Key;
type ChangeAllProcedures2<Obj> = Obj extends object
	? {
			[Key in keyof Obj as RemoveSubscribeProcedures<Obj, Key>]: ChangeProceduresType2<Obj, Key>;
	  }
	: Obj;
export type EndpointsToStore2<T extends object> = ChangeAllProcedures2<T>;
