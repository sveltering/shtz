<script>
    import LoadingDots from "$component/loading-dots.svelte";
    import { storeClient } from "$trpc/browserClient";

    var shouldError = Math.random() < 0.5;

    const generateKey = () => Math.random().toString(36).substring(2, 12);

    const multiple = storeClient.tests.addToList.mutate.$multiple({
        loading: true,
        entry: function (input) {
            return input.item;
        },
    });

    function addRandom() {
        $multiple.call({
            item: "Test " + generateKey(),
            qty: 20,
            time: 3,
        });
    }

    console.clear();
    $: console.log($multiple);
</script>

{#if shouldError}
    TEST: Endpoint should error (keep refreshing for success response)
{:else}
    TEST: Endpoint should return data successfully (keep refreshing for error response)
{/if}
<br />
<button on:click={addRandom}>Add random item</button><br />
{#if $multiple.loading}
    List item loading <LoadingDots /><br /><br />
{/if}
{#if $multiple.error}
    {$multiple.error.message}
{:else if $multiple.responses.length}
    {#each $multiple.responses as response}
        {#if response.loading}
            adding item <LoadingDots />
        {:else if response.success}
            {@const item = response.data}
            date: {item.date}<br />
            item: {item.item}<br /><br />
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
