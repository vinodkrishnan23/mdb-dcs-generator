import { redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import { getAccountDetails } from '@/app/actions';
import { TranscriptUploader } from '@/components/TranscriptUploader';
import { DCSGenerator } from '@/components/DCSGenerator';
import { DCSPreview } from '@/components/DCSPreview';
import { UserMenu } from '@/components/UserMenu';
import { ArrowLeft, FileText } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

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
  
  const { id } = await params;
  const account = await getAccountDetails(id);

  if (!account) {
    notFound();
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
            <h1 className="text-xl font-bold text-green-800">
              {account.name}
            </h1>
          </div>
          <div className="flex items-center space-x-4">
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
                  {account.transcripts.map((transcript) => (
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
    </div>
  );
}