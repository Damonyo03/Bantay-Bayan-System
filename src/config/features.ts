/**
 * Feature Flags Configuration
 * Allows toggling new capabilities without needing to revert or refactor code.
 */
export const FEATURES = {
  LOGBOOK: true,
  VEHICLE_MONITOR: true,
  VEHICLE_QR_CODES: true,
  GLOBAL_SEARCH: true,
  DAILY_SUMMARY_WIDGET: true,
  OPERATIONAL_REMINDERS: true,
  SHIFT_HANDOVER: true,
  TANOD_MODE: false,
  OFFLINE_MODE: false,
} as const;


export type FeatureKey = keyof typeof FEATURES;

export const isFeatureEnabled = (feature: FeatureKey): boolean => {
  return !!FEATURES[feature];
};
