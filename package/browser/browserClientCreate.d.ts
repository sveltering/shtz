import type { AnyRouter } from '@trpc/server';
import type { browserClientOpt, browserClientOptF, browserFCC, browserOCC } from './types.js';
declare function browserClientCreate<T extends AnyRouter>(options: browserClientOptF): browserFCC<T>;
declare function browserClientCreate<T extends AnyRouter>(options: browserClientOpt): browserOCC<T>;
export { browserClientCreate };
