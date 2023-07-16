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
type $RevisableOpts<Args extends any[], Data> = {
	prefill?: Data | (() => ToPromiseUnion<Data>);
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
};
type $RevisableExtension<Args extends any[], Data, Opts extends $RevisableOpts<Args, Data>> = {
	call: (...args: Args) => void;
} & (Opts['remove'] extends true ? { remove: () => void } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $RevisableInner<Args extends any[], Data, Opts extends $RevisableOpts<Args, Data>> =
	| StaleReponse<$RevisableExtension<Args, Data, Opts>>
	| SuccessResponse<Data, $RevisableExtension<Args, Data, Opts>>
	| ErrorResponse<$RevisableExtension<Args, Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<$RevisableExtension<Args, Data, Opts>>
			: StaleReponse<$RevisableExtension<Args, Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$RevisableExtension<Args, Data, Opts> & { abort: () => void }>
			: LoadingResponse<$RevisableExtension<Args, Data, Opts>>);

type $RevisableStore<Args extends any[], Data, Opts extends $RevisableOpts<Args, Data>> = Writable<
	Prettify<$RevisableInner<Args, Data, Opts>>
>;
type $RevisableFn<Args extends any[], Data> = <Opts extends $RevisableOpts<Args, Data>>(
	options?: Opts
) => $RevisableStore<Args, Data, Opts>;

/*
 * ARRAY STORE
 */

// type $ArrayOpts<Data> = {
// 	prefill?: Data[] | (() => ToPromiseUnion<Data[]>);
// 	loading?: boolean;
// 	remove?: boolean;
// 	abort?: boolean;
// 	abortOnRemove?: boolean;
// 	beforeRemove?: (response: Data) => ToPromiseUnion<boolean | Data>;
// 	beforeAdd?: (response: Data) => ToPromiseUnion<boolean | Data>;
// };
// type $ArrayExtension<
// 	Args extends any[],
// 	Data,
// 	Opts extends $ArrayOpts<Data>
// > = (Opts['remove'] extends true ? { remove: () => void } : {}) &
// 	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
// 	(Opts['abort'] extends true ? { aborted: false } : {});

// type $ArrayResponseInner<Args extends any[], Data, Opts extends $ArrayOpts<Data>> =
// 	| StaleReponse<$ArrayExtension<Args, Data, Opts>>
// 	| SuccessResponse<Data, $ArrayExtension<Args, Data, Opts>>
// 	| ErrorResponse<$ArrayExtension<Args, Data, Opts>>
// 	| (Opts['abort'] extends true
// 			? AbortedResponse<Omit<$ArrayExtension<Args, Data, Opts>, 'aborted'>>
// 			: StaleReponse<$ArrayExtension<Args, Data, Opts>>)
// 	| (Opts['abort'] extends true
// 			? LoadingResponse<$ArrayExtension<Args, Data, Opts> & { abort: () => void }>
// 			: LoadingResponse<$ArrayExtension<Args, Data, Opts>>);

// type $ArrayInner<Args extends any[], Data, Opts extends $ArrayOpts<Data>> = {
// 	responses: Prettify<$ArrayResponseInner<Args, Data, Opts>>[];
// 	call: (...args: Args) => void;
// } & (Opts['loading'] extends true ? { loading: false } : {});

// type $ArrayStore<Args extends any[], Data, Opts extends $ArrayOpts<Data>> = Writable<
// 	$ArrayInner<Args, Data, Opts>
// >;
// type $ArrayFn<Args extends any[], Data> = <
// 	AdditionalData extends {},
// 	Opts extends $ArrayOpts<Combine<Data, AdditionalData>>
// >(
// 	options?: Opts,
// 	additional?: AdditionalData
// ) => $ArrayStore<Args, Combine<Data, AdditionalData>, Opts>;

/*
 * ARRAY STORE
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
	Args extends any[],
	Entry,
	Data,
	Opts extends $EntryOpts<Data, Entry>
> = (Opts['remove'] extends true ? { remove: () => void } : {}) &
	(Opts['abortOnRemove'] extends true ? { remove: () => void } : {}) &
	(Opts['abort'] extends true ? { aborted: false } : {});

type $EntryResponseInner<Args extends any[], Entry, Data, Opts extends $EntryOpts<Data, Entry>> =
	| StaleReponse<$EntryExtension<Args, Entry, Data, Opts>>
	| SuccessResponse<Data, $EntryExtension<Args, Entry, Data, Opts>>
	| ErrorResponse<$EntryExtension<Args, Entry, Data, Opts>>
	| (Opts['abort'] extends true
			? AbortedResponse<Omit<$EntryExtension<Args, Entry, Data, Opts>, 'aborted'>>
			: StaleReponse<$EntryExtension<Args, Entry, Data, Opts>>)
	| (Opts['abort'] extends true
			? LoadingResponse<$EntryExtension<Args, Entry, Data, Opts> & { abort: () => void }>
			: LoadingResponse<$EntryExtension<Args, Entry, Data, Opts>>);

type $EntryInner<Args extends any[], Entry, Data, Opts extends $EntryOpts<Data, Entry>> = {
	responses: Prettify<$EntryResponseInner<Args, Entry, Data, Opts>>[];
	call: (...args: Args) => void;
} & (Opts['loading'] extends true ? { loading: false } : {});

type $EntryStore<Args extends any[], Entry, Data, Opts extends $EntryOpts<Data, Entry>> = Writable<
	$EntryInner<Args, Entry, Data, Opts>
>;

type $EntryFn<Args extends any[], Data> = <Entry, Opts extends $EntryOpts<Data, Entry>>(
	entry: (item: Data) => [Entry, Data],
	options?: Opts
) => $EntryStore<Args, Entry, Data, Opts>;

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