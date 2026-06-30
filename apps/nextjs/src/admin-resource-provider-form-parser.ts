import type {
  AdminResourceProviderAttachSponsorInput,
  AdminResourceProviderCategory,
  AdminResourceProviderContactKind,
  AdminResourceProviderCreateInput,
  AdminResourceProviderDeleteInput,
  AdminResourceProviderDetachSponsorInput,
  AdminResourceProviderUpdateInput,
  AdminResourceProviderUpdateVerificationInput,
} from "./admin-resource-provider-admin-model";
import {
  localSponsorPlacementSurfaceOptions,
  resourceProviderCategoryOptions,
  resourceProviderContactKindOptions,
} from "./admin-resource-provider-admin-model";
import {
  getSponsorPlacementMediaFormValues,
  validateDateOnlyRange,
} from "./admin-url-form-parser";

export const adminResourceProviderMaxContactOptions = 8;
export const adminResourceProviderMaxLinks = 6;

export interface AdminResourceProviderFormFieldError {
  field: string;
  message: string;
}

export type AdminResourceProviderFormParseResult<TInput> =
  | {
      fieldErrors: AdminResourceProviderFormFieldError[];
      ok: false;
    }
  | {
      input: TInput;
      ok: true;
    };

type ContactOptionInput = AdminResourceProviderCreateInput["contactOptions"];
type ResourceProviderLinkInput = NonNullable<
  AdminResourceProviderCreateInput["socialLinks"]
>;

const requiredFieldMessage = "Este campo es obligatorio.";

export function parseCreateProviderInput(
  formData: FormData,
): AdminResourceProviderFormParseResult<AdminResourceProviderCreateInput> {
  const fieldErrors: AdminResourceProviderFormFieldError[] = [];
  const category = getResourceCategoryFormValue(formData, fieldErrors);
  const contactOptions = getContactOptionsFormValue(formData, fieldErrors);
  const socialLinks = getLinksFormValue(
    formData,
    "socialLinks",
    "socialLink",
    fieldErrors,
  );
  const externalLinks = getLinksFormValue(
    formData,
    "externalLinks",
    "externalLink",
    fieldErrors,
  );
  const requiredFields = {
    approximateLocationLabel: getRequiredStringFormValue(
      formData,
      "approximateLocationLabel",
      fieldErrors,
    ),
    city: getRequiredStringFormValue(formData, "city", fieldErrors),
    department: getRequiredStringFormValue(formData, "department", fieldErrors),
    description: getRequiredStringFormValue(
      formData,
      "description",
      fieldErrors,
    ),
    exactLatitude: getRequiredNumberFormValue(
      formData,
      "exactLatitude",
      fieldErrors,
    ),
    exactLongitude: getRequiredNumberFormValue(
      formData,
      "exactLongitude",
      fieldErrors,
    ),
    hoursLabel: getRequiredStringFormValue(formData, "hoursLabel", fieldErrors),
    locationCell: getRequiredStringFormValue(
      formData,
      "locationCell",
      fieldErrors,
    ),
    name: getRequiredStringFormValue(formData, "name", fieldErrors),
    serviceAreaLabel: getRequiredStringFormValue(
      formData,
      "serviceAreaLabel",
      fieldErrors,
    ),
    shortDescription: getRequiredStringFormValue(
      formData,
      "shortDescription",
      fieldErrors,
    ),
  };

  if (fieldErrors.length > 0 || !category) {
    return { fieldErrors, ok: false };
  }

  return {
    input: {
      category,
      contactOptions,
      description: requiredFields.description,
      emergencyAvailable: getBooleanFormValue(formData, "emergencyAvailable"),
      ...(externalLinks.length > 0 ? { externalLinks } : {}),
      hoursLabel: requiredFields.hoursLabel,
      isOpenNow: getBooleanFormValue(formData, "isOpenNow"),
      location: {
        addressLabel: getOptionalStringFormValue(formData, "addressLabel"),
        approximateLocationLabel: requiredFields.approximateLocationLabel,
        city: requiredFields.city,
        department: requiredFields.department,
        exactLatitude: requiredFields.exactLatitude,
        exactLongitude: requiredFields.exactLongitude,
        locationCell: requiredFields.locationCell,
      },
      logoAssetId: getOptionalStringFormValue(formData, "logoAssetId"),
      logoUrl: getOptionalStringFormValue(formData, "logoUrl"),
      name: requiredFields.name,
      photoAssetId: getOptionalStringFormValue(formData, "photoAssetId"),
      photoUrl: getOptionalStringFormValue(formData, "photoUrl"),
      serviceAreaLabel: requiredFields.serviceAreaLabel,
      shortDescription: requiredFields.shortDescription,
      ...(socialLinks.length > 0 ? { socialLinks } : {}),
      websiteUrl: getOptionalStringFormValue(formData, "websiteUrl"),
    },
    ok: true,
  };
}

