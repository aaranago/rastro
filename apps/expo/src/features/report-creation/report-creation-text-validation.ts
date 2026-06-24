const reportCreationMinimumDescriptionLength = 10;

export function getReportCreationMinimumDescriptionError({
  emptyMessage,
  shortMessage,
  value,
}: {
  emptyMessage: string;
  shortMessage: string;
  value: string;
}) {
  const trimmedLength = value.trim().length;

  if (trimmedLength === 0) {
    return emptyMessage;
  }

  if (trimmedLength < reportCreationMinimumDescriptionLength) {
    return shortMessage;
  }

  return undefined;
}
