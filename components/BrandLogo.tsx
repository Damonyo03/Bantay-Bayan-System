import React from 'react';

/**
 * BrandLogo
 * ─────────────────────────────────────────────────────────────
 * Renders a branded image (seal / logo) from `src`.
 * When `src` is empty or not provided, renders a clean SVG
 * placeholder instead of a broken image icon.
 *
 * VARIANT GUIDE
 *  'seal-primary'   → City / Municipality seal  (landmark icon)
 *  'seal-secondary' → Barangay seal             (home/community icon)
 *  'logo'           → System / App logo         (shield icon)
 *
 * HOW TO CONFIGURE
 *  Set the src paths in `src/config/branding.ts`:
 *    primarySealUrl:   "/your_city_seal.png"
 *    secondarySealUrl: "/your_brgy_seal.png"
 *    appLogoUrl:       "/your_logo.png"
 *
 *  Drop the image files into the /public folder.
 *  Leave a URL as "" to keep showing the placeholder.
 */

type LogoVariant = 'seal-primary' | 'seal-secondary' | 'logo';

interface BrandLogoProps {
  /** Image URL (relative to /public). Leave "" to show placeholder. */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Tailwind class(es) for width/height, e.g. "w-10 h-10" */
  className?: string;
  /** Controls which placeholder icon is shown when src is empty */
  variant?: LogoVariant;
  /** Additional classes applied to the placeholder wrapper */
  placeholderClassName?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({
  src,
  alt,
  className = 'w-10 h-10',
  variant = 'logo',
  placeholderClassName = '',
}) => {
  // If a real src is provided, render the image normally.
  if (src && src.trim() !== '') {
    return (
      <img
        src={src}
        alt={alt}
        className={`object-contain ${className}`}
        onError={(e) => {
          // If the image fails to load at runtime, swap in the placeholder.
          (e.currentTarget as HTMLImageElement).style.display = 'none';
          const sibling = e.currentTarget.nextElementSibling as HTMLElement | null;
          if (sibling) sibling.style.display = 'flex';
        }}
      />
    );
  }

  // No src — render the appropriate SVG placeholder.
  return <BrandLogoPlaceholder variant={variant} className={className} placeholderClassName={placeholderClassName} alt={alt} />;
};

// ── Placeholder component ────────────────────────────────────────────────────

interface PlaceholderProps {
  variant: LogoVariant;
  className: string;
  placeholderClassName: string;
  alt: string;
}

const BrandLogoPlaceholder: React.FC<PlaceholderProps> = ({ variant, className, placeholderClassName, alt }) => {
  const base = `flex items-center justify-center rounded-full border-2 border-dashed bg-white/5 dark:bg-white/5 text-white/30 dark:text-white/20 flex-shrink-0 ${className} ${placeholderClassName}`;

  return (
    <div
      className={base}
      title={`${alt} — not configured`}
      aria-label={alt}
      role="img"
    >
      {variant === 'seal-primary'   && <CityIcon />}
      {variant === 'seal-secondary' && <BrgyIcon />}
      {variant === 'logo'           && <ShieldIcon />}
    </div>
  );
};

// ── SVG icons ────────────────────────────────────────────────────────────────

/** City / Municipality landmark icon */
const CityIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    strokeLinecap="round" strokeLinejoin="round" className="w-1/2 h-1/2">
    {/* building / city hall silhouette */}
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-4h6v4" />
    <path d="M9 10h1m4 0h1M9 14h1m4 0h1" />
    <path d="M12 3v4" />
  </svg>
);

/** Barangay / Community home icon */
const BrgyIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    strokeLinecap="round" strokeLinejoin="round" className="w-1/2 h-1/2">
    <path d="M3 9.5L12 3l9 6.5V21H3V9.5z" />
    <path d="M9 21v-6h6v6" />
    <circle cx="12" cy="11" r="1.5" />
  </svg>
);

/** System / App shield icon */
const ShieldIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}
    strokeLinecap="round" strokeLinejoin="round" className="w-1/2 h-1/2">
    <path d="M12 2l8 3.5v5.5c0 4.8-3.4 9.3-8 10.5C4.4 20.3 1 15.8 1 11V5.5L12 2z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export default BrandLogo;
