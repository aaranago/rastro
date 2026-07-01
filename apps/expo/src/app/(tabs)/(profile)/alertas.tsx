import {
  AlertSubscriptionSettingsScreen,
  createApiAlertSubscriptionRepository,
} from "~/features/alert-subscriptions";
import { useRastroShell } from "~/features/shell/shell-provider";
import { trpcClient } from "~/utils/api";

const alertSubscriptionRepository = createApiAlertSubscriptionRepository({
  client: trpcClient,
});

export default function AlertSubscriptionSettingsRoute() {
  const { session } = useRastroShell();

  return (
    <AlertSubscriptionSettingsScreen
      repository={alertSubscriptionRepository}
      session={
        session.kind === "member"
          ? {
              displayName: session.name ?? session.email ?? "Miembro Rastro",
              kind: "member",
              memberId: session.id,
            }
          : { kind: "visitor" }
      }
    />
  );
}
