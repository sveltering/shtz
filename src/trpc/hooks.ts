import { t } from '$trpc/init';
import routes from '$trpc/routes';

export type Router = typeof routes;
export const TRPCHook = t.hook(routes);

// export const TRPCHandlefetch = t.handleFetch();
