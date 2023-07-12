import type { AnyRouter } from '@trpc/server';
import type { loadClientOpt, loadCC } from './types.js';
declare function loadClientCreate<T extends AnyRouter>(options: loadClientOpt): loadCC<T>;
export { loadClientCreate };
