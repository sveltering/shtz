import { TRPCHook, TRPCHandlefetch } from './trpc/hooks';

export async function handle({ event, resolve }) {
	const TRPCResponse = await TRPCHook(event);
	if (TRPCResponse) {
		return TRPCResponse;
	}

	const response = await resolve(event);
	return response;
}

export async function handleFetch({ request, fetch }) {
	request = TRPCHandlefetch(request);

	return fetch(request);
}
