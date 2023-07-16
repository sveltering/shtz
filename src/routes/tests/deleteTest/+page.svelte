<script lang="ts">
	import { storeClient } from '$trpc/browserClient';
	import { get, writable } from 'svelte/store';

	// let list = storeClient.addToList.mutate.$array({}, null as any as { hello: string });

	// if ($list) {
	// 	// $list.responses[0].data;
	// }

	let weak = new WeakMap();

	const alldata = {
		hello: 1,
		hi: 2
	};

	weak.set(alldata, 'ALL');

	let abst = alldata;
	let abst2: any = {
		all: alldata
	};

	let wri = writable(abst2);

	let ret = get(wri);

	ret = {
		all: alldata
	};

	console.log(weak.get(ret.all));

	delete abst2.all;

	console.log(ret);
</script>
