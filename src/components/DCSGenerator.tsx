'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateDCS } from '@/app/actions';
import { RefreshCw, Zap } from 'lucide-react';

interface DCSGeneratorProps {
  accountId: string;
  status: string;
  hasTranscripts: boolean;
}

export function DCSGenerator({ accountId, status, hasTranscripts }: DCSGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!hasTranscripts || status === 'PROCESSING') return;
    
    setIsGenerating(true);
    const result = await generateDCS(accountId);
    
    if (!result.success) {
      alert('Failed to generate DCS: ' + result.error);
      setIsGenerating(false);
    } else {
      // Refresh the page to show updated status and start polling
      router.refresh();
    }
  };

  const buttonDisabled = !hasTranscripts || status === 'PROCESSING' || isGenerating;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold text-green-800 mb-4">
        Generate DCS
      </h2>
      
      <div className="space-y-4">
        <p className="text-green-600">
          Generate a Discovery Capture Sheet from the uploaded transcripts using AI analysis.
        </p>
        
        <button
          onClick={handleGenerate}
          disabled={buttonDisabled}
          className={`w-full flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-colors ${
            buttonDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
          }`}
        >
          {status === 'PROCESSING' || isGenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Generating DCS...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 mr-2" />
              Generate DCS
            </>
          )}
        </button>
        
        {!hasTranscripts && (
          <p className="text-sm text-red-600">
            Please upload at least one transcript before generating DCS
          </p>
        )}
      </div>
    </div>
  );
}