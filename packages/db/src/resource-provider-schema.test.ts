import { getTableConfig } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import {
  LocalSponsorPlacement,
  localSponsorPlacementSurface,
  ResourceProvider,
  resourceProviderCategory,
  resourceProviderContactKind,
  ResourceProviderContactOption,
  ResourceProviderLocation,
} from "./schema";

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

  it("uses Date values for provider timestamp update hooks", () => {
    expect(ResourceProvider.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
    expect(ResourceProviderLocation.updatedAt.onUpdateFn?.()).toBeInstanceOf(
      Date,
    );
    expect(
      ResourceProviderContactOption.updatedAt.onUpdateFn?.(),
    ).toBeInstanceOf(Date);
    expect(LocalSponsorPlacement.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date);
  });
});
