import { forwardRef } from 'react';

const Card = forwardRef(({ className = '', children, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-white/95 backdrop-blur-xl border border-white/20 shadow-xl',
    dark: 'bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 shadow-xl',
    glass: 'bg-white/80 backdrop-blur-xl border border-white/30 shadow-2xl',
    elevated: 'bg-white shadow-2xl border border-gray-100',
  };

  return (
    <div
      ref={ref}
      className={`rounded-2xl ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export { Card };
