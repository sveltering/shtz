import { z } from "zod";

export let add = z.object({
	friend1: z.string().max(8),
	friend2: z.string().max(8),
});

export let remove = add;
