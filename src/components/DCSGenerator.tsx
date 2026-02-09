'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateDCS, resetAccountStatus } from '@/app/actions';
import { RefreshCw, Zap, RotateCcw } from 'lucide-react';

interface DCSGeneratorProps {
  accountId: string;
  status: string;
  hasTranscripts: boolean;
}

export function DCSGenerator({ accountId, status, hasTranscripts }: DCSGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
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

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset? This will clear the current generation progress and allow you to start over.')) {
      return;
    }
    
    setIsResetting(true);
    const result = await resetAccountStatus(accountId);
    
    if (!result.success) {
      alert('Failed to reset: ' + result.error);
    }
    
    setIsResetting(false);
    router.refresh();
  };

  const buttonDisabled = !hasTranscripts || status === 'PROCESSING' || isGenerating;
  const showResetButton = status === 'PROCESSING' || status === 'FAILED';

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

        {showResetButton && (
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="w-full flex items-center justify-center px-4 py-3 rounded-md text-sm font-medium transition-colors bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            {isResetting ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset & Start Over
              </>
            )}
          </button>
        )}
        
        {!hasTranscripts && (
          <p className="text-sm text-red-600">
            Please upload at least one transcript before generating DCS
          </p>
        )}

        {status === 'FAILED' && (
          <p className="text-sm text-red-600">
            Generation failed. Click "Reset & Start Over" to try again.
          </p>
        )}
      </div>
    </div>
  );
}