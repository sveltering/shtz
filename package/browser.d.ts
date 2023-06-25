import type { AnyRouter } from '@trpc/server';
import type { browserClientOpt, browserClientOptF, browserFCC, browserOCC, loadClientOpt, loadCC, storeClientOpt, storeCC, EndpointReturnType } from './browser.types';
declare function browserClientCreate<T extends AnyRouter>(options: browserClientOptF): browserFCC<T>;
declare function browserClientCreate<T extends AnyRouter>(options: browserClientOpt): browserOCC<T>;
declare function loadClientCreate<T extends AnyRouter>(options: loadClientOpt): loadCC<T>;
declare function storeClientCreate<T extends AnyRouter, B extends boolean = false>(options: storeClientOpt<B>): storeCC<T, false>;
declare function storeClientCreate<T extends AnyRouter, B extends boolean = true>(options: storeClientOpt<B>): storeCC<T, true>;
export { browserClientCreate, storeClientCreate, loadClientCreate };
export type { EndpointReturnType };
