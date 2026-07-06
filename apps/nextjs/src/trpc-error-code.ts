export function readTrpcErrorCode(error: unknown) {
  return (
    readStringProperty(error, "code") ??
    readStringProperty(readRecordProperty(error, "data"), "code") ??
    readStringProperty(readRecordProperty(error, "shape"), "code") ??
    readStringProperty(
      readRecordProperty(readRecordProperty(error, "shape"), "data"),
      "code",
    )
  );
}

function readRecordProperty(
  value: unknown,
  property: string,
): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const propertyValue = (value as Record<string, unknown>)[property];

  return typeof propertyValue === "object" && propertyValue !== null
    ? (propertyValue as Record<string, unknown>)
    : null;
}

function readStringProperty(value: unknown, property: string) {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const propertyValue = (value as Record<string, unknown>)[property];

  return typeof propertyValue === "string" ? propertyValue : undefined;
}
