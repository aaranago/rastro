import type { AdminModerationViewer as ModelAdminModerationViewer } from "./admin-moderation";
import type {
  AdminModerationViewerRole,
  AdminModerationViewer as DashboardAdminModerationViewer,
} from "./admin-moderation-dashboard";

export interface AdminModerationSession {
  user: {
    email?: string | null;
    id?: string | null;
    name?: string | null;
  };
}

export interface CurrentAdminModerationViewer {
  dashboardViewer: DashboardAdminModerationViewer;
  modelViewer: ModelAdminModerationViewer;
}

export function buildAdminModerationViewer(
  session: AdminModerationSession | null,
  adminEmailList: string | undefined,
): CurrentAdminModerationViewer {
  const role = getViewerRole(session, adminEmailList);
  const displayName =
    firstNonEmpty(session?.user.name, session?.user.email) ??
    "Visitante sin sesion";

  return {
    dashboardViewer: {
      displayName,
      role,
    },
    modelViewer: {
      memberId: firstNonEmpty(session?.user.id) ?? "visitor",
      role: role === "admin" ? "admin" : "member",
    },
  };
}

function parseAdminEmails(adminEmailList: string | undefined) {
  return new Set(
    (adminEmailList ?? "")
      .split(/[\s,]+/)
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getViewerRole(
  session: AdminModerationSession | null,
  adminEmailList: string | undefined,
): AdminModerationViewerRole {
  if (!session) {
    return "visitor";
  }

  const email = session.user.email?.trim().toLowerCase();

  if (email && parseAdminEmails(adminEmailList).has(email)) {
    return "admin";
  }

  return "member";
}

function firstNonEmpty(...values: (string | null | undefined)[]) {
  return values.map((value) => value?.trim()).find((value) => Boolean(value));
}
