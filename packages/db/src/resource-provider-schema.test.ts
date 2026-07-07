import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  AdminMediaAsset,
  adminMediaAssetPurpose,
  adminMediaAssetStatus,
  LocalSponsorPlacement,
  LocalSponsorPlacementDeliveryEvent,
  localSponsorPlacementDeliveryEventType,
  localSponsorPlacementSurface,
  moderationReportReason,
  ResourceProvider,
  resourceProviderCategory,
  resourceProviderContactKind,
  ResourceProviderContactOption,
  ResourceProviderLocation,
  ResourceProviderModerationReport,
  ResourceProviderModerationReviewItem,
  resourceProviderModerationReviewStatus,
} from "./schema";

const postgresQueryConfig = {
  casing: {
    getColumnCasing: (column: { name: string }) => column.name,
  },
  escapeName: (name: string) => `"${name}"`,
  escapeParam: (index: number) => `$${index + 1}`,
  escapeString: (value: string) => `'${value.replaceAll("'", "''")}'`,
};

describe("resource provider schema", () => {
  it("aligns resource categories, contact kinds, and sponsor surfaces with Recursos contracts", () => {
    expect(resourceProviderCategory.enumValues).toEqual([
      "veterinary",
      "shelter",
      "groomer",
      "pet_food",
      "trainer",
      "pet_store",
      "transport",
      "other",
    ]);
    expect(resourceProviderContactKind.enumValues).toEqual([
      "phone",
      "whatsapp",
      "website",
      "email",
      "directions",
      "social",
    ]);
    expect(localSponsorPlacementSurface.enumValues).toEqual([
      "resources_directory",
      "provider_details",
      "launch_home_banner",
      "report_success",
      "contextual_care_resources",
    ]);
    expect(localSponsorPlacementDeliveryEventType.enumValues).toEqual([
      "impression",
      "open",
    ]);
    expect(moderationReportReason.enumValues).toEqual([
      "spam",
      "scam",
      "incorrect_location",
      "offensive_content",
      "animal_cruelty",
      "stolen_pet_concern",
      "impersonation",
      "other",
    ]);
    expect(resourceProviderModerationReviewStatus.enumValues).toEqual([
      "pending",
      "dismissed_false_report",
      "resolved_action_taken",
      "resolved_no_action",
    ]);
    expect(adminMediaAssetPurpose.enumValues).toEqual([
      "provider_logo",
      "provider_photo",
      "sponsor_logo",
      "sponsor_image",
    ]);
    expect(adminMediaAssetStatus.enumValues).toEqual([
      "pending",
      "ready",
      "failed",
      "removed",
    ]);
  });

  it("stores exact provider coordinates privately and exposes separate public coordinates", () => {
    expect(ResourceProviderLocation.exactPoint.getSQLType()).toBe(
      "geometry(point,4326)",
    );
    expect(ResourceProviderLocation.publicPoint.getSQLType()).toBe(
      "geometry(point,4326)",
    );
    expect(ResourceProviderLocation.exactLatitude).toBeDefined();
    expect(ResourceProviderLocation.exactLongitude).toBeDefined();
    expect(ResourceProviderLocation.publicLatitude).toBeDefined();
    expect(ResourceProviderLocation.publicLongitude).toBeDefined();
    expect(ResourceProviderLocation.city).toBeDefined();
    expect(ResourceProviderLocation.department).toBeDefined();
    expect(ResourceProviderLocation.approximateLocationLabel).toBeDefined();
    expect(ResourceProviderLocation.locationCell).toBeDefined();
  });

  it("keeps sponsor media as nullable URL fallback columns", () => {
    expect(LocalSponsorPlacement.logoUrl).toBeDefined();
    expect(LocalSponsorPlacement.imageUrl).toBeDefined();
    expect(LocalSponsorPlacement.logoUrl.notNull).toBe(false);
    expect(LocalSponsorPlacement.imageUrl.notNull).toBe(false);
  });

  it("stores paid sponsor delivery events without making placement ids public", () => {
    const indexes = getTableConfig(
      LocalSponsorPlacementDeliveryEvent,
    ).indexes.map((index) => index.config);

    expect(LocalSponsorPlacementDeliveryEvent.placementId).toBeDefined();
    expect(LocalSponsorPlacementDeliveryEvent.providerId).toBeDefined();
    expect(LocalSponsorPlacementDeliveryEvent.surface).toBeDefined();
    expect(LocalSponsorPlacementDeliveryEvent.eventType).toBeDefined();
    expect(LocalSponsorPlacementDeliveryEvent.idempotencyKey).toBeDefined();
    expect(LocalSponsorPlacementDeliveryEvent.idempotencyKey.notNull).toBe(
      true,
    );
    expect(LocalSponsorPlacementDeliveryEvent.memberId).toBeDefined();
    expect(LocalSponsorPlacementDeliveryEvent.source).toBeDefined();
    expect(LocalSponsorPlacementDeliveryEvent.occurredAt.notNull).toBe(true);
    expect(
      indexes.some(
        (index) =>
          index.name === "local_sponsor_delivery_event_idempotency_idx" &&
          index.unique === true,
      ),
    ).toBe(true);
    expect(indexes.map((index) => index.name)).toEqual(
      expect.arrayContaining([
        "local_sponsor_delivery_event_placement_idx",
        "local_sponsor_delivery_event_provider_surface_idx",
      ]),
    );
  });

  it("stores admin-owned media assets separately from report media", () => {
    const indexes = getTableConfig(AdminMediaAsset).indexes.map(
      (index) => index.config,
    );
    const objectKeyIndex = indexes.find(
      (index) => index.name === "admin_media_asset_object_key_idx",
    );
    const pendingExpiryIndex = indexes.find(
      (index) => index.name === "admin_media_asset_pending_expiry_idx",
    );

    expect(AdminMediaAsset.createdByAdminId).toBeDefined();
    expect(AdminMediaAsset.purpose).toBeDefined();
    expect(AdminMediaAsset.status).toBeDefined();
    expect(AdminMediaAsset.objectKey).toBeDefined();
    expect(AdminMediaAsset.canonicalUrl).toBeDefined();
    expect(AdminMediaAsset.expectedChecksumSha256).toBeDefined();
    expect(AdminMediaAsset.expiresAt).toBeDefined();
    expect(AdminMediaAsset.verifiedAt).toBeDefined();
    expect(AdminMediaAsset.failedAt).toBeDefined();
    expect(AdminMediaAsset.removedAt).toBeDefined();
    expect(AdminMediaAsset.createdAt.default).toBeDefined();
    expect(AdminMediaAsset.createdAt.notNull).toBe(true);
    expect(AdminMediaAsset.updatedAt.default).toBeDefined();
    expect(AdminMediaAsset.updatedAt.notNull).toBe(true);
    expect(objectKeyIndex?.unique).toBe(true);
    expect(
      pendingExpiryIndex?.where?.toQuery(postgresQueryConfig as never).sql,
    ).toBe(`"admin_media_asset"."status" = 'pending'`);
  });

  it("keeps admin media assets inside Drizzle-managed app tables", async () => {
    process.env.POSTGRES_URL ??=
      "postgresql://postgres:postgres@localhost/rastro";

    const { default: drizzleConfig } = await import("../drizzle.config");

    expect(drizzleConfig.tablesFilter).toContain("admin_media_asset");
    expect(drizzleConfig.tablesFilter).toContain("admin_settings");
    expect(drizzleConfig.tablesFilter).toContain(
      "local_sponsor_placement_delivery_event",
    );
  });

  it("indexes exact PostGIS search, public location display, contacts, and sponsor windows", () => {
    const locationIndexes = getTableConfig(
      ResourceProviderLocation,
    ).indexes.map((index) => index.config.name);
    const contactIndexes = getTableConfig(
      ResourceProviderContactOption,
    ).indexes.map((index) => index.config.name);
    const sponsorIndexes = getTableConfig(LocalSponsorPlacement).indexes.map(
      (index) => index.config,
    );
    const sponsorIndexNames = sponsorIndexes.map((index) => index.name);
    const sponsorActiveWindowIndex = sponsorIndexes.find(
      (index) => index.name === "local_sponsor_placement_active_window_idx",
    );

    expect(locationIndexes).toEqual(
      expect.arrayContaining([
        "resource_provider_location_exact_point_gist_idx",
        "resource_provider_location_public_point_gist_idx",
        "resource_provider_location_city_idx",
        "resource_provider_location_department_idx",
        "resource_provider_location_cell_idx",
      ]),
    );
    expect(contactIndexes).toContain("resource_provider_contact_provider_idx");
    expect(sponsorIndexNames).toEqual(
      expect.arrayContaining([
        "local_sponsor_placement_provider_idx",
        "local_sponsor_placement_surface_idx",
        "local_sponsor_placement_active_window_idx",
        "local_sponsor_placement_detached_idx",
      ]),
    );
    expect(
      sponsorActiveWindowIndex?.where?.toQuery(postgresQueryConfig as never)
        .sql,
    ).toBe(`"local_sponsor_placement"."detached_at" IS NULL`);
  });

  it("adds database-level sponsor window validity and overlap protection", () => {
    const migration = readFileSync(
      resolve("drizzle/0020_sponsor_window_constraints.sql"),
      "utf8",
    );

    expect(migration).toContain("CREATE EXTENSION IF NOT EXISTS btree_gist");
    expect(migration).toContain("local_sponsor_placement_valid_window_chk");
    expect(migration).toContain("starts_at");
    expect(migration).toContain(
      "local_sponsor_placement_no_window_overlap_excl",
    );
    expect(migration).toContain("tstzrange");
  });

  it("persists Resource Provider moderation groups and suppresses duplicate reporter reports", () => {
    const reviewIndexes = getTableConfig(
      ResourceProviderModerationReviewItem,
    ).indexes.map((index) => index.config);
    const reportIndexes = getTableConfig(
      ResourceProviderModerationReport,
    ).indexes.map((index) => index.config);
    const reviewUnique = reviewIndexes.find(
      (index) =>
        index.name === "resource_provider_moderation_review_unique_idx",
    );
    const reportUnique = reportIndexes.find(
      (index) =>
        index.name === "resource_provider_moderation_report_reporter_idx",
    );

    expect(ResourceProviderModerationReviewItem.providerId).toBeDefined();
    expect(ResourceProviderModerationReviewItem.reason).toBeDefined();
    expect(ResourceProviderModerationReviewItem.lastReportedAt).toBeDefined();
    expect(ResourceProviderModerationReport.reviewItemId).toBeDefined();
    expect(ResourceProviderModerationReport.reporterId).toBeDefined();
    expect(ResourceProviderModerationReport.detail).toBeDefined();
    expect(
      reviewUnique?.columns.map((column) => "name" in column && column.name),
    ).toEqual(["providerId", "reason"]);
    expect(reviewUnique?.where?.toQuery(postgresQueryConfig as never).sql).toBe(
      `"resource_provider_moderation_review_item"."status" = 'pending'`,
    );
    expect(
      reportUnique?.columns.map((column) => "name" in column && column.name),
    ).toEqual(["reporterId", "providerId", "reason"]);
  });

  it("uses Date values for provider timestamp update hooks", () => {
    expect(ResourceProvider.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(ResourceProviderLocation.updatedAt.onUpdateFn?.()).toBeInstanceOf(
      Date,
    );
    expect(
      ResourceProviderContactOption.updatedAt.onUpdateFn?.(),
    ).toBeInstanceOf(Date);
    expect(LocalSponsorPlacement.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(
      ResourceProviderModerationReviewItem.updatedAt.onUpdateFn?.(),
    ).toBeInstanceOf(Date);
    expect(AdminMediaAsset.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
