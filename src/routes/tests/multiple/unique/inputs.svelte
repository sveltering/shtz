<script lang="ts">
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

    function addFriends(e: SubmitEvent) {
        const target = e.target as any;
        const friend1T = document.getElementsByName("first")[0];
        const friend1TS = friend1T.nextElementSibling;
        const friend2T = document.getElementsByName("second")[0];
        const friend2TS = friend2T.nextElementSibling;

        const friend1 = friend1TS.value;
        const friend2 = friend2TS.value;

        console.log(friend1);

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
        const sibling: HTMLInputElement = target?.nextElementSibling as HTMLInputElement;
        const value = target.value;
        let found = false;
        if (value.length) {
            const valueIsUpper = value[0] == value[0].toUpperCase();
            for (let i = 0, iLen = nameList.length; i < iLen; i++) {
                if (nameList[i].toLowerCase().startsWith(value.toLowerCase())) {
                    let siblingValue = nameList[i];
                    if (valueIsUpper) {
                        siblingValue = siblingValue[0].toUpperCase() + siblingValue.slice(1);
                    } else {
                        siblingValue = siblingValue[0].toLowerCase() + siblingValue.slice(1);
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
        const sibling: HTMLInputElement = target?.nextElementSibling as HTMLInputElement;
        if (e.type === "keydown") {
            if (e.key === "Tab") {
                e.preventDefault();
                target.value = sibling.value;
                if (target.name === "first") {
                    document.getElementsByName("second")[0].focus();
                    document.getElementsByName("second")[0].select();
                } else {
                    document.getElementsByName("first")[0].focus();
                    document.getElementsByName("first")[0].select();
                }
                return;
            }
        }
    }
</script>

<form on:submit|preventDefault={addFriends}>
    <div class="hide-behind">
        {#if true}
            {@const value = name()}
            <input type="text" {value} on:keyup={typing} on:keydown={typingd} name="first" required />
            <input type="text" {value} />
        {/if}
    </div>
    <div class="hide-behind">
        {#if true}
            {@const value = name()}
            <input type="text" {value} on:keyup={typing} on:keydown={typingd} name="second" required />
            <input type="text" {value} />
        {/if}
    </div>
    <input type="submit" hidden />
</form>

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
    tr td,
    tr th {
        padding: 5px;
    }
    .hide-behind {
        display: inline-block;
        position: relative;
    }
    .hide-behind input {
        background: transparent;
        position: relative;
        z-index: 1;
        color: #000;
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
