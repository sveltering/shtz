import { syncServerClientCreate } from '$lib/server';
import { t } from './init';
import { routes } from './hooks';

export const serverClient = syncServerClientCreate(routes.createCaller, t.context);
