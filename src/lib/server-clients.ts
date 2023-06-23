import type { TRPC } from './server';
import type { AnyRouter } from '@trpc/server';
import type { RequestEvent } from '@sveltejs/kit';

type SyncReturnType<T extends CallableFunction> = T extends (...args: any) => infer R ? R : any;

type functionType = (...args: any) => any;

export const asyncServerClientCreate = function <R extends functionType>(
	createCaller: R,
	context: any
): (event: RequestEvent) => Promise<ReturnType<R>> {
	if (console?.warn && context.constructor.name === 'Function') {
		console.warn(
			`Message from \`asyncServerClientCreate()\`
Your context function is synchronous. Either:
	1. Switch to \`syncServerClientCreate()\`
	OR
	2. Use an asynchronous function for your context if you have async code`
		);
	}

	return async function (event: RequestEvent): Promise<ReturnType<R>> {
		return createCaller(await context(event, false));
	};
};

export const syncServerClientCreate = function <R extends functionType>(
	createCaller: R,
	context: any
): (event: RequestEvent) => ReturnType<R> {
	if (console?.warn && context.constructor.name === 'AsyncFunction') {
		console.warn(
			`Message from \`syncServerClientCreate()\`
	Your context function is asynchronous. Either:
		1. Switch to \`asyncServerClientCreate()\`
		OR
		2. Use a regular synchronous function for you context if you have no async code`
		);
	}

	return function (event: RequestEvent): ReturnType<R> {
		return createCaller(context(event, false));
	};
};
