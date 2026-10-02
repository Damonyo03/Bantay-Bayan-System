/**
 * ============================================================
 *  BANTAY BAYAN SYSTEM — BRANDING CONFIGURATION
 * ============================================================
 *
 *  ✅ RE-BRAND IN UNDER 5 MINUTES
 *  ─────────────────────────────────────────────────────────
 *  This is the SINGLE SOURCE OF TRUTH for all display-level
 *  branding in the web application. To deploy this system for
 *  a different Barangay or LGU, simply update the values below.
 *
 *  WHAT TO CHANGE:
 *    1. systemName       → The app's display name (shown in tabs, headers)
 *    2. orgName          → Your Barangay / LGU full name
 *    3. orgShortName     → Short form used in narrow spaces (mobile nav, etc.)
 *    4. orgSubtitle      → Optional tagline or sub-unit name (set "" to hide)
 *    5. cityName         → City or municipality name
 *    6. primarySealUrl   → Path to your City/Municipality seal (in /public)
 *    7. secondarySealUrl → Path to your Barangay seal (in /public)
 *    8. appLogoUrl       → Path to your system logo (in /public)
 *    9. emergencyContacts→ Update with your actual hotlines
 *   10. footerText       → Copyright / version string shown at the bottom
 *
 *  WHAT NOT TO CHANGE HERE:
 *    - API keys, Supabase URLs, or database field names
 *    - Role identifiers ('bantay_bayan', 'resident', 'admin', etc.)
 *    - Shared Preference keys or intent filter values
 *
 *  ─────────────────────────────────────────────────────────
 *  For Android re-branding, see:
 *    android/app/src/main/res/values/strings.xml
 *  ─────────────────────────────────────────────────────────
 */

export const branding = {
  // ── System Identity ──────────────────────────────────────
  /** Full system name — shown in page <title>, login screen, and browser tabs */
  systemName: "Bantay Bayan System",

  /** Full LGU / Barangay name — shown in sidebar header and landing page nav */
  orgName: "Community Operations",

  /** Short name for mobile headers and compact UI areas */
  orgShortName: "Bantay Bayan",

  /**
   * Sub-title line shown beneath the org name in the sidebar.
   * Typically the Barangay sub-unit or district name.
   * Set to "" (empty string) to hide this line entirely.
   */
  orgSubtitle: "",

  /** City or municipality name */
  cityName: "Your City",

  // ── Logos & Seals ─────────────────────────────────────────
  /**
   * URL paths relative to /public.
   * Drop your image files into the /public folder and set the paths below.
   *
   * Recommended sizes:
   *   - primarySealUrl   : 200×200 px transparent PNG or SVG
   *   - secondarySealUrl : 200×200 px transparent PNG or SVG
   *   - appLogoUrl       : 256×256 px transparent PNG or SVG
   *
   * PLACEHOLDER BEHAVIOUR (handled by <BrandLogo> in components/BrandLogo.tsx)
   *   - Set a path to ""  → a clean SVG placeholder is shown instead of a broken image.
   *   - Set a path to "/your_file.png" → that image is rendered.
   *   - If the image fails to load at runtime, the placeholder is shown automatically.
   *
   * Leave all three as "" until you have your own assets ready.
   */
  primarySealUrl:   "",   // → e.g. "/city_seal.png"    (City / Municipality seal)
  secondarySealUrl: "",   // → e.g. "/brgy_seal.png"    (Barangay seal)
  appLogoUrl:       "",   // → e.g. "/logo.png"          (System / App logo)

  // ── Landing Page — Vision & Mission ──────────────────────
  /**
   * Hero carousel slides shown on the public landing page.
   * Replace these with your Barangay's actual Vision & Mission text.
   */
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
  /**
   * Officials shown in the Landing Page "Leadership" carousel.
   *
   * executive[]: Top-tier officials (Punong Barangay, Secretary, Treasurer)
   *   - set isPrimary: true for the top card (Punong Barangay)
   *   - image paths are relative to /public/OFFICIALS/
   *
   * legislative[]: Kagawad / council members
   */
  executive: [
    {
      role: "Punong Barangay",
      name: "HON. [CAPTAIN NAME]",
      desc: "Executive Command",
      image: "", // → e.g. "/OFFICIALS/KAP-EXAMPLE.jpg"
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
  /**
   * Hotlines displayed on the Landing Page "Emergency" slide.
   * cityHotlines: City-level contacts
   * barangayContacts: Barangay-level contacts
   */
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
    address: "[Barangay Address], [City]",
    emergencyDesc:
      "Official gateway for Unified Security operations within your community. Rapid. Tactical. Professional.",
  },

  // ── Registration Areas ────────────────────────────────────
  /**
   * Dropdown values for the "Area / Vicinity" field in the registration form.
   * Replace with your actual sub-areas or puroks.
   * The 'OTHERS' sentinel value must remain last — it triggers a free-text input.
   */
  registrationAreas: [
    "AREA 1",
    "AREA 2",
    "AREA 3",
    "AREA 4",
    "OTHERS",
  ],

  // ── Login Page ───────────────────────────────────────────
  /**
   * Subtitle shown beneath the system name on the login screen.
   * Typically the name of the portal or operations unit.
   */
  loginSubtitle: "Operations Portal",

  // ── Footer ───────────────────────────────────────────────
  /** Copyright line shown at the bottom of the Landing Page */
  footerText: "BMS Core Command v4.0 © 2026",
} as const;

export type Branding = typeof branding;
