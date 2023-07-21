import type { AnyRouter } from "@trpc/server";
import type { LoadClientOpt, LoadCC } from "./types.js";
declare function loadClientCreate<T extends AnyRouter>(options: LoadClientOpt): LoadCC<T>;
export { loadClientCreate };
