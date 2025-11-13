import { forwardRef } from 'react';

const Input = forwardRef(({ 
  className = '', 
  type = 'text', 
  variant = 'default',
  icon: Icon,
  error,
  label,
  ...props 
}, ref) => {
  const variants = {
    default: 'bg-gray-50 border-gray-200 focus:border-blue-500 focus:ring-blue-500/20',
    dark: 'bg-gray-800 border-gray-600 text-white focus:border-blue-500 focus:ring-blue-500/20',
    glass: 'bg-white/70 backdrop-blur border-white/30 focus:border-blue-500 focus:ring-blue-500/20',
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className={`block text-sm font-medium ${variant === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {typeof Icon === 'function' ? <Icon className="h-5 w-5 text-gray-400" /> : Icon}
          </div>
        )}
        <input
          type={type}
          ref={ref}
          className={`
            w-full rounded-xl border px-4 py-3 text-sm transition-all duration-200
            focus:outline-none focus:ring-4 placeholder-gray-400
            ${Icon ? 'pl-10' : ''}
            ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : variants[variant]}
            ${className}
          `}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export { Input };
