import type { Writable } from 'svelte/store';
import type { TRPCClientError } from '@trpc/client';
import type {
	Prettify,
	Combine,
	Union,
	First,
	ArgumentTypes,
	FunctionType,
	AsyncReturnType,
	ToPromiseUnion,
	RequireOnlyOne
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

type $EntryOpts<Data, EntryLoading, EntrySuccess> = {
	prefill?: [EntrySuccess, Data][] | (() => ToPromiseUnion<[EntrySuccess, Data][]>);
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
	Data,
	Opts extends $EntryOpts<Data, EntryLoading, EntrySuccess>
> = (Opts['remove'] extends true ? { remove: () => void } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $EntryResponseInner<
	EntryLoading,
	EntrySuccess,
	Data,
	Opts extends $EntryOpts<Data, EntryLoading, EntrySuccess>
> =
	| SuccessResponse<[EntrySuccess, Data], $EntryExtension<EntryLoading, EntrySuccess, Data, Opts>>
	| ErrorResponse<
			$EntryExtension<EntryLoading, EntrySuccess, Data, Opts>,
			[EntryLoading, undefined]
	  >
	| (Opts['abort'] extends true
			? AbortedResponse<Omit<$EntryExtension<EntryLoading, EntrySuccess, Data, Opts>, 'aborted'>>
			: ErrorResponse<
					$EntryExtension<EntryLoading, EntrySuccess, Data, Opts>,
					[EntryLoading, undefined]
			  >)
	| (Opts['abort'] extends true
			? LoadingResponse<
					$EntryExtension<EntryLoading, EntrySuccess, Data, Opts> & {
						abort: () => void;
					},
					[EntryLoading, undefined]
			  >
			: LoadingResponse<
					$EntryExtension<EntryLoading, EntrySuccess, Data, Opts>,
					[EntryLoading, undefined]
			  >);

type $EntryInner<
	Args extends any[],
	EntryLoading,
	EntrySuccess,
	Data,
	Opts extends $EntryOpts<Data, EntryLoading, EntrySuccess>
> = {
	responses: Prettify<$EntryResponseInner<EntryLoading, EntrySuccess, Data, Opts>>[];
	call: (...args: Args) => void;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $EntryStore<
	Args extends any[],
	EntryLoading,
	EntrySuccess,
	Data,
	Opts extends $EntryOpts<Data, EntryLoading, EntrySuccess>
> = Writable<$EntryInner<Args, EntryLoading, EntrySuccess, Data, Opts>>;

type $EntryFn<Args extends any[], Data> = <
	EntryLoading extends {},
	EntrySuccess extends {},
	AdditionalEntry extends {},
	AdditionalData extends {},
	Opts extends $EntryOpts<
		Combine<Data, AdditionalData>,
		Combine<EntryLoading, AdditionalEntry>,
		Combine<First<EntrySuccess, EntryLoading>, AdditionalEntry>
	>
>(
	options?:
		| (Opts & {
				entry: (item: Data) => EntryLoading;
				entrySuccess?: (item: Data) => EntrySuccess;
				types?: {
					entry?: AdditionalEntry;
					data?: AdditionalData;
				};
		  })
		| ((item: Data) => EntryLoading)
) => $EntryStore<
	Args,
	Combine<EntryLoading, AdditionalEntry>,
	Combine<First<EntrySuccess, EntryLoading>, AdditionalEntry>,
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
				key: (item: Data) => string;
				keyAfter?: (item: Data) => string;
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
};
// & (Data extends any[]
// 	? {
// 			$format: $FormatFn<Args, Data>;
// 	  }
// 	: {});

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