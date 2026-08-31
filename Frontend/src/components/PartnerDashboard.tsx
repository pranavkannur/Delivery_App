import React, { useState, useEffect } from 'react';
import api from '../services/api';
import type { User, Order } from '../types';
import { Store, Package,  RefreshCw, ArrowRight } from 'lucide-react';

interface PartnerDashboardProps {
  user: User;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('789 Maple Drive, Suite 300');
  const [itemName, setItemName] = useState('Large Margherita Pizza + Drink');
  const [itemPrice, setItemPrice] = useState('24.00');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/orders', {
        pickupAddress: user.name, // The Partner/Store name
        deliveryAddress,
        pickupLat: 37.7749,
        pickupLng: -122.4194,
        deliveryLat: 37.7849,
        deliveryLng: -122.4094,
        items: [{ name: itemName, quantity: 1, price: parseFloat(itemPrice) }],
        totalAmount: parseFloat(itemPrice),
      });

      await fetchOrders();
      alert('📦 Order Dispatched to Drivers!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch order');
    }
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-black uppercase font-['Hanken_Grotesk',sans-serif]">
              Partner Store Hub
            </h1>
            <p className="text-xs text-[#5D5F5F] font-['JetBrains_Mono',monospace]">
              STORE: {user.name.toUpperCase()}
            </p>
          </div>

          <button
            onClick={fetchOrders}
            className="bg-[#f8f8f9] hover:bg-black hover:text-white text-[#5D5F5F] p-2.5 rounded-xl border border-[#e4e4e7] transition shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Dispatch Order Form (5 cols) */}
          <div className="lg:col-span-5 bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md font-['JetBrains_Mono',monospace]">
            <h2 className="text-sm font-black text-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <Store className="w-4 h-4" />
              Dispatch Store Order
            </h2>

            <form onSubmit={handleDispatchOrder} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                  Customer Delivery Destination
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                  Menu Items Description
                </label>
                <input
                  type="text"
                  required
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                  Order Total ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs focus:outline-none focus:border-black"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-black hover:bg-[#27272a] text-white text-xs font-bold uppercase tracking-widest py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
              >
                <span>DISPATCH TO DRIVERS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Outgoing Store Orders (7 cols) */}
          <div className="lg:col-span-7 bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md font-['JetBrains_Mono',monospace]">
            <h2 className="text-sm font-black text-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Dispatched Deliveries ({orders.length})
            </h2>

            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {orders.length === 0 ? (
                <p className="text-xs text-[#a1a1aa] text-center py-12">NO DISPATCHED ORDERS YET</p>
              ) : (
                orders.map((ord) => (
                  <div
                    key={ord.id}
                    className="p-3.5 bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-black">#{ord.id.slice(0, 8).toUpperCase()}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-black text-white">
                          {ord.status}
                        </span>
                      </div>
                      <p className="text-[#5D5F5F] truncate max-w-sm">🏁 To: {ord.deliveryAddress}</p>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-sm text-black">${ord.totalAmount.toFixed(2)}</span>
                      {ord.deliveryOtp && (
                        <span className="block text-[10px] text-black font-bold mt-0.5">
                          PIN: {ord.deliveryOtp}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};