export function parseUpdateProviderInput(
  formData: FormData,
): AdminResourceProviderFormParseResult<AdminResourceProviderUpdateInput> {
  const fieldErrors: AdminResourceProviderFormFieldError[] = [];
  const providerId = getRequiredStringFormValue(
    formData,
    "providerId",
    fieldErrors,
  );
  const category = getResourceCategoryFormValue(formData, fieldErrors);
  const contactOptions = getContactOptionsFormValue(formData, fieldErrors);
  const socialLinks = getLinksFormValue(
    formData,
    "socialLinks",
    "socialLink",
    fieldErrors,
  );
  const externalLinks = getLinksFormValue(
    formData,
    "externalLinks",
    "externalLink",
    fieldErrors,
  );
  const location = getLocationUpdateFormValue(formData, fieldErrors);
  const requiredFields = {
    description: getRequiredStringFormValue(
      formData,
      "description",
      fieldErrors,
    ),
    hoursLabel: getRequiredStringFormValue(formData, "hoursLabel", fieldErrors),
    name: getRequiredStringFormValue(formData, "name", fieldErrors),
    serviceAreaLabel: getRequiredStringFormValue(
      formData,
      "serviceAreaLabel",
      fieldErrors,
    ),
    shortDescription: getRequiredStringFormValue(
      formData,
      "shortDescription",
      fieldErrors,
    ),
  };

  if (fieldErrors.length > 0 || !category) {
    return { fieldErrors, ok: false };
  }

  return {
    input: {
      category,
      contactOptions,
      description: requiredFields.description,
      emergencyAvailable: getBooleanFormValue(formData, "emergencyAvailable"),
      externalLinks: externalLinks.length > 0 ? externalLinks : null,
      hoursLabel: requiredFields.hoursLabel,
      isOpenNow: getBooleanFormValue(formData, "isOpenNow"),
      location,
      logoAssetId: getOptionalStringFormValue(formData, "logoAssetId"),
      logoUrl: getNullableOptionalStringFormValue(formData, "logoUrl"),
      name: requiredFields.name,
      photoAssetId: getOptionalStringFormValue(formData, "photoAssetId"),
      photoUrl: getNullableOptionalStringFormValue(formData, "photoUrl"),
      providerId,
      serviceAreaLabel: requiredFields.serviceAreaLabel,
      shortDescription: requiredFields.shortDescription,
      socialLinks: socialLinks.length > 0 ? socialLinks : null,
      websiteUrl: getNullableOptionalStringFormValue(formData, "websiteUrl"),
    },
    ok: true,
  };
}

export function parseVerificationInput(
  formData: FormData,
): AdminResourceProviderFormParseResult<AdminResourceProviderUpdateVerificationInput> {
  const fieldErrors: AdminResourceProviderFormFieldError[] = [];
  const providerId = getRequiredStringFormValue(
    formData,
    "providerId",
    fieldErrors,
  );
  const status = getVerificationStatusFormValue(formData, fieldErrors);
  const note = getOptionalStringFormValue(formData, "verificationNote");

  if (fieldErrors.length > 0 || !status) {
    return { fieldErrors, ok: false };
  }

  return {
    input: {
      ...(note ? { note } : {}),
      providerId,
      status,
    },
    ok: true,
  };
}

