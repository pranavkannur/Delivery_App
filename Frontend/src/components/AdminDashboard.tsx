import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';
import type { User, Order } from '../types';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { 
  DollarSign, 
  Package, 
  Truck, 
  Users, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Activity,
  ArrowUpRight
} from 'lucide-react';

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [22, 36],
  iconAnchor: [11, 36],
});

interface AdminDashboardProps {
  user: User;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, ordersRes, driversRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/orders'),
        api.get('/admin/drivers'),
      ]);
      setStats(statsRes.data.stats);
      setOrders(ordersRes.data.orders);
      setDrivers(driversRes.data.drivers);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();

    // Listen for live platform events
    const handleNewOrder = () => fetchAdminData();
    socket.on('new_order_available', handleNewOrder);
    socket.on('order_status_update', handleNewOrder);

    return () => {
      socket.off('new_order_available', handleNewOrder);
      socket.off('order_status_update', handleNewOrder);
    };
  }, []);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer?.name && o.customer.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-[calc(100vh-65px)] bg-[#ececee] p-6 relative font-['Inter',sans-serif]">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.4] pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#d4d4d8 1px, transparent 1px), linear-gradient(to right, #d4d4d8 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      <div className="relative max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-black uppercase font-['Hanken_Grotesk',sans-serif]">
              Admin Operations & Analytics
            </h1>
            <p className="text-xs text-[#5D5F5F] font-['JetBrains_Mono',monospace]">
              SYSTEM HEALTH: ONLINE | ROLE: SUPER ADMIN
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            className="bg-[#f8f8f9] hover:bg-black hover:text-white text-[#5D5F5F] px-4 py-2 rounded-xl text-xs font-bold font-['JetBrains_Mono',monospace] border border-[#e4e4e7] transition shadow-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>REFRESH DATA</span>
          </button>
        </div>

        {/* Top KPI Cards (Design System Styled) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-['JetBrains_Mono',monospace]">
          {/* Revenue Card */}
          <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-[#71717a] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Revenue</span>
              <div className="bg-black text-white p-1.5 rounded-lg">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-black">
              ${stats ? stats.totalRevenue.toFixed(2) : '0.00'}
            </div>
            <p className="text-[10px] text-[#5D5F5F] mt-1 font-semibold">FROM COMPLETED DELIVERIES</p>
          </div>

          {/* Active Orders Card */}
          <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-[#71717a] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">In-Flight Deliveries</span>
              <div className="bg-black text-white p-1.5 rounded-lg">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-black">
              {stats ? stats.activeOrders : 0}
            </div>
            <p className="text-[10px] text-emerald-600 mt-1 font-bold">LIVE REAL-TIME JOBS</p>
          </div>

          {/* Total Orders Card */}
          <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-[#71717a] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Orders Placed</span>
              <div className="bg-black text-white p-1.5 rounded-lg">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-black">
              {stats ? stats.totalOrders : 0}
            </div>
            <p className="text-[10px] text-[#5D5F5F] mt-1 font-semibold">{stats ? stats.completedOrders : 0} DELIVERED</p>
          </div>

          {/* Active Drivers Card */}
          <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-[#71717a] mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider">Fleet Drivers</span>
              <div className="bg-black text-white p-1.5 rounded-lg">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-black">
              {stats ? stats.totalDrivers : 0}
            </div>
            <p className="text-[10px] text-[#5D5F5F] mt-1 font-semibold">{stats ? stats.onlineDrivers : 0} ONLINE & AVAILABLE</p>
          </div>
        </div>

        {/* Global Live Fleet Map & In-Transit Orders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12 bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4 font-['JetBrains_Mono',monospace]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Live Multi-Delivery Fleet Radar
                </h2>
                <p className="text-[10px] text-[#71717a] mt-0.5">TRACKING ALL ACTIVE PACKAGES & FLEET POSITIONS</p>
              </div>
            </div>

            <div className="h-[360px] w-full rounded-xl overflow-hidden border border-[#e4e4e7] relative shadow-inner">
              <MapContainer
                center={[37.7749, -122.4194]}
                zoom={12}
                scrollWheelZoom={false}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Render All Active Orders on the Admin Map */}
                {orders
                  .filter((o) => o.status !== 'DELIVERED' && o.status !== 'CANCELLED')
                  .map((ord) => (
                    <React.Fragment key={ord.id}>
                      <Marker position={[ord.pickupLat, ord.pickupLng]} icon={pickupIcon}>
                        <Popup>🟢 Pickup: #{ord.id.slice(0, 6)} - {ord.pickupAddress}</Popup>
                      </Marker>
                      <Marker position={[ord.deliveryLat, ord.deliveryLng]} icon={deliveryIcon}>
                        <Popup>🔴 Delivery: #{ord.id.slice(0, 6)} - {ord.deliveryAddress}</Popup>
                      </Marker>
                      <Polyline
                        positions={[
                          [ord.pickupLat, ord.pickupLng],
                          [ord.deliveryLat, ord.deliveryLng],
                        ]}
                        color="#000000"
                        dashArray="4, 6"
                      />
                    </React.Fragment>
                  ))}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Global Orders Table (Filterable & Searchable) */}
        <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4 font-['JetBrains_Mono',monospace]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4" />
              Global Orders Ledger ({filteredOrders.length})
            </h2>

            {/* Filter & Search Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-56">
                <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search orders, customers..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl pl-8 pr-3 py-1.5 text-xs text-black placeholder-[#a1a1aa] focus:outline-none focus:border-black transition"
                />
              </div>

              {/* Status Pills */}
              {['ALL', 'PENDING', 'ACCEPTED', 'PICKED_UP', 'DELIVERED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition ${
                    statusFilter === st
                      ? 'bg-black text-white'
                      : 'bg-[#f0f0f2] text-[#71717a] hover:text-black border border-[#e4e4e7]'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e4e4e7] text-[10px] uppercase font-bold text-[#71717a]">
                  <th className="py-2.5 px-3">Order ID</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Destination</th>
                  <th className="py-2.5 px-3">Driver</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e4e7]/60">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#a1a1aa]">
                      NO ORDERS MATCH CURRENT FILTER
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#f0f0f2]/50 transition">
                      <td className="py-3 px-3 font-bold text-black">
                        #{ord.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 px-3 text-[#5D5F5F]">
                        {ord.customer?.name || 'Customer'}
                      </td>
                      <td className="py-3 px-3 text-black truncate max-w-xs">
                        {ord.deliveryAddress}
                      </td>
                      <td className="py-3 px-3 text-[#5D5F5F]">
                        {ord.driver?.user?.name ? (
                          <span className="text-black font-semibold">{ord.driver.user.name}</span>
                        ) : (
                          <span className="text-[#a1a1aa] italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-black text-black">
                        ${ord.totalAmount.toFixed(2)}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                            ord.status === 'DELIVERED'
                              ? 'bg-emerald-600 text-white'
                              : ord.status === 'PICKED_UP'
                              ? 'bg-black text-white'
                              : ord.status === 'ACCEPTED'
                              ? 'bg-[#5D5F5F] text-white'
                              : 'bg-[#e4e4e7] text-black'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};