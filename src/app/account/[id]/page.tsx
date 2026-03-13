import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { AccountPageClient } from './client';

interface AccountPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }

  return <AccountPageClient params={params} user={user} />;
}
