import * as React from "react";
import { router, useLocalSearchParams } from "expo-router";

import type { MobileAuthCallbackSearchParams } from "~/utils/auth";
import { AppStateScreen } from "~/features/app-states";
import { completeMobileAuthCallback } from "~/utils/auth";

export default function MobileAuthCallbackRoute() {
  const rawParams = useLocalSearchParams();
  const params = React.useMemo<MobileAuthCallbackSearchParams>(
    () => ({
      cookie: getCallbackSearchParam(rawParams.cookie),
      error: getCallbackSearchParam(rawParams.error),
      error_description: getCallbackSearchParam(rawParams.error_description),
      message: getCallbackSearchParam(rawParams.message),
    }),
    [
      rawParams.cookie,
      rawParams.error,
      rawParams.error_description,
      rawParams.message,
    ],
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    const result = completeMobileAuthCallback(params);

    if (result.ok) {
      router.replace("/");
      return;
    }

    setErrorMessage(result.message ?? "No pudimos completar el ingreso.");
  }, [params]);

  return (
    <AppStateScreen
      descriptor={
        errorMessage
          ? {
              actions: [
                {
                  iconName: "arrow.left",
                  id: "home",
                  label: "Volver",
                },
              ],
              body: "Vuelve al inicio e intenta iniciar sesion otra vez.",
              kind: "error",
              title: errorMessage,
            }
          : {
              body: "Estamos cerrando la ventana de ingreso.",
              kind: "loading",
              progressLabel: "Un momento",
              title: "Completando ingreso",
            }
      }
      onActionPress={() => {
        router.replace("/");
      }}
    />
  );
}

function getCallbackSearchParam(
  value: string | string[] | undefined,
): string | string[] | undefined {
  if (Array.isArray(value)) {
    return value;
  }

  return value;
}
