import {
  ActivityScreen,
  createApiActivityRepository,
} from "~/features/activity";
import { trpcClient } from "~/utils/api";

const activityRepository = createApiActivityRepository({
  client: trpcClient,
});

export default function ActivityRoute() {
  return <ActivityScreen repository={activityRepository} />;
}
