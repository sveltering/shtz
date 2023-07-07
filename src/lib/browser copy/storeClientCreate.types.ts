import type { Writable } from 'svelte/store';

type FunctionType = (...args: any) => any;
type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any ? A : never;
type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (
	...args: any
) => Promise<infer R>
	? R
	: any;

type storeResponseValue<V> = Writable<
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

type ChangeQueriesType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? (...args: ArgumentTypes<Obj[Key]>) => storeResponseValue<AsyncReturnType<Obj[Key]>>
	: ChangeAllProcedures<Obj[Key]>;

type ChangeMutatesType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? ReturnType<Obj[Key]>
	: ChangeAllProcedures<Obj[Key]>;

type ChangeKeyNames<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? [Key] extends ['subscribe']
		? never
		: [Key] extends ['query']
		? '$query'
		: [Key] extends ['mutate']
		? '$mutate'
		: Key
	: Key;

type ChangeProceduresType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? [Key] extends ['query']
		? ChangeQueriesType<Obj, Key>
		: [Key] extends ['mutate']
		? ChangeMutatesType<Obj, Key>
		: ChangeAllProcedures<Obj[Key]>
	: ChangeAllProcedures<Obj[Key]>;

/*
 *
 *
 *
 *
 *
 *
 *
 * Store
 */
type AddQueriesStoreType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? '$store'
	: never;

type AddMutatesStoreType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? '$store'
	: never;

type AddKeyNamesStore<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? [Key] extends ['subscribe']
		? never
		: [Key] extends ['query']
		? '$store'
		: [Key] extends ['mutate']
		? '$store'
		: never
	: never;

type AddProceduresStoreType<
	Obj extends object,
	Key extends keyof Obj
> = Obj[Key] extends FunctionType
	? [Key] extends ['query']
		? AddQueriesStoreType<Obj, Key>
		: [Key] extends ['mutate']
		? AddMutatesStoreType<Obj, Key>
		: never
	: never;

/*
 *
 *
 *
 *
 *
 *
 *
 * Multiple store
 */
type AddQueriesMStoreType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? '$mstore'
	: never;

type AddMutatesMStoreType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? '$mstore'
	: never;

type AddKeyNamesMStore<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType
	? [Key] extends ['subscribe']
		? never
		: [Key] extends ['query']
		? '$mstore'
		: [Key] extends ['mutate']
		? '$mstore'
		: never
	: never;

type AddProceduresMStoreType<
	Obj extends object,
	Key extends keyof Obj
> = Obj[Key] extends FunctionType
	? [Key] extends ['query']
		? AddQueriesMStoreType<Obj, Key>
		: [Key] extends ['mutate']
		? AddMutatesMStoreType<Obj, Key>
		: never
	: never;

type PrettyMerge<Obj> = Obj extends object
	? {
			[Key in keyof Obj]: Obj[Key];
	  }
	: Obj;

type ChangeAllProcedures<Obj> = Obj extends object
	? PrettyMerge<
			{
				[Key in keyof Obj as ChangeKeyNames<Obj, Key>]: ChangeProceduresType<Obj, Key>;
			} & {
				[Key in keyof Obj as AddKeyNamesStore<Obj, Key>]: AddProceduresStoreType<Obj, Key>;
			} & {
				[Key in keyof Obj as AddKeyNamesMStore<Obj, Key>]: AddProceduresMStoreType<Obj, Key>;
			}
	  >
	: Obj;

export type EndpointsToStore<T extends object> = ChangeAllProcedures<T>;
