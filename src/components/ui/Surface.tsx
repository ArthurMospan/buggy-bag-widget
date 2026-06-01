import React from 'react';

const VARIANTS = {
  panel: 'bg-[#f4f4f5] rounded-[16px]',
  card:  'bg-white rounded-[16px]',
  inset: 'bg-[#f0f0f0] rounded-[16px]',
} as const;

const PADDING = {
  none: '',
  sm:   'p-[12px]',
  md:   'p-[16px]',
  lg:   'p-[20px]',
  xl:   'p-[24px]',
} as const;

interface SurfaceProps {
  variant?: keyof typeof VARIANTS;
  padding?: keyof typeof PADDING;
  className?: string;
  children: React.ReactNode;
}

export function Surface({
  variant = 'panel',
  padding = 'md',
  className = '',
  children,
}: SurfaceProps) {
  return (
    <div className={`${VARIANTS[variant]} ${PADDING[padding]} ${className}`}>
      {children}
    </div>
  );
}
