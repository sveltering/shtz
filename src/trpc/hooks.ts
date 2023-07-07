import { t } from './init';
import routes from './routes';

import type { createTRPCProxyClient } from '@trpc/client';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);
// export const TRPCHandlefetch = t.handleFetch();
