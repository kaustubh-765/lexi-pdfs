import { AuthBackground } from '@/components/auth/AuthBackground';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#060b18]">
      <AuthBackground />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
