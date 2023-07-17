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
type $UpdateOpts<Data> = {
	prefill?: Data | (() => Data) | (() => Promise<Data | undefined>);
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeRemove?: (response?: Data) => boolean | Data | Promise<boolean | Data>;
	beforeAdd?: (response: Data) => boolean | Data | Promise<boolean | Data>;
};
type $UpdateExtension<Data, Opts extends $UpdateOpts<Data>> = (Opts['remove'] extends true
	? { remove: () => void }
	: {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $UpdateResponse<Data, Opts extends $UpdateOpts<Data>> =
	| StaleReponse<$UpdateExtension<Data, Opts>>
	| SuccessResponse<Data, $UpdateExtension<Data, Opts>>
	| ErrorResponse<$UpdateExtension<Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<$UpdateExtension<Data, Opts>>
			: ErrorResponse<$UpdateExtension<Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$UpdateExtension<Data, Opts> & { abort: () => void }>
			: LoadingResponse<$UpdateExtension<Data, Opts>>);

type $UpdateInner<Args extends any[], Data, Opts extends $UpdateOpts<Data>> = {
	call: (...args: Args) => void;
} & $UpdateResponse<Data, Opts>;

type $UpdateStore<Args extends any[], Data, Opts extends $UpdateOpts<Data>> = Writable<
	Prettify<$UpdateInner<Args, Data, Opts>>
>;
type $UpdateFn<Args extends any[], Data> = <
	AdditionalData,
	DataFinal extends Combine<Data, AdditionalData>,
	Opts extends $UpdateOpts<DataFinal>
>(
	options?: Opts & {
		types?: {
			data?: AdditionalData;
		};
	}
) => $UpdateStore<Args, DataFinal, Opts>;

/*
 * ARRAY STORE
 */

type $ArrayOpts<Data> = {
	prefill?: Data[] | (() => Data[]) | (() => Promise<Data[] | undefined>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeRemove?: (response: Data) => boolean | Data | Promise<boolean | Data>;
	beforeAdd?: (response: Data) => boolean | Data | Promise<boolean | Data>;
};
type $ArrayExtension<Data, Opts extends $ArrayOpts<Data>> = (Opts['remove'] extends true
	? { remove: () => void }
	: {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $ArrayResponseInner<Data, Opts extends $ArrayOpts<Data>> =
	| SuccessResponse<Data, $ArrayExtension<Data, Opts>>
	| ErrorResponse<$ArrayExtension<Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<Omit<$ArrayExtension<Data, Opts>, 'aborted'>>
			: ErrorResponse<$ArrayExtension<Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$ArrayExtension<Data, Opts> & { abort: () => void }>
			: LoadingResponse<$ArrayExtension<Data, Opts>>);

type $ArrayInner<Args extends any[], Data, Opts extends $ArrayOpts<Data>> = {
	responses: Prettify<$ArrayResponseInner<Data, Opts>>[];
	call: (...args: Args) => void;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $ArrayStore<Args extends any[], Data, Opts extends $ArrayOpts<Data>> = Writable<
	$ArrayInner<Args, Data, Opts>
>;
type $ArrayFn<Args extends any[], Data> = <
	AdditionalData,
	DataFinal extends Combine<Data, AdditionalData>,
	Opts extends $ArrayOpts<DataFinal>
>(
	options?: Opts & {
		types?: {
			data?: AdditionalData;
		};
	}
) => $ArrayStore<Args, DataFinal, Opts>;

/*
 * ENTRIES STORE
 */

type $EntryOpts<Data> = {
	prefill?: Data[] | (() => Data[]) | (() => Promise<Data[] | undefined>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeRemove?: (response: Data) => boolean | Data | Promise<boolean | Data>;
	beforeAdd?: (response: Data) => boolean | Data | Promise<boolean | Data>;
};
type $EntryExtension<Data, Opts extends $EntryOpts<Data>> = (Opts['remove'] extends true
	? { remove: () => void }
	: {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $EntryResponseInner<
	EntryLoading extends {},
	EntrySuccess extends {},
	Data,
	Opts extends $EntryOpts<Data>
> =
	| SuccessResponse<Data, $EntryExtension<Data, Opts> & { entry: EntrySuccess }>
	| ErrorResponse<$EntryExtension<Data, Opts> & { entry: EntryLoading }>
	| (Opts['abort'] extends true
			? AbortedResponse<
					Omit<$EntryExtension<Data, Opts>, 'aborted'> & {
						entry: EntryLoading;
					}
			  >
			: ErrorResponse<
					$EntryExtension<Data, Opts> & {
						entry: EntryLoading;
					}
			  >)
	| (Opts['abort'] extends true
			? LoadingResponse<
					$EntryExtension<Data, Opts> & {
						abort: () => void;
						entry: EntryLoading;
					}
			  >
			: LoadingResponse<
					$EntryExtension<Data, Opts> & {
						entry: EntryLoading;
					}
			  >);

type $EntryInner<
	Args extends any[],
	EntryLoading extends {},
	EntrySuccess extends {},
	Data,
	Opts extends $EntryOpts<Data>,
	DEBUG
> = {
	responses: Prettify<$EntryResponseInner<EntryLoading, EntrySuccess, Data, Opts>>[];
	call: (...args: Args) => void;
	readonly DEBUG?: DEBUG;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $EntryStore<
	Args extends any[],
	EntryLoading extends {},
	EntrySuccess extends {},
	Data,
	Opts extends $EntryOpts<Data>,
	DEBUG
> = Writable<$EntryInner<Args, EntryLoading, EntrySuccess, Data, Opts, DEBUG>>;

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
	Opts extends $EntryOpts<DataFinal>,
	DEBUG extends DataFinal
>(
	options?:
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
) => $EntryStore<Args, EntryLoadingFinal, EntrySuccessFinal, DataFinal, Opts, DEBUG>;

/*
 * OBJECT STORE
 */

type $ObjectOpts<Data> = {
	prefill?: Data[] | (() => Data[]) | (() => Promise<Data[] | undefined>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeAdd?: (response: Data) => boolean | Data | Promise<boolean | Data>;
	beforeRemove?: (response: Data) => boolean | Data | Promise<boolean | Data>;
};
type $ObjectExtension<Data, Opts extends $ObjectOpts<Data>> = (Opts['remove'] extends true
	? { remove: () => void }
	: {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $ObjectResponseInner<Data, Opts extends $ObjectOpts<Data>> =
	| SuccessResponse<Data, $ObjectExtension<Data, Opts>>
	| ErrorResponse<$ObjectExtension<Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<Omit<$ObjectExtension<Data, Opts>, 'aborted'>>
			: ErrorResponse<$ObjectExtension<Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$ObjectExtension<Data, Opts> & { abort: () => void }>
			: LoadingResponse<$ObjectExtension<Data, Opts>>);

type $ObjectInner<Args extends any[], Data, Opts extends $ObjectOpts<Data>> = {
	responses: { [key: string]: Prettify<$ObjectResponseInner<Data, Opts>> };
	call: (...args: Args) => void;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $ObjectStore<Args extends any[], Data, Opts extends $ObjectOpts<Data>> = Writable<
	$ObjectInner<Args, Data, Opts>
>;

type $ObjectFn<Args extends any[], Data> = <
	AdditionalData,
	DataFinal extends Combine<Data, AdditionalData>,
	Opts extends $ObjectOpts<DataFinal>
>(
	options?:
		| (Opts & {
				key: (input: Args[0]) => string;
				keySuccess?: (response: Data) => string;
				types?: {
					data?: AdditionalData;
				};
		  })
		| ((item: Data) => string)
) => $ObjectStore<Args, DataFinal, Opts>;
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

export type AnyOnceStore = $OnceStore<any>;
export type AnyUpdateStore = $UpdateStore<any, any, any>;
export type AnyArrayStore = $ArrayStore<any, any, any>;
export type AnyEntryStore = $EntryStore<any, any, any, any, any, any>;
export type AnyObjectStore = $ObjectStore<any, any, any>;

export type StoreOpts = {
	store: Writable<any>;
	method: any;
	args: any[];
	endpointArgs: any[];
	endpoint: AsyncFunctionType;
	dotPath: string;
	is$once: boolean;
	is$update: boolean;
	is$array: boolean;
	is$entry: boolean;
	is$object: boolean;
	is$multiple: boolean;

	prefillData: undefined | any;
	prefillFn: undefined | (() => any | Promise<any>);
	entryFn: undefined | ((input: object) => object);
	entrySuccessFn: undefined | ((response: object) => object);
	keyFn: undefined | ((input: object) => string);
	keySuccessFn: undefined | ((response: object) => string);
	hasLoading: boolean;
	hasRemove: boolean;
	hasAbort: boolean;
	hasAbortOnRemove: boolean;
	beforeRemoveFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
	beforeAddFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
};

export type $OnceStoreOpts = {
	store: AnyOnceStore;
	method: '$once';
	args: any[];
	endpointArgs: any[];
	endpoint: AsyncFunctionType;
	dotPath: string;
	is$once: true;
	is$update: false;
	is$array: false;
	is$entry: false;
	is$object: false;
	is$multiple: false;

	prefillData: undefined;
	prefillFn: undefined;
	entryFn: undefined;
	entrySuccessFn: undefined;
	keyFn: undefined;
	keySuccessFn: undefined;
	hasLoading: false;
	hasRemove: false;
	hasAbort: false;
	hasAbortOnRemove: false;
	beforeRemoveFn: undefined;
	beforeAddFn: undefined;
};

export type $UpdateStoreOpts = {
	store: AnyUpdateStore;
	method: '$update';
	args: any[];
	endpointArgs: any[];
	endpoint: AsyncFunctionType;
	dotPath: string;
	is$once: true;
	is$update: false;
	is$array: false;
	is$entry: false;
	is$object: false;
	is$multiple: false;

	prefillData: undefined | any;
	prefillFn: undefined | (() => any | Promise<any>);
	entryFn: undefined;
	entrySuccessFn: undefined;
	keyFn: undefined;
	keySuccessFn: undefined;
	hasLoading: false;
	hasRemove: boolean;
	hasAbort: boolean;
	hasAbortOnRemove: boolean;
	beforeRemoveFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
	beforeAddFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
};

export type $ArrayStoreOpts = {
	store: AnyArrayStore;
	method: '$array';
	args: any[];
	endpointArgs: any[];
	endpoint: AsyncFunctionType;
	dotPath: string;
	is$once: false;
	is$update: false;
	is$array: true;
	is$entry: false;
	is$object: false;
	is$multiple: true;

	prefillData: undefined | any[];
	prefillFn: undefined | (() => any[] | Promise<any[]>);
	entryFn: undefined;
	entrySuccessFn: undefined;
	keyFn: undefined;
	keySuccessFn: undefined;
	hasLoading: boolean;
	hasRemove: boolean;
	hasAbort: boolean;
	hasAbortOnRemove: boolean;
	beforeRemoveFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
	beforeAddFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
};

export type $EntryStoreOpts = {
	store: AnyEntryStore;
	method: '$entry';
	args: any[];
	endpointArgs: any[];
	endpoint: AsyncFunctionType;
	dotPath: string;
	is$once: false;
	is$update: false;
	is$array: false;
	is$entry: true;
	is$object: false;
	is$multiple: true;

	prefillData: undefined | any[];
	prefillFn: undefined | (() => any[] | Promise<any[]>);
	entryFn: (input: object) => object;
	entrySuccessFn: undefined | ((response: object) => object);
	keyFn: undefined;
	keySuccessFn: undefined;
	hasLoading: boolean;
	hasRemove: boolean;
	hasAbort: boolean;
	hasAbortOnRemove: boolean;
	beforeRemoveFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
	beforeAddFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
};

export type $ObjectStoreOpts = {
	store: AnyObjectStore;
	method: '$object';
	args: any[];
	endpointArgs: any[];
	endpoint: AsyncFunctionType;
	dotPath: string;
	is$once: false;
	is$update: false;
	is$array: false;
	is$entry: false;
	is$object: true;
	is$multiple: true;

	prefillData: undefined | any[];
	prefillFn: undefined | (() => any[] | Promise<any[]>);
	entryFn: undefined;
	entrySuccessFn: undefined;
	keyFn: (input: object) => string;
	keySuccessFn: undefined | ((response: object) => string);
	hasLoading: boolean;
	hasRemove: boolean;
	hasAbort: boolean;
	hasAbortOnRemove: boolean;
	beforeRemoveFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
	beforeAddFn: undefined | ((response: any) => boolean | any | Promise<boolean | any>);
};

export type AnyStoreOpts =
	| $OnceStoreOpts
	| $UpdateStoreOpts
	| $ArrayStoreOpts
	| $EntryStoreOpts
	| $ObjectStoreOpts;
