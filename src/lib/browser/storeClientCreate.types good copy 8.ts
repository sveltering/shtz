import type { Writable } from 'svelte/store';
import type { TRPCClientError } from '@trpc/client';
import type {
	Prettify,
	Combine,
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
type LoadingResponse<Ext extends {} = {}> = ResponseObject<true, false, false, undefined, Ext>;
type SuccessResponse<Data, Ext extends {} = {}> = ResponseObject<false, true, false, Data, Ext>;
type ErrorResponse<Ext extends {} = {}> = ResponseObject<false, false, Error, undefined, Ext>;
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
			: StaleReponse<$RevisableExtension<Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$RevisableExtension<Data, Opts> & { abort: () => void }>
			: LoadingResponse<$RevisableExtension<Data, Opts>>);

type $RevisableInner<Args extends any[], Data, Opts extends $RevisableOpts<Data>> = {
	call: (...args: Args) => void;
} & $RevisableResponse<Data, Opts>;

type $RevisableStore<Args extends any[], Data, Opts extends $RevisableOpts<Data>> = Writable<
	Prettify<$RevisableInner<Args, Data, Opts>>
>;
type $RevisableFn<Args extends any[], Data> = <Opts extends $RevisableOpts<Data>>(
	options?: Opts
) => $RevisableStore<Args, Data, Opts>;

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
	| StaleReponse<$ArrayExtension<Data, Opts>>
	| SuccessResponse<Data, $ArrayExtension<Data, Opts>>
	| ErrorResponse<$ArrayExtension<Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<Omit<$ArrayExtension<Data, Opts>, 'aborted'>>
			: StaleReponse<$ArrayExtension<Data, Opts>>)
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

type $EntryOpts<Data, Entry> = {
	prefill?: [Entry, Data][] | (() => ToPromiseUnion<[Entry, Data][]>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeRemove?: (response: Data) => ToPromiseUnion<boolean | Data>;
	beforeAdd?: (response: Data) => ToPromiseUnion<boolean | Data>;
};
type $EntryExtension<
	Entry,
	Data,
	Opts extends $EntryOpts<Data, Entry>
> = (Opts['remove'] extends true ? { remove: () => void } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $EntryResponseInner<Entry, Data, Opts extends $EntryOpts<Data, Entry>> =
	| StaleReponse<$EntryExtension<Entry, Data, Opts>>
	| SuccessResponse<[Entry, Data], $EntryExtension<Entry, Data, Opts>>
	| ErrorResponse<$EntryExtension<Entry, Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<Omit<$EntryExtension<Entry, Data, Opts>, 'aborted'>>
			: StaleReponse<$EntryExtension<Entry, Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$EntryExtension<Entry, Data, Opts> & { abort: () => void }>
			: LoadingResponse<$EntryExtension<Entry, Data, Opts>>);

type $EntryInner<Args extends any[], Entry, Data, Opts extends $EntryOpts<Data, Entry>> = {
	responses: Prettify<$EntryResponseInner<Entry, Data, Opts>>[];
	call: (...args: Args) => void;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $EntryStore<Args extends any[], Entry, Data, Opts extends $EntryOpts<Data, Entry>> = Writable<
	$EntryInner<Args, Entry, Data, Opts>
>;

type $EntryFn<Args extends any[], Data> = <
	Entry,
	AdditionalEntry,
	AdditionalData,
	Opts extends $EntryOpts<Combine<Data, AdditionalData>, Combine<Entry, AdditionalEntry>>
>(
	options?:
		| (Opts & {
				entry: (item: Data) => [Entry, Data];
				types?: {
					entry?: AdditionalEntry;
					data?: AdditionalData;
				};
		  })
		| ((item: Data) => [Entry, Data])
) => $EntryStore<Args, Combine<Entry, AdditionalEntry>, Combine<Data, AdditionalData>, Opts>;

/*
 * CHANGE PROCEDURES
 */
type NewStoreProcedures<Args extends any[], Data> = {
	call: $CallFn<Args, Data>;
	$once: $OnceFn<Args, Data>;
	$revise: $RevisableFn<Args, Data>;
	$array: $ArrayFn<Args, Data>;
	$entry: $EntryFn<Args, Data>;
	$object: any;
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
