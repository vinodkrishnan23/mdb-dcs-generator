'use client';

import { useState, useEffect } from 'react';
import { DCSData } from '@/lib/schema';
import { DCSDisplay } from './DCSDisplay';
import { Clock, AlertCircle, Loader2 } from 'lucide-react';

interface DCSPreviewProps {
  accountId: string;
  initialStatus: string;
  initialProgressStep?: string;
  initialProgressDetails?: string;
  initialDcsData?: DCSData | null;
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
  const [dcsData, setDcsData] = useState<DCSData | null>(initialDcsData || null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Poll for updates when processing
    if (status === 'PROCESSING') {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/accounts/${accountId}/status`);
          if (response.ok) {
            const data = await response.json();
            setStatus(data.status);
            setProgressStep(data.progressStep);
            setProgressDetails(data.progressDetails);
            
            if (data.status === 'COMPLETED' && data.dcsData) {
              setDcsData(data.dcsData);
            } else if (data.status === 'FAILED') {
              setError(data.error || 'DCS generation failed');
            }
          }
        } catch (err) {
          console.error('Failed to fetch status:', err);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [status, accountId]);

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
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto mb-4" />
        <p className="text-green-700 font-medium mb-2">
          {progressStep || 'Processing...'}
        </p>
        {progressDetails && (
          <p className="text-sm text-gray-600">{progressDetails}</p>
        )}
      </div>
    );
  }

  if (!dcsData) {
    return (
      <div className="text-center py-8">
        <Clock className="w-8 h-8 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">Upload transcripts and generate DCS to see results here</p>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-200">
      <DCSDisplay 
        dcsData={dcsData} 
        status={status}
        accountName={dcsData.accountInfo?.workloadName || 'N/A'}
      />
    </div>
  );
}
