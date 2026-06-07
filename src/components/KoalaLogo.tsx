// Mascota del asistente: un koala (guiño a "kernel-koalas").
export function KoalaLogo({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Orejas */}
      <circle cx="15" cy="19" r="11" fill="#9CA3AF" />
      <circle cx="15" cy="19" r="5.5" fill="#E7C3CE" />
      <circle cx="49" cy="19" r="11" fill="#9CA3AF" />
      <circle cx="49" cy="19" r="5.5" fill="#E7C3CE" />
      {/* Cabeza */}
      <circle cx="32" cy="35" r="20" fill="#AEB4BA" />
      {/* Ojos */}
      <circle cx="24" cy="33" r="2.6" fill="#2D2D2D" />
      <circle cx="40" cy="33" r="2.6" fill="#2D2D2D" />
      {/* Nariz */}
      <ellipse cx="32" cy="41" rx="7.5" ry="6" fill="#374151" />
      <ellipse cx="29.6" cy="39.4" rx="1.6" ry="1.1" fill="#fff" opacity="0.5" />
    </svg>
  );
}
