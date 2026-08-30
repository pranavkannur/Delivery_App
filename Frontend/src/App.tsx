import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import type { User } from './types';
import { Truck, LogOut, CheckCircle2, User as UserIcon } from 'lucide-react';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  // Restore saved login session on page load
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLoginSuccess = (userData: User, token: string) => {
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
  };

  // If not logged in, show Auth screen
  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  // If logged in, show simple Success Welcome Card
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-6 shadow-2xl">
        <div className="inline-flex bg-emerald-500/20 text-emerald-400 p-4 rounded-full border border-emerald-500/30">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white">Login Successful!</h1>
          <p className="text-slate-400 text-sm mt-1">You are connected to the live backend</p>
        </div>

        {/* User Card */}
        <div className="bg-slate-800/70 p-4 rounded-xl text-left border border-slate-700 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Name:</span>
            <span className="font-semibold text-white">{user.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Email:</span>
            <span className="text-slate-200">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Account Type:</span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {user.role}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white py-2.5 rounded-xl transition border border-rose-500/30 text-sm font-semibold"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default App;