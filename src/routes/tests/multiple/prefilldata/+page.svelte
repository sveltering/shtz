<script lang="ts">
    import LoadingDots from "$component/loading-dots.svelte";
    import { storeClient } from "$trpc/browserClient";

    import type { PageData } from "./$types";

    export let data: PageData;

    const multiple = storeClient.tests.addToList.mutate.$multiple({
        loading: true,
        //working
        prefill: data.prefill,
        //
        //
        //working
        // prefill: async function () {
        // 	return storeClient.tests.getItem.query.call();
        // }
        //working
        // prefill: {
        // 	date: new Date().toLocaleString('en-GB'),
        // 	item: '468e1822-44c2-4021-90f2-34d1e5c57763'
        // }

        methods: {
            test: function (response, merge) {
                merge(
                    {
                        data: {
                            date: "dsadsd",
                            item: "ejjeje",
                        },
                    },
                    true
                );
            },
        },
    });

    // console.clear();
    // $: console.log($multiple);
</script>

TEST: Data should already fill store<br />
{#if $multiple.loading}
    List item loading <LoadingDots /><br /><br />
{/if}
{#if $multiple.prefillError}
    {$multiple.prefillError.message}
{/if}
{#if $multiple.responses.length}
    {#each $multiple.responses as response, index}
        {#if response.loading}
            adding item <LoadingDots />
        {:else if response.success}
            {@const item = response.data}
            date: {item.date}<br />
            item: {item.item}<br />
            <button on:click={response.test}>Test</button>
            <br />
            <br />
        {:else}
            Error adding item
        {/if}
        <br />
    {/each}
{:else if !$multiple.responses.length}
    No items added yet
{:else}
    Store is stagnant
{/if}
