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

type replaceInputFn<Input> = (newInput: Input) => Input;

type beforeCallFn<Input> = (input: Input, replaceInput: replaceInputFn<Input>) => boolean | void | Promise<boolean | void>;

type beforeRemoveInputFn<Input> = (input: Input) => boolean | void | Promise<boolean | void>;

type beforeRemoveResponseFn<Data> = (response: Data, replaceData?: replaceInputFn<Data>) => boolean | void | Promise<boolean | void>;

type beforeRemoveErrorFn = (error: Error) => boolean | void | Promise<boolean | void>;
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
  beforeCall?: beforeCallFn<Input>;
  beforeRemoveInput?: beforeRemoveInputFn<Input>;
  beforeRemoveResponse?: beforeRemoveResponseFn<Input>;
  beforeRemoveError?: beforeRemoveErrorFn;
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
  Opts extends $ManyOpts<Input, Data>,
  DEBUG
> = {
  call: (...args: Args) => void;
  readonly DEBUG?: DEBUG;
} & $ManyResponse<Input, EntryLoading, EntrySuccess, Data, Opts>;

type $ManyStore<
  Args extends any[],
  Input,
  EntryLoading extends {},
  EntrySuccess extends {},
  Data,
  Opts extends $ManyOpts<Input, Data>,
  DEBUG
> = Writable<$ManyInner<Args, Input, EntryLoading, EntrySuccess, Data, Opts, DEBUG>>;

type $ManyFn<Args extends any[], Data> = <
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
  Opts extends $ManyOpts<Args[0], DataFinal>,
  DEBUG extends {}
>(
  options?: Opts & {
    entry?: (input: Args[0]) => EntryLoading;
    entrySuccess?: (response: DataFinal) => EntrySuccess;
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
) => $ManyStore<Args, Args[0], EntryLoadingFinal, EntrySuccessFinal, DataFinal, Opts, DEBUG>;

/*
 * ENTRIES STORE
 */

type $MultipleOpts<Input, Data> = {
  prefill?: Data | Data[] | (() => Data | Data[]) | (() => Promise<Data | Data[] | undefined>);
  loading?: boolean;
  remove?: boolean;
  abort?: boolean;
  abortOnRemove?: boolean;
  beforeCall?: beforeCallFn<Input>;
  beforeRemoveInput?: beforeRemoveInputFn<Input>;
  beforeRemoveResponse?: beforeRemoveResponseFn<Input>;
  beforeRemoveError?: beforeRemoveErrorFn;
};
type $MultipleExtension<Input, Data, Opts extends $MultipleOpts<Input, Data>> = (Opts["remove"] extends true
  ? { remove: () => Promise<void> }
  : {}) &
  (Opts["abortOnRemove"] extends true ? { remove: () => Promise<void> } : {}) &
  (Opts["abort"] extends true ? { aborted: false } : {});

type $MultipleResponseInner<Input, EntryLoading extends {}, EntrySuccess extends {}, Data, Opts extends $MultipleOpts<Input, Data>> =
  | SuccessResponse<Data, $MultipleExtension<Input, Data, Opts> & { entry: EntrySuccess }>
  | ErrorResponse<$MultipleExtension<Input, Data, Opts> & { entry: EntryLoading }>
  | (Opts["abort"] extends true
      ? AbortedResponse<
          Omit<$MultipleExtension<Input, Data, Opts>, "aborted"> & {
            entry: EntryLoading;
          }
        >
      : ErrorResponse<
          $MultipleExtension<Input, Data, Opts> & {
            entry: EntryLoading;
          }
        >)
  | (Opts["abort"] extends true
      ? LoadingResponse<
          $MultipleExtension<Input, Data, Opts> & {
            abort: () => void;
            entry: EntryLoading;
          }
        >
      : LoadingResponse<
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
  Opts extends $MultipleOpts<Input, Data>,
  DEBUG
> = {
  prefillError?: Error;
  responses: $MultipleResponseInner<Input, EntryLoading, EntrySuccess, Data, Opts>[];
  call: (...args: Args) => void;
  readonly DEBUG?: DEBUG;
} & (Opts["loading"] extends true ? { loading: false } : {});

type $MultipleStore<
  Args extends any[],
  Input,
  EntryLoading extends {},
  EntrySuccess extends {},
  Data,
  Opts extends $MultipleOpts<Input, Data>,
  DEBUG
> = Writable<$MultipleInner<Args, Input, EntryLoading, EntrySuccess, Data, Opts, DEBUG>>;

type $TypeMake<OriginalType, AndType extends {}, OrType extends {}> = OriginalType extends KeyValueObject
  ? AndType extends EmptyObject
    ? OrType extends EmptyObject
      ? OriginalType
      : OriginalType | Combine<OriginalType, OrType>
    : Combine<OriginalType, AndType>
  : OriginalType;

type $MultipleFn<Args extends any[], Data> = <
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
  Opts extends $MultipleOpts<Args[0], DataFinal>,
  DEBUG extends {}
>(
  options?: Opts & {
    entry?: (input: Args[0]) => EntryLoading;
    entrySuccess?: (response: DataFinal) => EntrySuccess;
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
) => $MultipleStore<Args, Args[0], EntryLoadingFinal, EntrySuccessFinal, DataFinal, Opts, DEBUG>;

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
  readonly beforeCallFn: undefined | beforeCallFn<any>;
  readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
  readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
  readonly beforeRemoveErrorFn: undefined | beforeRemoveErrorFn;
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
  readonly beforeCallFn: undefined | beforeCallFn<any>;
  readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
  readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
  readonly beforeRemoveErrorFn: undefined | beforeRemoveErrorFn;
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
  readonly beforeCallFn: undefined | beforeCallFn<any>;
  readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
  readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
  readonly beforeRemoveErrorFn: undefined | beforeRemoveErrorFn;
};

export type AnyOnceStore = $OnceStore<any>;
export type AnyManyStore = $ManyStore<any[], any, any, any, any, any, any>;
export type AnyMultipleStore = $MultipleStore<any[], any, any, any, any, any, any>;

export type AnyStore = AnyOnceStore | AnyManyStore | AnyMultipleStore;

export type AnyStoreOpts = $OnceStoreOpts | $ManyStoreOpts | $MultipleStoreOpts;

export type CallTracker = {
  // input: any;
  skip?: boolean;
  index: number;
  // responseInner: any;
  abortController?: undefined | AbortController;
};
