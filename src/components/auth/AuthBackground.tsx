'use client';

export function AuthBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      {/* Gradient blobs */}
      <div
        className="absolute -top-40 -left-40 w-80 h-80 rounded-full opacity-20 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #6366f1, transparent)',
          animation: 'float 6s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-1/2 -right-40 w-96 h-96 rounded-full opacity-15 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #8b5cf6, transparent)',
          animation: 'float 8s ease-in-out infinite reverse',
        }}
      />
      <div
        className="absolute -bottom-40 left-1/3 w-80 h-80 rounded-full opacity-15 blur-3xl"
        style={{
          background: 'radial-gradient(circle, #22d3ee, transparent)',
          animation: 'float 7s ease-in-out infinite 2s',
        }}
      />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}
