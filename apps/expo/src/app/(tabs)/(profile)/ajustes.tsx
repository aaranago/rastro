import * as React from "react";

import {
  createApiMemberProfileRepository,
  MemberProfileSettingsScreen,
} from "~/features/member-profile";
import { useRastroShell } from "~/features/shell/shell-provider";
import { trpcClient } from "~/utils/api";

const memberProfileRepository = createApiMemberProfileRepository({
  client: trpcClient,
});

export default function ProfileAccountSettingsRoute() {
  const { refreshSession, requestAuthPrompt, session } = useRastroShell();
  const memberId = session.kind === "member" ? session.id : undefined;
  const memberName = session.kind === "member" ? session.name : undefined;
  const memberEmail = session.kind === "member" ? session.email : undefined;
  const memberProfileSession = React.useMemo(() => {
    if (!memberId) {
      return { kind: "visitor" } as const;
    }

    return {
      displayName: memberName ?? memberEmail ?? "Miembro Rastro",
      email: memberEmail,
      kind: "member" as const,
      memberId,
    };
  }, [memberEmail, memberId, memberName]);

  return (
    <MemberProfileSettingsScreen
      onRequestSignIn={() =>
        requestAuthPrompt({
          returnTo: "/(tabs)/(profile)/ajustes",
          sourceHref: "rastro://auth/sign-in?returnTo=/perfil/ajustes",
        })
      }
      onSaved={refreshSession}
      repository={memberProfileRepository}
      session={memberProfileSession}
    />
  );
}
