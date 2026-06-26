import type {
  AdminResourceProviderCategory,
  AdminResourceProviderContactKind,
  AdminResourceProviderCreateInput,
  AdminResourceProviderUpdateInput,
} from "./admin-resource-provider-admin-model";
import {
  resourceProviderCategoryOptions,
  resourceProviderContactKindOptions,
} from "./admin-resource-provider-admin-model";

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
  const socialLinks = getLinksFormValue(formData, "socialLink", fieldErrors);
  const externalLinks = getLinksFormValue(
    formData,
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
    department: getRequiredStringFormValue(
      formData,
      "department",
      fieldErrors,
    ),
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
    hoursLabel: getRequiredStringFormValue(
      formData,
      "hoursLabel",
      fieldErrors,
    ),
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
      logoUrl: getOptionalStringFormValue(formData, "logoUrl"),
      name: requiredFields.name,
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
  const socialLinks = getLinksFormValue(formData, "socialLink", fieldErrors);
  const externalLinks = getLinksFormValue(
    formData,
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
    hoursLabel: getRequiredStringFormValue(
      formData,
      "hoursLabel",
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
      externalLinks: externalLinks.length > 0 ? externalLinks : null,
      hoursLabel: requiredFields.hoursLabel,
      isOpenNow: getBooleanFormValue(formData, "isOpenNow"),
      location,
      logoUrl: getNullableOptionalStringFormValue(formData, "logoUrl"),
      name: requiredFields.name,
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
    department: getRequiredStringFormValue(
      formData,
      "department",
      fieldErrors,
    ),
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

  for (let index = 0; index < adminResourceProviderMaxContactOptions; index++) {
    const kind = getContactKindFormValue(formData, `contactKind${index}`);
    const label = getOptionalStringFormValue(formData, `contactLabel${index}`);
    const value = getOptionalStringFormValue(formData, `contactValue${index}`);

    if (!label && !value) {
      continue;
    }

    if (!kind) {
      fieldErrors.push({
        field: `contactKind${index}`,
        message: "Selecciona un tipo de contacto valido.",
      });
      continue;
    }

    if (!label) {
      fieldErrors.push({
        field: `contactLabel${index}`,
        message: requiredFieldMessage,
      });
      continue;
    }

    if (!value) {
      fieldErrors.push({
        field: `contactValue${index}`,
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
  fieldPrefix: "externalLink" | "socialLink",
  fieldErrors: AdminResourceProviderFormFieldError[],
): ResourceProviderLinkInput {
  const links: ResourceProviderLinkInput = [];

  for (let index = 0; index < adminResourceProviderMaxLinks; index++) {
    const label = getOptionalStringFormValue(
      formData,
      `${fieldPrefix}Label${index}`,
    );
    const url = getOptionalStringFormValue(
      formData,
      `${fieldPrefix}Url${index}`,
    );

    if (!label && !url) {
      continue;
    }

    if (!label) {
      fieldErrors.push({
        field: `${fieldPrefix}Label${index}`,
        message: requiredFieldMessage,
      });
      continue;
    }

    if (!url) {
      fieldErrors.push({
        field: `${fieldPrefix}Url${index}`,
        message: requiredFieldMessage,
      });
      continue;
    }

    links.push({ label, url });
  }

  return links;
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
  return getOptionalStringFormValue(formData, key) ?? null;
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
    message: "Selecciona una categoria valida.",
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
