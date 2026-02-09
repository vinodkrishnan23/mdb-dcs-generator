import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getAccounts } from './actions';
import { CreateAccountForm } from '@/components/CreateAccountForm';
import { AccountCard } from '@/components/AccountCard';
import { UserMenu } from '@/components/UserMenu';
import { Plus, FileText } from 'lucide-react';

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
            Generate Discovery Capture Sheets from your call transcripts
          </p>
          <CreateAccountForm userEmail={user.email} />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account._id} account={account} />
          ))}
          
          {accounts.length === 0 && (
            <div className="col-span-full text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-green-400 mb-4" />
              <h3 className="text-lg font-medium text-green-800 mb-2">
                No accounts yet
              </h3>
              <p className="text-green-600">
                Create your first account to start generating DCS from transcripts
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
