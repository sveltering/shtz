import type { Writable } from 'svelte/store';

import type { Resolver, TRPCClientError } from '@trpc/client';
import type { BuildProcedure } from '@trpc/server/src/core/internals/procedureBuilder';
import type { OverwriteKnown } from '@trpc/server/src/core/internals/utils';

import type {
	storeClientOpt,
	ArgumentTypes,
	FunctionType,
	Prettify,
	AsyncReturnType
} from './types';

type ExtractResolver<Type> = Type extends Resolver<infer X> ? X : never;
type ExtractBuild<Type> = Type extends BuildProcedure<'query' | 'mutation', infer X, unknown>
	? X
	: never;
type ExtractOverwrite<Type> = Type extends OverwriteKnown<infer X, unknown> ? X : never;
type ProcedureHasInput<T> = T extends Symbol ? never : T;
type ProcedureInput<Obj extends object> = ProcedureHasInput<
	ExtractOverwrite<ExtractBuild<ExtractResolver<Obj>>>['_input_in']
>;

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

type staleInner = {
	loading: false;
	success: false;
	error: false;
	data: undefined;
};

type $revisableStoreInner<V, A extends any[]> = ($onceStoreInner<V> | staleInner) & {
	call: (...args: A) => undefined;
};

type $multipleStoreInner<V, Rb extends boolean> = ($onceStoreInner<V> | staleInner) &
	(Rb extends true
		? {
				remove: () => void;
		  }
		: {});

export type $onceStore<V> = Writable<$onceStoreInner<V>>;

export type $revisableStore<V, A extends any[]> = Writable<$revisableStoreInner<V, A>>;

export type $multipleStore<V, A extends any[], Lb extends boolean, Rb extends boolean> =
	| $multipleStoreObject<V, A, Lb, Rb>
	| $multipleStoreArray<V, A, Lb, Rb>
	| $multipleStoreArrayEntries<V, A, any, Lb, Rb>;

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

export type $methodOpts = {
	method: string;
	endpoint: CallableFunction;
	args: any[];
	options: storeClientOpt;
	path: string[];
	is$once: true | false;
	is$revisable: true | false;
	is$multiple: true | false;
	is$multipleArray: true | false;
	is$multipleEntriesArray: true | false;
	is$multipleObject: true | false;
	$multipleGetKeyFn: undefined | FunctionType;
	$multipleGetEntryFn: undefined | FunctionType;
	$multipleHasLoading: true | false;
	$multipleHasRemove: true | false;
};

export type callEndpointOpts = $methodOpts & {
	endpointArgs: any[];
	store: $onceStore<any> | $revisableStore<any, any[]> | $multipleStore<any, any[], any, any>;
};
