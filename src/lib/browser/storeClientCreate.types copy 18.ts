import type { Writable } from 'svelte/store';
import type { TRPCClientError } from '@trpc/client';
import type {
	Prettify,
	Combine,
	FirstEntry,
	ArgumentTypes,
	FunctionType,
	AsyncReturnType,
	ToPromiseUnion,
	EmptyObject
} from '../types.js';

type TRPCError = TRPCClientError<any>;

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
type $CallFn<Args extends any[], Data> = (...args: Args) => Promise<Data>;

/*
 * ONCE STORE
 */
type $OnceInner<Data> = LoadingResponse | SuccessResponse<Data> | ErrorResponse;
type $OnceStore<Data> = Writable<$OnceInner<Data>>;
type $OnceFn<Args extends any[], Data> = (...args: Args) => $OnceStore<Data>;

/*
 * FORMAT STORE
 */

type $FormatPrefillData<Data> = Data[] | (() => ToPromiseUnion<Data[]>);
type $FormatOpts<Data> = {
	prefill: $FormatPrefillData<Data>;
};

type $FormatResponse<Data, NewDataFormat, Opts extends $FormatOpts<Data>> =
	| StaleReponse
	| SuccessResponse<NewDataFormat>
	| ErrorResponse
	| AbortedResponse
	| LoadingResponse;

type $FormatInner<
	Args extends any[],
	Data,
	NewDataFormat,
	Opts extends $FormatOpts<Data>
> = $FormatOpts<Data>['prefill'] extends $FormatPrefillData<Data>
	? SuccessResponse<NewDataFormat>
	: {
			call: (...args: Args) => void;
	  } & $FormatResponse<Data, NewDataFormat, Opts>;

type $FormatStore<
	Args extends any[],
	Data,
	NewDataFormat,
	Opts extends $FormatOpts<Data>
> = Writable<Prettify<$FormatInner<Args, Data, NewDataFormat, Opts>>>;

type $FormatFn<Args extends any[], Data> = <
	KeyValue extends string,
	Entry extends {},
	Opts extends $FormatOpts<Data>
>(
	options?: Opts &
		(
			| {
					key: (response: Data) => KeyValue;
			  }
			| {
					entry: (response: Data) => Entry;
			  }
		)
) => $FormatStore<
	Args,
	Data,
	Entry extends EmptyObject ? (KeyValue extends string ? KeyValue : Data) : [Entry, Data][],
	Opts
>;
/*
 * REVISE STORE
 */
