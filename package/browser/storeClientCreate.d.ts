import type { AnyRouter } from '@trpc/server';
import type { storeClientOpt, storeCC } from './types.js';
declare function storeClientCreate<T extends AnyRouter>(options: storeClientOpt): storeCC<T>;
export { storeClientCreate };
