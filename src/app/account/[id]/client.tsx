'use client';

import { useState, useEffect } from 'react';
import { getAccountDetails } from '@/app/actions';
import { TranscriptUploader } from '@/components/TranscriptUploader';
import { DCSGenerator } from '@/components/DCSGenerator';
import { DCSPreview } from '@/components/DCSPreview';
import { ShareAccountModal } from '@/components/ShareAccountModal';
import { UserMenu } from '@/components/UserMenu';
import { ArrowLeft, FileText, Share2, Users, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AccountPageClientProps {
  params: Promise<{ id: string }>;
  user: { email: string; name?: string };
}

export function AccountPageClient({ params, user }: AccountPageClientProps) {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    const { id } = await params;
    const accountData = await getAccountDetails(id, user.email);
    if (!accountData) { router.push('/'); return; }
    setAccount(accountData);
    setLoading(false);
  };

  if (loading || !account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-sm text-gray-500">Loading account…</p>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; className: string }> = {
    PROCESSING: { label: 'Generating…',   className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
    COMPLETED:  { label: 'DCS Ready',      className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
    FAILED:     { label: 'Failed',          className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  };
  const sc = statusConfig[account.status] ?? { label: 'Pending', className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex-shrink-0 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-green-700 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </Link>
            <div className="w-px h-5 bg-gray-200 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-gray-900 truncate">{account.name}</h1>
              {!account.isOwner && (
                <p className="text-xs text-blue-600 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />
                  Shared by {account.userEmail}
                </p>
              )}
            </div>
            <span className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${sc.className}`}>
              {sc.label}
            </span>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Share2 className="w-4 h-4" />
              {account.isOwner ? 'Share' : 'Sharing'}
            </button>
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Meta bar */}
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-6">
          <Calendar className="w-3.5 h-3.5" />
          Created {new Date(account.createdAt).toLocaleDateString()}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Left — Upload, Transcripts, Generate */}
          <div className="space-y-5">

            {/* Upload */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Upload Transcripts</h2>
              <TranscriptUploader accountId={account._id} userEmail={user.email} onUploadSuccess={loadAccount} />
            </div>

            {/* Transcript list */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Transcripts
                <span className="ml-2 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">{account.transcripts.length}</span>
              </h2>
              {account.transcripts.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="mx-auto w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-400">No transcripts uploaded yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {account.transcripts.map((t: any) => (
                    <div key={t._id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-800 truncate">{t.filename}</span>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate */}
            <DCSGenerator
              accountId={account._id}
              status={account.status}
              hasTranscripts={account.transcripts.length > 0}
            />
          </div>

          {/* Right — DCS Preview / Progress */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Discovery Capture Sheet</h2>
            <DCSPreview
              accountId={account._id}
              initialStatus={account.status}
              initialProgressStep={account.progressStep}
              initialProgressDetails={account.progressDetails}
              initialDcsData={account.dcsData}
            />
          </div>
        </div>
      </div>

      <ShareAccountModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        accountId={account._id}
        accountName={account.name}
        ownerEmail={account.userEmail}
        sharedWith={account.sharedWith || []}
        currentUserEmail={user.email}
        isOwner={account.isOwner}
        onSuccess={loadAccount}
      />
    </div>
  );
}
