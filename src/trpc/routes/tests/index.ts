import { t } from "$trpc/init";
import { z } from "zod";
import * as crypto from "crypto";
import { sleep, strContainsError } from "$trpc/functions";
export default t.router({
    getList: t.procedure.input(z.boolean().optional()).query(async function ({ input: throwErr }) {
        await sleep(0.3, 1);
        if (throwErr) {
            throw t.error("Error thrown as set");
        }
        const returnData = [];
        for (let i = 0; i < 10; i++) {
            returnData.push({
                date: new Date().toLocaleString("en-GB"),
                item: crypto.randomUUID() as string,
            });
        }
        return returnData;
    }),
    getItem: t.procedure.input(z.boolean().optional()).query(async function ({ input: throwErr }) {
        await sleep(0.3, 1);
        if (throwErr) {
            throw t.error("Error thrown as set");
        }
        return {
            date: new Date().toLocaleString("en-GB"),
            item: crypto.randomUUID() as string,
        };
    }),
    addToList: t.procedure
        .input(z.object({ item: z.string(), qty: z.coerce.number(), time: z.coerce.number().optional() }))
        .mutation(async function ({ input }) {
            await sleep(0.3, 1);
            if (input.time) {
                await sleep(input.time);
            }
            if (strContainsError(input.item)) {
                throw t.error(`Error adding item "${input.item}" to list.`, "FORBIDDEN");
            }
            return {
                date: new Date().toLocaleString("en-GB"),
                item: input.item,
            };
        }),

    friends: t.procedure.input(z.object({ friend1: z.string(), friend2: z.string() })).mutation(async function ({ input }) {
        return {
            date: new Date().toLocaleString("en-GB"),
            ...input,
        };
    }),
});
