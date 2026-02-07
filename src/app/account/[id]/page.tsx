import { getAccountDetails } from '@/app/actions';
import { TranscriptUploader } from '@/components/TranscriptUploader';
import { DCSGenerator } from '@/components/DCSGenerator';
import { ArrowLeft, FileText, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface AccountPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function AccountPage({ params }: AccountPageProps) {
  const { id } = await params;
  const account = await getAccountDetails(id);

  if (!account) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-green-600 hover:text-green-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-green-800 mb-2">
                {account.name}
              </h1>
              <p className="text-green-600">
                Account created on {new Date(account.createdAt).toLocaleDateString()}
              </p>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-green-500">Status</div>
              <div className="text-lg font-semibold text-green-800">
                {account.status === 'GENERATING' ? 'Generating DCS...' : 
                 account.status === 'COMPLETED' ? 'DCS Ready' : 'Ready to process'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Left Column - Upload and Generate */}
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-green-800 mb-4">
                Upload Transcripts
              </h2>
              <TranscriptUploader accountId={account._id} />
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
                        <span className="font-medium">{transcript.filename}</span>
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
            
            {account.status === 'COMPLETED' && account.dcsData && account.dcsData.length > 0 ? (
              <div className="text-center py-8">
                <div className="mb-4">
                  <FileText className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-green-800 mb-2">
                    DCS Generated Successfully
                  </h3>
                  <p className="text-green-600 mb-2">
                    {account.dcsData.length} {account.dcsData.length === 1 ? 'workload' : 'workloads'} identified
                  </p>
                  <p className="text-sm text-gray-600 mb-6">
                    Your Discovery Capture Sheet is ready to view
                  </p>
                </div>
                
                <Link
                  href={`/dcs/${account._id}`}
                  className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 text-lg font-semibold"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  View Full DCS
                </Link>
              </div>
            ) : account.status === 'PROCESSING' ? (
              <div className="text-center py-8">
                <RefreshCw className="w-16 h-16 text-green-600 animate-spin mx-auto mb-4" />
                <p className="text-green-700 text-lg">Analyzing transcripts and generating DCS...</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <p className="text-green-600 text-lg">Upload transcripts and generate DCS to see results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}