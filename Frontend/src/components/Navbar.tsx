import React from 'react';
import type { User } from '../types';
import { LogOut, User as UserIcon, Shield, Truck } from 'lucide-react';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  return (
    <nav className="bg-[#f8f8f9] border-b border-[#e4e4e7] sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between shadow-sm">
      {/* Brand Logo */}
      <div className="flex items-center gap-3">
        <div className="bg-black text-white p-2 rounded-xl">
          <Truck className="w-5 h-5" />
        </div>
        <div>
          <span className="font-black text-lg tracking-wider text-black font-['Hanken_Grotesk',sans-serif] uppercase">
            DELIVERY'S
          </span>
        </div>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-[#f0f0f2] border border-[#e4e4e7] px-3.5 py-1.5 rounded-xl font-['JetBrains_Mono',monospace]">
          <UserIcon className="w-3.5 h-3.5 text-[#5D5F5F]" />
          <span className="text-xs font-semibold text-black">{user.name}</span>
          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-black text-white tracking-wider">
            {user.role}
          </span>
        </div>

        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 bg-[#f0f0f2] hover:bg-black hover:text-white text-[#5D5F5F] px-3 py-1.5 rounded-xl text-xs font-bold font-['JetBrains_Mono',monospace] transition duration-150 border border-[#e4e4e7]"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>LOGOUT</span>
        </button>
      </div>
    </nav>
  );
};