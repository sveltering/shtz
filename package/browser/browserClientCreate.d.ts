import type { AnyRouter } from "@trpc/server";
import type { BrowserClientOpt, BrowserClientOptF, BrowserACC, BrowserOCC } from "./types.js";
declare function browserClientCreate<T extends AnyRouter>(options: BrowserClientOptF): BrowserACC<T>;
declare function browserClientCreate<T extends AnyRouter>(options: BrowserClientOpt): BrowserOCC<T>;
export { browserClientCreate };
