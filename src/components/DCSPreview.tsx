'use client';

import { useState, useEffect, useRef } from 'react';
import { DCSData } from '@/lib/schemas';
import { AgentFlowDiagram } from './AgentFlowDiagram';
import { Clock, AlertCircle, FileText, Coins, Timer } from 'lucide-react';

interface LiveUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost: number;
}

interface DCSPreviewProps {
  accountId: string;
  initialStatus: string;
  initialProgressStep?: string;
  initialProgressDetails?: any;
  initialDcsData?: DCSData[] | DCSData | null;
}

export function DCSPreview({
  accountId,
  initialStatus,
  initialProgressStep,
  initialProgressDetails,
  initialDcsData,
}: DCSPreviewProps) {
  const [status, setStatus] = useState(initialStatus);
  const [progressStep, setProgressStep] = useState(initialProgressStep);
  const [progressDetails, setProgressDetails] = useState(initialProgressDetails);
  const [liveUsage, setLiveUsage] = useState<LiveUsage | null>(null);
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const [dcsDataArray, setDcsDataArray] = useState<DCSData[]>(() => {
    if (!initialDcsData) return [];
    if (Array.isArray(initialDcsData)) return initialDcsData;
    return [initialDcsData];
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Poll for updates - start immediately and continue while processing
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/accounts/${accountId}/status`);
        if (response.ok) {
          const data = await response.json();
          setStatus(data.status);
          setProgressStep(data.progressStep);
          setProgressDetails(data.progressDetails);
          if (data.usage) setLiveUsage(data.usage);

          // Start the elapsed-time clock on first PROCESSING poll
          if (data.status === 'PROCESSING' && startedAtRef.current === null) {
            startedAtRef.current = Date.now();
          }
          
          if (data.status === 'COMPLETED' && data.dcsData) {
            const dataArray = Array.isArray(data.dcsData) ? data.dcsData : [data.dcsData];
            setDcsDataArray(dataArray);
          } else if (data.status === 'FAILED') {
            setError(data.error || 'DCS generation failed');
          }
        }
      } catch (err) {
        console.error('Failed to fetch status:', err);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [accountId]);

  // 1-second ticker for the elapsed time display
  useEffect(() => {
    if (status !== 'PROCESSING') return;
    if (startedAtRef.current === null) startedAtRef.current = Date.now();
    const tick = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - startedAtRef.current!) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [status]);

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-sm font-semibold text-red-700 mb-1">Generation Failed</p>
        <p className="text-xs text-gray-500">{error}</p>
      </div>
    );
  }

  if (status === 'PROCESSING') {
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    const elapsedLabel = mins > 0
      ? `${mins}m ${secs.toString().padStart(2, '0')}s`
      : `${secs}s`;

    return (
      <div className="py-4">
        <AgentFlowDiagram currentStep={progressStep} />
        <div className="mt-4 mx-2 px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl flex items-center gap-3 flex-wrap">
          {/* Elapsed time — always visible */}
          <div className="flex items-center gap-1.5">
            <Timer className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-xs font-semibold text-blue-700 tabular-nums">{elapsedLabel}</span>
          </div>

          {liveUsage ? (
            <>
              <span className="text-gray-200 select-none">|</span>
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-medium text-gray-600">Tokens</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{liveUsage.promptTokens.toLocaleString()}</span> in
                </span>
                <span className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{liveUsage.completionTokens.toLocaleString()}</span> out
                </span>
                <span className="text-xs text-gray-500">
                  <span className="font-medium text-gray-700">{liveUsage.totalTokens.toLocaleString()}</span> total
                </span>
              </div>
              <span className="ml-auto text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
                ${liveUsage.estimatedCost.toFixed(4)}
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">Waiting for first agent…</span>
          )}
        </div>
      </div>
    );
  }

  if (status === 'COMPLETED') {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
          <FileText className="w-8 h-8 text-green-600" />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-gray-900 mb-0.5">DCS Ready</p>
          <p className="text-sm text-gray-500">Your Discovery Capture Sheet has been generated</p>
        </div>
        <a
          href={`/dcs/${accountId}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
        >
          <FileText className="w-4 h-4" />
          View Full DCS
        </a>
      </div>
    );
  }

  if (status !== 'COMPLETED' && dcsDataArray.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
          <Clock className="w-6 h-6 text-gray-300" />
        </div>
        <p className="text-sm text-gray-400 text-center">Upload transcripts and click Generate DCS to see results here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center">
        <FileText className="w-8 h-8 text-green-600" />
      </div>
      <p className="text-sm font-semibold text-gray-900">DCS Available</p>
      <a
        href={`/dcs/${accountId}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow-md transition-all"
      >
        <FileText className="w-4 h-4" />
        View Full DCS
      </a>
    </div>
  );
}
