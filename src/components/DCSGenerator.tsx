'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateDCS, resetAccountStatus, forceRegenerateDCS } from '@/app/actions';
import { RefreshCw, Zap, RotateCcw, AlertTriangle, CheckCircle2, FlameKindling } from 'lucide-react';

interface DCSGeneratorProps {
  accountId: string;
  status: string;
  hasTranscripts: boolean;
  allTranscriptsProcessed: boolean;
}

export function DCSGenerator({ accountId, status, hasTranscripts, allTranscriptsProcessed }: DCSGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showAllProcessedHint, setShowAllProcessedHint] = useState(false);
  const [showForceConfirm, setShowForceConfirm] = useState(false);
  const [isForcing, setIsForcing] = useState(false);
  const router = useRouter();

  const handleGenerate = async () => {
    if (!hasTranscripts || status === 'PROCESSING') return;
    setShowAllProcessedHint(false);
    setIsGenerating(true);
    const result = await generateDCS(accountId);
    if (!result.success) {
      alert('Failed to generate DCS: ' + (result as any).error);
      setIsGenerating(false);
    } else if ((result as any).allProcessed) {
      // All transcripts already processed — no new work to do
      setIsGenerating(false);
      setShowAllProcessedHint(true);
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

  const handleForceRegenerate = async () => {
    setShowForceConfirm(false);
    setIsForcing(true);
    const result = await forceRegenerateDCS(accountId);
    if (!result.success) {
      alert('Failed to start force regeneration: ' + (result as any).error);
      setIsForcing(false);
    } else {
      router.refresh();
    }
  };

  const isProcessing = status === 'PROCESSING' || isGenerating || isForcing;
  const canGenerate  = hasTranscripts && !isProcessing && !allTranscriptsProcessed;
  const showReset    = status === 'PROCESSING' || status === 'FAILED';
  const canForce     = hasTranscripts && !isProcessing && (allTranscriptsProcessed || status === 'COMPLETED');

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
        {(allTranscriptsProcessed || showAllProcessedHint) && !isProcessing && (
          <p className="text-xs text-emerald-700 flex items-center gap-1.5 justify-center text-center">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            All transcripts have been processed. Upload a new transcript to regenerate the DCS.
          </p>
        )}
        {status === 'FAILED' && (
          <p className="text-xs text-red-600 text-center">Generation failed — reset and try again.</p>
        )}

        {/* Force Regenerate */}
        {canForce && (
          !showForceConfirm ? (
            <button
              onClick={() => setShowForceConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-amber-600 hover:text-amber-700 hover:bg-amber-50 border border-amber-200 hover:border-amber-300 transition-colors"
            >
              <FlameKindling className="w-3.5 h-3.5" />
              Force Regenerate All
            </button>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
              <p className="text-xs text-amber-800 font-medium">This will reprocess all transcripts from scratch and replace the existing DCS. Continue?</p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowForceConfirm(false)}
                  className="px-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForceRegenerate}
                  disabled={isForcing}
                  className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isForcing ? <><RefreshCw className="w-3 h-3 animate-spin" /> Starting…</> : 'Yes, Regenerate'}
                </button>
              </div>
            </div>
          )
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

