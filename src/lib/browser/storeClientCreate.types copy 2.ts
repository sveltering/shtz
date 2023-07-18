import type { Writable } from 'svelte/store';
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
	KeyValueObject
} from '../types.js';

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
type LoadingResponse<Ext extends {} = {}, Data = undefined> = ResponseObject<
	true,
	false,
	false,
	Data,
	Ext
>;
type SuccessResponse<Data, Ext extends {} = {}> = ResponseObject<false, true, false, Data, Ext>;
type ErrorResponse<Ext extends {} = {}, Data = undefined> = ResponseObject<
	false,
	false,
	Error,
	Data,
	Ext
>;
type AbortedResponse<Ext extends {} = {}> = StaleReponse<{ aborted: true } & Omit<Ext, 'aborted'>>;

type replaceInputFn<Input> = (newInput: Input) => Input;

type beforeCallFn<Input> = (
	input: Input,
	replaceInput: replaceInputFn<Input>
) => boolean | void | Promise<boolean | void>;

type beforeRemoveInputFn<Input> = (input: Input) => boolean | void | Promise<boolean | void>;

type beforeRemoveResponseFn<Data> = (
	response: Data,
	replaceData: replaceInputFn<Data>
) => boolean | void | Promise<boolean | void>;
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
 * UPDATE STORE
 */
type $UpdateOpts<Input, Data> = {
	prefill?: Data | (() => Data) | (() => Promise<Data | undefined>);
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeCall?: beforeCallFn<Input>;
	beforeRemoveInput?: beforeRemoveInputFn<Input>;
	beforeRemoveResponse?: beforeRemoveResponseFn<Input>;
};
type $UpdateExtension<
	Input,
	Data,
	Opts extends $UpdateOpts<Input, Data>
> = (Opts['remove'] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $UpdateResponse<Input, Data, Opts extends $UpdateOpts<Input, Data>> =
	| StaleReponse<$UpdateExtension<Input, Data, Opts>>
	| SuccessResponse<Data, $UpdateExtension<Input, Data, Opts>>
	| ErrorResponse<$UpdateExtension<Input, Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<$UpdateExtension<Input, Data, Opts>>
			: ErrorResponse<$UpdateExtension<Input, Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$UpdateExtension<Input, Data, Opts> & { abort: () => void }>
			: LoadingResponse<$UpdateExtension<Input, Data, Opts>>);

type $UpdateInner<Args extends any[], Input, Data, Opts extends $UpdateOpts<Input, Data>, DEBUG> = {
	call: (...args: Args) => void;
	readonly DEBUG?: DEBUG;
} & $UpdateResponse<Input, Data, Opts>;

type $UpdateStore<
	Args extends any[],
	Input,
	Data,
	Opts extends $UpdateOpts<Input, Data>,
	DEBUG
> = Writable<Prettify<$UpdateInner<Args, Input, Data, Opts, DEBUG>>>;

type $UpdateFn<Args extends any[], Data> = <
	AdditionalData extends {},
	DataFinal extends Combine<Data, AdditionalData>,
	Opts extends $UpdateOpts<Args[0], DataFinal>,
	DEBUG extends {}
>(
	options?: Opts & {
		types?: {
			data?: AdditionalData;
		};
	}
) => $UpdateStore<Args, Args[0], DataFinal, Opts, DEBUG>;

/*
 * ARRAY STORE
 */

