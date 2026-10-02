import { useState, useEffect } from 'react';

/**
 * ============================================================
 *  BANTAY BAYAN SYSTEM — BRANDING CONFIGURATION
 * ============================================================
 *
 *  ✅ RE-BRAND IN UNDER 5 MINUTES OR VIA SETTINGS UI
 *  ─────────────────────────────────────────────────────────
 *  This is the baseline configuration for all display-level
 *  branding. Developers and administrators can also replace
 *  the icons and logos directly through Settings > System Branding.
 *
 *  WHAT TO CHANGE:
 *    1. systemName       → The app's display name
 *    2. orgName          → Your Barangay / LGU full name
 *    3. orgShortName     → Short form used in mobile nav
 *    4. orgSubtitle      → Optional tagline or sub-unit name (set "" to hide)
 *    5. cityName         → City or municipality name (set "" to hide text)
 *    6. primarySealUrl   → Path or data URL for City/Municipality seal
 *    7. secondarySealUrl → Path or data URL for Barangay seal
 *    8. appLogoUrl       → Path or data URL for system logo
 *    9. emergencyContacts→ Update with your actual hotlines
 *   10. footerText       → Copyright / version string
 */

export const defaultBranding = {
  // ── System Identity ──────────────────────────────────────
  /** Full system name — shown in page <title>, login screen, and browser tabs */
  systemName: "Bantay Bayan System",

  /** Full LGU / Barangay name — shown in sidebar header and landing page nav */
  orgName: "Community Operations",

  /** Short name for mobile headers and compact UI areas */
  orgShortName: "Bantay Bayan",

  /**
   * Sub-title line shown beneath the org name in the sidebar.
   * Set to "" to hide this line entirely.
   */
  orgSubtitle: "",

  /** City or municipality name. Set to "" to hide text and show only the elements. */
  cityName: "",

  // ── Logos & Seals ─────────────────────────────────────────
  /**
   * URL paths relative to /public, or base64 Data URLs uploaded via Settings.
   * Leaving these as "" will display designated SVG placeholder elements.
   */
  primarySealUrl:   "",   // City / Municipality seal
  secondarySealUrl: "",   // Barangay seal
  appLogoUrl:       "",   // System / App logo

  // ── Landing Page — Vision & Mission ──────────────────────
  heroSlides: [
    {
      title: "Our",
      highlight: "Vision",
      subtitle: "Future Forward.",
      description:
        "Our community envisions a livable, peaceful, sustainable, and progressive environment that harnesses residents to become smart, productive, and empowered citizens.",
      badge: "The Vision",
      image: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&q=80",
    },
    {
      title: "Our",
      highlight: "Mission",
      subtitle: "Commitment.",
      description:
        "We commit to the community through transparent, inclusive Programs, Projects and Activities that foster a strong sense of community with high-quality public services.",
      badge: "The Mission",
      image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80",
    },
  ],

  // ── Leadership ───────────────────────────────────────────
  executive: [
    {
      role: "Punong Barangay",
      name: "HON. [CAPTAIN NAME]",
      desc: "Executive Command",
      image: "",
      isPrimary: true,
    },
    {
      role: "Barangay Secretary",
      name: "HON. [SECRETARY NAME]",
      desc: "Administration",
      image: "",
    },
    {
      role: "Barangay Treasurer",
      name: "HON. [TREASURER NAME]",
      desc: "Fiscal Oversight",
      image: "",
    },
  ],

  legislative: [
    { role: "Kagawad", name: "HON. [MEMBER 1]", desc: "[Committee 1]", image: "" },
    { role: "Kagawad", name: "HON. [MEMBER 2]", desc: "[Committee 2]", image: "" },
    { role: "Kagawad", name: "HON. [MEMBER 3]", desc: "[Committee 3]", image: "" },
    { role: "Kagawad", name: "HON. [MEMBER 4]", desc: "[Committee 4]", image: "" },
    { role: "Kagawad", name: "HON. [MEMBER 5]", desc: "[Committee 5]", image: "" },
    { role: "Kagawad", name: "HON. [MEMBER 6]", desc: "[Committee 6]", image: "" },
    { role: "Kagawad", name: "HON. [MEMBER 7]", desc: "[Committee 7]", image: "" },
    { role: "SK Chairperson", name: "HON. [SK CHAIR]", desc: "Youth Development", image: "" },
  ],

  // ── Emergency Contacts ────────────────────────────────────
  emergency: {
    cityHotlines: [
      { label: "National:", number: "911" },
      { label: "City Emergency:", number: "[City Hotline]" },
      { label: "Command Center:", number: "[Command Center No.]" },
      { label: "BFP Fire:", number: "[Fire Dept. No.]" },
    ],
    barangayContacts: [
      { label: "Brgy. Hall:", number: "[Barangay Hall No.]" },
    ],
    address: "",
    emergencyDesc:
      "Official gateway for Unified Security operations within your community. Rapid. Tactical. Professional.",
  },

  // ── Registration Areas ────────────────────────────────────
  registrationAreas: [
    "AREA 1",
    "AREA 2",
    "AREA 3",
    "AREA 4",
    "OTHERS",
  ],

  // ── Login Page ───────────────────────────────────────────
  loginSubtitle: "Operations Portal",

  // ── Footer ───────────────────────────────────────────────
  footerText: "BMS Core Command v4.0 © 2026",
};

export type BrandingConfig = typeof defaultBranding;

const STORAGE_KEY = 'bms_custom_branding';

/** Get overrides stored by admin in localStorage */
export const getCustomBranding = (): Partial<BrandingConfig> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

/** Save admin custom branding (pictures, names, etc.) */
export const saveCustomBranding = (custom: Partial<BrandingConfig>) => {
  if (typeof window === 'undefined') return;
  try {
    const current = getCustomBranding();
    const updated = { ...current, ...custom };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('bms_branding_changed'));
  } catch (e) {
    console.error('Failed to save branding:', e);
  }
};

/** Reset custom branding to baseline defaults */
export const clearCustomBranding = () => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('bms_branding_changed'));
  } catch (e) {
    console.error('Failed to clear branding:', e);
  }
};

/** Resolve current active branding merged with any saved admin overrides */
export const getActiveBranding = (): BrandingConfig => {
  const custom = getCustomBranding();
  return {
    ...defaultBranding,
    ...custom,
    emergency: {
      ...defaultBranding.emergency,
      ...(custom.emergency || {}),
    },
  };
};

/** Reactive hook for React components to immediately re-render when branding changes */
export const useBranding = (): BrandingConfig => {
  const [currentBranding, setCurrentBranding] = useState<BrandingConfig>(getActiveBranding);

  useEffect(() => {
    const update = () => setCurrentBranding(getActiveBranding());
    window.addEventListener('bms_branding_changed', update);
    window.addEventListener('storage', update);
    return () => {
      window.removeEventListener('bms_branding_changed', update);
      window.removeEventListener('storage', update);
    };
  }, []);

  return currentBranding;
};

/** Proxy export for direct property access compatibility */
export const branding = new Proxy(defaultBranding, {
  get(_target, prop: string) {
    const active = getActiveBranding();
    return (active as any)[prop];
  },
});

export type Branding = BrandingConfig;
