import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { DCSPageClient } from './client';

interface DCSPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DCSPage({ params }: DCSPageProps) {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return <DCSPageClient params={params} user={user} />;
}
