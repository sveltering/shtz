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
import type { ZodTypeAny, ZodError } from "zod";
import type { TRPCClientError } from "@trpc/client";

type ResponseObject<
	Loading extends boolean,
	Success extends boolean,
	Err extends false | ErrorTypes,
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

type ErrorTypes = Error | ZodError | TRPCClientError<any>;

type StaleReponse<Ext extends {} = {}> = ResponseObject<
	false,
	false,
	false,
	undefined,
	Ext
>;

type LoadingResponse<Ext extends {} = {}, Data = undefined> = ResponseObject<
	true,
	false,
	false,
	Data,
	Ext
>;

type SuccessResponse<Data, Ext extends {} = {}> = ResponseObject<
	false,
	true,
	false,
	Data,
	Ext
>;

type ErrorResponse<Ext extends {} = {}, Data = undefined> = ResponseObject<
	false,
	false,
	ErrorTypes,
	Data,
	Ext
>;

type AbortedResponse<Ext extends {} = {}> = StaleReponse<
	{ aborted: true } & Omit<Ext, "aborted">
>;

type ReplaceInputFn<Input> = (newInput: Input) => Input;

type BeforeCallFn<Input> = (
	input: Input,
	replaceInput: ReplaceInputFn<Input>
) => boolean | void | Promise<boolean | void>;

type AdditionalMethodFn<Response> = (
	response: Response,
	remove: () => { remove: "REMOVE" }
) =>
	| Response
	| boolean
	| { remove: "REMOVE" }
	| Promise<Response | boolean | { remove: "REMOVE" }>;

type AdditionalMethods<Methods extends {}, Response> = {
	[key in keyof Methods]: AdditionalMethodFn<Response>;
};

type AdditionalMethodsFinal<Methods extends { [key: string]: FunctionType }> = {
	[key in keyof Methods]: () => void | Promise<void>;
};

/*
 * CALL
 */
type $CallFn<Args extends any[], Data> = (
	...args: Args
) => Promise<Data | undefined>;

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
	zod?: ZodTypeAny;
};
type $ManyExtension<
	Input,
	Data,
	Opts extends $ManyOpts<Input, Data>
> = (Opts["remove"] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts["abortOnRemove"] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts["abort"] extends true ? { aborted: false } : {});

type $ManyResponse<
	Input,
	EntryLoading extends {},
	EntrySuccess extends {},
	Data,
	Opts extends $ManyOpts<Input, Data>
> =
	| StaleReponse<$ManyExtension<Input, Data, Opts> & { entry: {} }>
	| SuccessResponse<
			Data,
			$ManyExtension<Input, Data, Opts> & { entry: EntrySuccess }
	  >
	| ErrorResponse<$ManyExtension<Input, Data, Opts> & { entry: EntryLoading }>
	| (Opts["abort"] extends true
			? AbortedResponse<
					$ManyExtension<Input, Data, Opts> & { entry: EntryLoading }
			  >
			: ErrorResponse<
					$ManyExtension<Input, Data, Opts> & { entry: EntryLoading }
			  >)
	| (Opts["abort"] extends true
			? LoadingResponse<
					$ManyExtension<Input, Data, Opts> & {
						abort: () => void;
						entry: EntryLoading;
					}
			  >
			: LoadingResponse<
					$ManyExtension<Input, Data, Opts> & { entry: EntryLoading }
			  >);

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
	fill: (data: Data | (() => Data) | (() => Promise<Data | undefined>)) => void;
	// readonly DEBUG?: DEBUG;
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
> = Writable<
	$ManyInner<
		Args,
		Input,
		EntryLoading,
		EntrySuccess,
		Data,
		Methods,
		Opts,
		DEBUG
	>
>;

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
	EntryLoadingFinal extends $TypeMake<
		EntryLoading,
		AndEntryLoading,
		OrEntryLoading
	>,
	EntrySuccessFinal extends $TypeMake<
		FirstNotEmpty<EntrySuccess, EntryLoading>,
		AndEntrySuccess,
		OrEntrySuccess
	>,
	DataFinal extends $TypeMake<Data, AndData, OrData>,
	Response extends $ManyResponse<
		Input,
		EntryLoadingFinal,
		EntrySuccessFinal,
		DataFinal,
		Opts
	>,
	Opts extends $ManyOpts<Args[0], DataFinal>,
	Methods extends {},
	MethodsFinal extends AdditionalMethodsFinal<Methods>,
	DEBUG extends {}
