import { forwardRef } from 'react';

const Button = forwardRef(({ 
  className = '', 
  variant = 'primary', 
  size = 'default', 
  children, 
  ...props 
}, ref) => {
  const variants = {
    primary: 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25',
    secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-200',
    success: 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25',
    danger: 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white shadow-lg shadow-red-500/25',
    warning: 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg shadow-yellow-500/25',
    ghost: 'hover:bg-gray-100 text-gray-700 border border-gray-200 hover:border-gray-300',
    outline: 'border-2 border-blue-500 text-blue-600 hover:bg-blue-50',
  };

  const sizes = {
    sm: 'px-3 py-2 text-sm',
    default: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg',
  };

  return (
    <button
      ref={ref}
      className={`
        inline-flex items-center justify-center rounded-xl font-medium 
        transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-500/20
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className?.includes('flex-col') ? '' : 'gap-2'}
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export { Button };
