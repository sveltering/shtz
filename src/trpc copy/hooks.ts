import { t } from './init';
import routes from './routes';

export { routes };
export type Router = typeof routes;

export const TRPCHook = t.hook<Router>(routes);
export const TRPCHandlefetch = t.handleFetch();
