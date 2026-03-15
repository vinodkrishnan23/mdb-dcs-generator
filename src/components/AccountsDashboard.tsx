'use client';

import { useState, useEffect, useTransition } from 'react';
import { FileText, Search, X } from 'lucide-react';
import { searchAccounts } from '@/app/actions';
import { AccountCard } from '@/components/AccountCard';

interface Account {
  _id: string;
  name: string;
  status: string;
  transcriptCount: number;
  createdAt: Date;
  isOwner?: boolean;
}

interface AccountsDashboardProps {
  initialAccounts: Account[];
  userEmail: string;
}

export function AccountsDashboard({ initialAccounts, userEmail }: AccountsDashboardProps) {
  const [query, setQuery] = useState('');
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [isPending, startTransition] = useTransition();

  // Sync if parent re-renders with new data (e.g. after delete revalidation)
  useEffect(() => {
    if (!query.trim()) setAccounts(initialAccounts);
  }, [initialAccounts, query]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      startTransition(async () => {
        const results = await searchAccounts(query, userEmail);
        setAccounts(results as Account[]);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, userEmail]);

  const handleAccountDeleted = (accountId: string) => {
    setAccounts(prev => prev.filter(a => a._id !== accountId));
  };

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-8">
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-2xl border border-gray-200 shadow-sm focus-within:border-green-400 focus-within:ring-2 focus-within:ring-green-100 transition-all">
          <div className="flex-shrink-0">
            {isPending ? (
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search accounts by name…"
            className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none text-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {query && !isPending && (
          <p className="text-xs text-gray-400 mt-1.5 ml-1">
            {accounts.length} result{accounts.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      {/* Account grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {accounts.map(account => (
          <AccountCard
            key={account._id}
            account={account}
            userEmail={userEmail}
            onDeleted={handleAccountDeleted}
          />
        ))}

        {accounts.length === 0 && (
          <div className="col-span-full text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-green-400 mb-4" />
            {query ? (
              <>
                <h3 className="text-lg font-medium text-green-800 mb-2">No accounts found</h3>
                <p className="text-green-600">No accounts match &ldquo;{query}&rdquo;</p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium text-green-800 mb-2">No accounts yet</h3>
                <p className="text-green-600">
                  Create your first account to start generating DCS from transcripts
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
