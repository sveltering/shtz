import type { Writable } from "svelte/store";
import type {
    Prettify,
    Combine,
    FirstNotEmpty,
    ArgumentTypes,
    FunctionType,
    AsyncFunctionType,
    AsyncReturnType,
    OneOf,
    EmptyObject,
    KeyValueObject,
} from "../types.js";

import type { Options as DeepMergeOpts } from "deepmerge";

type ResponseObject<
    Loading extends boolean,
    Success extends boolean,
    Err extends false | Error,
    Data extends any,
    Ext extends {}
> = Prettify<
    {
        loading: Loading;
        success: Success;
        error: Err;
        data: Data;
    } & {
        [Key in keyof Ext]: Ext[Key];
    }
>;

type StaleReponse<Ext extends {} = {}> = ResponseObject<false, false, false, undefined, Ext>;

type LoadingResponse<Ext extends {} = {}, Data = undefined> = ResponseObject<true, false, false, Data, Ext>;

type SuccessResponse<Data, Ext extends {} = {}> = ResponseObject<false, true, false, Data, Ext>;

type ErrorResponse<Ext extends {} = {}, Data = undefined> = ResponseObject<false, false, Error, Data, Ext>;

type AbortedResponse<Ext extends {} = {}> = StaleReponse<{ aborted: true } & Omit<Ext, "aborted">>;

type ReplaceInputFn<Input> = (newInput: Input) => Input;

type BeforeCallFn<Input> = (input: Input, replaceInput: ReplaceInputFn<Input>) => boolean | void | Promise<boolean | void>;

type BeforeRemoveInputFn<Input> = (input: Input) => boolean | void | Promise<boolean | void>;

type BeforeRemoveResponseFn<Data> = (response: Data, replaceData?: ReplaceInputFn<Data>) => boolean | void | Promise<boolean | void>;

type BeforeRemoveErrorFn = (error: Error) => boolean | void | Promise<boolean | void>;

type ReservedMethodKeys = "loading" | "success" | "error" | "data" | "aborted" | "abort" | "remove";

export type StringLiteral<T> = T extends string ? (string extends T ? never : T) : never;

type Partial<T> = {
    [P in keyof T]?: T[P];
};
type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface AdditionalMethodMerge<Response> {
    (newResponse: Partial<Response>): void;
    (newResponse: Partial<Response>, deep: false): void;
    (newResponse: DeepPartial<Response>, deep: true, mergeOpts?: undefined): void;
}

type AdditionalMethodFn<Response> = (response: Response, merge: AdditionalMethodMerge<Response>) => Response | boolean;

type AdditionalMethods<Methods extends {}, Response> = {
    [key in keyof Methods]: AdditionalMethodFn<Response>;
};

type AdditionalMethodsFinal<Methods> = {
    [key in keyof Methods]: () => void | Promise<void>;
};

/*
 * CALL
 */
type $CallFn<Args extends any[], Data> = (...args: Args) => Promise<Data | undefined>;

/*
 * ONCE STORE
 */
type $OnceInner<Data> = LoadingResponse | SuccessResponse<Data> | ErrorResponse;
type $OnceStore<Data> = Writable<$OnceInner<Data>>;
type $OnceFn<Args extends any[], Data> = (...args: Args) => $OnceStore<Data>;

/*
 * MANY STORE
 */
type $ManyOpts<Input, Data> = {
    prefill?: Data | (() => Data) | (() => Promise<Data | undefined>);
    remove?: boolean;
    abort?: boolean;
    abortOnRemove?: boolean;
    beforeCall?: BeforeCallFn<Input>;
    beforeRemoveInput?: BeforeRemoveInputFn<Input>;
    beforeRemoveResponse?: BeforeRemoveResponseFn<Input>;
    beforeRemoveError?: BeforeRemoveErrorFn;
};
type $ManyExtension<Input, Data, Opts extends $ManyOpts<Input, Data>> = (Opts["remove"] extends true
    ? { remove: () => Promise<void> }
    : {}) &
    (Opts["abortOnRemove"] extends true ? { remove: () => Promise<void> } : {}) &
    (Opts["abort"] extends true ? { aborted: false } : {});

type $ManyResponse<Input, EntryLoading extends {}, EntrySuccess extends {}, Data, Opts extends $ManyOpts<Input, Data>> =
    | StaleReponse<$ManyExtension<Input, Data, Opts> & { entry: {} }>
    | SuccessResponse<Data, $ManyExtension<Input, Data, Opts> & { entry: EntrySuccess }>
    | ErrorResponse<$ManyExtension<Input, Data, Opts> & { entry: EntryLoading }>
    | (Opts["abort"] extends true
          ? AbortedResponse<$ManyExtension<Input, Data, Opts> & { entry: EntryLoading }>
          : ErrorResponse<$ManyExtension<Input, Data, Opts> & { entry: EntryLoading }>)
    | (Opts["abort"] extends true
          ? LoadingResponse<$ManyExtension<Input, Data, Opts> & { abort: () => void; entry: EntryLoading }>
          : LoadingResponse<$ManyExtension<Input, Data, Opts> & { entry: EntryLoading }>);

