import { useLocalSearchParams } from "expo-router";

import { PublicAdoptionListingDeepLinkScreen } from "~/features/adoption-listings/public-adoption-listing-deep-link-screen";

export default function PublicAdoptionListingDeepLinkRoute() {
  const { listingId } = useLocalSearchParams<{ listingId: string }>();

  return <PublicAdoptionListingDeepLinkScreen listingId={listingId} />;
}
