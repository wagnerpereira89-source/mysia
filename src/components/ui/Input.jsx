export function Input({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[13px] font-medium text-[#52525b]">{label}</label>
      )}
      <input
        className={`w-full h-10 px-3 text-sm bg-white border rounded-lg outline-none transition-colors
          border-[#e4e4e7] focus:border-primary focus:ring-2 focus:ring-primary/20
          placeholder:text-[#a1a1aa] disabled:bg-[#f4f4f5] disabled:cursor-not-allowed
          ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Textarea({ label, error, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[13px] font-medium text-[#52525b]">{label}</label>
      )}
      <textarea
        className={`w-full px-3 py-2 text-sm bg-white border rounded-lg outline-none transition-colors resize-y
          border-[#e4e4e7] focus:border-primary focus:ring-2 focus:ring-primary/20
          placeholder:text-[#a1a1aa] min-h-[200px]
          ${error ? 'border-red-500' : ''}
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
