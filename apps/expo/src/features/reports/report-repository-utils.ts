import { findWithinRadius } from "../geo/distance";

export interface ReportExactLocation {
  latitude: number;
  longitude: number;
}

export type ReportPublicLocation =
  | {
      addressLabel?: string;
      kind: "exact";
      label: string;
      latitude: number;
      longitude: number;
    }
  | {
      kind: "approximate";
      label: string;
      locationCellLabel?: string;
    };

export interface ReportStoredContactOption {
  kind: "both" | "in-app-chat" | "whatsapp";
  phoneNumber?: string;
}

export interface ReportShareTarget {
  appDeepLink: string;
}

export type PublicReportContactOption =
  | {
      href: string;
      kind: "in-app-chat";
      label: string;
    }
  | {
      href: string;
      kind: "whatsapp";
      label: string;
      phoneNumber: string;
    };

export function buildPublicReportContactOptions({
  contactOption,
  shareTarget,
}: {
  contactOption: ReportStoredContactOption;
  shareTarget: ReportShareTarget;
}): PublicReportContactOption[] {
  const options: PublicReportContactOption[] = [];

  if (contactOption.kind === "in-app-chat" || contactOption.kind === "both") {
    options.push({
      href: shareTarget.appDeepLink,
      kind: "in-app-chat",
      label: "Enviar mensaje en Rastro",
    });
  }

  if (contactOption.kind === "whatsapp" || contactOption.kind === "both") {
    const phoneNumber = contactOption.phoneNumber ?? "";

    options.push({
      href: `https://wa.me/${phoneNumber.replace(/\D/g, "")}`,
      kind: "whatsapp",
      label: "Escribir por WhatsApp",
      phoneNumber,
    });
  }

  return options;
}

export function toPublicReportDetailLocation(
  publicLocation: ReportPublicLocation,
  exactPrivacyNote: string,
) {
  if (publicLocation.kind === "exact") {
    return {
      address: publicLocation.addressLabel,
      coordinates: {
        latitude: publicLocation.latitude,
        longitude: publicLocation.longitude,
      },
      label: publicLocation.label,
      privacyNote: exactPrivacyNote,
      type: "exact" as const,
    };
  }

  return {
    label: publicLocation.label,
    privacyNote: "Zona aproximada compartida por seguridad.",
    type: "approximate" as const,
  };
}

export function summarizeActiveReportsWithinRadius<TReport, TSummary>({
  center,
  getLocation,
  reports,
  radiusMeters,
  toSummary,
}: {
  center: ReportExactLocation;
  getLocation: (report: TReport) => ReportExactLocation;
  reports: readonly TReport[];
  radiusMeters: number;
  toSummary: (input: { distanceMeters: number; report: TReport }) => TSummary;
}): TSummary[] {
  return findWithinRadius({
    center,
    getLocation,
    items: reports,
    radiusMeters,
  })
    .sort((left, right) => left.distanceMeters - right.distanceMeters)
    .map(({ distanceMeters, report }) =>
      toSummary({
        distanceMeters,
        report,
      }),
    );
}
