import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';
import type { Order } from '../types';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { 
  Package, 
  Search, 
  KeyRound, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  Navigation,
  MapPin
} from 'lucide-react';

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Helper component to smoothly re-center Leaflet map when coordinates update
const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
};

export const CustomerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Order Form State (Real GPS Coordinates)
  const [pickupAddress, setPickupAddress] = useState('123 Artisan Bakery & Cafe');
  const [deliveryAddress, setDeliveryAddress] = useState('456 Skyline Tower, Apt 12');
  const [pickupLat, setPickupLat] = useState(37.7749);
  const [pickupLng, setPickupLng] = useState(-122.4194);
  const [deliveryLat, setDeliveryLat] = useState(37.7889);
  const [deliveryLng, setDeliveryLng] = useState(-122.4014);
  const [totalAmount, setTotalAmount] = useState('32.00');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data.orders);
      if (res.data.orders.length > 0 && !selectedOrder) {
        setSelectedOrder(res.data.orders[0]);
      }
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // WebSocket Live Updates
  useEffect(() => {
    if (!selectedOrder) return;

    socket.emit('join_order_room', selectedOrder.id);

    const handleDriverLocation = (data: { orderId: string; latitude: number; longitude: number }) => {
      if (data.orderId === selectedOrder.id) {
        setDriverLocation({ lat: data.latitude, lng: data.longitude });
      }
    };

    const handleStatusUpdate = (data: { orderId: string; status: any; driver?: any }) => {
      if (data.orderId === selectedOrder.id) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: data.status, driver: data.driver || prev.driver } : null));
        fetchOrders();
      }
    };

    socket.on('live_driver_location', handleDriverLocation);
    socket.on('order_status_update', handleStatusUpdate);

    return () => {
      socket.off('live_driver_location', handleDriverLocation);
      socket.off('order_status_update', handleStatusUpdate);
    };
  }, [selectedOrder?.id]);

  // 📍 1-Click Detect Real Device Location
    // 📍 1-Click Smart City / Location Detection
  const handleUseMyLocation = async () => {
    setDetectingGps(true);

    const applyCoordinates = async (lat: number, lng: number, fallbackCity?: string) => {
      setDeliveryLat(lat);
      setDeliveryLng(lng);
      setPickupLat(lat - 0.008);
      setPickupLng(lng - 0.008);

      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await res.json();
        if (data && data.display_name) {
          const shortAddress = data.display_name.split(',').slice(0, 3).join(',');
          setDeliveryAddress(shortAddress);
          setPickupAddress('Local Store & Bakery, ' + data.display_name.split(',')[0]);
        } else if (fallbackCity) {
          setDeliveryAddress(`Downtown Delivery, ${fallbackCity}`);
          setPickupAddress(`Local Bakery, ${fallbackCity}`);
        }
      } catch {
        setDeliveryAddress(fallbackCity ? `Main Street, ${fallbackCity}` : `GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
      } finally {
        setDetectingGps(false);
      }
    };

    // 1. Try HTML5 Browser GPS if available (HTTPS or localhost)
    if (navigator.geolocation && window.isSecureContext) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          applyCoordinates(position.coords.latitude, position.coords.longitude);
        },
        async () => {
          // Fallback to IP Geolocation if permission denied
          await fetchIpLocation();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      // 2. Fallback to free IP-based city geolocation on HTTP
      await fetchIpLocation();
    }

    async function fetchIpLocation() {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          applyCoordinates(data.latitude, data.longitude, `${data.city}, ${data.region}`);
        } else {
          setDetectingGps(false);
          alert('Could not determine city location');
        }
      } catch {
        setDetectingGps(false);
        alert('Could not determine city location');
      }
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/orders', {
        pickupAddress,
        deliveryAddress,
        pickupLat,
        pickupLng,
        deliveryLat,
        deliveryLng,
        items: [
          { name: 'Gourmet Sourdough Bread', quantity: 2, price: 10.0 },
          { name: 'Fresh Espresso Beans (250g)', quantity: 1, price: 12.0 },
        ],
        totalAmount: parseFloat(totalAmount),
      });

      await fetchOrders();
      setSelectedOrder(res.data.order);
      alert('🎉 Order Placed Successfully in your city!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to place order');
    }
  };

  const filteredOrders = orders.filter((o) =>
    o.deliveryAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-black uppercase font-['Hanken_Grotesk',sans-serif]">
              Customer Hub
            </h1>
            <p className="text-xs text-[#5D5F5F] font-['JetBrains_Mono',monospace]">
              CREATE ORDERS & TRACK LIVE DELIVERIES
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="w-4 h-4 text-[#71717a] absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#f8f8f9] border border-[#e4e4e7] rounded-xl pl-9 pr-3 py-2 text-xs font-['JetBrains_Mono',monospace] text-black placeholder-[#a1a1aa] focus:outline-none focus:border-black transition shadow-sm"
              />
            </div>

            <button
              onClick={fetchOrders}
              className="bg-[#f8f8f9] hover:bg-black hover:text-white text-[#5D5F5F] p-2.5 rounded-xl border border-[#e4e4e7] transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2-Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Place Order Form & Orders Feed (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Create Order Card */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-black uppercase tracking-wider font-['JetBrains_Mono',monospace] flex items-center gap-2">
                  <Package className="w-4 h-4 text-black" />
                  Place Delivery Order
                </h2>

                {/* 📍 Use Real Device GPS Button */}
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={detectingGps}
                  className="bg-black hover:bg-[#27272a] text-white text-[10px] font-bold font-['JetBrains_Mono',monospace] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <Navigation className={`w-3 h-3 ${detectingGps ? 'animate-spin' : ''}`} />
                  <span>{detectingGps ? 'LOCATING...' : 'MY LOCATION'}</span>
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                    Pickup Location
                  </label>
                  <input
                    type="text"
                    required
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-black transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-black transition"
                  />
                </div>

                <div className="flex items-center gap-2 text-[10px] text-[#71717a] font-['JetBrains_Mono',monospace]">
                  <MapPin className="w-3 h-3 text-black" />
                  <span>GPS: {deliveryLat.toFixed(4)}, {deliveryLng.toFixed(4)}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                    Total Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-black transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-black hover:bg-[#27272a] text-white text-xs font-bold font-['JetBrains_Mono',monospace] tracking-widest uppercase py-3 rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>CREATE ORDER</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Orders Feed */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-3">
              <h2 className="text-sm font-black text-black uppercase tracking-wider font-['JetBrains_Mono',monospace] mb-2 flex items-center justify-between">
                <span>Recent Orders ({filteredOrders.length})</span>
                <Clock className="w-4 h-4 text-[#71717a]" />
              </h2>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredOrders.length === 0 ? (
                  <p className="text-xs text-[#a1a1aa] font-['JetBrains_Mono',monospace] text-center py-6">
                    NO ORDERS FOUND
                  </p>
                ) : (
                  filteredOrders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setDriverLocation(null);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition font-['JetBrains_Mono',monospace] ${
                        selectedOrder?.id === ord.id
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-[#f0f0f2] text-black border-[#e4e4e7] hover:border-[#d4d4d8]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold">
                          #{ord.id.slice(0, 8).toUpperCase()}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                            selectedOrder?.id === ord.id
                              ? 'bg-white text-black'
                              : 'bg-black text-white'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>

                      <p className={`text-xs truncate ${selectedOrder?.id === ord.id ? 'text-[#d4d4d8]' : 'text-[#5D5F5F]'}`}>
                        📍 {ord.deliveryAddress}
                      </p>

                      <div className="flex items-center justify-between text-xs font-bold mt-2 pt-2 border-t border-[#e4e4e7]/30">
                        <span>${ord.totalAmount.toFixed(2)}</span>
                        {ord.deliveryOtp && (
                          <span className={`text-xs tracking-wider ${selectedOrder?.id === ord.id ? 'text-white' : 'text-black'}`}>
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

          {/* Right Column: Live Map & Selected Order Card (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {selectedOrder ? (
              <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4 font-['JetBrains_Mono',monospace]">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7]">
                  <div>
                    <span className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest block">
                      LIVE TRACKING
                    </span>
                    <h3 className="text-base font-black text-black mt-0.5">
                      ORDER #{selectedOrder.id.slice(0, 8).toUpperCase()}
                    </h3>
                    <p className="text-xs text-[#5D5F5F] font-semibold mt-0.5">
                      STATUS: {selectedOrder.status}
                    </p>
                  </div>

                  {selectedOrder.deliveryOtp && (
                    <div className="bg-black text-white px-4 py-2 rounded-xl text-center shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#a1a1aa] font-bold tracking-wider uppercase mb-0.5">
                        <KeyRound className="w-3.5 h-3.5" />
                        HANDOVER PIN
                      </div>
                      <div className="text-xl font-black tracking-widest text-white">
                        {selectedOrder.deliveryOtp}
                      </div>
                    </div>
                  )}
                </div>

                {/* Leaflet Live Map with Auto-Recenter */}
                <div className="h-[420px] w-full rounded-xl overflow-hidden border border-[#e4e4e7] relative shadow-inner">
                  <MapContainer
                    center={[selectedOrder.pickupLat, selectedOrder.pickupLng]}
                    zoom={13}
                    scrollWheelZoom={false}
                    className="w-full h-full"
                  >
                    <MapRecenter center={[selectedOrder.pickupLat, selectedOrder.pickupLng]} />

                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    {/* Pickup Marker */}
                    <Marker position={[selectedOrder.pickupLat, selectedOrder.pickupLng]} icon={pickupIcon}>
                      <Popup>Pickup: {selectedOrder.pickupAddress}</Popup>
                    </Marker>

                    {/* Delivery Marker */}
                    <Marker position={[selectedOrder.deliveryLat, selectedOrder.deliveryLng]} icon={deliveryIcon}>
                      <Popup>Delivery: {selectedOrder.deliveryAddress}</Popup>
                    </Marker>

                    {/* Live Driver Marker */}
                    {driverLocation && (
                      <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
                        <Popup>🛵 Driver Live GPS</Popup>
                      </Marker>
                    )}

                    {/* Route Line */}
                    <Polyline
                      positions={[
                        [selectedOrder.pickupLat, selectedOrder.pickupLng],
                        driverLocation
                          ? [driverLocation.lat, driverLocation.lng]
                          : [selectedOrder.deliveryLat, selectedOrder.deliveryLng],
                        [selectedOrder.deliveryLat, selectedOrder.deliveryLng],
                      ]}
                      color="#000000"
                      dashArray="6, 8"
                    />
                  </MapContainer>

                  {driverLocation && (
                    <div className="absolute top-3 right-3 z-[1000] bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-[11px] font-bold shadow-md">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      DRIVER CONNECTED
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-16 text-center text-[#a1a1aa] font-['JetBrains_Mono',monospace]">
                <Package className="w-12 h-12 mx-auto mb-3 text-[#d4d4d8]" />
                <p className="text-xs tracking-wider uppercase">SELECT AN ORDER TO VIEW LIVE TRACKING</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};