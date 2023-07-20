<script>
    import LoadingDots from "$component/loading-dots.svelte";
    import { storeClient } from "$trpc/browserClient";

    const multiple = storeClient.tests.addToList.mutate.$multiple({
        loading: true,
        //working
        prefill: storeClient.tests.getList.query.call,
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

        entrySuccess: function (input) {
            return input;
        },
        methods: {
            test: function (response) {
                if (response.success) {
                    response.data.date = "POOOOOP";
                    return true;
                }
                return false;
            },
        },
    });

    // console.clear();
    // $: console.log($multiple);
</script>

TEST: Data should already fill store<br />
{#if $multiple.loading}
    List item loading <LoadingDots /><br />
{/if}
{#if $multiple.prefillError}
    Failed to prefil store <br />
    {$multiple.prefillError.message}
{/if}<br />
{#if $multiple.responses.length}
    {#each $multiple.responses as response}
        {#if response.loading}
            adding item <LoadingDots />
        {:else if response.success}
            {@const item = response.data}
            date: {item.date}<br />
            item: {item.item}
            <button on:click={response.test}>Test</button><br /><br />
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
