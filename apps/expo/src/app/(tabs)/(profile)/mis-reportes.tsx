import * as React from "react";
import { useLocalSearchParams } from "expo-router";

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
  const { reportId } = useLocalSearchParams<{
    reportId?: string | string[];
  }>();
  const { requestAuthPrompt, session } = useRastroShell();
  const initialManageReportId = normalizeRouteParam(reportId);
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
      initialManageReportId={initialManageReportId}
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

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