type $ManyInner<
    Args extends any[],
    Input,
    EntryLoading extends {},
    EntrySuccess extends {},
    Data,
    Methods,
    Opts extends $ManyOpts<Input, Data>,
    DEBUG
> = {
    call: (...args: Args) => void;
    readonly DEBUG?: DEBUG;
} & Methods &
    $ManyResponse<Input, EntryLoading, EntrySuccess, Data, Opts>;

type $ManyStore<
    Args extends any[],
    Input,
    EntryLoading extends {},
    EntrySuccess extends {},
    Data,
    Methods,
    Opts extends $ManyOpts<Input, Data>,
    DEBUG
> = Writable<$ManyInner<Args, Input, EntryLoading, EntrySuccess, Data, Methods, Opts, DEBUG>>;

type $ManyFn<Args extends any[], Data> = <
    Input extends Args[0],
    EntryLoading extends {},
    EntrySuccess extends {},
    AndEntryLoading extends {},
    OrEntryLoading extends {},
    AndEntrySuccess extends {},
    OrEntrySuccess extends {},
    AndData extends {},
    OrData extends {},
    EntryLoadingFinal extends $TypeMake<EntryLoading, AndEntryLoading, OrEntryLoading>,
    EntrySuccessFinal extends $TypeMake<FirstNotEmpty<EntrySuccess, EntryLoading>, AndEntrySuccess, OrEntrySuccess>,
    DataFinal extends $TypeMake<Data, AndData, OrData>,
    Response extends $ManyResponse<Input, EntryLoadingFinal, EntrySuccessFinal, DataFinal, Opts>,
    Opts extends $ManyOpts<Args[0], DataFinal>,
    Methods extends AdditionalMethods<{ [key: string]: FunctionType }, Response>,
    MethodsInner extends AdditionalMethods<Methods, Response>,
    MethodsFinal extends AdditionalMethodsFinal<MethodsInner>,
    DEBUG extends {}
>(
    options?: Opts & {
        entry?: (input: Input) => EntryLoading;
        entrySuccess?: (response: DataFinal) => EntrySuccess;
        methods?: Methods;
        types?: OneOf<{
            orData?: OrData;
            andData?: AndData;
        }> &
            OneOf<{
                orEntrySuccess?: OrEntrySuccess;
                andEntrySuccess?: AndEntrySuccess;
            }> &
            OneOf<{
                orEntry?: OrEntryLoading;
                andEntry?: AndEntryLoading;
            }>;
    }
) => $ManyStore<Args, Input, EntryLoadingFinal, EntrySuccessFinal, DataFinal, MethodsFinal, Opts, DEBUG>;

/*
 * ENTRIES STORE
 */

type $MultipleOpts<Input, Data> = {
    prefill?: Data | Data[] | (() => Data | Data[]) | (() => Promise<Data | Data[] | undefined>);
    loading?: boolean;
    remove?: boolean;
    abort?: boolean;
    abortOnRemove?: boolean;
    beforeCall?: BeforeCallFn<Input>;
    beforeRemoveInput?: BeforeRemoveInputFn<Input>;
    beforeRemoveResponse?: BeforeRemoveResponseFn<Input>;
    beforeRemoveError?: BeforeRemoveErrorFn;
};
type $MultipleExtension<Input, Data, Opts extends $MultipleOpts<Input, Data>> = (Opts["remove"] extends true
    ? { remove: () => Promise<void> }
    : {}) &
    (Opts["abortOnRemove"] extends true ? { remove: () => Promise<void> } : {}) &
    (Opts["abort"] extends true ? { aborted: false } : {});

type $MultipleResponseInner<
    Input,
    EntryLoading extends {},
    EntrySuccess extends {},
    Data,
    Methods,
    Opts extends $MultipleOpts<Input, Data>
> =
    | SuccessResponse<Data, Methods & $MultipleExtension<Input, Data, Opts> & { entry: EntrySuccess }>
    | ErrorResponse<Methods & $MultipleExtension<Input, Data, Opts> & { entry: EntryLoading }>
    | (Opts["abort"] extends true
          ? AbortedResponse<
                Methods &
                    $MultipleExtension<Input, Data, Opts> & {
                        entry: EntryLoading;
                    }
            >
          : ErrorResponse<
                Methods &
                    $MultipleExtension<Input, Data, Opts> & {
                        entry: EntryLoading;
                    }
            >)
    | (Opts["abort"] extends true
          ? LoadingResponse<
                Methods &
                    $MultipleExtension<Input, Data, Opts> & {
                        abort: () => void;
                        entry: EntryLoading;
                    }
            >
          : LoadingResponse<
                Methods &
                    $MultipleExtension<Input, Data, Opts> & {
                        entry: EntryLoading;
                    }
            >);

