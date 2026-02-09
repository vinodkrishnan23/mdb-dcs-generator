'use client';

import { useState, useEffect } from 'react';
import { DCSData } from '@/lib/schemas';
import { AgentFlowDiagram } from './AgentFlowDiagram';
import { Clock, AlertCircle, FileText } from 'lucide-react';

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

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
        <p className="text-red-700 font-medium mb-2">Generation Failed</p>
        <p className="text-sm text-gray-600">{error}</p>
      </div>
    );
  }

  if (status === 'PROCESSING') {
    return (
      <div className="py-8">
        <AgentFlowDiagram currentStep={progressStep} />
      </div>
    );
  }

  if (status === 'COMPLETED' && dcsDataArray.length > 0) {
    return (
      <div className="text-center py-8">
        <FileText className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <p className="text-green-700 font-medium mb-4">
          DCS Generation Complete!
        </p>
        <a
          href={`/dcs/${accountId}`}
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
        >
          <FileText className="w-5 h-5 mr-2" />
          View Full DCS
        </a>
      </div>
    );
  }

  if (dcsDataArray.length === 0) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Upload transcripts and generate DCS to see results here</p>
      </div>
    );
  }

  // If we have data but status is not COMPLETED, show the button anyway
  return (
    <div className="text-center py-8">
      <FileText className="w-16 h-16 text-green-600 mx-auto mb-4" />
      <p className="text-green-700 font-medium mb-4">
        DCS Available
      </p>
      <a
        href={`/dcs/${accountId}`}
        className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium"
      >
        <FileText className="w-5 h-5 mr-2" />
        View Full DCS
      </a>
    </div>
  );
}