type $ArrayOpts<Input, Data> = {
	prefill?: Data[] | (() => Data[]) | (() => Promise<Data[] | undefined>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeCall?: beforeCallFn<Input>;
	beforeRemoveInput?: beforeRemoveInputFn<Input>;
	beforeRemoveResponse?: beforeRemoveResponseFn<Input>;
};
type $ArrayExtension<
	Input,
	Data,
	Opts extends $ArrayOpts<Input, Data>
> = (Opts['remove'] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $ArrayResponseInner<Input, Data, Opts extends $ArrayOpts<Input, Data>> =
	| SuccessResponse<Data, $ArrayExtension<Input, Data, Opts>>
	| ErrorResponse<$ArrayExtension<Input, Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<Omit<$ArrayExtension<Input, Data, Opts>, 'aborted'>>
			: ErrorResponse<$ArrayExtension<Input, Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$ArrayExtension<Input, Data, Opts> & { abort: () => void }>
			: LoadingResponse<$ArrayExtension<Input, Data, Opts>>);

type $ArrayInner<Args extends any[], Input, Data, Opts extends $ArrayOpts<Input, Data>, DEBUG> = {
	responses: Prettify<$ArrayResponseInner<Input, Data, Opts>>[];
	call: (...args: Args) => void;
	readonly DEBUG?: DEBUG;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $ArrayStore<
	Args extends any[],
	Input,
	Data,
	Opts extends $ArrayOpts<Input, Data>,
	DEBUG
> = Writable<$ArrayInner<Args, Input, Data, Opts, DEBUG>>;
type $ArrayFn<Args extends any[], Data> = <
	AdditionalData extends {},
	DataFinal extends Combine<Data, AdditionalData>,
	Opts extends $ArrayOpts<Args[0], DataFinal>,
	DEBUG extends {}
>(
	options?: Opts & {
		types?: {
			data?: AdditionalData;
		};
	}
) => $ArrayStore<Args, Args[0], DataFinal, Opts, DEBUG>;

/*
 * ENTRIES STORE
 */

type $EntryOpts<Input, Data> = {
	prefill?: Data[] | (() => Data[]) | (() => Promise<Data[] | undefined>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeCall?: beforeCallFn<Input>;
	beforeRemoveInput?: beforeRemoveInputFn<Input>;
	beforeRemoveResponse?: beforeRemoveResponseFn<Input>;
};
type $EntryExtension<
	Input,
	Data,
	Opts extends $EntryOpts<Input, Data>
> = (Opts['remove'] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $EntryResponseInner<
	Input,
	EntryLoading extends {},
	EntrySuccess extends {},
	Data,
	Opts extends $EntryOpts<Input, Data>
> =
	| SuccessResponse<Data, $EntryExtension<Input, Data, Opts> & { entry: EntrySuccess }>
	| ErrorResponse<$EntryExtension<Input, Data, Opts> & { entry: EntryLoading }>
	| (Opts['abort'] extends true
			? AbortedResponse<
					Omit<$EntryExtension<Input, Data, Opts>, 'aborted'> & {
						entry: EntryLoading;
					}
			  >
			: ErrorResponse<
					$EntryExtension<Input, Data, Opts> & {
						entry: EntryLoading;
					}
			  >)
	| (Opts['abort'] extends true
			? LoadingResponse<
					$EntryExtension<Input, Data, Opts> & {
						abort: () => void;
						entry: EntryLoading;
					}
			  >
			: LoadingResponse<
					$EntryExtension<Input, Data, Opts> & {
						entry: EntryLoading;
					}
			  >);

type $EntryInner<
	Args extends any[],
	Input,
	EntryLoading extends {},
	EntrySuccess extends {},
	Data,
	Opts extends $EntryOpts<Input, Data>,
	DEBUG
> = {
	responses: Prettify<$EntryResponseInner<Input, EntryLoading, EntrySuccess, Data, Opts>>[];
	call: (...args: Args) => void;
	readonly DEBUG?: DEBUG;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $EntryStore<
	Args extends any[],
	Input,
	EntryLoading extends {},
	EntrySuccess extends {},
	Data,
	Opts extends $EntryOpts<Input, Data>,
	DEBUG
> = Writable<$EntryInner<Args, Input, EntryLoading, EntrySuccess, Data, Opts, DEBUG>>;

type $TypeMake<
	OriginalType,
	AndType extends {},
	OrType extends {}
> = OriginalType extends KeyValueObject
	? AndType extends EmptyObject
		? OrType extends EmptyObject
			? OriginalType
			: OriginalType | Combine<OriginalType, OrType>
		: Combine<OriginalType, AndType>
	: OriginalType;

type $EntryFn<Args extends any[], Data> = <
	EntryLoading extends {},
	EntrySuccess extends {},
	AndEntryLoading extends {},
	OrEntryLoading extends {},
	AndEntrySuccess extends {},
	OrEntrySuccess extends {},
	AndData extends {},
	OrData extends {},
	EntryLoadingFinal extends $TypeMake<EntryLoading, AndEntryLoading, OrEntryLoading>,
	EntrySuccessFinal extends $TypeMake<
		FirstNotEmpty<EntrySuccess, EntryLoading>,
		AndEntrySuccess,
		OrEntrySuccess
	>,
	DataFinal extends $TypeMake<Data, AndData, OrData>,
	Opts extends $EntryOpts<Args[0], DataFinal>,
	DEBUG extends {}
>(
	options:
		| (Opts & {
				entry: (input: Args[0]) => EntryLoading;
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
		  })
		| ((item: Data) => EntryLoading)
) => $EntryStore<Args, Args[0], EntryLoadingFinal, EntrySuccessFinal, DataFinal, Opts, DEBUG>;

/*
 * OBJECT STORE
 */

type $ObjectOpts<Input, Data> = {
	key?: (input: Input) => string;
	keySuccess?: (response: Data) => string;
	prefill?: Data[] | (() => Data[]) | (() => Promise<Data[] | undefined>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeCall?: beforeCallFn<Input>;
	beforeRemoveInput?: beforeRemoveInputFn<Input>;
	beforeRemoveResponse?: beforeRemoveResponseFn<Input>;
};
type $ObjectExtension<
	Input,
	Data,
	Opts extends $ObjectOpts<Input, Data>
> = (Opts['remove'] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $ObjectResponseInner<Input, Data, Opts extends $ObjectOpts<Input, Data>> =
	| SuccessResponse<Data, $ObjectExtension<Input, Data, Opts>>
	| ErrorResponse<$ObjectExtension<Input, Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<Omit<$ObjectExtension<Input, Data, Opts>, 'aborted'>>
			: ErrorResponse<$ObjectExtension<Input, Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$ObjectExtension<Input, Data, Opts> & { abort: () => void }>
			: LoadingResponse<$ObjectExtension<Input, Data, Opts>>);

type $ObjectInner<Args extends any[], Input, Data, Opts extends $ObjectOpts<Input, Data>, DEBUG> = {
	responses: { [key: string]: Prettify<$ObjectResponseInner<Input, Data, Opts>> };
	call: (...args: Args) => void;
	readonly DEBUG?: DEBUG;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $ObjectStore<
	Args extends any[],
	Input,
	Data,
	Opts extends $ObjectOpts<Input, Data>,
	DEBUG
> = Writable<$ObjectInner<Args, Input, Data, Opts, DEBUG>>;

type $ObjectFn<Args extends any[], Data> = <
	AdditionalData extends {},
	DataFinal extends Combine<Data, AdditionalData>,
	Opts extends $ObjectOpts<Args[0], DataFinal>,
	DEBUG extends {}
>(
	options?:
		| (Opts & {
				types?: {
					data?: AdditionalData;
				};
		  })
		| ((item: Args[0]) => string)
) => $ObjectStore<Args, Args[0], DataFinal, Opts, DEBUG>;
/*
 * CHANGE PROCEDURES
 */
type NewStoreProcedures<Args extends any[], Data> = {
	call: $CallFn<Args, Data>;
	$once: $OnceFn<Args, Data>;
	$update: $UpdateFn<Args, Data>;
	$array: $ArrayFn<Args, Data>;
	$entry: $EntryFn<Args, Data>;
	$object: $ObjectFn<Args, Data>;
};

type ChangeProceduresType<
	Client extends object,
	Key extends keyof Client
> = Client[Key] extends FunctionType
	? Key extends 'query' | 'mutate'
		? NewStoreProcedures<ArgumentTypes<Client[Key]>, AsyncReturnType<Client[Key]>>
		: ChangeAllProcedures<Client[Key]>
	: ChangeAllProcedures<Client[Key]>;

type RemoveSubscribeProcedures<
	Client extends object,
	Key extends keyof Client
> = Client[Key] extends FunctionType ? (Key extends 'subscribe' ? never : Key) : Key;

type ChangeAllProcedures<Client> = Client extends object
	? {
			[Key in keyof Client as RemoveSubscribeProcedures<Client, Key>]: ChangeProceduresType<
				Client,
				Key
			>;
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
	readonly is$update: boolean;
	readonly is$array: boolean;
	readonly is$entry: boolean;
	readonly is$object: boolean;
	readonly is$multiple: boolean;
	readonly is$arrayType: boolean;

	readonly prefillData: undefined | any;
	readonly prefillFn: undefined | (() => any | Promise<any>);
	readonly entryFn: undefined | ((input: object) => object);
	readonly entrySuccessFn: undefined | ((response: object) => object);
	readonly keyFn: undefined | ((input: object) => string);
	readonly keySuccessFn: undefined | ((response: object) => string);
	readonly hasLoading: boolean;
	readonly hasRemove: boolean;
	readonly hasAbort: boolean;
	readonly hasAbortOnRemove: boolean;
	readonly beforeCallFn: undefined | beforeCallFn<any>;
	readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
	readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
};

export type $OnceStoreOpts = {
	readonly method: '$once';
	readonly args: any[];
	readonly endpoint: AsyncFunctionType;
	readonly dotPath: string;
	readonly is$once: true;
	readonly is$update: false;
	readonly is$array: false;
	readonly is$entry: false;
	readonly is$object: false;
	readonly is$multiple: false;
	readonly is$arrayType: false;

	readonly prefillData: undefined;
	readonly prefillFn: undefined;
	readonly entryFn: undefined;
	readonly entrySuccessFn: undefined;
	readonly keyFn: undefined;
	readonly keySuccessFn: undefined;
	readonly hasLoading: false;
	readonly hasRemove: false;
	readonly hasAbort: false;
	readonly hasAbortOnRemove: false;
	readonly beforeCallFn: undefined | beforeCallFn<any>;
	readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
	readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
};

export type $UpdateStoreOpts = {
	readonly method: '$update';
	readonly args: any[];
	readonly endpoint: AsyncFunctionType;
	readonly dotPath: string;
	readonly is$once: true;
	readonly is$update: false;
	readonly is$array: false;
	readonly is$entry: false;
	readonly is$object: false;
	readonly is$multiple: false;
	readonly is$arrayType: false;

	readonly prefillData: undefined | any;
	readonly prefillFn: undefined | (() => any | Promise<any>);
	readonly entryFn: undefined;
	readonly entrySuccessFn: undefined;
	readonly keyFn: undefined;
	readonly keySuccessFn: undefined;
	readonly hasLoading: false;
	readonly hasRemove: boolean;
	readonly hasAbort: boolean;
	readonly hasAbortOnRemove: boolean;
	readonly beforeCallFn: undefined | beforeCallFn<any>;
	readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
	readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
};

export type $ArrayStoreOpts = {
	readonly method: '$array';
	readonly args: any[];
	readonly endpoint: AsyncFunctionType;
	readonly dotPath: string;
	readonly is$once: false;
	readonly is$update: false;
	readonly is$array: true;
	readonly is$entry: false;
	readonly is$object: false;
	readonly is$multiple: true;
	readonly is$arrayType: true;

	readonly prefillData: undefined | any[];
	readonly prefillFn: undefined | (() => any[] | Promise<any[]>);
	readonly entryFn: undefined;
	readonly entrySuccessFn: undefined;
	readonly keyFn: undefined;
	readonly keySuccessFn: undefined;
	readonly hasLoading: boolean;
	readonly hasRemove: boolean;
	readonly hasAbort: boolean;
	readonly hasAbortOnRemove: boolean;
	readonly beforeCallFn: undefined | beforeCallFn<any>;
	readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
	readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
};

export type $EntryStoreOpts = {
	readonly method: '$entry';
	readonly args: any[];
	readonly endpoint: AsyncFunctionType;
	readonly dotPath: string;
	readonly is$once: false;
	readonly is$update: false;
	readonly is$array: false;
	readonly is$entry: true;
	readonly is$object: false;
	readonly is$multiple: true;
	readonly is$arrayType: true;

	readonly prefillData: undefined | any[];
	readonly prefillFn: undefined | (() => any[] | Promise<any[]>);
	readonly entryFn: (input: object) => object;
	readonly entrySuccessFn: undefined | ((response: object) => object);
	readonly keyFn: undefined;
	readonly keySuccessFn: undefined;
	readonly hasLoading: boolean;
	readonly hasRemove: boolean;
	readonly hasAbort: boolean;
	readonly hasAbortOnRemove: boolean;
	readonly beforeCallFn: undefined | beforeCallFn<any>;
	readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
	readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
};

export type $ObjectStoreOpts = {
	readonly method: '$object';
	readonly args: any[];
	readonly endpoint: AsyncFunctionType;
	readonly dotPath: string;
	readonly is$once: false;
	readonly is$update: false;
	readonly is$array: false;
	readonly is$entry: false;
	readonly is$object: true;
	readonly is$multiple: true;
	readonly is$arrayType: false;

	readonly prefillData: undefined | any[];
	readonly prefillFn: undefined | (() => any[] | Promise<any[]>);
	readonly entryFn: undefined;
	readonly entrySuccessFn: undefined;
	readonly keyFn: (input: object) => string;
	readonly keySuccessFn: undefined | ((response: object) => string);
	readonly hasLoading: boolean;
	readonly hasRemove: boolean;
	readonly hasAbort: boolean;
	readonly hasAbortOnRemove: boolean;
	readonly beforeCallFn: undefined | beforeCallFn<any>;
	readonly beforeRemoveInputFn: undefined | beforeRemoveInputFn<any>;
	readonly beforeRemoveResponseFn: undefined | beforeRemoveResponseFn<any>;
};

export type AnyOnceStore = $OnceStore<any>;
export type AnyUpdateStore = $UpdateStore<any[], any, any, any, any>;
export type AnyArrayStore = $ArrayStore<any[], any, any, any, any>;
export type AnyEntryStore = $EntryStore<any[], any, any, any, any, any, any>;
export type AnyObjectStore = $ObjectStore<any[], any, any, any, any>;

export type AnyStore =
	| AnyOnceStore
	| AnyUpdateStore
	| AnyArrayStore
	| AnyEntryStore
	| AnyObjectStore;

// export type AnyNotOnceStore = AnyUpdateStore | AnyArrayStore | AnyEntryStore | AnyObjectStore;

// export type AnyNotOnceStoreInner =
// 	| $UpdateInner<any[], any, any, any>
// 	| $ArrayInner<any[], any, any, any>
// 	| $EntryInner<any[], any, any, any, any, any, any>
// 	| $ObjectInner<any[], any, any, any>;

export type AnyStoreOpts =
	| $OnceStoreOpts
	| $UpdateStoreOpts
	| $ArrayStoreOpts
	| $EntryStoreOpts
	| $ObjectStoreOpts;

// export type AnyNotOnceStoreOpts =
// 	| $UpdateStoreOpts
// 	| $ArrayStoreOpts
// 	| $EntryStoreOpts
// 	| $ObjectStoreOpts;

export type CallTracker = {
	response?: any;
	abortController?: undefined | AbortController;
	skip: boolean;
	index: string | number;
};
