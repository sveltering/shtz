import type { Writable } from 'svelte/store';

import type { Resolver } from '@trpc/client';
import type { BuildProcedure } from '@trpc/server/src/core/internals/procedureBuilder';
import type { OverwriteKnown } from '@trpc/server/src/core/internals/utils';

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

type $onceStoreInner<V> =
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
	  };

export type $onceStore<V> = Writable<$onceStoreInner<V>>;

export type $revisableStore<V, A extends any[]> = Writable<{
	//Loading
	loading: true;
	success: false;
	error: false;
	response: undefined;
	call: (...args: A) => undefined;
}>;

export type $multipleStore<V, A extends any[], K> = K extends string
	? Writable<{
			loading: true;
			responses: { [key: string]: $onceStoreInner<V> };
			call: (...args: A) => undefined;
	  }>
	: Writable<{
			loading: true;
			responses: $onceStoreInner<V>[];
			call: (...args: A) => undefined;
	  }>;

export type $multipleStoreObject<V, A extends any[]> = Writable<{
	loading: true;
	responses: { [key: string]: $onceStoreInner<V> };
	call: (...args: A) => undefined;
}>;
export type $multipleStoreArray<V, A extends any[]> = Writable<{
	loading: true;
	responses: $onceStoreInner<V>[];
	call: (...args: A) => undefined;
}>;

export type $multipleStoreArrayEntries<V, A extends any[]> = Writable<{
	loading: true;
	responses: [string, $onceStoreInner<V>][];
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

interface $multipleOpts<Fn extends FunctionType> {
	(): $multipleStoreArray<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
	(keyFn: (input: ProcedureInput<Fn>) => string): $multipleStoreObject<
		AsyncReturnType<Fn>,
		ArgumentTypes<Fn>
	>;
	(opts: { loading?: boolean; removeable?: boolean }): $multipleStoreArray<
		AsyncReturnType<Fn>,
		ArgumentTypes<Fn>
	>;
	(opts: {
		loading?: boolean;
		removeable?: boolean;
		entries?: false;
		key: (input: ProcedureInput<Fn>) => string;
	}): $multipleStoreObject<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
	(opts: {
		loading?: boolean;
		removeable?: boolean;
		entries?: true;
		key: (input: ProcedureInput<Fn>) => string;
	}): $multipleStoreArrayEntries<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
}

type NewStoreProcedures<Fn extends FunctionType, Obj extends object> = Prettify<{
	$once: (...args: ArgumentTypes<Fn>) => $onceStore<AsyncReturnType<Fn>>;
	$revisable: () => $revisableStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
	$multiple: $multipleOpts<Fn>;
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
