import * as React from "react";

import type { NearbyLocationAdapter } from "../nearby/nearby-location-adapter";
import type { ReportLocationDraft } from "../report-creation/report-location-draft";

export function useReportLocationPickerDraft<TDraft>({
  applyLocation,
  locationAdapter,
  onChooseLocation,
  setDraft,
}: {
  applyLocation: (draft: TDraft, location: ReportLocationDraft) => TDraft;
  locationAdapter?: NearbyLocationAdapter;
  onChooseLocation?: () => void;
  setDraft: React.Dispatch<React.SetStateAction<TDraft>>;
}) {
  const [isLocationPickerVisible, setLocationPickerVisible] =
    React.useState(false);

  const openLocationPicker = React.useCallback(() => {
    if (onChooseLocation) {
      onChooseLocation();
      return;
    }

    if (locationAdapter) {
      setLocationPickerVisible(true);
    }
  }, [locationAdapter, onChooseLocation]);

  const closeLocationPicker = React.useCallback(() => {
    setLocationPickerVisible(false);
  }, []);

  const confirmLocation = React.useCallback(
    (location: ReportLocationDraft) => {
      setDraft((current) => applyLocation(current, location));
      setLocationPickerVisible(false);
    },
    [applyLocation, setDraft],
  );

  return {
    closeLocationPicker,
    confirmLocation,
    isLocationPickerVisible,
    openLocationPicker,
  };
}