type $RevisableOpts<Data> = {
	prefill?: Data | (() => ToPromiseUnion<Data>);
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
};
type $RevisableExtension<Data, Opts extends $RevisableOpts<Data>> = (Opts['remove'] extends true
	? { remove: () => void }
	: {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $RevisableResponse<Data, Opts extends $RevisableOpts<Data>> =
	| StaleReponse<$RevisableExtension<Data, Opts>>
	| SuccessResponse<Data, $RevisableExtension<Data, Opts>>
	| ErrorResponse<$RevisableExtension<Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<$RevisableExtension<Data, Opts>>
			: ErrorResponse<$RevisableExtension<Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$RevisableExtension<Data, Opts> & { abort: () => void }>
			: LoadingResponse<$RevisableExtension<Data, Opts>>);

type $RevisableInner<Args extends any[], Data, Opts extends $RevisableOpts<Data>> = {
	call: (...args: Args) => void;
} & $RevisableResponse<Data, Opts>;

type $RevisableStore<Args extends any[], Data, Opts extends $RevisableOpts<Data>> = Writable<
	Prettify<$RevisableInner<Args, Data, Opts>>
>;
type $RevisableFn<Args extends any[], Data> = <
	AdditionalData,
	Opts extends $RevisableOpts<Combine<Data, AdditionalData>>
>(
	options?: Opts & {
		types?: {
			data?: AdditionalData;
		};
	}
) => $RevisableStore<Args, Combine<Data, AdditionalData>, Opts>;

/*
 * ARRAY STORE
 */

type $ArrayOpts<Data> = {
	prefill?: Data[] | (() => ToPromiseUnion<Data[]>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeRemove?: (response: Data) => ToPromiseUnion<boolean | Data>;
	beforeAdd?: (response: Data) => ToPromiseUnion<boolean | Data>;
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
	Opts extends $ArrayOpts<Combine<Data, AdditionalData>>
>(
	options?: Opts & {
		types?: {
			data?: AdditionalData;
		};
	}
) => $ArrayStore<Args, Combine<Data, AdditionalData>, Opts>;

/*
 * ENTRIES STORE
 */

type $EntryOpts<Data, EntryLoading, EntrySuccess, EntryFinal> = {
	prefill?: [EntryFinal, Data][] | (() => ToPromiseUnion<[EntryFinal, Data][]>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeRemove?: (response: Data) => ToPromiseUnion<boolean | Data>;
	beforeAdd?: (response: Data) => ToPromiseUnion<boolean | Data>;
};
type $EntryExtension<
	EntryLoading,
	EntrySuccess,
	EntryFinal,
	Data,
	Opts extends $EntryOpts<Data, EntryLoading, EntrySuccess, EntryFinal>
> = (Opts['remove'] extends true ? { remove: () => void } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $EntryResponseInner<
	EntryLoading,
	EntrySuccess,
	EntryFinal,
	Data,
	Opts extends $EntryOpts<Data, EntryLoading, EntrySuccess, EntryFinal>
> =
	| SuccessResponse<
			[EntrySuccess, Data],
			$EntryExtension<EntryLoading, EntrySuccess, EntryFinal, Data, Opts>
	  >
	| ErrorResponse<
			$EntryExtension<EntryLoading, EntrySuccess, EntryFinal, Data, Opts>,
			[EntryLoading, undefined]
	  >
	| (Opts['abort'] extends true
			? AbortedResponse<
					Omit<$EntryExtension<EntryLoading, EntrySuccess, EntryFinal, Data, Opts>, 'aborted'>
			  >
			: ErrorResponse<
					$EntryExtension<EntryLoading, EntrySuccess, EntryFinal, Data, Opts>,
					[EntryLoading, undefined]
			  >)
	| (Opts['abort'] extends true
			? LoadingResponse<
					$EntryExtension<EntryLoading, EntrySuccess, EntryFinal, Data, Opts> & {
						abort: () => void;
					},
					[EntryLoading, undefined]
			  >
			: LoadingResponse<
					$EntryExtension<EntryLoading, EntrySuccess, EntryFinal, Data, Opts>,
					[EntryLoading, undefined]
			  >);

type $EntryInner<
	Args extends any[],
	EntryLoading,
	EntrySuccess,
	EntryFinal,
	Data,
	Opts extends $EntryOpts<Data, EntryLoading, EntrySuccess, EntryFinal>
> = {
	responses: Prettify<$EntryResponseInner<EntryLoading, EntrySuccess, EntryFinal, Data, Opts>>[];
	call: (...args: Args) => void;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $EntryStore<
	Args extends any[],
	EntryLoading,
	EntrySuccess,
	EntryFinal,
	Data,
	Opts extends $EntryOpts<Data, EntryLoading, EntrySuccess, EntryFinal>
> = Writable<$EntryInner<Args, EntryLoading, EntrySuccess, EntryFinal, Data, Opts>>;

type $EntryFn<Args extends any[], Data> = <
	EntryLoading extends {},
	EntrySuccess extends {},
	AdditionalEntry extends {},
	AdditionalData extends {},
	Opts extends $EntryOpts<
		Combine<Data, AdditionalData>,
		Combine<EntryLoading, AdditionalEntry>,
		Combine<EntrySuccess, AdditionalEntry>,
		EntrySuccess & EntryLoading
	>
>(
	options?:
		| (Opts & {
				entry: (input: Args[0]) => EntryLoading;
				entrySuccess?: (response: Data) => EntrySuccess;
				types?: {
					entry?: AdditionalEntry;
					data?: AdditionalData;
				};
		  })
		| ((item: Data) => EntryLoading)
) => $EntryStore<
	Args,
	Combine<EntryLoading, AdditionalEntry>,
	Combine<EntrySuccess, AdditionalEntry>,
	EntrySuccess & EntryLoading,
	Combine<Data, AdditionalData>,
	Opts
>;

/*
 * Object STORE
 */

type $ObjectOpts<Data> = {
	prefill?: { [key: string]: Data } | (() => ToPromiseUnion<{ [key: string]: Data }>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeRemove?: (response: Data) => ToPromiseUnion<boolean | Data>;
	beforeAdd?: (response: Data) => ToPromiseUnion<boolean | Data>;
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
	Opts extends $ObjectOpts<Combine<Data, AdditionalData>>
>(
	options?:
		| (Opts & {
				key: (input: Args[0]) => string;
				keyAfter?: (response: Data) => string;
				types?: {
					data?: AdditionalData;
				};
		  })
		| ((item: Data) => string)
) => $ObjectStore<Args, Combine<Data, AdditionalData>, Opts>;
/*
 * CHANGE PROCEDURES
 */
type NewStoreProcedures<Args extends any[], Data> = {
	call: $CallFn<Args, Data>;
	$once: $OnceFn<Args, Data>;
	$revise: $RevisableFn<Args, Data>;
	$array: $ArrayFn<Args, Data>;
	$entry: $EntryFn<Args, Data>;
	$object: $ObjectFn<Args, Data>;
} & (Data extends any[] ? { $format: $FormatFn<Args, Data[0]> } : {});

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
