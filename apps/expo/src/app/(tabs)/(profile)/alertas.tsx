import { AlertSubscriptionSettingsScreen } from "~/features/alert-subscriptions";
import { useRastroShell } from "~/features/shell/shell-provider";

export default function AlertSubscriptionSettingsRoute() {
  const { session } = useRastroShell();

  return (
    <AlertSubscriptionSettingsScreen
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
