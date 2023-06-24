import { t } from './init';
import routes from './routes';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);
// export const TRPCHandlefetch = t.handleFetch();