type $MultipleInner<
    Args extends any[],
    Input,
    EntryLoading extends {},
    EntrySuccess extends {},
    Data,
    Methods,
    Opts extends $MultipleOpts<Input, Data>,
    DEBUG
> = {
    prefillError?: Error;
    responses: $MultipleResponseInner<Input, EntryLoading, EntrySuccess, Data, Methods, Opts>[];
    call: (...args: Args) => void;
    readonly DEBUG?: DEBUG;
} & (Opts["loading"] extends true ? { loading: false } : {});

type $MultipleStore<
    Args extends any[],
    Input,
    EntryLoading extends {},
    EntrySuccess extends {},
    Data,
    Methods,
    Opts extends $MultipleOpts<Input, Data>,
    DEBUG
> = Writable<$MultipleInner<Args, Input, EntryLoading, EntrySuccess, Data, Methods, Opts, DEBUG>>;

type $TypeMake<OriginalType, AndType extends {}, OrType extends {}> = OriginalType extends KeyValueObject
    ? AndType extends EmptyObject
        ? OrType extends EmptyObject
            ? OriginalType
            : OriginalType | Combine<OriginalType, OrType>
        : Combine<OriginalType, AndType>
    : OriginalType;

type $MultipleFn<Args extends any[], Data> = <
    Input extends Args[0],
    EntryLoading extends {},
    EntrySuccess extends {},
    AndEntryLoading extends {},
    OrEntryLoading extends {},
    AndEntrySuccess extends {},
    OrEntrySuccess extends {},
    AndData extends {},
    OrData extends {},
    EntryLoadingFinal extends $TypeMake<EntryLoading, AndEntryLoading, OrEntryLoading>,
    EntrySuccessFinal extends $TypeMake<FirstNotEmpty<EntrySuccess, EntryLoading>, AndEntrySuccess, OrEntrySuccess>,
    DataFinal extends $TypeMake<Data, AndData, OrData>,
    Response extends $MultipleResponseInner<Input, EntryLoadingFinal, EntrySuccessFinal, DataFinal, {}, Opts>,
    Opts extends $MultipleOpts<Input, DataFinal>,
    Methods extends AdditionalMethods<{ [key: string]: FunctionType }, Response>,
    MethodsInner extends AdditionalMethods<Methods, Response>,
    MethodsFinal extends AdditionalMethodsFinal<MethodsInner>,
    DEBUG extends {}
>(
    options?: Opts & {
        entry?: (input: Input) => EntryLoading;
        entrySuccess?: (response: DataFinal) => EntrySuccess;
        methods?: Methods;
        types?: OneOf<{
            orData?: OrData;
            andData?: AndData;
        }> &
            OneOf<{
                orEntrySuccess?: OrEntrySuccess;
                andEntrySuccess?: AndEntrySuccess;
            }> &
            OneOf<{
                orEntry?: OrEntryLoading;
                andEntry?: AndEntryLoading;
            }>;
    }
) => $MultipleStore<Args, Input, EntryLoadingFinal, EntrySuccessFinal, DataFinal, MethodsFinal, Opts, DEBUG>;

/*
 * CHANGE PROCEDURES
 */
type NewStoreProcedures<Args extends any[], Data> = {
    call: $CallFn<Args, Data>;
    $once: $OnceFn<Args, Data>;
    $many: $ManyFn<Args, Data>;
    $multiple: $MultipleFn<Args, Data>;
};

type ChangeProceduresType<Client extends object, Key extends keyof Client> = Client[Key] extends FunctionType
    ? Key extends "query" | "mutate"
        ? NewStoreProcedures<ArgumentTypes<Client[Key]>, AsyncReturnType<Client[Key]>>
        : ChangeAllProcedures<Client[Key]>
    : ChangeAllProcedures<Client[Key]>;

type RemoveSubscribeProcedures<Client extends object, Key extends keyof Client> = Client[Key] extends FunctionType
    ? Key extends "subscribe"
        ? never
        : Key
    : Key;

type ChangeAllProcedures<Client> = Client extends object
    ? {
          [Key in keyof Client as RemoveSubscribeProcedures<Client, Key>]: ChangeProceduresType<Client, Key>;
      }
    : Client;

export type MakeStoreType<Client extends object> = ChangeAllProcedures<Client>;

/*
 *
 *
 *
 *
 *
 **/

