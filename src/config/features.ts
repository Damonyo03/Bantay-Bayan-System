/**
 * Feature Flags Configuration
 * Allows toggling new capabilities without needing to revert or refactor code.
 */
export const FEATURES = {
  LOGBOOK: true,
  VEHICLE_MONITOR: false,
  SHIFT_HANDOVER: false,
  TANOD_MODE: false,
  OFFLINE_MODE: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (feature: FeatureKey): boolean => {
  return !!FEATURES[feature];
};
