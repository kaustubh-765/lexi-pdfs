import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/login');
  }

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      pdfName: true,
      summary: true,
      createdAt: true,
    },
  });

  const serialized = sessions.map((s) => ({
    ...s,
    createdAt: s.createdAt.toISOString(),
  }));

  return <DashboardShell initialSessions={serialized} />;
}