>(
	options?: Opts & {
		entry?: (input: Input) => EntryLoading;
		entrySuccess?: (
			response: DataFinal,
			lastEntry: EntryLoadingFinal extends EmptyObject
				? undefined
				: EntryLoadingFinal
		) => EntrySuccess;
		methods?: Methods & {
			[key: string]: AdditionalMethodFn<Response>;
		};
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
) => $ManyStore<
	Args,
	Input,
	EntryLoadingFinal,
	EntrySuccessFinal,
	DataFinal,
	MethodsFinal,
	Opts,
	DEBUG
>;

/*
 * ENTRIES STORE
 */

type $MultipleOpts<Input, Data> = {
	prefill?:
		| Data
		| Data[]
		| (() => Data | Data[])
		| (() => Promise<Data | Data[] | undefined>);
	loading?: boolean;
	remove?: boolean;
	abort?: boolean;
	abortOnRemove?: boolean;
	beforeCall?: BeforeCallFn<Input>;
	zod?: ZodTypeAny;
	uniqueResponse?: "remove" | "replace";
	addResponse?: "start" | "end";
	changeTimer?: number;
};
type $MultipleExtension<
	Input,
	Data,
	Opts extends $MultipleOpts<Input, Data>
> = (Opts["remove"] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts["abortOnRemove"] extends true ? { remove: () => Promise<void> } : {}) &
	(Opts["abort"] extends true ? { aborted: false } : {}) &
	(Opts["changeTimer"] extends number ? { changed: boolean } : {});

type $MultipleResponseInner<
	Input,
	EntryLoading extends {},
	EntrySuccess extends {},
	Data,
	Methods,
	Opts extends $MultipleOpts<Input, Data>
> =
	| SuccessResponse<
			Data,
			Methods & $MultipleExtension<Input, Data, Opts> & { entry: EntrySuccess }
	  >
	| ErrorResponse<
			Methods & $MultipleExtension<Input, Data, Opts> & { entry: EntryLoading }
	  >
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
	prefillError?: ErrorTypes;
	responses: $MultipleResponseInner<
		Input,
		EntryLoading,
		EntrySuccess,
		Data,
		Methods,
		Opts
	>[];
	call: (...args: Args) => void;
	fill: (
		data:
			| Data
			| Data[]
			| (() => Data | Data[])
			| (() => Promise<Data | Data[] | undefined>)
	) => void;
	// readonly DEBUG?: DEBUG;
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
> = Writable<
	$MultipleInner<
		Args,
		Input,
		EntryLoading,
		EntrySuccess,
		Data,
		Methods,
		Opts,
		DEBUG
	>
>;

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
	EntryLoadingFinal extends $TypeMake<
		EntryLoading,
		AndEntryLoading,
		OrEntryLoading
	>,
	EntrySuccessFinal extends $TypeMake<
		FirstNotEmpty<EntrySuccess, EntryLoading>,
		AndEntrySuccess,
		OrEntrySuccess
	>,
	DataFinal extends $TypeMake<Data, AndData, OrData>,
	Opts extends $MultipleOpts<Input, DataFinal>,
	Response extends $MultipleResponseInner<
		Input,
		EntryLoadingFinal,
		EntrySuccessFinal,
		DataFinal,
		{},
		Opts
	>,
	Methods extends {},
	MethodsFinal extends AdditionalMethodsFinal<Methods>,
	DEBUG extends {}
>(
	options?: Opts & {
		entry?: (input: Input) => EntryLoading;
		entrySuccess?: (
			response: DataFinal,
			lastEntry: EntryLoadingFinal extends EmptyObject
				? undefined
				: EntryLoadingFinal
		) => EntrySuccess;
		methods?: Methods & {
			[key: string]: AdditionalMethodFn<Response>;
		};
		unique?: (
			input?: Input,
			data?: DataFinal
		) => void | undefined | string | number | KeyValueObject;
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
) => $MultipleStore<
	Args,
	Input,
	EntryLoadingFinal,
	EntrySuccessFinal,
	DataFinal,
	MethodsFinal,
	Opts,
	DEBUG
>;

/*
 * CHANGE PROCEDURES
 */
type NewStoreProcedures<Args extends any[], Data> = {
	call: $CallFn<Args, Data>;
	$once: $OnceFn<Args, Data>;
	$many: $ManyFn<Args, Data>;
	$multiple: $MultipleFn<Args, Data>;
};

type ChangeProceduresType<
	Client extends object,
	Key extends keyof Client
> = Client[Key] extends FunctionType
	? Key extends "query" | "mutate"
		? NewStoreProcedures<
				ArgumentTypes<Client[Key]>,
				AsyncReturnType<Client[Key]>
		  >
		: ChangeAllProcedures<Client[Key]>
	: ChangeAllProcedures<Client[Key]>;

type RemoveSubscribeProcedures<
	Client extends object,
	Key extends keyof Client
> = Client[Key] extends FunctionType
	? Key extends "subscribe"
		? never
		: Key
	: Key;

type ChangeAllProcedures<Client> = Client extends object
	? {
			[Key in keyof Client as RemoveSubscribeProcedures<
				Client,
				Key
			>]: ChangeProceduresType<Client, Key>;
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
	readonly entrySuccessFn:
		| undefined
		| ((response: {}, lastEntry: undefined | {}) => {});
	readonly uniqueFn: undefined | ((input: any, response: any) => any);
	readonly uniqueResponse: undefined | "remove" | "replace";
	readonly addResponse: undefined | "start" | "end";
	readonly hasLoading: boolean;
	readonly hasRemove: boolean;
	readonly hasAbort: boolean;
	readonly hasAbortOnRemove: boolean;
	readonly beforeCallFn: undefined | BeforeCallFn<any>;
	readonly methodsFns: AdditionalMethods<any, any>;
	readonly uniqueTracker: any[];
	readonly zod: any;
	readonly changeTimer: undefined;
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
	readonly uniqueFn: undefined;
	readonly uniqueResponse: undefined;
	readonly addResponse: undefined;
	readonly hasLoading: false;
	readonly hasRemove: false;
	readonly hasAbort: false;
	readonly hasAbortOnRemove: false;
	readonly beforeCallFn: undefined;
	readonly methodsFns: AdditionalMethods<any, any>;
	readonly uniqueTracker: any[];
	readonly zod: any;
	readonly changeTimer: undefined;
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
	readonly uniqueFn: undefined;
	readonly uniqueResponse: undefined;
	readonly addResponse: undefined;
	readonly entryUnique: false;
	readonly hasLoading: false;
	readonly hasRemove: boolean;
	readonly hasAbort: boolean;
	readonly hasAbortOnRemove: boolean;
	readonly beforeCallFn: undefined | BeforeCallFn<any>;
	readonly methodsFns: AdditionalMethods<any, any>;
	readonly uniqueTracker: any[];
	readonly zod: any;
	readonly changeTimer: number;
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
	readonly entrySuccessFn:
		| undefined
		| ((response: {}, lastEntry: undefined | {}) => {});
	readonly uniqueFn: undefined | ((input: any, response: any) => any);
	readonly uniqueResponse: "remove" | "replace";
	readonly addResponse: "start" | "end";
	readonly hasLoading: boolean;
	readonly hasRemove: boolean;
	readonly hasAbort: boolean;
	readonly hasAbortOnRemove: boolean;
	readonly beforeCallFn: undefined | BeforeCallFn<any>;
	readonly methodsFns: AdditionalMethods<any, any>;
	readonly uniqueTracker: any[];
	readonly zod: any;
	readonly changeTimer: number;
};

export type AnyOnceStore = $OnceStore<any>;
export type AnyManyStore = $ManyStore<any[], any, any, any, any, any, any, any>;
export type AnyMultipleStore = $MultipleStore<
	any[],
	any,
	any,
	any,
	any,
	any,
	any,
	any
>;

export type AnyStore = AnyOnceStore | AnyManyStore | AnyMultipleStore;

export type AnyStoreOpts = $OnceStoreOpts | $ManyStoreOpts | $MultipleStoreOpts;

export type CallTracker = {
	// input: any;
	skip?: boolean;
	removed?: boolean;
	index: number;
	// responseInner: any;
	abortController?: undefined | AbortController;
	isLastPrefill?: boolean;
	uniqueKey?: any;
	timeout?: number | null;
};
