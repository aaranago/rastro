import { describe, expect, it, vi } from "vitest";

import {
  applyAdminMemberAction,
  buildAdminMemberRedirectUrl,
  parseAdminMemberActionFormData,
} from "./admin-member-actions";

describe("admin member actions", () => {
  it("requires a reason and destructive confirmation before suspension", () => {
    const formData = new FormData();
    formData.set("memberAction", "suspend");
    formData.set("memberId", "member-diego");
    formData.set("memberSuspensionReason", " ");

    const result = parseAdminMemberActionFormData(formData);

    expect(result).toEqual({
      feedback: {
        fieldErrors: {
          confirmation:
            "Confirma que entiendes que el miembro no podra publicar.",
          reason: "Ingresa un motivo para registrar la decision.",
        },
        memberId: "member-diego",
        status: "error",
        workflow: "suspend",
      },
      ok: false,
    });
  });

  it("applies suspend and unsuspend mutations with required reasons", async () => {
    const suspend = vi.fn().mockResolvedValue({});
    const unsuspend = vi.fn().mockResolvedValue({});
    const suspendForm = new FormData();
    suspendForm.set("memberAction", "suspend");
    suspendForm.set("memberId", "member-diego");
    suspendForm.set("memberSuspensionReason", "Estafa confirmada.");
    suspendForm.set("confirmMemberSuspension", "on");
    const unsuspendForm = new FormData();
    unsuspendForm.set("memberAction", "unsuspend");
    unsuspendForm.set("memberId", "member-diego");
    unsuspendForm.set("memberSuspensionReason", "Apelación revisada.");

    await expect(
      applyAdminMemberAction(suspendForm, { suspend }),
    ).resolves.toEqual({
      memberId: "member-diego",
      ok: true,
      workflow: "suspend",
    });
    await expect(
      applyAdminMemberAction(unsuspendForm, { unsuspend }),
    ).resolves.toEqual({
      memberId: "member-diego",
      ok: true,
      workflow: "unsuspend",
    });
    expect(suspend).toHaveBeenCalledWith({
      memberId: "member-diego",
      reason: "Estafa confirmada.",
    });
    expect(unsuspend).toHaveBeenCalledWith({
      memberId: "member-diego",
      reason: "Apelación revisada.",
    });
  });

  it("builds focused redirect URLs that preserve member and field errors", () => {
    const result = parseAdminMemberActionFormData(
      new FormDataBuilder()
        .set("memberAction", "suspend")
        .set("memberId", "member-ana")
        .toFormData(),
    );

    expect(buildAdminMemberRedirectUrl(result, "ana")).toContain(
      "/admin/miembros?",
    );
    expect(buildAdminMemberRedirectUrl(result, "ana")).toContain(
      "memberId=member-ana",
    );
    expect(buildAdminMemberRedirectUrl(result, "ana")).toContain("q=ana");
    expect(buildAdminMemberRedirectUrl(result, "ana")).toContain(
      "error_reason=",
    );
  });
});

class FormDataBuilder {
  private readonly formData = new FormData();

  set(key: string, value: string) {
    this.formData.set(key, value);

    return this;
  }

  toFormData() {
    return this.formData;
  }
}
