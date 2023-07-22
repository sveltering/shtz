<script lang="ts">
    import LoadingDots from "$component/loading-dots.svelte";
    import { storeClient } from "$trpc/browserClient";
    import { z } from "zod";
    import Inputs from "./inputs.svelte";
    console.clear();

    const store = storeClient.tests.friends.mutate.$multiple({
        loading: true,
        remove: true,
        zod: z.object({ friend1: z.string().max(8), friend2: z.string().max(8) }),
        uniqueMethod: "replace",
        addMethod: "start",
        changeTimer: 1000,
        abortOnRemove: true,
        entry: function (input) {
            return input;
        },
        unique: function (input, response) {
            if (input) {
                let { friend1, friend2 } = input;
                friend1 = friend1.toLocaleLowerCase();
                friend2 = friend2.toLocaleLowerCase();
                return { friend1, friend2 };
            }
            if (response) {
                let { friend1, friend2 } = response;
                friend1 = friend1.toLocaleLowerCase();
                friend2 = friend2.toLocaleLowerCase();
                return { friend1, friend2 };
            }
        },
    });
</script>

{#if $store.loading}
    Adding Friends <LoadingDots />
{/if}
<Inputs {store} />
<br />
<table border={1}>
    <thead>
        <tr>
            <th>Friend 1</th>
            <th>Friend 2</th>
            <th>Date</th>
            <th>Remove</th>
        </tr>
    </thead>
    <tbody>
        {#each $store.responses as response}
            {#if response.loading}
                {@const entry = response.entry}
                <tr class:loading={response.changed && response.loading}>
                    <td>{entry.friend1}</td>
                    <td>{entry.friend2}</td>
                    <td>Adding <LoadingDots /></td>
                    <td><button on:click={response.remove}>remove</button></td>
                </tr>
            {:else if response.success}
                {@const data = response.data}
                <tr class:successed={response.changed && response.success}>
                    <td>{data.friend1}</td>
                    <td>{data.friend2}</td>
                    <td>{data.date}</td>
                    <td><button on:click={response.remove}>remove</button></td>
                </tr>
            {:else if response.error && response.error.name === "ZodError"}
                {@const error = response.error}
                <tr class:errored={response.changed && response.error}>
                    <td colspan="3">
                        {#each error?.issues as issue}
                            {issue.message}<br />
                        {/each}
                    </td>
                    <td><button on:click={response.remove}>remove</button></td>
                </tr>
            {/if}
        {/each}
    </tbody>
</table>

<style>
    tr {
        background-color: transparent;
        transition: background-color 1s linear;
    }
    tr.loading {
        background-color: rgb(167, 216, 240);
        transition: background-color 1s linear;
    }
    tr.successed {
        background-color: rgb(163, 233, 163);
        transition: background-color 1s linear;
    }
    tr.errored {
        background-color: rgb(251, 129, 105);
        transition: background-color 1s linear;
    }
    tr td,
    tr th {
        padding: 5px;
    }
</style>
