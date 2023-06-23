import type { Router } from './hooks.js';
import { syncServerClientCreate } from '$lib/server';
import { t } from './init';

export const serverClient = syncServerClientCreate<Router>(t);