export function parseAttachSponsorInput(
  formData: FormData,
): AdminResourceProviderFormParseResult<AdminResourceProviderAttachSponsorInput> {
  const fieldErrors: AdminResourceProviderFormFieldError[] = [];
  const providerId = getRequiredStringFormValue(
    formData,
    "providerId",
    fieldErrors,
  );
  const surface = getSponsorSurfaceFormValue(formData, fieldErrors);
  const startsOn = getRequiredDateOnlyFormValue(
    formData,
    "startsOn",
    fieldErrors,
  );
  const endsOn = getRequiredDateOnlyFormValue(formData, "endsOn", fieldErrors);
  const label = getOptionalStringFormValue(formData, "sponsorLabel");
  const disclosure = getOptionalStringFormValue(formData, "sponsorDisclosure");
  const media = getSponsorPlacementMediaFormValues({
    fieldErrors,
    formData,
    getOptionalStringFormValue,
  });

  validateDateOnlyRange({ endsOn, fieldErrors, startsOn });

  if (fieldErrors.length > 0 || !surface) {
    return { fieldErrors, ok: false };
  }

  return {
    input: {
      disclosure,
      endsOn,
      imageAssetId: media.imageAssetId,
      imageUrl: media.imageUrl,
      label,
      logoAssetId: media.logoAssetId,
      logoUrl: media.logoUrl,
      providerId,
      startsOn,
      surface,
    },
    ok: true,
  };
}

export function parseDetachSponsorInput(
  formData: FormData,
): AdminResourceProviderFormParseResult<AdminResourceProviderDetachSponsorInput> {
  const fieldErrors: AdminResourceProviderFormFieldError[] = [];
  const providerId = getRequiredStringFormValue(
    formData,
    "providerId",
    fieldErrors,
  );
  const placementId = getRequiredStringFormValue(
    formData,
    "placementId",
    fieldErrors,
  );

  if (fieldErrors.length > 0) {
    return { fieldErrors, ok: false };
  }

  return {
    input: {
      placementId,
      providerId,
    },
    ok: true,
  };
}

export function parseArchiveProviderInput(
  formData: FormData,
): AdminResourceProviderFormParseResult<AdminResourceProviderDeleteInput> {
  const fieldErrors: AdminResourceProviderFormFieldError[] = [];
  const providerId = getRequiredStringFormValue(
    formData,
    "providerId",
    fieldErrors,
  );

  if (getStringFormValue(formData, "archiveConfirmation") !== "confirmed") {
    fieldErrors.push({
      field: "archiveConfirmation",
      message: "Confirma que quieres archivar este proveedor.",
    });
  }

  if (fieldErrors.length > 0) {
    return { fieldErrors, ok: false };
  }

  return {
    input: {
      providerId,
    },
    ok: true,
  };
}

function getLocationUpdateFormValue(
  formData: FormData,
  fieldErrors: AdminResourceProviderFormFieldError[],
): NonNullable<AdminResourceProviderUpdateInput["location"]> {
  const exactLatitude = getOptionalNumberFormValue(formData, "exactLatitude");
  const exactLongitude = getOptionalNumberFormValue(formData, "exactLongitude");

  if ((exactLatitude === null) !== (exactLongitude === null)) {
    fieldErrors.push({
      field: exactLatitude === null ? "exactLatitude" : "exactLongitude",
      message: "Ingresa latitud y longitud exactas juntas.",
    });
  }

  return {
    addressLabel: getNullableOptionalStringFormValue(formData, "addressLabel"),
    approximateLocationLabel: getRequiredStringFormValue(
      formData,
      "approximateLocationLabel",
      fieldErrors,
    ),
    city: getRequiredStringFormValue(formData, "city", fieldErrors),
    department: getRequiredStringFormValue(formData, "department", fieldErrors),
    ...(exactLatitude !== null && exactLongitude !== null
      ? { exactLatitude, exactLongitude }
      : {}),
    locationCell: getRequiredStringFormValue(
      formData,
      "locationCell",
      fieldErrors,
    ),
  };
}

