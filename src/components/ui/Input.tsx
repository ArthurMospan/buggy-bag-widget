import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ElementType;
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon: Icon, error, ...props }, ref) => (
    <div className="relative w-full">
      {Icon && (
        <Icon
          size={14}
          className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#9a9a9a]"
        />
      )}
      <input
        ref={ref}
        className={`h-[36px] w-full bg-[#f4f4f5] border border-transparent rounded-[10px] text-[13px] text-[#1f1f1f] focus:border-[#1f1f1f] outline-none transition-colors placeholder:text-[#a3a3a3] ${Icon ? 'pl-[36px]' : 'pl-[12px]'} pr-[12px] ${error ? 'border-red-500 bg-red-50' : ''} ${className}`}
        {...props}
      />
    </div>
  )
);
Input.displayName = 'Input';
