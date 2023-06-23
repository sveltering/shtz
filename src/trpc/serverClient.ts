import { syncServerClientCreate } from '$lib/server-clients';
import { t } from './init';
import { routes } from './hooks';

export const serverClient = syncServerClientCreate(routes.createCaller, t.options.context);
