<script lang="ts">
	import LoadingDots from "$component/loading-dots.svelte";
	import Inputs from "$component/inputs.svelte";
	import { storeClient } from "$trpc/browserClient";
	import { add as addSchema } from "$trpc/routes/friends/schema.js";
	import { ZodError, z } from "zod";

	import type { PageData } from "./$types";
	export let data: PageData;

	const store = storeClient.friends.add.mutate.$multiple({
		prefill: data?.prefill || [],
		loading: true,
		remove: true,
		abortOnRemove: true,
		zod: addSchema,
		uniqueResponse: "replace",
		addResponse: "start",
		changeTimer: 1000,
		entry: function (input) {
			return input;
		},
		entrySuccess: function (response) {
			const { friend1, friend2 } = response;
			return { friend1, friend2 };
		},
		unique: function (input, response) {
			if (input) {
				let { friend1, friend2 } = input;
				friend1 = friend1.toLowerCase();
				friend2 = friend2.toLowerCase();
				return { friend1, friend2 };
			}
			if (response) {
				let { friend1, friend2 } = response;
				friend1 = friend1.toLowerCase();
				friend2 = friend2.toLowerCase();
				return { friend1, friend2 };
			}
		},
		methods: {
			removeSuccessfullResponse: async function (response, actions) {
				if (response.success) {
					response.entry.removing = true;
					actions.update();
					let removed = await storeClient.friends.remove.query.call({
						friend1: response.entry.friend1,
						friend2: response.entry.friend2,
					});
					if (removed) {
						actions.remove();
					} else {
						response.entry.removing = false;
						actions.update();
					}
				}
			},
		},
		types: {
			andEntrySuccess: null as any as {
				removing: boolean;
			},
		},
	});
</script>

{#if $store.loading}
	Adding Friends <LoadingDots />
{/if}
<Inputs {store} />
Not sure what's happening? (Keep pressing enter 🤫)
<br />
Try entering duplicate input for Friend 1 and Friend 2
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
					<td colspan="2">Adding <LoadingDots /></td>
				</tr>
			{:else if response.success}
				{@const data = response.data}
				{@const entry = response.entry}
				{#if entry.removing}
					<tr class:removing={response.changed}>
						<td colspan="4">Removing <LoadingDots /></td>
					</tr>
				{:else}
					<tr class:successed={response.changed && response.success}>
						<td>{data.friend1}</td>
						<td>{data.friend2}</td>
						<td>Friends Since {data.date}</td>
						<td>
							<button on:click={response.removeSuccessfullResponse}
								>remove</button
							>
						</td>
					</tr>
				{/if}
			{:else if response.error && response.error.name === "ZodError"}
				{@const error = response.error}
				{#if error instanceof ZodError}
					<tr class:errored={response.changed && response.error}>
						<td colspan="3">
							{#each error.issues as issue}
								{issue.message}<br />
							{/each}
						</td>
						<td>
							<button on:click={response.remove}>Can't remove yet sorry</button>
						</td>
					</tr>
				{/if}
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
	}
	tr.successed {
		background-color: rgb(163, 233, 163);
	}
	tr.errored,
	tr.removing {
		background-color: rgb(251, 129, 105);
	}
	tr td,
	tr th {
		padding: 5px;
	}
</style>
