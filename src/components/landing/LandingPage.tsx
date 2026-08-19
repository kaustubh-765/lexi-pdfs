'use client';

import { LandingNav } from './LandingNav';
import { HeroSection } from './HeroSection';
import { FeaturesSection } from './FeaturesSection';
import { CtaSection } from './CtaSection';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060b18] relative overflow-hidden">
      {/* Ambient background blobs */}
      <div
        className="fixed top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }}
      />
      <div
        className="fixed bottom-0 right-1/4 w-[500px] h-[500px] rounded-full opacity-8 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #22d3ee, transparent)' }}
      />

      <LandingNav />
      <HeroSection />
      <FeaturesSection />
      <CtaSection />

      <footer className="text-center py-8 text-xs text-slate-600 border-t border-white/5">
        © {new Date().getFullYear()} LexiPDF. Built with Next.js &amp; AI.
      </footer>
    </div>
  );
}
