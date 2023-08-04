import { handleHook, handlefetchHook } from "$trpc/hooks";

export async function handle({ event, resolve }) {
	const TRPCResponse = await handleHook(event);
	if (TRPCResponse) {
		return TRPCResponse;
	}

	const response = await resolve(event);
	return response;
}

export async function handleFetch({ request, fetch }) {
	request = handlefetchHook(request);
	return fetch(request);
}
