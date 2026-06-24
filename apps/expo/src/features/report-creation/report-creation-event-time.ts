export const reportCreationEventTimeValidationError =
  "Selecciona una fecha y hora valida.";

const isoDateTimePattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;

const todayMinutesAgoPattern = /^hoy,?\s+hace\s+(\d+)\s+min$/i;
const maxTodayRelativeMinutes = 24 * 60;

export function normalizeReportCreationEventTime(
  value: string,
  now: Date = new Date(),
) {
  const trimmed = value.trim();

  if (isIsoDateTime(trimmed)) {
    return toIsoStringIfValid(new Date(Date.parse(trimmed)));
  }

  const minutesAgoMatch = todayMinutesAgoPattern.exec(trimmed);

  if (minutesAgoMatch) {
    const minutesAgo = Number(minutesAgoMatch[1]);

    if (
      Number.isSafeInteger(minutesAgo) &&
      minutesAgo >= 0 &&
      minutesAgo <= maxTodayRelativeMinutes
    ) {
      return toIsoStringIfValid(new Date(now.getTime() - minutesAgo * 60_000));
    }
  }

  return undefined;
}

function isIsoDateTime(value: string) {
  return isoDateTimePattern.test(value) && Number.isFinite(Date.parse(value));
}

function toIsoStringIfValid(date: Date) {
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}