function getContactOptionsFormValue(
  formData: FormData,
  fieldErrors: AdminResourceProviderFormFieldError[],
): ContactOptionInput {
  const contactOptions: ContactOptionInput = [];
  const structuredIndices = getStructuredFieldArrayIndices(
    formData,
    "contactOptions",
  );
  const rowIndices =
    structuredIndices.length > 0
      ? structuredIndices.slice(0, adminResourceProviderMaxContactOptions)
      : Array.from(
          { length: adminResourceProviderMaxContactOptions },
          (_, index) => index,
        );
  const isStructured = structuredIndices.length > 0;

  for (const index of rowIndices) {
    const fields = isStructured
      ? {
          kind: `contactOptions.${index}.kind`,
          label: `contactOptions.${index}.label`,
          value: `contactOptions.${index}.value`,
        }
      : {
          kind: `contactKind${index}`,
          label: `contactLabel${index}`,
          value: `contactValue${index}`,
        };
    const kind = getContactKindFormValue(formData, fields.kind);
    const label = getOptionalStringFormValue(formData, fields.label);
    const value = getOptionalStringFormValue(formData, fields.value);

    if (!label && !value) {
      continue;
    }

    if (!kind) {
      fieldErrors.push({
        field: fields.kind,
        message: "Selecciona un tipo de contacto valido.",
      });
      continue;
    }

    if (!label) {
      fieldErrors.push({
        field: fields.label,
        message: requiredFieldMessage,
      });
      continue;
    }

    if (!value) {
      fieldErrors.push({
        field: fields.value,
        message: requiredFieldMessage,
      });
      continue;
    }

    contactOptions.push({ kind, label, value });
  }

  if (contactOptions.length === 0) {
    fieldErrors.push({
      field: "contactOptions",
      message: "Registra al menos una opcion de contacto.",
    });
  }

  return contactOptions;
}

function getLinksFormValue(
  formData: FormData,
  fieldArrayName: "externalLinks" | "socialLinks",
  legacyFieldPrefix: "externalLink" | "socialLink",
  fieldErrors: AdminResourceProviderFormFieldError[],
): ResourceProviderLinkInput {
  const links: ResourceProviderLinkInput = [];
  const structuredIndices = getStructuredFieldArrayIndices(
    formData,
    fieldArrayName,
  );
  const rowIndices =
    structuredIndices.length > 0
      ? structuredIndices.slice(0, adminResourceProviderMaxLinks)
      : Array.from(
          { length: adminResourceProviderMaxLinks },
          (_, index) => index,
        );
  const isStructured = structuredIndices.length > 0;

  for (const index of rowIndices) {
    const fields = isStructured
      ? {
          label: `${fieldArrayName}.${index}.label`,
          url: `${fieldArrayName}.${index}.url`,
        }
      : {
          label: `${legacyFieldPrefix}Label${index}`,
          url: `${legacyFieldPrefix}Url${index}`,
        };
    const label = getOptionalStringFormValue(formData, fields.label);
    const url = getOptionalStringFormValue(formData, fields.url);

    if (!label && !url) {
      continue;
    }

    if (!label) {
      fieldErrors.push({
        field: fields.label,
        message: requiredFieldMessage,
      });
      continue;
    }

    if (!url) {
      fieldErrors.push({
        field: fields.url,
        message: requiredFieldMessage,
      });
      continue;
    }

    links.push({ label, url });
  }

  return links;
}

