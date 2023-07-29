<script lang="ts">
	import { onMount } from "svelte";

	export let store;
	const nameList = [
		"Time",
		"Past",
		"Future",
		"Dev",
		"Fly",
		"Flying",
		"Soar",
		"Soaring",
		"Power",
		"Falling",
		"Fall",
		"Jump",
		"Cliff",
		"Mountain",
		"Rend",
		"Red",
		"Blue",
		"Green",
		"Yellow",
		"Gold",
		"Demon",
		"Demonic",
		"Panda",
		"Cat",
		"Kitty",
		"Kitten",
		"Zero",
		"Memory",
		"Trooper",
		"XX",
		"Bandit",
		"Fear",
		"Light",
		"Glow",
		"Tread",
		"Deep",
		"Deeper",
		"Deepest",
		"Mine",
		"Your",
		"Worst",
		"Enemy",
		"Hostile",
		"Force",
		"Video",
		"Game",
		"Donkey",
		"Mule",
		"Colt",
		"Cult",
		"Cultist",
		"Magnum",
		"Gun",
		"Assault",
		"Recon",
		"Trap",
		"Trapper",
		"Redeem",
		"Code",
		"Script",
		"Writer",
		"Near",
		"Close",
		"Open",
		"Cube",
		"Circle",
		"Geo",
		"Genome",
		"Germ",
		"Spaz",
		"Shot",
		"Echo",
		"Beta",
		"Alpha",
		"Gamma",
		"Omega",
		"Seal",
		"Squid",
		"Money",
		"Cash",
		"Lord",
		"King",
		"Duke",
		"Rest",
		"Fire",
		"Flame",
		"Morrow",
		"Break",
		"Breaker",
		"Numb",
		"Ice",
		"Cold",
		"Rotten",
		"Sick",
		"Sickly",
		"Janitor",
		"Camel",
		"Rooster",
		"Sand",
		"Desert",
		"Dessert",
		"Hurdle",
		"Racer",
		"Eraser",
		"Erase",
		"Big",
		"Small",
		"Short",
		"Tall",
		"Sith",
		"Bounty",
		"Hunter",
		"Cracked",
		"Broken",
		"Sad",
		"Happy",
		"Joy",
		"Joyful",
		"Crimson",
		"Destiny",
		"Deceit",
		"Lies",
		"Lie",
		"Honest",
		"Destined",
		"Bloxxer",
		"Hawk",
		"Eagle",
		"Hawker",
		"Walker",
		"Zombie",
		"Sarge",
		"Capt",
		"Captain",
		"Punch",
		"One",
		"Two",
		"Uno",
		"Slice",
		"Slash",
		"Melt",
		"Melted",
		"Melting",
		"Fell",
		"Wolf",
		"Hound",
		"Legacy",
		"Sharp",
		"Dead",
		"Mew",
		"Chuckle",
		"Bubba",
		"Bubble",
		"Sandwich",
		"Smasher",
		"Extreme",
		"Multi",
		"Universe",
		"Ultimate",
		"Death",
		"Ready",
		"Monkey",
		"Elevator",
		"Wrench",
		"Grease",
		"Head",
		"Theme",
		"Grand",
		"Cool",
		"Kid",
		"Boy",
		"Girl",
		"Vortex",
		"Paradox",
	];

	function name() {
		return nameList[Math.floor(Math.random() * nameList.length)];
	}

	let friend1T: HTMLInputElement;
	let friend1TS: HTMLInputElement;
	let friend2T: HTMLInputElement;
	let friend2TS: HTMLInputElement;
	onMount(() => {
		friend1T = document.getElementsByName("first")[0] as HTMLInputElement;
		friend1TS = friend1T.nextElementSibling as HTMLInputElement;
		friend2T = document.getElementsByName("second")[0] as HTMLInputElement;
		friend2TS = friend2T.nextElementSibling as HTMLInputElement;
	});

	function addFriends(e: SubmitEvent) {
		const friend1 = friend1TS.value;
		const friend2 = friend2TS.value;

		friend1T.value = name();
		friend1TS.value = friend1T.value;
		friend2T.value = name();
		friend2TS.value = friend2T.value;
		friend1T.focus();
		friend1T.select();
		$store.call({ friend1, friend2 });
	}

	function typing(e: KeyboardEvent) {
		e.stopPropagation();
		if (!e) return;
		const target: HTMLInputElement = e.target as HTMLInputElement;
		const sibling: HTMLInputElement =
			target?.nextElementSibling as HTMLInputElement;
		const value = target.value;
		let found = false;
		if (value.length) {
			const valueIsUpper = value[0] == value[0].toUpperCase();
			for (let i = 0, iLen = nameList.length; i < iLen; i++) {
				if (nameList[i].toLowerCase().startsWith(value.toLowerCase())) {
					let siblingValue = nameList[i];
					if (valueIsUpper) {
						siblingValue =
							siblingValue[0].toUpperCase() + siblingValue.slice(1);
					} else {
						siblingValue =
							siblingValue[0].toLowerCase() + siblingValue.slice(1);
					}
					sibling.value = siblingValue;
					found = true;
					break;
				}
			}
		}
		if (!found) {
			sibling.value = value;
		}
	}

	function typingd(e: KeyboardEvent) {
		e.stopPropagation();
		if (!e) return;
		const target: HTMLInputElement = e.target as HTMLInputElement;
		const sibling: HTMLInputElement =
			target?.nextElementSibling as HTMLInputElement;
		if (e.type === "keydown") {
			if (e.key === "Tab") {
				e.preventDefault();
				target.value = sibling.value;
				if (target.name === "first") {
					friend2T.focus();
					friend2T.select();
				} else {
					friend1T.focus();
					friend1T.select();
				}
				return;
			}
		}
	}

	function clicked(e: MouseEvent) {
		const target: HTMLInputElement = e.target as HTMLInputElement;
		target.select();
	}
	function bodyClicked(e: MouseEvent) {
		if (e.target === document.body) {
			friend1T.focus();
			friend1T.select();
		}
	}
</script>

<svelte:body on:click={bodyClicked} />
<form on:submit|preventDefault={addFriends}>
	<div class="hide-behind">
		{#if true}
			{@const value = name()}
			<input
				type="text"
				{value}
				on:keyup={typing}
				on:keydown={typingd}
				on:click={clicked}
				name="first"
				required
			/>
			<input type="text" {value} />
		{/if}
	</div>
	<div class="hide-behind">
		{#if true}
			{@const value = name()}
			<input
				type="text"
				{value}
				on:keyup={typing}
				on:keydown={typingd}
				on:click={clicked}
				name="second"
				required
			/>
			<input type="text" {value} />
		{/if}
	</div>
	<input type="submit" hidden />
</form>

<style>
	.hide-behind {
		display: inline-block;
		position: relative;
	}
	.hide-behind input {
		box-sizing: border-box;
		background: transparent;
		position: relative;
		z-index: 1;
		color: #000;
		padding: 5px;
		outline: none;
		border: 1px solid #000;
		font-size: 1rem;
		border-radius: 2px;
	}
	.hide-behind input:focus {
		padding: 4px;
		border: 2px solid #000;
	}
	.hide-behind input:last-child {
		position: absolute;
		z-index: 0;
		top: 0;
		left: 0;
		color: #999;
		pointer-events: none;
		user-select: none;
	}
</style>
