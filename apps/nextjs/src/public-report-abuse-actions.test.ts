import { beforeEach, describe, expect, it, vi } from "vitest";

const nextNavigation = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

const nextHeaders = vi.hoisted(() => ({
  headers: vi.fn(() => new Headers()),
}));

const reportAbuse = vi.hoisted(() => vi.fn());

const api = vi.hoisted(() => ({
  appRouter: {
    createCaller: vi.fn(() => ({
      report: {
        reportAbuse,
      },
    })),
  },
  createTRPCContext: vi.fn(() => ({
    session: {
      user: {
        id: "member-diego",
      },
    },
  })),
}));

vi.mock("next/navigation", () => nextNavigation);
vi.mock("next/headers", () => nextHeaders);
vi.mock("@acme/api", () => api);
vi.mock("~/env", () => ({
  env: {
    RASTRO_ADMIN_EMAILS: "",
  },
}));
vi.mock("~/auth/server", () => ({
  auth: {},
}));
vi.mock("~/trpc-error-code", () => ({
  readTrpcErrorCode: (error: unknown) =>
    error instanceof Error && "code" in error
      ? (error as Error & { code: string }).code
      : undefined,
}));

const reportId = "11111111-1111-4111-8111-111111111111";

describe("public report abuse server action", () => {
  beforeEach(() => {
    nextNavigation.redirect.mockClear();
    nextHeaders.headers.mockClear();
    api.appRouter.createCaller.mockClear();
    api.createTRPCContext.mockClear();
    reportAbuse.mockReset();
  });

  it("submits a valid abuse report and redirects back with created status", async () => {
    const { reportPublicReportAbuse } = await import(
      "./public-report-abuse-actions"
    );
    reportAbuse.mockResolvedValue({
      status: "created",
    });

    await expect(
      reportPublicReportAbuse(
        createFormData({
          detail: "Este reporte usa fotos falsas de otra mascota.",
          reason: "scam",
          reportId,
          returnTo: `/reportes/encontrados/${reportId}`,
        }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/reportes/encontrados/${reportId}?reportAbuse=created#reportar`,
    );

    expect(reportAbuse).toHaveBeenCalledWith({
      detail: "Este reporte usa fotos falsas de otra mascota.",
      reason: "scam",
      reportId,
    });
    expect(api.createTRPCContext).toHaveBeenCalledOnce();
    expect(nextHeaders.headers).toHaveBeenCalledOnce();
  });

  it("preserves duplicate receipts instead of showing a generic error", async () => {
    const { reportPublicReportAbuse } = await import(
      "./public-report-abuse-actions"
    );
    reportAbuse.mockResolvedValue({
      status: "already_reported",
    });

    await expect(
      reportPublicReportAbuse(
        createFormData({
          detail: "Este reporte usa fotos falsas de otra mascota.",
          reason: "scam",
          reportId,
          returnTo: `/reportes/avistamientos/${reportId}`,
        }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/reportes/avistamientos/${reportId}?reportAbuse=already_reported#reportar`,
    );
  });

  it("drops unsafe return paths before redirecting invalid reports", async () => {
    const { reportPublicReportAbuse } = await import(
      "./public-report-abuse-actions"
    );

    await expect(
      reportPublicReportAbuse(
        createFormData({
          detail: "corto",
          reason: "other",
          reportId,
          returnTo: "https://evil.example/reportes/perdidos/1",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/?reportAbuse=invalid#reportar");

    expect(reportAbuse).not.toHaveBeenCalled();
  });

  it("sends unauthorized visitors to sign-in with only safe return paths", async () => {
    const { reportPublicReportAbuse } = await import(
      "./public-report-abuse-actions"
    );
    const unauthorized = new Error("Unauthorized") as Error & { code: string };
    unauthorized.code = "UNAUTHORIZED";
    reportAbuse.mockRejectedValue(unauthorized);

    await expect(
      reportPublicReportAbuse(
        createFormData({
          detail: "Este reporte usa fotos falsas de otra mascota.",
          reason: "scam",
          reportId,
          returnTo: `/reportes/perdidos/${reportId}`,
        }),
      ),
    ).rejects.toThrow(
      `NEXT_REDIRECT:/?auth=signin-required&returnTo=%2Freportes%2Fperdidos%2F${reportId}#auth`,
    );

    await expect(
      reportPublicReportAbuse(
        createFormData({
          detail: "Este reporte usa fotos falsas de otra mascota.",
          reason: "scam",
          reportId,
          returnTo: "//evil.example/reportes/perdidos/1",
        }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT:/?auth=signin-required#auth");
  });
});

function createFormData(values: {
  detail: string;
  reason: string;
  reportId: string;
  returnTo: string;
}) {
  const formData = new FormData();

  formData.set("detail", values.detail);
  formData.set("reason", values.reason);
  formData.set("reportId", values.reportId);
  formData.set("returnTo", values.returnTo);

  return formData;
}
