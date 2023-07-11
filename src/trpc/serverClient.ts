import { syncServerClientCreate } from '@sveltering/trpc/server';

import { t } from '$trpc/init';
import type { Router } from '$trpc/hooks';

export const serverClient = syncServerClientCreate<Router>(t);
