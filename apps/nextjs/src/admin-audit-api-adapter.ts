import { headers } from "next/headers";

import { appRouter, createTRPCContext } from "@acme/api";

import { auth } from "~/auth/server";
import { env } from "~/env";
import {
  formatIdentifier,
  getAuditActionLabel,
  getAuditTargetTypeLabel,
} from "./admin-audit-labels";

export interface AdminAuditListInput {
  action?: string;
  actor?: string;
  limit?: number;
  targetType?: string;
}

export interface AdminAuditActor {
  email?: string | null;
  id: string;
  label: string;
}

export interface AdminAuditTarget {
  id: string;
  label: string;
  type: string;
  typeLabel?: string;
}

export interface AdminAuditEvent {
  action: string;
  actionLabel?: string;
  actor: AdminAuditActor;
  city?: string | null;
  department?: string | null;
  id: string;
  occurredAt: Date | string;
  summary: string;
  target: AdminAuditTarget;
}

type AdminAuditFilterOptionSource =
  | string
  | {
      label: string;
      value: string;
    };

interface AdminAuditListResponse {
  events: AdminAuditEvent[];
  filters: {
    actions: AdminAuditFilterOptionSource[];
    actors: AdminAuditFilterOptionSource[];
    targetTypes: AdminAuditFilterOptionSource[];
  };
  total: number;
}

export interface AdminAuditFilterOption {
  label: string;
  value: string;
}

export interface AdminAuditLogData {
  events: AdminAuditEvent[];
  filters: {
    actions: AdminAuditFilterOption[];
    actors: AdminAuditFilterOption[];
    targetTypes: AdminAuditFilterOption[];
  };
  total: number;
}

export type AdminAuditLogState =
  | {
      data: AdminAuditLogData;
      status: "ready";
    }
  | {
      message: string;
      status: "error";
    };

interface ExpectedAdminAuditCaller {
  admin: {
    audit?: {
      list?: (input: AdminAuditListInput) => Promise<AdminAuditListResponse>;
    };
  };
}

export async function listAdminAuditEvents(
  input: AdminAuditListInput,
): Promise<AdminAuditLogState> {
  try {
    const caller = await createAdminAuditCaller();

    if (typeof caller.admin.audit?.list !== "function") {
      throw new MissingAdminAuditContractError();
    }

    return {
      data: normalizeAdminAuditListResponse(
        await caller.admin.audit.list(input),
      ),
      status: "ready",
    };
  } catch (error) {
    return {
      message: getAdminAuditErrorMessage(error),
      status: "error",
    };
  }
}

async function createAdminAuditCaller(): Promise<ExpectedAdminAuditCaller> {
  const requestHeaders = new Headers(await headers());
  requestHeaders.set("x-trpc-source", "next-admin-audit");
  const context = await createTRPCContext({
    adminEmailList: env.RASTRO_ADMIN_EMAILS,
    auth,
    headers: requestHeaders,
  });

  return appRouter.createCaller(context) as unknown as ExpectedAdminAuditCaller;
}

function normalizeAdminAuditListResponse(
  response: AdminAuditListResponse,
): AdminAuditLogData {
  return {
    events: response.events,
    filters: {
      actions: toAuditFilterOptions(response.filters.actions, (value) =>
        getAuditActionLabel(value),
      ),
      actors: toAuditFilterOptions(response.filters.actors, formatIdentifier),
      targetTypes: toAuditFilterOptions(response.filters.targetTypes, (value) =>
        getAuditTargetTypeLabel(value),
      ),
    },
    total: response.total,
  };
}

function toAuditFilterOptions(
  options: readonly AdminAuditFilterOptionSource[],
  getFallbackLabel: (value: string) => string,
): AdminAuditFilterOption[] {
  return options.map((option) =>
    typeof option === "string"
      ? {
          label: getFallbackLabel(option),
          value: option,
        }
      : option,
  );
}

class MissingAdminAuditContractError extends Error {
  constructor() {
    super("admin.audit.list is not registered");
  }
}

function getAdminAuditErrorMessage(error: unknown) {
  if (error instanceof MissingAdminAuditContractError) {
    return "El contrato admin.audit.list todavía no está disponible en el backend.";
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return `No se pudo cargar la auditoría: ${error.message}`;
  }

  return "No se pudo cargar la auditoría.";
}
