import {
	loadClientCreate,
	storeClientCreate,
	browserClientCreate,
	type ProcedureReturnType,
} from "@sveltering/shtz/browser";
import type { Router } from "$trpc/hooks";

export const loadClient = loadClientCreate<Router>({
	url: "http://localhost:5001/trpc",
});

export const storeClient = storeClientCreate<Router>({
	url: "http://localhost:5001/trpc",
});

export const browserClient = browserClientCreate<Router>({
	url: "http://localhost:5001/trpc",
});

export type { ProcedureReturnType };
