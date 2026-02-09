import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage() {
  const user = await getUser();
  
  // If already logged in, redirect to home
  if (user) {
    redirect('/');
  }

  return <LoginForm />;
}
