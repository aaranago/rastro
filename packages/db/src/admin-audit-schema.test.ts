import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { AdminAuditEvent } from "./schema";

describe("admin audit event schema", () => {
  it("persists actor, action, target, summary, metadata, source, and timestamp", () => {
    expect(AdminAuditEvent.actorId).toBeDefined();
    expect(AdminAuditEvent.actorEmail).toBeDefined();
    expect(AdminAuditEvent.action).toBeDefined();
    expect(AdminAuditEvent.targetType).toBeDefined();
    expect(AdminAuditEvent.targetId).toBeDefined();
    expect(AdminAuditEvent.targetLabel).toBeDefined();
    expect(AdminAuditEvent.summary).toBeDefined();
    expect(AdminAuditEvent.metadata).toBeDefined();
    expect(AdminAuditEvent.source).toBeDefined();
    expect(AdminAuditEvent.createdAt).toBeDefined();
  });

  it("indexes admin audit filters and newest-first reads", () => {
    const indexes = getTableConfig(AdminAuditEvent).indexes.map(
      (index) => index.config.name,
    );

    expect(indexes).toEqual(
      expect.arrayContaining([
        "admin_audit_event_created_idx",
        "admin_audit_event_actor_idx",
        "admin_audit_event_action_idx",
        "admin_audit_event_target_idx",
      ]),
    );
  });
});