export type StoreOpts = {
    readonly method: any;
    readonly args: any[];
    readonly endpoint: AsyncFunctionType;
    readonly dotPath: string;
    readonly is$once: boolean;
    readonly is$many: boolean;
    readonly is$multiple: boolean;
    readonly has$call: boolean;

    readonly prefillData: undefined | any;
    readonly prefillFn: undefined | (() => any | Promise<any>);
    readonly entryFn: undefined | ((input: object) => object);
    readonly entrySuccessFn: undefined | ((response: object) => object);
    readonly hasLoading: boolean;
    readonly hasRemove: boolean;
    readonly hasAbort: boolean;
    readonly hasAbortOnRemove: boolean;
    readonly beforeCallFn: undefined | BeforeCallFn<any>;
    readonly beforeRemoveInputFn: undefined | BeforeRemoveInputFn<any>;
    readonly beforeRemoveResponseFn: undefined | BeforeRemoveResponseFn<any>;
    readonly beforeRemoveErrorFn: undefined | BeforeRemoveErrorFn;
    readonly methodsFns: AdditionalMethods<any, any>;
};

export type $OnceStoreOpts = {
    readonly method: "$once";
    readonly args: any[];
    readonly endpoint: AsyncFunctionType;
    readonly dotPath: string;
    readonly is$once: true;
    readonly is$many: false;
    readonly is$multiple: false;
    readonly has$call: false;

    readonly prefillData: undefined;
    readonly prefillFn: undefined;
    readonly entryFn: undefined;
    readonly entrySuccessFn: undefined;
    readonly hasLoading: false;
    readonly hasRemove: false;
    readonly hasAbort: false;
    readonly hasAbortOnRemove: false;
    readonly beforeCallFn: undefined;
    readonly beforeRemoveInputFn: undefined;
    readonly beforeRemoveResponseFn: undefined;
    readonly beforeRemoveErrorFn: undefined;
    readonly methodsFns: AdditionalMethods<any, any>;
};

export type $ManyStoreOpts = {
    readonly method: "$many";
    readonly args: any[];
    readonly endpoint: AsyncFunctionType;
    readonly dotPath: string;
    readonly is$once: false;
    readonly is$many: true;
    readonly is$multiple: false;
    readonly has$call: true;

    readonly prefillData: undefined | any;
    readonly prefillFn: undefined | (() => any | Promise<any>);
    readonly entryFn: undefined;
    readonly entrySuccessFn: undefined;
    readonly hasLoading: false;
    readonly hasRemove: boolean;
    readonly hasAbort: boolean;
    readonly hasAbortOnRemove: boolean;
    readonly beforeCallFn: undefined | BeforeCallFn<any>;
    readonly beforeRemoveInputFn: undefined | BeforeRemoveInputFn<any>;
    readonly beforeRemoveResponseFn: undefined | BeforeRemoveResponseFn<any>;
    readonly beforeRemoveErrorFn: undefined | BeforeRemoveErrorFn;
    readonly methodsFns: AdditionalMethods<any, any>;
};

export type $MultipleStoreOpts = {
    readonly method: "$multiple";
    readonly args: any[];
    readonly endpoint: AsyncFunctionType;
    readonly dotPath: string;
    readonly is$once: false;
    readonly is$many: false;
    readonly is$multiple: true;
    readonly has$call: true;

    readonly prefillData: undefined | any[];
    readonly prefillFn: undefined | (() => any[] | Promise<any[]>);
    readonly entryFn: (input: object) => object;
    readonly entrySuccessFn: undefined | ((response: object) => object);
    readonly hasLoading: boolean;
    readonly hasRemove: boolean;
    readonly hasAbort: boolean;
    readonly hasAbortOnRemove: boolean;
    readonly beforeCallFn: undefined | BeforeCallFn<any>;
    readonly beforeRemoveInputFn: undefined | BeforeRemoveInputFn<any>;
    readonly beforeRemoveResponseFn: undefined | BeforeRemoveResponseFn<any>;
    readonly beforeRemoveErrorFn: undefined | BeforeRemoveErrorFn;
    readonly methodsFns: AdditionalMethods<any, any>;
};

export type AnyOnceStore = $OnceStore<any>;
export type AnyManyStore = $ManyStore<any[], any, any, any, any, any, any, any>;
export type AnyMultipleStore = $MultipleStore<any[], any, any, any, any, any, any, any>;

export type AnyStore = AnyOnceStore | AnyManyStore | AnyMultipleStore;

export type AnyStoreOpts = $OnceStoreOpts | $ManyStoreOpts | $MultipleStoreOpts;

export type CallTracker = {
    // input: any;
    skip?: boolean;
    index: number;
    // responseInner: any;
    abortController?: undefined | AbortController;
    isLastPrefill?: boolean;
};
