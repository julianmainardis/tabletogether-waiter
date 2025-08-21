import type React from "react"

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "full" | "icon" | "text"
  className?: string
}

export const TableTogetherLogo: React.FC<LogoProps> = ({ size = "md", variant = "full", className = "" }) => {
  const sizeClasses = {
    sm: "w-24 h-8",
    md: "w-32 h-10",
    lg: "w-48 h-16",
    xl: "w-64 h-20",
  }

  const LogoIcon = () => (
    <div className="flex items-center justify-center">
      <svg viewBox="0 0 60 60" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Mesa circular */}
        <circle cx="30" cy="30" r="20" fill="#F97316" stroke="#EA580C" strokeWidth="2" />

        {/* Personas alrededor de la mesa */}
        <circle cx="30" cy="15" r="4" fill="#1F2937" />
        <circle cx="45" cy="30" r="4" fill="#1F2937" />
        <circle cx="30" cy="45" r="4" fill="#1F2937" />
        <circle cx="15" cy="30" r="4" fill="#1F2937" />

        {/* Líneas de conexión */}
        <path
          d="M30 19 L30 26 M41 30 L34 30 M30 41 L30 34 M19 30 L26 30"
          stroke="#FED7AA"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Centro de la mesa */}
        <circle cx="30" cy="30" r="3" fill="#FED7AA" />
      </svg>
    </div>
  )

  const LogoText = () => (
    <div className="flex flex-col">
      <span className="font-bold text-orange-600 leading-tight">Table</span>
      <span className="font-bold text-gray-800 leading-tight">Together</span>
    </div>
  )

  if (variant === "icon") {
    return (
      <div className={`${sizeClasses[size]} ${className}`}>
        <LogoIcon />
      </div>
    )
  }

  if (variant === "text") {
    return (
      <div className={`${className}`}>
        <LogoText />
      </div>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`${sizeClasses[size]} aspect-square`}>
        <LogoIcon />
      </div>
      <div className="text-lg">
        <LogoText />
      </div>
    </div>
  )
}

export default TableTogetherLogo
