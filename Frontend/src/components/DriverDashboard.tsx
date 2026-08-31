import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';
import type { Order, User } from '../types';
import { Truck, CheckCircle2, Navigation, RefreshCw, KeyRound, AlertCircle, ArrowRight, MapPin, Package } from 'lucide-react';

interface DriverDashboardProps {
  user: User;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({ user }) => {
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [otpInput, setOtpInput] = useState<{ [orderId: string]: string }>({});
  const [isSimulatingGps, setIsSimulatingGps] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [availRes, myRes] = await Promise.all([
        api.get('/orders/available'),
        api.get('/orders'),
      ]);
      setAvailableOrders(availRes.data.availableOrders);
      setMyOrders(myRes.data.orders);
    } catch (err: any) {
      setError('Error fetching orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleNewOrder = () => {
      fetchData();
    };

    socket.on('new_order_available', handleNewOrder);
    return () => {
      socket.off('new_order_available', handleNewOrder);
    };
  }, []);

  // 1. Accept Order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/accept`);
      await fetchData();
      alert('🛵 Order Accepted! Head to the pickup location.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to accept order');
    }
  };

  // 2. Mark Picked Up
  const handleMarkPickedUp = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: 'PICKED_UP' });
      await fetchData();
      alert('📦 Order Marked as Picked Up! Proceed to deliver to customer.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  // 3. Complete Delivery with Customer OTP
  const handleCompleteDelivery = async (orderId: string) => {
    const otp = otpInput[orderId];
    if (!otp) {
      alert('Please enter the customer PIN/OTP to complete delivery');
      return;
    }

    try {
      await api.post(`/orders/${orderId}/complete`, { otp });
      await fetchData();
      alert('🎉 Delivery Handover Verified & Completed!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Invalid OTP');
    }
  };

  // 4. GPS Simulation (Emits live moving coordinates to the Customer's map)
  const activeOrder = myOrders.find((o) => o.status === 'ACCEPTED' || o.status === 'PICKED_UP');

  useEffect(() => {
    if (!isSimulatingGps || !activeOrder) return;

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.05;
      if (progress > 1) {
        progress = 1;
        setIsSimulatingGps(false);
      }

      const currentLat = activeOrder.pickupLat + (activeOrder.deliveryLat - activeOrder.pickupLat) * progress;
      const currentLng = activeOrder.pickupLng + (activeOrder.deliveryLng - activeOrder.pickupLng) * progress;

      socket.emit('driver_location_update', {
        orderId: activeOrder.id,
        driverId: user.driver?.id || user.id,
        latitude: currentLat,
        longitude: currentLng,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulatingGps, activeOrder]);

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#ececee] p-6 relative font-['Inter',sans-serif]">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#d4d4d8 1px, transparent 1px), linear-gradient(to right, #d4d4d8 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-black uppercase font-['Hanken_Grotesk',sans-serif]">
              Driver Operations Hub
            </h1>
            <p className="text-xs text-[#5D5F5F] font-['JetBrains_Mono',monospace]">
              ACCEPT JOBS & BROADCAST REAL-TIME GPS
            </p>
          </div>

          <button
            onClick={fetchData}
            className="bg-[#f8f8f9] hover:bg-black hover:text-white text-[#5D5F5F] p-2.5 rounded-xl border border-[#e4e4e7] transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-['JetBrains_Mono',monospace] flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Active Delivery Job Card */}
        {activeOrder && (
          <div className="bg-[#f8f8f9] border border-black rounded-2xl p-6 shadow-xl space-y-4 font-['JetBrains_Mono',monospace]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider bg-black text-white">
                  ACTIVE JOB ({activeOrder.status})
                </span>
                <h2 className="text-lg font-black text-black mt-1">
                  ORDER #{activeOrder.id.slice(0, 8).toUpperCase()}
                </h2>
              </div>

              {/* Live GPS Broadcast Button */}
              <button
                onClick={() => setIsSimulatingGps(!isSimulatingGps)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider uppercase transition shadow-sm ${
                  isSimulatingGps
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-black hover:bg-[#27272a] text-white'
                }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                {isSimulatingGps ? 'STOP GPS BROADCAST' : 'START LIVE GPS BROADCAST'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-black">
              <div className="p-3.5 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7]">
                <span className="text-[10px] text-[#71717a] uppercase font-bold block mb-1">Pickup Location</span>
                📍 {activeOrder.pickupAddress}
              </div>
              <div className="p-3.5 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7]">
                <span className="text-[10px] text-[#71717a] uppercase font-bold block mb-1">Delivery Destination</span>
                🏁 {activeOrder.deliveryAddress}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#e4e4e7]">
              {activeOrder.status === 'ACCEPTED' && (
                <button
                  onClick={() => handleMarkPickedUp(activeOrder.id)}
                  className="bg-black hover:bg-[#27272a] text-white text-xs font-bold uppercase tracking-wider px-5 py-2.5 rounded-xl transition flex items-center gap-2"
                >
                  <Truck className="w-4 h-4" />
                  CONFIRM PICKUP
                </button>
              )}

              {/* Handover OTP Verification */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-44">
                  <KeyRound className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-3" />
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="ENTER 4-DIGIT PIN"
                    value={otpInput[activeOrder.id] || ''}
                    onChange={(e) => setOtpInput({ ...otpInput, [activeOrder.id]: e.target.value })}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl pl-8 pr-3 py-2 text-black text-xs font-bold placeholder-[#a1a1aa] focus:outline-none focus:border-black"
                  />
                </div>
                <button
                  onClick={() => handleCompleteDelivery(activeOrder.id)}
                  className="bg-black hover:bg-[#27272a] text-white text-xs font-bold uppercase tracking-wider px-5 py-2 rounded-xl transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  COMPLETE
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Available Orders Queue */}
        <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md font-['JetBrains_Mono',monospace]">
          <h2 className="text-sm font-black text-black uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4" />
            Available Delivery Requests ({availableOrders.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableOrders.length === 0 ? (
              <p className="text-xs text-[#a1a1aa] col-span-full py-12 text-center">
                NO NEW DELIVERY REQUESTS AT THIS MOMENT
              </p>
            ) : (
              availableOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl p-4 flex flex-col justify-between space-y-4 hover:border-black transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-black">#{ord.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-sm font-black text-black">${ord.totalAmount.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-[#5D5F5F] mb-1">📍 From: {ord.pickupAddress}</p>
                    <p className="text-xs text-[#5D5F5F]">🏁 To: {ord.deliveryAddress}</p>
                  </div>

                  <button
                    onClick={() => handleAcceptOrder(ord.id)}
                    className="w-full bg-black hover:bg-[#27272a] text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-xl transition flex items-center justify-center gap-2"
                  >
                    <span>ACCEPT JOB</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};