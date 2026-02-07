import Link from 'next/link';
import { FileText, Clock, CheckCircle, RefreshCw } from 'lucide-react';

interface AccountCardProps {
  account: {
    _id: string;
    name: string;
    status: string;
    transcriptCount: number;
    createdAt: Date;
  };
}

export function AccountCard({ account }: AccountCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'GENERATING':
        return <RefreshCw className="w-4 h-4 text-green-600 animate-spin" />;
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      default:
        return <Clock className="w-4 h-4 text-green-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'GENERATING':
        return 'Generating DCS...';
      case 'COMPLETED':
        return 'DCS Ready';
      default:
        return 'Ready to process';
    }
  };

  return (
    <Link href={`/account/${account._id}`}>
      <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <FileText className="w-5 h-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-semibold text-green-800 truncate">
              {account.name}
            </h3>
          </div>
          {getStatusIcon(account.status)}
        </div>
        
        <div className="space-y-2 text-sm text-green-600">
          <div className="flex justify-between">
            <span>Transcripts:</span>
            <span className="font-medium">{account.transcriptCount}</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-medium">{getStatusText(account.status)}</span>
          </div>
          <div className="flex justify-between">
            <span>Created:</span>
            <span className="font-medium">
              {new Date(account.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}