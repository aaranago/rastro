import {
  ActivityScreen,
  createApiActivityRepository,
  createCachedActivityRepository,
} from "~/features/activity";
import { createInMemoryLastLoadedCache } from "~/features/resilience/last-loaded-cache";
import { trpcClient } from "~/utils/api";

const activityRepository = createCachedActivityRepository({
  cache: createInMemoryLastLoadedCache(),
  cacheKey: (input) => `activity-inbox:${input.limit ?? "default"}`,
  source: createApiActivityRepository({
    client: trpcClient,
  }),
});

export default function ActivityRoute() {
  return <ActivityScreen repository={activityRepository} />;
}
