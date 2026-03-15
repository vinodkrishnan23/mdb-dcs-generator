import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getAccounts } from './actions';
import { CreateAccountForm } from '@/components/CreateAccountForm';
import { AccountsDashboard } from '@/components/AccountsDashboard';
import { UserMenu } from '@/components/UserMenu';

export default async function Home() {
  const user = await getUser();
  
  if (!user) {
    redirect('/login');
  }
  
  const accounts = await getAccounts(user.email);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-green-800">
            TigerLens
          </h1>
          <UserMenu user={user} />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-green-600 text-lg mb-6">
            Transform Call Transcripts into Structured Discovery Insights - Tiger DCS
          </p>
          <CreateAccountForm userEmail={user.email} />
        </div>

        <AccountsDashboard initialAccounts={accounts} userEmail={user.email} />
      </div>
    </div>
  );
}
