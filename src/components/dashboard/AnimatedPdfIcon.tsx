export function AnimatedPdfIcon() {
  return (
    <div className="animate-float">
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Document body */}
        <rect x="8" y="4" width="36" height="48" rx="4" fill="rgba(99,102,241,0.15)" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
        {/* Folded corner */}
        <path d="M36 4 L44 12 L36 12 Z" fill="rgba(99,102,241,0.25)" stroke="rgba(99,102,241,0.4)" strokeWidth="1.5" />
        {/* PDF badge */}
        <rect x="18" y="44" width="28" height="14" rx="3" fill="rgba(99,102,241,0.8)" />
        <text x="32" y="55" textAnchor="middle" fontSize="7" fontWeight="700" fill="white" fontFamily="system-ui">PDF</text>
        {/* Lines */}
        <line x1="14" y1="22" x2="34" y2="22" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="28" x2="34" y2="28" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="14" y1="34" x2="26" y2="34" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </div>
  );
}
