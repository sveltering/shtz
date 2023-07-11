<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let list = storeClient.addToList.mutate.$multiple({
		loading: true,
		remove: true,
		entry: (input) => {
			return input;
		}
	});
	let todoInput: HTMLInputElement;

	function randInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	let ac: AbortController;

	function addToList(e: SubmitEvent) {
		e.preventDefault();
		ac = new AbortController();
		$list.call({ item: todoInput.value, time: randInt(5, 7) }, { context: {} });
		todoInput.value = '';
	}

	function remove(r: any) {
		return function () {
			ac.abort();
			r.remove();
		};
	}
</script>

{#if $list.loading}
	Adding to list<br />
{/if}
<table>
	<thead>
		<tr>
			<th>date</th>
			<th>item</th>
			<th>remove</th>
		</tr>
	</thead>
	<tbody>
		{#each $list.responses as [entry, response]}
			<tr>
				{#if response.loading}
					<td colspan="2">Saving item ({entry.item}) in ({entry.time})s to list...</td>
					<td><button on:click={remove(response)}>Remove</button></td>
				{:else if response.success}
					{@const { data } = response}
					<td>{data.date}</td>
					<td>{data.item}</td>
					<td><button on:click={remove(response)}>Remove</button></td>
				{:else if response.error}
					<td colspan="2">{response.error.message}</td>
					<td><button on:click={remove(response)}>Remove</button></td>
				{/if}
			</tr>
		{/each}
	</tbody>
	<tfoot>
		<tr>
			<td colspan="3"
				><form on:submit={addToList}>
					<input type="text" placeholder="Todo" bind:this={todoInput} />
				</form></td
			>
		</tr>
	</tfoot>
</table>

<style>
	* {
		box-sizing: border-box;
	}
	table {
		font-family: Arial, Helvetica, sans-serif;
	}
	table,
	table th,
	table td {
		border: 0.5px solid #000;
		border-spacing: 0;
	}
	table th,
	table td {
		padding: 5px;
		border: 0.5px solid #000;
		text-transform: capitalize;
	}
	table th {
		text-transform: capitalize;
	}
	td input {
		border: 1px solid #000;
		outline: none;
		width: 100%;
		padding: 5px;
	}
</style>
