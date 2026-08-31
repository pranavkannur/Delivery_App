import React, { useState } from 'react';
import api from '../services/api';
import type { User, Role, VehicleType } from '../types';
import { User as UserIcon, Store, Truck, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';

interface AuthProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState<Role>('CUSTOMER');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('MOTORCYCLE');
  const [licensePlate, setLicensePlate] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.post('/auth/login', { email, password });
        onLoginSuccess(res.data.user, res.data.token);
      } else {
        const payload: any = {
          email,
          password,
          name: role === 'PARTNER' && storeName ? `${storeName} (${name})` : name,
          role,
          phone,
        };

        if (role === 'DRIVER') {
          payload.vehicleType = vehicleType;
          payload.licensePlate = licensePlate || 'UNASSIGNED';
        }

        const res = await api.post('/auth/register', payload);
        onLoginSuccess(res.data.user, res.data.token);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ececee] flex items-center justify-center p-4 relative font-['Inter',sans-serif]">
      {/* Subtle Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#d4d4d8 1px, transparent 1px), linear-gradient(to right, #d4d4d8 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Main Card */}
      <div className="relative w-full max-w-[440px] bg-[#f8f8f9] border border-[#e4e4e7] rounded-3xl p-8 sm:p-10 shadow-xl shadow-black/5">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-black tracking-wider uppercase font-['Hanken_Grotesk',sans-serif]">
            DELIVERY'S
          </h1>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-xs font-['JetBrains_Mono',monospace]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* SIGN UP ONLY: 3-Way Role Selector */}
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-2">
                I AM A...
              </label>
              <div className="grid grid-cols-3 gap-2">
                {/* Customer */}
                <button
                  type="button"
                  onClick={() => setRole('CUSTOMER')}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition duration-150 ${
                    role === 'CUSTOMER'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-[#f0f0f2] text-[#71717a] border-[#e4e4e7] hover:border-[#d4d4d8] hover:text-black'
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-wider font-['JetBrains_Mono',monospace]">
                    CUSTOMER
                  </span>
                </button>

                {/* Partner */}
                <button
                  type="button"
                  onClick={() => setRole('PARTNER')}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition duration-150 ${
                    role === 'PARTNER'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-[#f0f0f2] text-[#71717a] border-[#e4e4e7] hover:border-[#d4d4d8] hover:text-black'
                  }`}
                >
                  <Store className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-wider font-['JetBrains_Mono',monospace]">
                    PARTNER
                  </span>
                </button>

                {/* Driver */}
                <button
                  type="button"
                  onClick={() => setRole('DRIVER')}
                  className={`flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-xl border transition duration-150 ${
                    role === 'DRIVER'
                      ? 'bg-black text-white border-black shadow-sm'
                      : 'bg-[#f0f0f2] text-[#71717a] border-[#e4e4e7] hover:border-[#d4d4d8] hover:text-black'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span className="text-[10px] font-bold tracking-wider font-['JetBrains_Mono',monospace]">
                    DRIVER
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* PARTNER ONLY: Store / Business Name */}
          {!isLogin && role === 'PARTNER' && (
            <div>
              <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                Store / Business Name
              </label>
              <input
                type="text"
                required
                placeholder="Downtown Pizza & Bakery"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2.5 text-black placeholder-[#a1a1aa] text-sm focus:outline-none focus:border-black transition font-['JetBrains_Mono',monospace]"
              />
            </div>
          )}

          {/* Full Name / Owner Name */}
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                {role === 'PARTNER' ? 'Owner / Manager Name' : 'Full Name'}
              </label>
              <input
                type="text"
                required
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2.5 text-black placeholder-[#a1a1aa] text-sm focus:outline-none focus:border-black transition font-['JetBrains_Mono',monospace]"
              />
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder={isLogin ? 'operator@kinetic.com' : 'john@example.com'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2.5 text-black placeholder-[#a1a1aa] text-sm focus:outline-none focus:border-black transition font-['JetBrains_Mono',monospace]"
            />
          </div>

          {/* Phone Number */}
          {!isLogin && (
            <div>
              <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2.5 text-black placeholder-[#a1a1aa] text-sm focus:outline-none focus:border-black transition font-['JetBrains_Mono',monospace]"
              />
            </div>
          )}

          {/* DRIVER ONLY: Vehicle Details */}
          {!isLogin && role === 'DRIVER' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                  Vehicle
                </label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as VehicleType)}
                  className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2.5 text-black text-sm focus:outline-none focus:border-black transition font-['JetBrains_Mono',monospace]"
                >
                  <option value="MOTORCYCLE">Motorcycle</option>
                  <option value="CAR">Car</option>
                  <option value="BICYCLE">Bicycle</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                  License Plate
                </label>
                <input
                  type="text"
                  placeholder="DL-3C-1234"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2.5 text-black placeholder-[#a1a1aa] text-sm focus:outline-none focus:border-black transition font-['JetBrains_Mono',monospace]"
                />
              </div>
            </div>
          )}

          {/* Password */}
          <div>
            <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2.5 pr-10 text-black placeholder-[#a1a1aa] text-sm focus:outline-none focus:border-black transition font-['JetBrains_Mono',monospace]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-[#71717a] hover:text-black transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* SIGN IN ONLY: Remember Me & Forgot Password */}
          {isLogin && (
            <div className="flex items-center justify-between text-xs font-['JetBrains_Mono',monospace] pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#71717a] hover:text-black">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#d4d4d8] text-black focus:ring-0 focus:ring-offset-0"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => alert('Password reset flow')}
                className="text-[#71717a] hover:text-black underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-3 bg-black hover:bg-[#27272a] text-white text-xs font-bold font-['JetBrains_Mono',monospace] tracking-widest uppercase py-3.5 px-4 rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isLogin ? (
              'SIGN IN'
            ) : (
              <>
                <span>CREATE ACCOUNT</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* OR CONTINUE WITH Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#e4e4e7]" />
          </div>
          <span className="relative bg-[#f8f8f9] px-3 text-[10px] uppercase font-bold text-[#a1a1aa] font-['JetBrains_Mono',monospace] tracking-widest">
            OR CONTINUE WITH
          </span>
        </div>

        {/* Google Auth Button */}
        <button
          type="button"
          onClick={() => alert('Google authentication')}
          className="w-full bg-[#f0f0f2] hover:bg-[#e4e4e7] border border-[#e4e4e7] text-black text-xs font-semibold font-['JetBrains_Mono',monospace] py-3 px-4 rounded-xl transition flex items-center justify-center gap-2.5 shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Google</span>
        </button>

        {/* Footer Toggle Link */}
        <div className="text-center mt-6 text-xs text-[#71717a] font-['JetBrains_Mono',monospace]">
          {isLogin ? (
            <>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className="text-black font-semibold underline hover:opacity-75 transition"
              >
                Create Account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className="text-black font-semibold underline hover:opacity-75 transition"
              >
                Log In
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};