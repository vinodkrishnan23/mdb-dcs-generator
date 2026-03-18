'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, RefreshCw, Users, Trash2, AlertTriangle } from 'lucide-react';
import { deleteAccount } from '@/app/actions';

interface AccountCardProps {
  account: {
    _id: string;
    name: string;
    status: string;
    transcriptCount: number;
    createdAt: Date;
    isOwner?: boolean;
  };
  userEmail: string;
  onDeleted?: (id: string) => void;
}

export function AccountCard({ account, userEmail, onDeleted }: AccountCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAccount(account._id, userEmail);
      onDeleted?.(account._id);
    } catch (err) {
      console.error('Delete failed:', err);
      setIsDeleting(false);
      setShowModal(false);
    }
  };
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'GENERATING':
        return {
          icon: <RefreshCw className="w-3 h-3 animate-spin" />,
          label: 'Generating…',
          className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
        };
      case 'COMPLETED':
        return {
          icon: <CheckCircle className="w-3 h-3" />,
          label: 'DCS Ready',
          className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
        };
      default:
        return {
          icon: <Clock className="w-3 h-3" />,
          label: 'Pending',
          className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
        };
    }
  };

  const statusConfig = getStatusConfig(account.status);

  return (
    <>
      {/* Card */}
      <div className="group relative flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
        {/* Clickable body */}
        <Link href={`/account/${account._id}`} className="flex-1 p-5 flex flex-col gap-4">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
                <FileText className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="text-base font-semibold text-gray-900 truncate leading-tight">
                {account.name}
              </h3>
            </div>
            {account.isOwner === false && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                <Users className="w-3 h-3" />
                Shared
              </span>
            )}
          </div>

          {/* Meta */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-gray-400 text-xs uppercase tracking-wide font-medium">Transcripts</dt>
              <dd className="text-gray-900 font-semibold mt-0.5">{account.transcriptCount}</dd>
            </div>
            <div>
              <dt className="text-gray-400 text-xs uppercase tracking-wide font-medium">Created</dt>
              <dd className="text-gray-900 font-semibold mt-0.5">
                {new Date(account.createdAt).toLocaleDateString('en-GB')}
              </dd>
            </div>
          </dl>
        </Link>

        {/* Footer row */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-50">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.className}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>

          {/* Delete button — owner only, bottom-right */}
          {account.isOwner !== false && (
            <button
              onClick={handleDeleteClick}
              title="Delete account"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => !isDeleting && setShowModal(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 flex flex-col gap-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Delete account?</h3>
                <p className="text-sm text-gray-500 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">&ldquo;{account.name}&rdquo;</span> and all its
              transcripts will be permanently deleted.
            </p>

            <div className="flex gap-3 justify-end mt-1">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}