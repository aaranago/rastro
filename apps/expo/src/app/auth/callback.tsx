import * as React from "react";
import { router, useLocalSearchParams } from "expo-router";

import type { MobileAuthCallbackSearchParams } from "~/utils/auth";
import { AppStateScreen } from "~/features/app-states";
import {
  completeMobileE2ESessionHandoff,
  completeMobileAuthCallback,
  mobileAuthCallbackRedirectHref,
} from "~/utils/auth";

export default function MobileAuthCallbackRoute() {
  const rawParams = useLocalSearchParams();
  const e2eCookieHex = getCallbackSearchParam(rawParams.e2eCookieHex);
  const e2eCookie =
    decodeHexCallbackSearchParam(e2eCookieHex) ??
    getCallbackSearchParam(rawParams.e2eCookie);
  const params = React.useMemo<MobileAuthCallbackSearchParams>(
    () => ({
      cookie: e2eCookie ?? getCallbackSearchParam(rawParams.cookie),
      error: getCallbackSearchParam(rawParams.error),
      error_description: getCallbackSearchParam(rawParams.error_description),
      message: getCallbackSearchParam(rawParams.message),
      transaction: getCallbackSearchParam(rawParams.transaction),
    }),
    [
      e2eCookie,
      e2eCookieHex,
      rawParams.cookie,
      rawParams.error,
      rawParams.error_description,
      rawParams.message,
      rawParams.transaction,
    ],
  );
  const isE2EHandoff =
    Boolean(e2eCookie) || getCallbackSearchParam(rawParams.e2e) === "1";
  const [state, setState] = React.useState<
    | {
        email?: string | undefined;
        kind: "ready";
      }
    | {
        message: string;
        kind: "error";
      }
    | {
        kind: "loading";
      }
  >({ kind: "loading" });

  React.useEffect(() => {
    let isActive = true;

    if (isE2EHandoff) {
      void completeMobileE2ESessionHandoff(params)
        .then((result) => {
          if (!isActive) {
            return;
          }

          if (result.ok) {
            setState({ email: result.email, kind: "ready" });
            setTimeout(() => {
              if (isActive) {
                router.replace(mobileAuthCallbackRedirectHref);
              }
            }, 3000);
            return;
          }

          setState({
            kind: "error",
            message: result.message ?? "No pudimos preparar la sesión.",
          });
        })
        .catch(() => {
          if (isActive) {
            setState({
              kind: "error",
              message: "No pudimos preparar la sesión.",
            });
          }
        });

      return () => {
        isActive = false;
      };
    }

    const result = completeMobileAuthCallback(params);

    if (result.ok) {
      router.replace(mobileAuthCallbackRedirectHref);
    } else {
      setState({
        kind: "error",
        message: result.message ?? "No pudimos completar el ingreso.",
      });
    }

    return () => {
      isActive = false;
    };
  }, [isE2EHandoff, params]);

  return (
    <AppStateScreen
      descriptor={
        state.kind === "error"
          ? {
              actions: [
                {
                  iconName: "arrow.left",
                  id: "home",
                  label: "Volver",
                },
              ],
              body: "Vuelve al inicio e intenta iniciar sesión otra vez.",
              kind: "error",
              title: state.message,
            }
          : state.kind === "ready"
            ? {
                body:
                  state.email ??
                  "La sesión de prueba fue verificada por el backend.",
                kind: "empty",
                title: "Sesión lista",
              }
          : {
              body: isE2EHandoff
                ? "Estamos preparando una sesión verificada."
                : "Estamos cerrando la ventana de ingreso.",
              kind: "loading",
              progressLabel: "Un momento",
              title: isE2EHandoff ? "Preparando prueba" : "Completando ingreso",
            }
      }
      onActionPress={() => {
        router.replace(mobileAuthCallbackRedirectHref);
      }}
      testID={
        isE2EHandoff
          ? state.kind === "ready"
            ? "e2e-session-ready"
            : state.kind === "error"
              ? "e2e-session-failed"
              : "e2e-session-loading"
          : undefined
      }
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

function decodeHexCallbackSearchParam(
  value: string | string[] | undefined,
): string | undefined {
  const hex = getCallbackSearchParam(value);

  if (
    typeof hex !== "string" ||
    hex.length % 2 !== 0 ||
    !/^[\da-f]+$/i.test(hex)
  ) {
    return undefined;
  }

  let decoded = "";

  for (let index = 0; index < hex.length; index += 2) {
    const byte = Number.parseInt(hex.slice(index, index + 2), 16);

    if (!Number.isFinite(byte)) {
      return undefined;
    }

    decoded += String.fromCharCode(byte);
  }

  return decoded;
}
