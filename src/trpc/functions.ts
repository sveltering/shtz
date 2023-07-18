export function sleep(tMin: number, tMax?: number, inS: boolean = true) {
	tMin = tMin * (inS ? 1000 : 1);
	tMax = tMax ? tMax * (inS ? 1000 : 1) : undefined;
	const s = tMax !== undefined && tMax > tMin ? randInt(tMax, tMin) : tMin;
	return new Promise((resolve) => {
		setTimeout(resolve, s);
	});
}
export function randInt(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}
export function strContainsError(str: string | undefined): boolean {
	return str ? str.toLowerCase().indexOf('error') > -1 : false;
}
