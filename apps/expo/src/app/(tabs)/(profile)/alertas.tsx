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
  const { requestAuthPrompt, session } = useRastroShell();

  return (
    <AlertSubscriptionSettingsScreen
      onRequestSignIn={() => {
        const returnTo = "/(tabs)/(profile)/alertas";

        requestAuthPrompt({
          returnTo,
          sourceHref: `rastro://auth/sign-in?returnTo=${encodeURIComponent(
            returnTo,
          )}`,
        });
      }}
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
