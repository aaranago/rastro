import type { PetProfilesSessionState } from "~/features/pet-profiles/pet-profile-types";
import type { ShellSession } from "~/features/shell/shell-model";
import { MisMascotasScreen } from "~/features/pet-profiles/pet-profiles-screen";
import { useRastroShell } from "~/features/shell/shell-provider";

export default function MisMascotasRoute() {
  const { session } = useRastroShell();

  return <MisMascotasScreen session={toPetProfilesSession(session)} />;
}

function toPetProfilesSession(session: ShellSession): PetProfilesSessionState {
  if (session.kind === "visitor") {
    return {
      kind: "visitor",
    };
  }

  return {
    displayName: session.name ?? session.email ?? undefined,
    kind: "member",
    memberId: session.id,
  };
}
