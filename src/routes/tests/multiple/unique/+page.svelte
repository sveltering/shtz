<script lang="ts">
    import LoadingDots from "$component/loading-dots.svelte";
    import { storeClient } from "$trpc/browserClient";
    import { error } from "@sveltejs/kit";
    import { z } from "zod";
    console.clear();
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
        // "Kitty",
        // "Kitten",
        // "Zero",
        // "Memory",
        // "Trooper",
        // "XX",
        // "Bandit",
        // "Fear",
        // "Light",
        // "Glow",
        // "Tread",
        // "Deep",
        // "Deeper",
        // "Deepest",
        // "Mine",
        // "Your",
        // "Worst",
        // "Enemy",
        // "Hostile",
        // "Force",
        // "Video",
        // "Game",
        // "Donkey",
        // "Mule",
        // "Colt",
        // "Cult",
        // "Cultist",
        // "Magnum",
        // "Gun",
        // "Assault",
        // "Recon",
        // "Trap",
        // "Trapper",
        // "Redeem",
        // "Code",
        // "Script",
        // "Writer",
        // "Near",
        // "Close",
        // "Open",
        // "Cube",
        // "Circle",
        // "Geo",
        // "Genome",
        // "Germ",
        // "Spaz",
        // "Shot",
        // "Echo",
        // "Beta",
        // "Alpha",
        // "Gamma",
        // "Omega",
        // "Seal",
        // "Squid",
        // "Money",
        // "Cash",
        // "Lord",
        // "King",
        // "Duke",
        // "Rest",
        // "Fire",
        // "Flame",
        // "Morrow",
        // "Break",
        // "Breaker",
        // "Numb",
        // "Ice",
        // "Cold",
        // "Rotten",
        // "Sick",
        // "Sickly",
        // "Janitor",
        // "Camel",
        // "Rooster",
        // "Sand",
        // "Desert",
        // "Dessert",
        // "Hurdle",
        // "Racer",
        // "Eraser",
        // "Erase",
        // "Big",
        // "Small",
        // "Short",
        // "Tall",
        // "Sith",
        // "Bounty",
        // "Hunter",
        // "Cracked",
        // "Broken",
        // "Sad",
        // "Happy",
        // "Joy",
        // "Joyful",
        // "Crimson",
        // "Destiny",
        // "Deceit",
        // "Lies",
        // "Lie",
        // "Honest",
        // "Destined",
        // "Bloxxer",
        // "Hawk",
        // "Eagle",
        // "Hawker",
        // "Walker",
        // "Zombie",
        // "Sarge",
        // "Capt",
        // "Captain",
        // "Punch",
        // "One",
        // "Two",
        // "Uno",
        // "Slice",
        // "Slash",
        // "Melt",
        // "Melted",
        // "Melting",
        // "Fell",
        // "Wolf",
        // "Hound",
        // "Legacy",
        // "Sharp",
        // "Dead",
        // "Mew",
        // "Chuckle",
        // "Bubba",
        // "Bubble",
        // "Sandwich",
        // "Smasher",
        // "Extreme",
        // "Multi",
        // "Universe",
        // "Ultimate",
        // "Death",
        // "Ready",
        // "Monkey",
        // "Elevator",
        // "Wrench",
        // "Grease",
        // "Head",
        // "Theme",
        // "Grand",
        // "Cool",
        // "Kid",
        // "Boy",
        // "Girl",
        // "Vortex",
        // "Paradox",
    ];

    function name() {
        return nameList[Math.floor(Math.random() * nameList.length)];
    }
    const store = storeClient.tests.friends.mutate.$multiple({
        loading: true,
        remove: true,
        zod: z.object({ friend1: z.string().max(8), friend2: z.string().max(8) }),
        // uniqueMethod: "replace",
        changeTimer: 1000,
        unique: function (input, response) {
            if (response) {
                let { friend1, friend2 } = response;
                friend1 = friend1.toLocaleLowerCase();
                friend2 = friend2.toLocaleLowerCase();
                return { friend1, friend2 };
            }
        },
    });

    function addFriends(e: SubmitEvent) {
        const target = e.target as any;
        const friend1 = target[0].value;
        const friend2 = target[1].value;
        target[0].value = name();
        target[1].value = name();
        target[0].focus();
        $store.call({ friend1, friend2 });
    }
</script>

<form on:submit|preventDefault={addFriends}>
    <input type="text" placeholder="friend 1" value={name()} required />
    <input type="text" placeholder="friend 2" value={name()} required />
    <input type="submit" hidden />
</form>
{#if $store.loading}
    Adding Friends <LoadingDots />
{/if}

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
            {#if response.success}
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
                        {#each error.issues as issue}
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
    tr.successed {
        background-color: rgb(163, 233, 163);
        transition: background-color 1s linear;
    }
    tr.errored {
        background-color: rgb(251, 129, 105);
        transition: background-color 1s linear;
    }
</style>
