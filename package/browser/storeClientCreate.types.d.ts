import type { Writable } from 'svelte/store';
import type { TRPCClientError } from '@trpc/client';
import type { storeClientOpt, ArgumentTypes, FunctionType, Prettify, AsyncReturnType } from './types.js';
type staleInner = {
    loading: false;
    success: false;
    error: false;
    data: undefined;
};
type loadingInner = {
    loading: true;
    success: false;
    error: false;
    data: undefined;
};
type successInner<Output> = {
    loading: false;
    success: true;
    error: false;
    data: Output;
};
type errorInner = {
    loading: false;
    success: false;
    error: TRPCClientError<any>;
    data: undefined;
};
type abortedInner = {
    loading: false;
    success: false;
    error: false;
    data: undefined;
    aborted: true;
};
type $onceStoreInner<Output> = Prettify<loadingInner | successInner<Output> | errorInner>;
type $revisableStoreInner<Inputs extends any[], Output> = Prettify<($onceStoreInner<Output> | staleInner) & {
    call: (...args: Inputs) => void;
}>;
type callInners<Output> = loadingInner | successInner<Output> | errorInner;
type loadedInners<Output> = successInner<Output> | errorInner;
type $multipleStoreInner<Output, Rb extends boolean, Ab extends boolean> = Prettify<(Ab extends true ? abortedInner | (loadingInner & {
    abort: () => void;
    aborted: false;
}) | (loadedInners<Output> & {
    aborted: false;
}) : callInners<Output>) & (Rb extends true ? {
    remove: () => void;
} : {})>;
export type $onceStore<Output> = Writable<$onceStoreInner<Output>>;
export type $revisableStore<Inputs extends any[], Output> = Writable<$revisableStoreInner<Inputs, Output>>;
export type $multipleStore<Inputs extends any[], Output, Lb extends boolean, Rb extends boolean, Ab extends boolean> = $multipleStoreObject<Inputs, Output, Lb, Rb, Ab> | $multipleStoreArray<Inputs, Output, Lb, Rb, Ab> | $multipleStoreArrayEntries<Inputs, Output, any, Lb, Rb, Ab>;
type $multipleStoreWritableMake<Inputs extends any[], Resp, Lb> = Lb extends true ? Writable<{
    loading: boolean;
    responses: Resp;
    call: (...args: Inputs) => void;
}> : Writable<{
    responses: Resp;
    call: (...args: Inputs) => void;
}>;
type $multipleStoreObject<Inputs extends any[], Output, Lb extends boolean, Rb extends boolean, Ab extends boolean> = $multipleStoreWritableMake<Inputs, {
    [key: string]: $multipleStoreInner<Output, Rb, Ab>;
}, Lb>;
type $multipleStoreArray<Inputs extends any[], Output, Lb extends boolean, Rb extends boolean, Ab extends boolean> = $multipleStoreWritableMake<Inputs, $multipleStoreInner<Output, Rb, Ab>[], Lb>;
type $multipleStoreArrayEntries<Inputs extends any[], Output, Entry extends any, Lb extends boolean, Rb extends boolean, Ab extends boolean> = $multipleStoreWritableMake<Inputs, [Entry, $multipleStoreInner<Output, Rb, Ab>][], Lb>;
type $onceFnMake<Inputs extends any[], Output> = (...args: Inputs) => $onceStore<Output>;
type $revisableFnMake<Inputs extends any[], Output> = () => $revisableStore<Inputs, Output>;
interface $multipleFnMake<Inputs extends any[], Output> {
    (): $multipleStoreArray<Inputs, Output, false, false, false>;
    <Entry>(entryFn: (input: Inputs[0]) => Entry): $multipleStoreArrayEntries<Inputs, Output, Entry, false, false, false>;
    <Lb extends boolean, Rb extends boolean, Ab extends boolean>(opts: {
        loading?: Lb;
        remove?: Rb;
        abort?: Ab;
        abortOnRemove?: boolean;
        key: (input: Inputs[0]) => string;
    }): $multipleStoreObject<Inputs, Output, Lb, Rb, Ab>;
    <Lb extends boolean, Rb extends boolean, Entry, Ab extends boolean>(opts: {
        loading?: Lb;
        remove?: Rb;
        abort?: Ab;
        abortOnRemove?: boolean;
        entry: (input: Inputs[0]) => Entry;
    }): $multipleStoreArrayEntries<Inputs, Output, Entry, Lb, Rb, Ab>;
    <Lb extends boolean, Rb extends boolean, Ab extends boolean>(opts: {
        loading?: Lb;
        remove?: Rb;
        abort?: Ab;
        abortOnRemove?: boolean;
    }): $multipleStoreArray<Inputs, Output, Lb, Rb, Ab>;
}
type NewStoreProcedures<Inputs extends any[], Output extends any> = Prettify<{
    $once: $onceFnMake<Inputs, Output>;
    $revisable: $revisableFnMake<Inputs, Output>;
    $multiple: $multipleFnMake<Inputs, Output>;
}>;
type ChangeProceduresType<Client extends object, Key extends keyof Client> = Client[Key] extends FunctionType ? Key extends 'query' | 'mutate' ? NewStoreProcedures<ArgumentTypes<Client[Key]>, AsyncReturnType<Client[Key]>> : ChangeAllProcedures<Client[Key]> : ChangeAllProcedures<Client[Key]>;
type RemoveSubscribeProcedures<Client extends object, Key extends keyof Client> = Client[Key] extends FunctionType ? (Key extends 'subscribe' ? never : Key) : Key;
type ChangeAllProcedures<Client> = Client extends object ? {
    [Key in keyof Client as RemoveSubscribeProcedures<Client, Key>]: ChangeProceduresType<Client, Key>;
} : Client;
export type MakeStoreType<Client extends object> = ChangeAllProcedures<Client>;
export type $methodOpts = {
    method: string;
    endpoint: CallableFunction;
    args: any[];
    options: storeClientOpt;
    path: string;
    is$once: boolean;
    is$revisable: boolean;
    is$multiple: boolean;
    is$multipleArray: boolean;
    is$multipleEntriesArray: boolean;
    is$multipleObject: boolean;
    $multipleGetKeyFn: undefined | FunctionType;
    $multipleGetEntryFn: undefined | FunctionType;
    $multipleHasLoading: boolean;
    $multipleHasRemove: boolean;
    $multipleHasAbort: boolean;
    $multipleHasAbortOnRemove: boolean;
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
