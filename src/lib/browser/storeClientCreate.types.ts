import type { Writable } from 'svelte/store';

import type { Resolver, TRPCClientError } from '@trpc/client';
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
export type FunctionType = (...args: any) => any;
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
			data: undefined;
	  }
	| {
			//Load Successfull
			loading: false;
			success: true;
			error: false;
			data: V;
	  }
	| {
			//Loading Error
			loading: false;
			success: false;
			error: TRPCClientError<any>;
			data: undefined;
	  };

type $multipleStoreInner<V, Rb extends boolean> = Prettify<
	Rb extends true
		? $onceStoreInner<V> & {
				remove: () => void;
		  }
		: $onceStoreInner<V>
>;

export type $onceStore<V> = Writable<$onceStoreInner<V>>;

export type $revisableStore<V, A extends any[]> = Writable<{
	//Loading
	loading: boolean;
	success: false;
	error: false;
	data: undefined;
	call: (...args: A) => undefined;
}>;

export type $multipleStore<V, A extends any[], K> = K extends string
	? Writable<{
			loading?: boolean;
			responses: { [key: string]: $onceStoreInner<V> };
			call: (...args: A) => undefined;
	  }>
	: Writable<{
			loading?: boolean;
			responses: $onceStoreInner<V>[];
			call: (...args: A) => undefined;
	  }>;

type $multipleStoreWritableMake<Resp, A extends any[], L> = L extends true
	? Writable<{
			loading: true;
			responses: Resp;
			call: (...args: A) => undefined;
	  }>
	: Writable<{
			responses: Resp;
			call: (...args: A) => undefined;
	  }>;

export type $multipleStoreObject<
	V,
	A extends any[],
	Lb extends boolean,
	Rb extends boolean
> = $multipleStoreWritableMake<{ [key: string]: $multipleStoreInner<V, Rb> }, A, Lb>;

export type $multipleStoreArray<
	V,
	A extends any[],
	Lb extends boolean,
	Rb extends boolean
> = $multipleStoreWritableMake<$multipleStoreInner<V, Rb>[], A, Lb>;

export type $multipleStoreArrayEntries<
	V,
	A extends any[],
	X extends any,
	Lb extends boolean,
	Rb extends boolean
> = $multipleStoreWritableMake<[X, $multipleStoreInner<V, Rb>][], A, Lb>;

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

type $onceFnMake<Fn extends FunctionType> = (
	...args: ArgumentTypes<Fn>
) => $onceStore<AsyncReturnType<Fn>>;
type $revisableFnMake<Fn extends FunctionType> = () => $revisableStore<
	AsyncReturnType<Fn>,
	ArgumentTypes<Fn>
>;
interface $multipleFnMake<Fn extends FunctionType> {
	(): $multipleStoreArray<AsyncReturnType<Fn>, ArgumentTypes<Fn>, false, false>;

	<X>(entryFn: (input: ProcedureInput<Fn>) => X): $multipleStoreArrayEntries<
		AsyncReturnType<Fn>,
		ArgumentTypes<Fn>,
		X,
		false,
		false
	>;

	<Lb extends boolean, Rb extends boolean>(opts: {
		loading?: Lb;
		remove?: Rb;
		key: (input: ProcedureInput<Fn>) => string;
	}): $multipleStoreObject<AsyncReturnType<Fn>, ArgumentTypes<Fn>, Lb, Rb>;

	<Lb extends boolean, Rb extends boolean, X>(opts: {
		loading?: Lb;
		remove?: Rb;
		entry: (input: ProcedureInput<Fn>) => X;
	}): $multipleStoreArrayEntries<AsyncReturnType<Fn>, ArgumentTypes<Fn>, X, Lb, Rb>;

	<Lb extends boolean, Rb extends boolean>(opts: {
		loading?: Lb;
		remove?: Rb;
	}): $multipleStoreArray<AsyncReturnType<Fn>, ArgumentTypes<Fn>, Lb, Rb>;
}

type NewStoreProcedures<Fn extends FunctionType> = Prettify<{
	$once: $onceFnMake<Fn>;
	$revisable: $revisableFnMake<Fn>;
	$multiple: $multipleFnMake<Fn>;
}>;

type ChangeQueriesType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? NewStoreProcedures<Obj[Key]>
	: ChangeAllProcedures<Obj[Key]>;

type ChangeMutatesType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? NewStoreProcedures<Obj[Key]>
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
