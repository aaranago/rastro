import * as React from "react";

import {
  createApiMyReportsRepository,
  MyReportsScreen,
} from "~/features/my-reports";
import { useRastroShell } from "~/features/shell/shell-provider";
import { trpcClient } from "~/utils/api";

const myReportsRepository = createApiMyReportsRepository({
  client: trpcClient,
});

export default function MisReportesRoute() {
  const { requestAuthPrompt, session } = useRastroShell();
  const myReportsSession = React.useMemo(() => {
    if (session.kind !== "member") {
      return { kind: "visitor" } as const;
    }

    return {
      kind: "member" as const,
      memberId: session.id,
    };
  }, [session]);

  return (
    <MyReportsScreen
      onRequestSignIn={() => {
        const returnTo = "/(tabs)/(profile)/mis-reportes";

        requestAuthPrompt({
          returnTo,
          sourceHref: `rastro://auth/sign-in?returnTo=${encodeURIComponent(
            returnTo,
          )}`,
        });
      }}
      repository={myReportsRepository}
      session={myReportsSession}
    />
  );
}
