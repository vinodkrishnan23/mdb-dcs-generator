'use client';

import { useEffect, useState } from 'react';
import { getAccountDetails } from '@/app/actions';
import { DCSDisplay } from '@/components/DCSDisplayNew';
import { UserMenu } from '@/components/UserMenu';
import { ArrowLeft, FileText, Download } from 'lucide-react';
import Link from 'next/link';
import { exportToPDF } from '@/lib/pdf-export';

interface DCSPageClientProps {
  params: Promise<{
    id: string;
  }>;
  user: {
    email: string;
    name?: string;
  };
}

export function DCSPageClient({ params, user }: DCSPageClientProps) {
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [selectedWorkloadIndex, setSelectedWorkloadIndex] = useState(0);

  useEffect(() => {
    async function loadAccount() {
      const { id } = await params;
      setAccountId(id);
      const accountData = await getAccountDetails(id);
      setAccount(accountData);
      setLoading(false);
    }
    loadAccount();
  }, [params]);

  const handleExportPDF = async () => {
    if (!account) return;
    
    setExporting(true);
    try {
      const workloadName = account.dcsData[selectedWorkloadIndex]?.workloadName || 'workload';
      const filename = `DCS-${account.name.replace(/[^a-z0-9]/gi, '_')}-${workloadName.replace(/[^a-z0-9]/gi, '_')}-${new Date().toISOString().split('T')[0]}.pdf`;
      await exportToPDF('dcs-content', filename);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-green-500 mx-auto mb-4 animate-pulse" />
          <p className="text-green-700 text-lg">Loading DCS...</p>
        </div>
      </div>
    );
  }

  if (!account || !account.dcsData || account.dcsData.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">DCS Not Found</h1>
          <p className="text-gray-600 mb-6">The requested DCS could not be found or has not been generated yet.</p>
          <Link
            href={`/account/${accountId}`}
            className="inline-flex items-center text-green-600 hover:text-green-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Account
          </Link>
        </div>
      </div>
    );
  }

  const currentDCS = account.dcsData[selectedWorkloadIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <Link 
            href={`/account/${accountId}`} 
            className="inline-flex items-center text-green-600 hover:text-green-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Account
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-green-800 mb-2">
                Discovery Capture Sheet
              </h1>
              <p className="text-green-600">
                {account.name} • Generated on {new Date().toLocaleDateString()}
              </p>
              {account.usage && (
                <div className="mt-2 text-sm text-green-600">
                  <span className="font-medium">Token Usage:</span> {(account.usage.totalTokens || 0).toLocaleString()} tokens 
                  <span className="mx-2">•</span>
                  <span className="font-medium">Estimated Cost:</span> ${(account.usage.estimatedCost || 0).toFixed(4)}
                </div>
              )}
            </div>
            
            <div className="flex gap-3 items-center">
              <button 
                onClick={handleExportPDF}
                disabled={exporting}
                className="inline-flex items-center px-4 py-2 border border-green-600 text-green-600 rounded-md hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className={`w-4 h-4 mr-2 ${exporting ? 'animate-spin' : ''}`} />
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <UserMenu user={user} />
            </div>
          </div>
        </div>

        {/* Workload Tabs - Show only if multiple workloads */}
        {account.dcsData.length > 1 && (
          <div className="mb-6 border-b border-gray-200">
            <div className="flex space-x-2">
              {account.dcsData.map((dcs: any, index: number) => (
                <button
                  key={dcs.workloadId}
                  onClick={() => setSelectedWorkloadIndex(index)}
                  className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                    selectedWorkloadIndex === index
                      ? 'border-green-600 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {dcs.workloadName}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-8" id="dcs-content">
          <DCSDisplay 
            dcsData={currentDCS}
            accountName={account.name}
          />
        </div>

        {/* Usage Statistics */}
        {account.usage && (
          <div className="mt-6 bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Generation Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{(account.usage.promptTokens || 0).toLocaleString()}</div>
                <div className="text-sm text-green-600">Prompt Tokens</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{(account.usage.completionTokens || 0).toLocaleString()}</div>
                <div className="text-sm text-green-600">Completion Tokens</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">{(account.usage.totalTokens || 0).toLocaleString()}</div>
                <div className="text-sm text-green-600">Total Tokens</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-700">${(account.usage.estimatedCost || 0).toFixed(4)}</div>
                <div className="text-sm text-green-600">Estimated Cost</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
