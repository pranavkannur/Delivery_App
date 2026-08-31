import React, { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { Navbar } from './components/Navbar';
import { CustomerDashboard } from './components/CustomerDashboard';
import { DriverDashboard } from './components/DriverDashboard';
import { PartnerDashboard } from './components/PartnerDashboard';
import type { User } from './types';

export const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

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

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#ececee] flex flex-col font-['Inter',sans-serif]">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="flex-1">
        {user.role === 'DRIVER' && <DriverDashboard user={user} />}
        {user.role === 'PARTNER' && <PartnerDashboard user={user} />}
        {user.role === 'CUSTOMER' && <CustomerDashboard />}
      </main>
    </div>
  );
};

export default App;