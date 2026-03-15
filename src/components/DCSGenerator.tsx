'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateDCS, resetAccountStatus } from '@/app/actions';
import { RefreshCw, Zap, RotateCcw, AlertTriangle } from 'lucide-react';

interface DCSGeneratorProps {
  accountId: string;
  status: string;
  hasTranscripts: boolean;
}

export function DCSGenerator({ accountId, status, hasTranscripts }: DCSGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!hasTranscripts || status === 'PROCESSING') return;
    setIsGenerating(true);
    const result = await generateDCS(accountId);
    if (!result.success) {
      alert('Failed to generate DCS: ' + result.error);
      setIsGenerating(false);
    } else {
      router.refresh();
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setShowResetConfirm(false);
    const result = await resetAccountStatus(accountId);
    if (!result.success) alert('Failed to reset: ' + result.error);
    setIsResetting(false);
    router.refresh();
  };

  const isProcessing = status === 'PROCESSING' || isGenerating;
  const canGenerate  = hasTranscripts && !isProcessing;
  const showReset    = status === 'PROCESSING' || status === 'FAILED';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Generate DCS</h2>

      <div className="space-y-3">
        {/* Primary CTA */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
            isProcessing
              ? 'bg-green-50 text-green-600 cursor-not-allowed'
              : canGenerate
              ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm hover:shadow-md'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isProcessing ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Generating DCS…</>
          ) : (
            <><Zap className="w-4 h-4" /> Generate DCS</>
          )}
        </button>

        {/* Hints */}
        {!hasTranscripts && (
          <p className="text-xs text-amber-600 flex items-center gap-1.5 justify-center">
            <AlertTriangle className="w-3.5 h-3.5" />
            Upload at least one transcript first
          </p>
        )}
        {status === 'FAILED' && (
          <p className="text-xs text-red-600 text-center">Generation failed — reset and try again.</p>
        )}

        {/* Reset */}
        {showReset && (
          !showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              disabled={isResetting}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-200 hover:border-red-200 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset & Start Over
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-center justify-between gap-3">
              <p className="text-xs text-red-700 font-medium">Clear progress and start over?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReset}
                  disabled={isResetting}
                  className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isResetting ? 'Resetting…' : 'Reset'}
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

