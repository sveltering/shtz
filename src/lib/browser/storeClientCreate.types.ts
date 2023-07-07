import type { Writable } from 'svelte/store';

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

export type $multipleStore<V, K> = K extends string
	? Writable<{ [key: string]: $onceStore<V> }>
	: K extends number
	? Writable<$onceStore<V>[]>
	: never;
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

type NewStoreProcedures<Fn extends FunctionType> = Prettify<{
	$once: (...args: ArgumentTypes<Fn>) => $onceStore<AsyncReturnType<Fn>>;
	$many: () => $manyStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
	$multiple: '$multiple';
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
