export function normalizeUploadContentType(contentType: string | null) {
  return contentType?.split(";")[0]?.trim().toLowerCase() ?? null;
}

export function readNumberUploadMetadata(
  metadata: Record<string, string>,
  key: string,
): number | null {
  const value = readStringUploadMetadata(metadata, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readStringUploadMetadata(
  metadata: Record<string, string>,
  key: string,
): string | null {
  return metadata[key.toLowerCase()] ?? metadata[key] ?? null;
}
