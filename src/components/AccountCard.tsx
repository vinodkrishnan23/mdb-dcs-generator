import Link from 'next/link';
import { FileText, Clock, CheckCircle, RefreshCw, Users } from 'lucide-react';

interface AccountCardProps {
  account: {
    _id: string;
    name: string;
    status: string;
    transcriptCount: number;
    createdAt: Date;
    isOwner?: boolean;
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
          <div className="flex items-center flex-1 min-w-0">
            <FileText className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-green-800 truncate">
              {account.name}
            </h3>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
            {account.isOwner === false && (
              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                <Users className="w-3 h-3 mr-1" />
                Shared
              </span>
            )}
            {getStatusIcon(account.status)}
          </div>
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