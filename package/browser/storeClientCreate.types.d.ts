import type { Writable } from 'svelte/store';
import type { Resolver, TRPCClientError } from '@trpc/client';
import type { BuildProcedure } from '@trpc/server/src/core/internals/procedureBuilder';
import type { OverwriteKnown } from '@trpc/server/src/core/internals/utils';
import type { storeClientOpt, ArgumentTypes, FunctionType, Prettify, AsyncReturnType } from './types';
type ExtractResolver<Type> = Type extends Resolver<infer X> ? X : never;
type ExtractBuild<Type> = Type extends BuildProcedure<'query' | 'mutation', infer X, unknown> ? X : never;
type ExtractOverwrite<Type> = Type extends OverwriteKnown<infer X, unknown> ? X : never;
type ProcedureHasInput<T> = T extends Symbol ? never : T;
type ProcedureInput<Obj extends object> = ProcedureHasInput<ExtractOverwrite<ExtractBuild<ExtractResolver<Obj>>>['_input_in']>;
type $onceStoreInner<V> = {
    loading: true;
    success: false;
    error: false;
    data: undefined;
} | {
    loading: false;
    success: true;
    error: false;
    data: V;
} | {
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
type $multipleStoreInner<V, Rb extends boolean, Ab extends boolean> = ($onceStoreInner<V> | staleInner | (staleInner & Ab extends true ? {
    aborted: false;
    abort: () => void;
} : {})) & (Rb extends true ? {
    remove: () => void;
} : {}) & (Ab extends true ? {
    aborted: boolean;
} : {});
export type $onceStore<V> = Writable<$onceStoreInner<V>>;
export type $revisableStore<V, A extends any[]> = Writable<$revisableStoreInner<V, A>>;
export type $multipleStore<V, A extends any[], Lb extends boolean, Rb extends boolean, Ab extends boolean> = $multipleStoreObject<V, A, Lb, Rb, Ab> | $multipleStoreArray<V, A, Lb, Rb, Ab> | $multipleStoreArrayEntries<V, A, any, Lb, Rb, Ab>;
type $multipleStoreWritableMake<Resp, A extends any[], L> = L extends true ? Writable<{
    loading: true;
    responses: Resp;
    call: (...args: A) => undefined;
}> : Writable<{
    responses: Resp;
    call: (...args: A) => undefined;
}>;
export type $multipleStoreObject<V, A extends any[], Lb extends boolean, Rb extends boolean, Ab extends boolean> = $multipleStoreWritableMake<{
    [key: string]: $multipleStoreInner<V, Rb, Ab>;
}, A, Lb>;
export type $multipleStoreArray<V, A extends any[], Lb extends boolean, Rb extends boolean, Ab extends boolean> = $multipleStoreWritableMake<$multipleStoreInner<V, Rb, Ab>[], A, Lb>;
export type $multipleStoreArrayEntries<V, A extends any[], X extends any, Lb extends boolean, Rb extends boolean, Ab extends boolean> = $multipleStoreWritableMake<[X, $multipleStoreInner<V, Rb, Ab>][], A, Lb>;
type $onceFnMake<Fn extends FunctionType> = (...args: ArgumentTypes<Fn>) => $onceStore<AsyncReturnType<Fn>>;
type $revisableFnMake<Fn extends FunctionType> = () => $revisableStore<AsyncReturnType<Fn>, ArgumentTypes<Fn>>;
interface $multipleFnMake<Fn extends FunctionType> {
    (): $multipleStoreArray<AsyncReturnType<Fn>, ArgumentTypes<Fn>, false, false, false>;
    <X>(entryFn: (input: ProcedureInput<Fn>) => X): $multipleStoreArrayEntries<AsyncReturnType<Fn>, ArgumentTypes<Fn>, X, false, false, false>;
    <Lb extends boolean, Rb extends boolean, Ab extends boolean>(opts: {
        loading?: Lb;
        remove?: Rb;
        abort?: Ab;
        abortOnRemove?: boolean;
        key: (input: ProcedureInput<Fn>) => string;
    }): $multipleStoreObject<AsyncReturnType<Fn>, ArgumentTypes<Fn>, Lb, Rb, Ab>;
    <Lb extends boolean, Rb extends boolean, X, Ab extends boolean>(opts: {
        loading?: Lb;
        remove?: Rb;
        abort?: Ab;
        abortOnRemove?: boolean;
        entry: (input: ProcedureInput<Fn>) => X;
    }): $multipleStoreArrayEntries<AsyncReturnType<Fn>, ArgumentTypes<Fn>, X, Lb, Rb, Ab>;
    <Lb extends boolean, Rb extends boolean, Ab extends boolean>(opts: {
        loading?: Lb;
        remove?: Rb;
        abort?: Ab;
        abortOnRemove?: boolean;
    }): $multipleStoreArray<AsyncReturnType<Fn>, ArgumentTypes<Fn>, Lb, Rb, Ab>;
}
type NewStoreProcedures<Fn extends FunctionType> = Prettify<{
    $once: $onceFnMake<Fn>;
    $revisable: $revisableFnMake<Fn>;
    $multiple: $multipleFnMake<Fn>;
}>;
type ChangeQueriesType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType ? NewStoreProcedures<Obj[Key]> : ChangeAllProcedures<Obj[Key]>;
type ChangeMutatesType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType ? NewStoreProcedures<Obj[Key]> : ChangeAllProcedures<Obj[Key]>;
type ChangeProceduresType<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType ? [Key] extends ['query'] ? ChangeQueriesType<Obj, Key> : [Key] extends ['mutate'] ? ChangeMutatesType<Obj, Key> : ChangeAllProcedures<Obj[Key]> : ChangeAllProcedures<Obj[Key]>;
type RemoveSubscribeProcedures<Obj extends object, Key extends keyof Obj> = Obj[Key] extends FunctionType ? ([Key] extends ['subscribe'] ? never : Key) : Key;
type ChangeAllProcedures<Obj> = Obj extends object ? {
    [Key in keyof Obj as RemoveSubscribeProcedures<Obj, Key>]: ChangeProceduresType<Obj, Key>;
} : Obj;
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
    $multipleHasAbort: true | false;
    $multipleHasAbortOnRemove: true | false;
};
export type callEndpointOpts = $methodOpts & {
    endpointArgs: any[];
    store: $onceStore<any> | $revisableStore<any, any[]> | $multipleStore<any, any[], any, any, any>;
};
export type track$multipleOpts = {
    index: string | number;
    abortController?: AbortController;
};
export {};
