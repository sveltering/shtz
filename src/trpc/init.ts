import { TRPC } from "@sveltering/shtz/server";

export const t = new TRPC({
	origin: "http://localhost:5001",
	bypassOrigin: "http://localhost:5001",
	path: "/trpc",
});
