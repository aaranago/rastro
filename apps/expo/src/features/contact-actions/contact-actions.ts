import type { PublicReportContactOption } from "../reports/report-repository-utils";

export interface PublicContactActionDependencies {
  openURL: (url: string) => Promise<void> | void;
  openChat?: (input: PublicInAppChatActionInput) => Promise<void> | void;
}

export interface PublicInAppChatActionInput {
  href: string;
}

export type PublicContactActionResult =
  | {
      kind: "success";
      label: string;
    }
  | {
      kind: "error";
      label: string;
    };

export async function runPublicContactAction(
  option: PublicReportContactOption,
  dependencies: PublicContactActionDependencies,
): Promise<PublicContactActionResult> {
  try {
    if (option.kind === "whatsapp") {
      if (!isWhatsappContactHref(option.href)) {
        return {
          kind: "error",
          label: "No se pudo abrir WhatsApp.",
        };
      }

      await dependencies.openURL(option.href);

      return {
        kind: "success",
        label: "WhatsApp abierto.",
      };
    }

    if (!dependencies.openChat) {
      return {
        kind: "error",
        label: "No se pudo abrir el chat en Rastro.",
      };
    }

    await dependencies.openChat({
      href: option.href,
    });

    return {
      kind: "success",
      label: "Chat abierto en Rastro.",
    };
  } catch {
    return {
      kind: "error",
      label:
        option.kind === "whatsapp"
          ? "No se pudo abrir WhatsApp."
          : "No se pudo abrir el chat en Rastro.",
    };
  }
}

function isWhatsappContactHref(href: string) {
  return /^https:\/\/wa\.me\/\d+(?:[?#].*)?$/.test(href);
}
