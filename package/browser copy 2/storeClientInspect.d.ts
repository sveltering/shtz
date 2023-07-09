import type { Writable } from 'svelte/store';
import type { Resolver } from '@trpc/client';
import type { BuildProcedure } from '@trpc/server/src/core/internals/procedureBuilder';
import type { OverwriteKnown } from '@trpc/server/src/core/internals/utils';
export type $onceStore<V> = Writable<{
    loading: true;
    success: false;
    error: false;
    response: undefined;
} | {
    loading: false;
    success: true;
    error: false;
    response: V;
} | {
    loading: false;
    success: false;
    error: unknown;
    response: undefined;
}>;
export type $revisableStore<V, A extends any[]> = Writable<{
    loading: true;
    success: false;
    error: false;
    response: undefined;
    call: (...args: A) => undefined;
}>;
type $multipleResponses<V, K> = K extends string ? Writable<{
    [key: string]: $onceStore<V>;
}> : K extends number ? Writable<$onceStore<V>[]> : never;
export type $multipleStore<V, A extends any[], K> = Writable<{
    loading: true;
    responses: $multipleResponses<V, K>;
    call: (...args: A) => undefined;
}>;
type ExtractResolver<Type> = Type extends Resolver<infer X> ? X : never;
type ExtractBuild<Type> = Type extends BuildProcedure<'query', infer X, unknown> ? X : never;
type ExtractoverWrite<Type> = Type extends OverwriteKnown<infer X, unknown> ? X : never;
type ProcedureHasInput<T> = T extends Symbol ? never : T;
type ProcedureInput<Obj extends object> = ProcedureHasInput<ExtractoverWrite<ExtractBuild<ExtractResolver<Obj>>>['_input_in']>;
type FunctionType = (...args: any) => any;
type ChangeQueriesType2<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType ? ProcedureInput<Obj[Key]> : ChangeAllProcedures2<Obj[Key]>;
type ChangeMutatesType2<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType ? ProcedureInput<Obj[Key]> : ChangeAllProcedures2<Obj[Key]>;
type ChangeProceduresType2<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType ? [Key] extends ['query'] ? ChangeQueriesType2<Obj, Key> : [Key] extends ['mutate'] ? ChangeMutatesType2<Obj, Key> : ChangeAllProcedures2<Obj[Key]> : ChangeAllProcedures2<Obj[Key]>;
type RemoveSubscribeProcedures<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType ? ([Key] extends ['subscribe'] ? never : Key) : Key;
type ChangeAllProcedures2<Obj> = Obj extends object ? {
    [Key in keyof Obj as RemoveSubscribeProcedures<Obj, Key>]: ChangeProceduresType2<Obj, Key>;
} : Obj;
export type EndpointsToStore2<T extends object> = ChangeAllProcedures2<T>;
export {};
