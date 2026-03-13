'use client';

import { useState } from 'react';
import { shareAccount, unshareAccount } from '@/app/actions';
import { X, UserPlus, Users, Mail, Trash2 } from 'lucide-react';

interface ShareAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountName: string;
  ownerEmail: string;
  sharedWith: string[];
  currentUserEmail: string;
  isOwner: boolean;
  onSuccess: () => void;
}

export function ShareAccountModal({
  isOpen,
  onClose,
  accountId,
  accountName,
  ownerEmail,
  sharedWith,
  currentUserEmail,
  isOwner,
  onSuccess,
}: ShareAccountModalProps) {
  const [emailToShare, setEmailToShare] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen) return null;

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await shareAccount(accountId, emailToShare, currentUserEmail);

    if (result.success) {
      setMessage({ type: 'success', text: `Successfully shared with ${emailToShare}` });
      setEmailToShare('');
      onSuccess();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to share account' });
    }

    setLoading(false);
  };

  const handleUnshare = async (email: string) => {
    if (!confirm(`Remove access for ${email}?`)) return;

    setLoading(true);
    setMessage(null);

    const result = await unshareAccount(accountId, email, currentUserEmail);

    if (result.success) {
      setMessage({ type: 'success', text: `Removed access for ${email}` });
      onSuccess();
    } else {
      setMessage({ type: 'error', text: result.error || 'Failed to remove access' });
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              Share Account
            </h2>
            <p className="text-sm text-gray-600 mt-1">{accountName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Owner Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center text-sm">
              <Mail className="w-4 h-4 mr-2 text-green-600" />
              <span className="text-gray-600">Owner:</span>
              <span className="ml-2 font-medium text-gray-900">{ownerEmail}</span>
            </div>
          </div>

          {/* Share Form (Owner Only) */}
          {isOwner && (
            <form onSubmit={handleShare} className="space-y-3">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Share with user (email)
                </label>
                <div className="flex space-x-2">
                  <input
                    type="email"
                    id="email"
                    value={emailToShare}
                    onChange={(e) => setEmailToShare(e.target.value)}
                    placeholder="user@example.com"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 text-sm"
                    required
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !emailToShare}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="w-4 h-4 mr-1" />
                    Share
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Message */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Shared Users List */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Shared with ({sharedWith.length})
            </h3>
            {sharedWith.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Not shared with anyone yet</p>
            ) : (
              <div className="space-y-2">
                {sharedWith.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200"
                  >
                    <div className="flex items-center">
                      <Mail className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-sm text-gray-900">{email}</span>
                    </div>
                    {isOwner && (
                      <button
                        onClick={() => handleUnshare(email)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info for non-owners */}
          {!isOwner && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                This account has been shared with you. You can view and edit, but only the owner can manage sharing settings.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
