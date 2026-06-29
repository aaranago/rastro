import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  AdminMediaAsset,
  adminMediaAssetPurpose,
  adminMediaAssetStatus,
  LocalSponsorPlacement,
  moderationReportReason,
  localSponsorPlacementSurface,
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
    expect(objectKeyIndex?.unique).toBe(true);
    expect(
      pendingExpiryIndex?.where?.toQuery(postgresQueryConfig as never).sql,
    ).toBe(`"admin_media_asset"."status" = 'pending'`);
  });

  it("indexes exact PostGIS search, public location display, contacts, and sponsor windows", () => {
    const locationIndexes = getTableConfig(
      ResourceProviderLocation,
    ).indexes.map((index) => index.config.name);
    const contactIndexes = getTableConfig(
      ResourceProviderContactOption,
    ).indexes.map((index) => index.config.name);
    const sponsorIndexes = getTableConfig(LocalSponsorPlacement).indexes.map(
      (index) => index.config.name,
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
    expect(sponsorIndexes).toEqual(
      expect.arrayContaining([
        "local_sponsor_placement_provider_idx",
        "local_sponsor_placement_surface_idx",
        "local_sponsor_placement_active_window_idx",
      ]),
    );
  });

  it("persists Resource Provider moderation groups and suppresses duplicate reporter reports", () => {
    const reviewIndexes = getTableConfig(
      ResourceProviderModerationReviewItem,
    ).indexes.map((index) => index.config);
    const reportIndexes = getTableConfig(
      ResourceProviderModerationReport,
    ).indexes.map((index) => index.config);
    const reviewUnique = reviewIndexes.find(
      (index) => index.name === "resource_provider_moderation_review_unique_idx",
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
