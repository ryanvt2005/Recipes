export default function Input({ label, error, type = 'text', className = '', ...props }) {
  // Set sensible defaults for mobile based on input type
  const mobileProps = {};

  if (type === 'email') {
    mobileProps.autoCapitalize = 'none';
    mobileProps.autoCorrect = 'off';
    mobileProps.inputMode = 'email';
  } else if (type === 'url') {
    mobileProps.autoCapitalize = 'none';
    mobileProps.autoCorrect = 'off';
    mobileProps.inputMode = 'url';
  } else if (type === 'tel') {
    mobileProps.inputMode = 'tel';
  } else if (type === 'number') {
    mobileProps.inputMode = 'numeric';
  }

  return (
    <div className="mb-4">
      {label && <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>}
      <input
        type={type}
        className={`input min-h-[44px] ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${className}`}
        {...mobileProps}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}
