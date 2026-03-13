'use client';

import { useState, useEffect } from 'react';
import { getAccountDetails } from '@/app/actions';
import { TranscriptUploader } from '@/components/TranscriptUploader';
import { DCSGenerator } from '@/components/DCSGenerator';
import { DCSPreview } from '@/components/DCSPreview';
import { ShareAccountModal } from '@/components/ShareAccountModal';
import { UserMenu } from '@/components/UserMenu';
import { ArrowLeft, FileText, Share2, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AccountPageClientProps {
  params: Promise<{ id: string }>;
  user: { email: string; name: string };
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
    
    if (!accountData) {
      router.push('/');
      return;
    }
    
    setAccount(accountData);
    setLoading(false);
  };

  const handleShareSuccess = () => {
    loadAccount(); // Refresh account data to show updated sharedWith list
  };

  if (loading || !account) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Link 
              href="/" 
              className="inline-flex items-center text-green-600 hover:text-green-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-bold text-green-800">
                {account.name}
              </h1>
              {!account.isOwner && (
                <p className="text-xs text-blue-600 flex items-center mt-1">
                  <Users className="w-3 h-3 mr-1" />
                  Shared with you by {account.userEmail}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Share Button */}
            <button
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {account.isOwner ? 'Share' : 'View Sharing'}
            </button>

            <div className="text-right">
              <div className="text-xs text-green-500">Status</div>
              <div className="text-sm font-semibold text-green-800">
                {account.status === 'PROCESSING' ? 'Generating DCS...' : 
                 account.status === 'COMPLETED' ? 'DCS Ready' : 'Ready to process'}
              </div>
            </div>
            <UserMenu user={user} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-green-600 text-sm">
            Account created on {new Date(account.createdAt).toLocaleDateString()}
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Upload and Generate */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">
                Upload Transcripts
              </h2>
              <TranscriptUploader accountId={account._id} userEmail={user.email} />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">
                Transcripts ({account.transcripts.length})
              </h2>
              {account.transcripts.length === 0 ? (
                <div className="text-center py-8 text-green-600">
                  <FileText className="mx-auto h-12 w-12 text-green-400 mb-4" />
                  <p>No transcripts uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {account.transcripts.map((transcript: any) => (
                    <div 
                      key={transcript._id} 
                      className="flex items-center justify-between p-3 bg-gray-50 rounded"
                    >
                      <div className="flex items-center">
                        <FileText className="w-4 h-4 text-gray-400 mr-3" />
                        <span className="font-medium text-gray-900">{transcript.filename}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(transcript.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <DCSGenerator 
              accountId={account._id} 
              status={account.status}
              hasTranscripts={account.transcripts.length > 0}
            />
          </div>

          {/* Right Column - DCS Preview */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-green-800 mb-4">
              Discovery Capture Sheet
            </h2>
            
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

      {/* Share Modal */}
      <ShareAccountModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        accountId={account._id}
        accountName={account.name}
        ownerEmail={account.userEmail}
        sharedWith={account.sharedWith || []}
        currentUserEmail={user.email}
        isOwner={account.isOwner}
        onSuccess={handleShareSuccess}
      />
    </div>
  );
}
