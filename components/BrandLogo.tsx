import React, { useState, useEffect } from 'react';

/**
 * BrandLogo
 * ─────────────────────────────────────────────────────────────
 * Renders a branded image (seal / logo) from `src`.
 * When `src` is empty, unset, or fails to load, renders a clean,
 * high-contrast SVG placeholder that is clearly visible in BOTH
 * light and dark modes.
 *
 * VARIANT GUIDE
 *  'seal-primary'   → City / Municipality seal  (City Hall icon, Blue accent)
 *  'seal-secondary' → Barangay seal             (Community Home icon, Green accent)
 *  'logo'           → System / App logo         (Security Shield icon, Gold accent)
 */

type LogoVariant = 'seal-primary' | 'seal-secondary' | 'logo';

interface BrandLogoProps {
  /** Image URL or Data URL. Leave "" to show placeholder. */
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
  const [loadFailed, setLoadFailed] = useState(false);

  // Reset error state if src changes
  useEffect(() => {
    setLoadFailed(false);
  }, [src]);

  // If a valid src is provided and hasn't failed, render the image.
  if (src && src.trim() !== '' && !loadFailed) {
    return (
      <img
        src={src}
        alt={alt}
        className={`object-contain ${className}`}
        onError={() => setLoadFailed(true)}
      />
    );
  }

  // Otherwise, render the designated high-contrast placeholder.
  return (
    <BrandLogoPlaceholder
      variant={variant}
      className={className}
      placeholderClassName={placeholderClassName}
      alt={alt}
    />
  );
};

// ── Placeholder Component ────────────────────────────────────────────────────

interface PlaceholderProps {
  variant: LogoVariant;
  className: string;
  placeholderClassName: string;
  alt: string;
}

// Visual themes for placeholders ensuring strong visibility in BOTH light and dark modes
const variantStyles: Record<LogoVariant, string> = {
  'seal-primary':
    'bg-blue-100/90 text-blue-700 border-blue-400 dark:bg-blue-950/80 dark:text-blue-300 dark:border-blue-500/80',
  'seal-secondary':
    'bg-emerald-100/90 text-emerald-700 border-emerald-400 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-500/80',
  'logo':
    'bg-amber-100/90 text-amber-800 border-amber-400 dark:bg-amber-950/80 dark:text-amber-300 dark:border-amber-500/80',
};

const BrandLogoPlaceholder: React.FC<PlaceholderProps> = ({
  variant,
  className,
  placeholderClassName,
  alt,
}) => {
  const themeClasses = variantStyles[variant] || variantStyles.logo;
  const base = `flex items-center justify-center rounded-full border-2 border-dashed flex-shrink-0 transition-colors shadow-sm ${themeClasses} ${className} ${placeholderClassName}`;

  return (
    <div
      className={base}
      title={`${alt} (Placeholder)`}
      aria-label={alt}
      role="img"
    >
      {variant === 'seal-primary' && <CityIcon />}
      {variant === 'seal-secondary' && <BrgyIcon />}
      {variant === 'logo' && <ShieldIcon />}
    </div>
  );
};

// ── SVG Icons (High-contrast, strokeWidth 2 for crisp visibility) ────────────

/** City / Municipality Landmark Icon */
const CityIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3/5 h-3/5 drop-shadow-sm"
  >
    <path d="M3 21h18" />
    <path d="M5 21V7l7-4 7 4v14" />
    <path d="M9 21v-4h6v4" />
    <path d="M9 10h1m4 0h1M9 14h1m4 0h1" />
    <path d="M12 3v4" />
  </svg>
);

/** Barangay / Community Home Icon */
const BrgyIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3/5 h-3/5 drop-shadow-sm"
  >
    <path d="M3 9.5L12 3l9 6.5V21H3V9.5z" />
    <path d="M9 21v-6h6v6" />
    <circle cx="12" cy="11" r="1.5" />
  </svg>
);

/** System / Security Shield Icon */
const ShieldIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-3/5 h-3/5 drop-shadow-sm"
  >
    <path d="M12 2l8 3.5v5.5c0 4.8-3.4 9.3-8 10.5C4.4 20.3 1 15.8 1 11V5.5L12 2z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export default BrandLogo;
