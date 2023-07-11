<script lang="ts">
	import { storeClient } from '$trpc/browserClient';

	let list = storeClient.addToList.mutate.$multiple({
		loading: true,
		remove: true
	});
	let todoInput: HTMLInputElement;

	function addToList(e: SubmitEvent) {
		e.preventDefault();
		$list.call({ item: todoInput.value, time: randInt(1, 7) });
		todoInput.value = '';
	}
	function randInt(min: number, max: number): number {
		return Math.floor(Math.random() * (max - min + 1)) + min;
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
		{#each $list.responses as response}
			<tr>
				{#if response.loading}
					<td colspan="2">Saving item to list...</td>
					<td><button on:click={response.remove}>Remove</button></td>
				{:else if response.success}
					{@const { data } = response}
					<td>{data.date}</td>
					<td>{data.item}</td>
					<td><button on:click={response.remove}>Remove</button></td>
				{:else if response.error}
					<td colspan="2">{response.error.message}</td>
					<td><button on:click={response.remove}>Remove</button></td>
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
		min-width: 500px;
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
