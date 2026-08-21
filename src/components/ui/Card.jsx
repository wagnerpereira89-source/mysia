export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white border border-[#e4e4e7] rounded-xl p-4 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }) {
  return (
    <h2 className={`text-[18px] font-semibold text-[#1a1a1a] mb-3 ${className}`}>
      {children}
    </h2>
  )
}
