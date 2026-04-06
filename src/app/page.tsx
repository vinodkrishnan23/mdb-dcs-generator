import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getAccounts } from './actions';
import { CreateAccountForm } from '@/components/CreateAccountForm';
import { AccountsDashboard } from '@/components/AccountsDashboard';
import { UserMenu } from '@/components/UserMenu';
import { Building2, CheckCircle2, FileText } from 'lucide-react';

export default async function Home() {
  const user = await getUser();

  if (!user) {
    redirect('/login');
  }

  const accounts = await getAccounts(user.email);

  const totalAccounts = accounts.length;
  const completedAccounts = accounts.filter(a => a.status === 'COMPLETED').length;
  const totalTranscripts = accounts.reduce((sum, a) => sum + a.transcriptCount, 0);

  // Friendly first name: "Vinod Krishnan" → "Vinod", "vinod.k@mongodb.com" → "Vinod"
  const firstName = (user.name || user.email.split('@')[0])
    .split(/[\s.]+/)[0]
    .replace(/^\w/, c => c.toUpperCase());

  const stats = [
    { icon: Building2, value: totalAccounts, label: 'Accounts' },
    { icon: CheckCircle2, value: completedAccounts, label: 'DCS Generated' },
    { icon: FileText, value: totalTranscripts, label: 'Transcripts' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <header className="bg-[#001E2B] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-green-500 flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">TigerLens</span>
          </div>
          <UserMenu user={user} />
        </div>
      </header>

      {/* Hero strip */}
      <div className="bg-[#001E2B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16">
          <p className="text-green-400 text-xs font-semibold uppercase tracking-widest mb-2">
            Tiger DCS Generator
          </p>
          <h1 className="text-white text-3xl font-bold mb-2">
            Welcome back, {firstName}
          </h1>
          <p className="text-gray-400 text-sm">
            Transform call transcripts into structured discovery insights
          </p>

          {/* Stats */}
          <div className="mt-8 flex flex-wrap gap-3">
            {stats.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3 min-w-[130px]"
              >
                <Icon className="w-4 h-4 text-green-400 flex-shrink-0" />
                <div>
                  <div className="text-white text-xl font-bold leading-none">{value}</div>
                  <div className="text-gray-400 text-xs mt-0.5">{label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main content — slightly overlaps the hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Section toolbar */}
        <div className="flex items-center justify-between mb-6 bg-white rounded-2xl px-5 py-4 shadow-sm border border-gray-100">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Accounts</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {totalAccounts} account{totalAccounts !== 1 ? 's' : ''}
            </p>
          </div>
          <CreateAccountForm userEmail={user.email} />
        </div>

        <AccountsDashboard initialAccounts={accounts} userEmail={user.email} />
      </div>
    </div>
  );
}
