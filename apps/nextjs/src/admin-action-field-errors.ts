export interface AdminActionFieldError {
  field: string;
  message: string;
}

export function getMutationFieldErrors(
  error: unknown,
): AdminActionFieldError[] {
  const fieldErrors = findErrorFieldErrors(error);

  if (!fieldErrors) {
    return [];
  }

  return Object.entries(fieldErrors).flatMap(([field, messages]) =>
    messages.map((message) => ({
      field,
      message,
    })),
  );
}

function findErrorFieldErrors(
  error: unknown,
): Record<string, string[]> | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }

  if ("fieldErrors" in error && isFieldErrorRecord(error.fieldErrors)) {
    return error.fieldErrors;
  }

  if ("cause" in error) {
    return findErrorFieldErrors(error.cause);
  }

  return undefined;
}

function isFieldErrorRecord(value: unknown): value is Record<string, string[]> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every(
      (messages) =>
        Array.isArray(messages) &&
        messages.every((message) => typeof message === "string"),
    )
  );
}
