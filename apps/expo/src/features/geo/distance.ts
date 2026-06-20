export interface CoordinatesLike {
  latitude: number;
  longitude: number;
}

export function calculateDistanceMeters(
  from: CoordinatesLike,
  to: CoordinatesLike,
) {
  const earthRadiusMeters = 6_371_000;
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return earthRadiusMeters * centralAngle;
}

export function findWithinRadius<TItem>({
  center,
  getLocation,
  items,
  radiusMeters,
}: {
  center: CoordinatesLike;
  getLocation: (item: TItem) => CoordinatesLike;
  items: readonly TItem[];
  radiusMeters: number;
}) {
  return items
    .map((item) => ({
      distanceMeters: calculateDistanceMeters(center, getLocation(item)),
      report: item,
    }))
    .filter((match) => match.distanceMeters <= radiusMeters);
}

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}
