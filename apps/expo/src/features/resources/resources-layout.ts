const resourcesBottomSafeAreaPadding = 188;
const resourcesMinimumBottomInset = 208;

export function getResourcesScrollableBottomInset(bottomSafeAreaInset: number) {
  return Math.max(
    Math.max(bottomSafeAreaInset, 0) + resourcesBottomSafeAreaPadding,
    resourcesMinimumBottomInset,
  );
}
