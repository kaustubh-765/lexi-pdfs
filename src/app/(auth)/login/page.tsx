import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/auth';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return <LoginForm />;
}
