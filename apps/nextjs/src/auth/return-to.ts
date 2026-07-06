export function sanitizeAuthReturnTo(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const returnTo = value.trim();

  if (
    returnTo.length === 0 ||
    returnTo.length > 2048 ||
    !returnTo.startsWith("/") ||
    returnTo.startsWith("//") ||
    returnTo.includes("\\")
  ) {
    return undefined;
  }

  return returnTo;
}

export function buildAuthHomeHref(status: string, returnTo?: string) {
  const params = new URLSearchParams({ auth: status });

  if (returnTo) {
    params.set("returnTo", returnTo);
  }

  return `/?${params.toString()}#auth`;
}