function getStructuredFieldArrayIndices(
  formData: FormData,
  fieldArrayName: string,
) {
  const indices = new Set<number>();
  const fieldPrefix = `${fieldArrayName}.`;

  for (const key of formData.keys()) {
    if (!key.startsWith(fieldPrefix)) {
      continue;
    }

    const [index] = key.slice(fieldPrefix.length).split(".");
    const parsed = Number(index);

    if (Number.isInteger(parsed) && parsed >= 0) {
      indices.add(parsed);
    }
  }

  return [...indices].sort((left, right) => left - right);
}

function getRequiredStringFormValue(
  formData: FormData,
  key: string,
  fieldErrors: AdminResourceProviderFormFieldError[],
) {
  const value = getOptionalStringFormValue(formData, key);

  if (!value) {
    fieldErrors.push({ field: key, message: requiredFieldMessage });
    return "";
  }

  return value;
}

function getRequiredNumberFormValue(
  formData: FormData,
  key: string,
  fieldErrors: AdminResourceProviderFormFieldError[],
) {
  const value = getOptionalNumberFormValue(formData, key);

  if (value === null) {
    fieldErrors.push({ field: key, message: requiredFieldMessage });
    return 0;
  }

  return value;
}

function getStringFormValue(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : null;
}

function getOptionalStringFormValue(formData: FormData, key: string) {
  const value = getStringFormValue(formData, key);
  const trimmed = value?.trim();

  if (!trimmed) {
    return undefined;
  }

  return trimmed;
}

function getNullableOptionalStringFormValue(formData: FormData, key: string) {
  const value = getStringFormValue(formData, key);

  if (value === null) {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

function getOptionalNumberFormValue(formData: FormData, key: string) {
  const value = getStringFormValue(formData, key);

  if (value === null || value.trim().length === 0) {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function getBooleanFormValue(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getRequiredDateOnlyFormValue(
  formData: FormData,
  key: string,
  fieldErrors: AdminResourceProviderFormFieldError[],
) {
  const value = getRequiredStringFormValue(formData, key, fieldErrors);

  if (!value) {
    return "";
  }

  if (!isValidDateOnly(value)) {
    fieldErrors.push({
      field: key,
      message: "Ingresa una fecha valida en formato AAAA-MM-DD.",
    });
    return "";
  }

  return value;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value)
  );
}

function getResourceCategoryFormValue(
  formData: FormData,
  fieldErrors: AdminResourceProviderFormFieldError[],
): AdminResourceProviderCategory | null {
  const value = getStringFormValue(formData, "category");

  if (resourceProviderCategoryOptions.some((option) => option.id === value)) {
    return value as AdminResourceProviderCategory;
  }

  fieldErrors.push({
    field: "category",
    message: "Selecciona una categoría válida.",
  });
  return null;
}

function getSponsorSurfaceFormValue(
  formData: FormData,
  fieldErrors: AdminResourceProviderFormFieldError[],
): AdminResourceProviderAttachSponsorInput["surface"] | null {
  const value = getStringFormValue(formData, "sponsorSurface");

  if (
    localSponsorPlacementSurfaceOptions.some((option) => option.id === value)
  ) {
    return value as AdminResourceProviderAttachSponsorInput["surface"];
  }

  fieldErrors.push({
    field: "sponsorSurface",
    message: "Selecciona una superficie valida.",
  });
  return null;
}

function getVerificationStatusFormValue(
  formData: FormData,
  fieldErrors: AdminResourceProviderFormFieldError[],
): AdminResourceProviderUpdateVerificationInput["status"] | null {
  const value = getStringFormValue(formData, "verificationStatus");

  if (value === "verified" || value === "unverified") {
    return value;
  }

  fieldErrors.push({
    field: "verificationStatus",
    message: "Selecciona un estado de verificación válido.",
  });
  return null;
}

function getContactKindFormValue(
  formData: FormData,
  key: string,
): AdminResourceProviderContactKind | null {
  const value = getStringFormValue(formData, key);

  if (
    resourceProviderContactKindOptions.some((option) => option.id === value)
  ) {
    return value as AdminResourceProviderContactKind;
  }

  return null;
}
