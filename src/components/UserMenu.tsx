'use client';

import { useState } from 'react';
import { logout } from '@/app/auth-actions';
import { LogOut, ChevronDown } from 'lucide-react';

interface UserMenuProps {
  user: {
    email: string;
    name?: string;
  };
}

function getInitials(nameOrEmail: string): string {
  return nameOrEmail
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const displayName = user.name || user.email.split('@')[0];
  const initials = getInitials(user.name || user.email);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white select-none flex-shrink-0">
          {initials}
        </div>
        <span className="text-sm font-medium text-gray-200 hidden sm:block max-w-[160px] truncate">
          {displayName}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl z-20 border border-gray-100 overflow-hidden">
            {/* User info */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
              </div>
            </div>
            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2.5 text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
}
