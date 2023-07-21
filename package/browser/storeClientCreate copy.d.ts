import type { AnyRouter } from "@trpc/server";
import type { StoreClientOpt, StoreCC } from "./types.js";
declare function storeClientCreate<Router extends AnyRouter>(options: StoreClientOpt): StoreCC<Router>;
export { storeClientCreate };
