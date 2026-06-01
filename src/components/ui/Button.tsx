import React from 'react';

const SIZES = {
  sm:   'h-[28px] px-[12px] text-[12px] rounded-[10px]',
  md:   'h-[32px] px-[16px] text-[13px] rounded-[10px]',
  lg:   'h-[36px] px-[18px] text-[13px] rounded-[10px]',
  icon: 'w-[32px] h-[32px] rounded-[10px] p-0',
} as const;

const VARIANTS = {
  primary:   'bg-[#1f1f1f] text-white hover:bg-[#303030]',
  secondary: 'bg-[#f5f5f5] text-[#1f1f1f] hover:bg-[#ebebeb]',
  ghost:     'bg-transparent text-[#9a9a9a] hover:text-[#1f1f1f] hover:bg-[#f0f0f0]',
  danger:    'bg-[#ef4444] text-white hover:bg-[#dc2626]',
} as const;

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  icon?: React.ElementType;
}

export function Button({
  children,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  className = '',
  ...props
}: ButtonProps) {
  const iconSize = size === 'lg' ? 16 : size === 'sm' ? 12 : 14;
  return (
    <button
      className={`inline-flex items-center justify-center gap-[6px] font-bold leading-none transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={iconSize} />}
      {children && (
        <span className={size === 'icon' ? 'sr-only' : ''}>{children}</span>
      )}
    </button>
  );
}
