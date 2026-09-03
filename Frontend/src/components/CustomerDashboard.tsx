import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { socket } from '../services/socket';
import type { Order } from '../types';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Package, 
  Search, 
  KeyRound, 
  RefreshCw, 
  ArrowRight, 
  Clock, 
  Navigation,
  MapPin,
  Plus,
  Store,
  ShoppingCart,
  Star,
  Check
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

// Helper: Smoothly fly and zoom to building level
const MapRecenter: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom = 15 }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.0 });
  }, [center, zoom, map]);
  return null;
};

// Helper: Click on map to place precision pin
const MapClickHandler: React.FC<{ onLocationSelect: (lat: number, lng: number) => void; isInteractive: boolean }> = ({ 
  onLocationSelect, 
  isInteractive 
}) => {
  useMapEvents({
    click(e) {
      if (isInteractive) {
        onLocationSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

export const CustomerDashboard: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Tab State: 'EXPLORE' (Store Marketplace) vs 'CUSTOM_PIN' (Manual)
  const [activeTab, setActiveTab] = useState<'EXPLORE' | 'CUSTOM_PIN'>('EXPLORE');
  const [isCreatingOrder, setIsCreatingOrder] = useState(true);

  // Stores Catalog State
  const [stores, setStores] = useState<any[]>([]);
  const [selectedStore, setSelectedStore] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<{ item: any; quantity: number }[]>([]);

  // Address Search Autocomplete State
  const [addressInput, setAddressInput] = useState('Select address on map or type here');
  const [pickupAddress, setPickupAddress] = useState('Local Store & Bakery');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Coordinates
  const [pickupLat, setPickupLat] = useState(17.6599);
  const [pickupLng, setPickupLng] = useState(75.9064);
  const [deliveryLat, setDeliveryLat] = useState(17.6700);
  const [deliveryLng, setDeliveryLng] = useState(75.9100);

  const deliveryMarkerRef = useRef<any>(null);

  // Fetch Stores Catalog & Orders
  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordersRes, storesRes] = await Promise.all([
        api.get('/orders'),
        api.get('/stores'),
      ]);
      setOrders(ordersRes.data.orders);
      setStores(storesRes.data.stores);
      if (storesRes.data.stores.length > 0 && !selectedStore) {
        setSelectedStore(storesRes.data.stores[0]);
        setPickupAddress(storesRes.data.stores[0].pickupAddress);
        setPickupLat(storesRes.data.stores[0].pickupLat);
        setPickupLng(storesRes.data.stores[0].pickupLng);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch Road Route from OSRM
  const fetchRoadRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        setRouteCoordinates(coords);
      }
    } catch {
      setRouteCoordinates([[startLat, startLng], [endLat, endLng]]);
    }
  };

  useEffect(() => {
    if (!selectedOrder) {
      fetchRoadRoute(pickupLat, pickupLng, deliveryLat, deliveryLng);
      return;
    }
    const startLat = driverLocation ? driverLocation.lat : selectedOrder.pickupLat;
    const startLng = driverLocation ? driverLocation.lng : selectedOrder.pickupLng;
    fetchRoadRoute(startLat, startLng, selectedOrder.deliveryLat, selectedOrder.deliveryLng);
  }, [selectedOrder, driverLocation, pickupLat, pickupLng, deliveryLat, deliveryLng]);

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
        fetchData();
      }
    };

    socket.on('live_driver_location', handleDriverLocation);
    socket.on('order_status_update', handleStatusUpdate);

    return () => {
      socket.off('live_driver_location', handleDriverLocation);
      socket.off('order_status_update', handleStatusUpdate);
    };
  }, [selectedOrder?.id]);

  // Reverse Geocode
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        const short = data.display_name.split(',').slice(0, 3).join(',');
        setAddressInput(short);
      }
    } catch {
      setAddressInput(`Pinpoint (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    }
  };

  const handleMapLocationSelect = (lat: number, lng: number) => {
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    reverseGeocode(lat, lng);
  };

  // Address Search Autocomplete
  const handleAddressSearch = async (text: string) => {
    setAddressInput(text);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearchingAddress(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`);
      const data = await res.json();
      setSuggestions(data || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearchingAddress(false);
    }
  };

  const selectSuggestion = (s: any) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    setAddressInput(s.display_name.split(',').slice(0, 3).join(','));
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    setSuggestions([]);
  };

  // Cart Management
  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.item.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);

  // Switch Store Selection
  const selectStore = (store: any) => {
    setSelectedStore(store);
    setPickupAddress(store.pickupAddress);
    setPickupLat(store.pickupLat);
    setPickupLng(store.pickupLng);
    setCart([]);
  };

  // Place Order (From Cart or Custom Pin)
  const handlePlaceOrder = async () => {
    if (cart.length === 0 && activeTab === 'EXPLORE') {
      alert('Please add at least 1 item to your cart from the menu!');
      return;
    }

    try {
      const itemsToOrder = activeTab === 'EXPLORE' 
        ? cart.map((c) => ({ name: c.item.name, quantity: c.quantity, price: c.item.price }))
        : [{ name: 'Custom Package Delivery', quantity: 1, price: 25.0 }];

      const total = activeTab === 'EXPLORE' ? cartTotal : 25.0;

      const res = await api.post('/orders', {
        pickupAddress,
        deliveryAddress: addressInput,
        pickupLat,
        pickupLng,
        deliveryLat,
        deliveryLng,
        items: itemsToOrder,
        totalAmount: total,
      });

      await fetchData();
      setSelectedOrder(res.data.order);
      setIsCreatingOrder(false);
      setCart([]);
      alert('🎉 Order Placed with the Store!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to place order');
    }
  };

  const handleUseMyLocation = () => {
    setDetectingGps(true);
    if (navigator.geolocation && window.isSecureContext) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleMapLocationSelect(pos.coords.latitude, pos.coords.longitude);
          setDetectingGps(false);
        },
        () => {
          setDetectingGps(false);
          alert('Could not retrieve location');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      setDetectingGps(false);
      alert('Location requires HTTPS');
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-black uppercase font-['Hanken_Grotesk',sans-serif]">
              Customer Hub
            </h1>
            <p className="text-xs text-[#5D5F5F] font-['JetBrains_Mono',monospace]">
              EXPLORE SHOPS, ORDER ITEMS & TRACK LIVE DELIVERIES
            </p>
          </div>

          {/* Mode Switchers */}
          <div className="flex items-center gap-3">
            <div className="bg-[#f0f0f2] p-1 rounded-xl border border-[#e4e4e7] flex items-center gap-1 font-['JetBrains_Mono',monospace]">
              <button
                onClick={() => {
                  setActiveTab('EXPLORE');
                  setIsCreatingOrder(true);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                  activeTab === 'EXPLORE' && isCreatingOrder ? 'bg-black text-white shadow-sm' : 'text-[#71717a] hover:text-black'
                }`}
              >
                🛍️ EXPLORE SHOPS
              </button>

              <button
                onClick={() => {
                  setActiveTab('CUSTOM_PIN');
                  setIsCreatingOrder(true);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase transition ${
                  activeTab === 'CUSTOM_PIN' && isCreatingOrder ? 'bg-black text-white shadow-sm' : 'text-[#71717a] hover:text-black'
                }`}
              >
                📍 CUSTOM PIN
              </button>
            </div>

            <button
              onClick={fetchData}
              className="bg-[#f8f8f9] hover:bg-black hover:text-white text-[#5D5F5F] p-2.5 rounded-xl border border-[#e4e4e7] transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* 2-Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Stores & Menus / Order Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6 font-['JetBrains_Mono',monospace]">
            {/* 🛍️ EXPLORE SHOPS & MENU VIEW */}
            {activeTab === 'EXPLORE' && isCreatingOrder && (
              <div className="bg-[#f8f8f9] border border-black rounded-2xl p-6 shadow-md space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Explore Partner Stores
                  </h2>
                  <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-bold">
                    {stores.length} OPEN
                  </span>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[10px]">
                  {['ALL', 'Bakery', 'Pizza', 'Café', 'Groceries'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg font-bold uppercase transition shrink-0 ${
                        selectedCategory === cat ? 'bg-black text-white' : 'bg-[#f0f0f2] text-[#71717a] border border-[#e4e4e7]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Store Selector Cards */}
                <div className="grid grid-cols-1 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {stores
                    .filter((s) => selectedCategory === 'ALL' || s.category.toLowerCase().includes(selectedCategory.toLowerCase()))
                    .map((s) => (
                      <div
                        key={s.id}
                        onClick={() => selectStore(s)}
                        className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                          selectedStore?.id === s.id
                            ? 'bg-black text-white border-black shadow-sm'
                            : 'bg-[#f0f0f2] text-black border-[#e4e4e7] hover:border-[#d4d4d8]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{s.image}</span>
                          <div>
                            <span className="text-xs font-bold block">{s.name}</span>
                            <span className={`text-[10px] ${selectedStore?.id === s.id ? 'text-[#d4d4d8]' : 'text-[#71717a]'}`}>
                              {s.category} • {s.deliveryTime}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] font-bold">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span>{s.rating}</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Selected Store's Menu */}
                {selectedStore && (
                  <div className="pt-3 border-t border-[#e4e4e7] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase text-black">
                        {selectedStore.name} Menu
                      </span>
                      <span className="text-[10px] text-[#71717a]">CLICK TO ADD TO BASKET</span>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {selectedStore.menu.map((item: any) => (
                        <div
                          key={item.id}
                          className="p-2.5 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7] flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-black block">{item.name}</span>
                            <span className="text-[10px] text-[#71717a] block">{item.desc}</span>
                            <span className="text-xs font-black text-black mt-0.5 block">${item.price.toFixed(2)}</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => addToCart(item)}
                            className="bg-black hover:bg-[#27272a] text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition shadow-sm flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>ADD</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cart Drawer */}
                {cart.length > 0 && (
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-950">
                      <span className="flex items-center gap-1.5">
                        <ShoppingCart className="w-4 h-4 text-emerald-700" />
                        Shopping Basket ({cart.length} items)
                      </span>
                      <span>Total: ${cartTotal.toFixed(2)}</span>
                    </div>

                    <div className="space-y-1 text-[11px] text-emerald-900">
                      {cart.map((c) => (
                        <div key={c.item.id} className="flex items-center justify-between">
                          <span>{c.quantity}x {c.item.name}</span>
                          <div className="flex items-center gap-2">
                            <span>${(c.item.price * c.quantity).toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => removeFromCart(c.item.id)}
                              className="text-red-500 hover:text-red-700 font-bold"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivery Doorstep Pin Input */}
                <div className="pt-2 border-t border-[#e4e4e7] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[#71717a] uppercase">
                      Deliver To (Doorstep Pin)
                    </label>

                    <button
                      type="button"
                      onClick={handleUseMyLocation}
                      disabled={detectingGps}
                      className="bg-[#f0f0f2] hover:bg-black hover:text-white text-black text-[10px] font-bold px-2 py-0.5 rounded transition border border-[#e4e4e7]"
                    >
                      <span>📍 MY LOCATION</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => handleAddressSearch(e.target.value)}
                    placeholder="Type street or click doorstep on map..."
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className="w-full bg-black hover:bg-[#27272a] text-white text-xs font-bold uppercase py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>PLACE STORE ORDER (${cartTotal.toFixed(2)})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 📍 CUSTOM PIN ORDER (MANUAL FORM) */}
            {activeTab === 'CUSTOM_PIN' && isCreatingOrder && (
              <div className="bg-[#f8f8f9] border border-black rounded-2xl p-6 shadow-md space-y-3">
                <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Custom Package Order
                </h2>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                    Pickup Location
                  </label>
                  <input
                    type="text"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                    Delivery Address
                  </label>
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => handleAddressSearch(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePlaceOrder}
                  className="w-full mt-2 bg-black hover:bg-[#27272a] text-white text-xs font-bold uppercase py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>CONFIRM & PLACE CUSTOM ORDER</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Orders Feed */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-3">
              <h2 className="text-sm font-black text-black uppercase tracking-wider mb-2 flex items-center justify-between">
                <span>Recent Orders ({orders.length})</span>
                <Clock className="w-4 h-4 text-[#71717a]" />
              </h2>

              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {orders.length === 0 ? (
                  <p className="text-xs text-[#a1a1aa] text-center py-6">NO ORDERS FOUND</p>
                ) : (
                  orders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => {
                        setSelectedOrder(ord);
                        setIsCreatingOrder(false);
                        setDriverLocation(null);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition ${
                        selectedOrder?.id === ord.id && !isCreatingOrder
                          ? 'bg-black text-white border-black shadow-sm'
                          : 'bg-[#f0f0f2] text-black border-[#e4e4e7] hover:border-[#d4d4d8]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold">#{ord.id.slice(0, 8).toUpperCase()}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                            selectedOrder?.id === ord.id && !isCreatingOrder ? 'bg-white text-black' : 'bg-black text-white'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>

                      <p className={`text-xs truncate ${selectedOrder?.id === ord.id && !isCreatingOrder ? 'text-[#d4d4d8]' : 'text-[#5D5F5F]'}`}>
                        📍 {ord.deliveryAddress}
                      </p>

                      <div className="flex items-center justify-between text-xs font-bold mt-2 pt-2 border-t border-[#e4e4e7]/30">
                        <span>${ord.totalAmount.toFixed(2)}</span>
                        {ord.deliveryOtp && (
                          <span className={`${selectedOrder?.id === ord.id && !isCreatingOrder ? 'text-white' : 'text-black'}`}>
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

          {/* Right Column: Interactive Map (7 cols) */}
          <div className="lg:col-span-7 space-y-6 font-['JetBrains_Mono',monospace]">
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4">
              {selectedOrder && !isCreatingOrder ? (
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7]">
                  <div>
                    <span className="text-[10px] text-[#71717a] uppercase font-bold tracking-widest block">
                      LIVE ROAD TRACKING
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
              ) : (
                <div className="flex items-center justify-between p-2 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7] text-xs">
                  <span className="text-black font-bold">
                    📍 {selectedStore ? `Ordering from: ${selectedStore.name}` : 'Click map to choose doorstep pin'}
                  </span>
                  <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded font-bold">
                    PRECISION MAP
                  </span>
                </div>
              )}

              {/* Leaflet Precision Map */}
              <div className="h-[520px] w-full rounded-xl overflow-hidden border border-[#e4e4e7] relative shadow-inner">
                <MapContainer
                  center={[
                    !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLat : deliveryLat,
                    !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLng : deliveryLng
                  ]}
                  zoom={14}
                  scrollWheelZoom={true}
                  className="w-full h-full cursor-crosshair"
                >
                  <MapRecenter 
                    center={[
                      !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLat : deliveryLat,
                      !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLng : deliveryLng
                    ]} 
                    zoom={14}
                  />

                  {/* Click Map to Drop Doorstep Pin */}
                  <MapClickHandler 
                    onLocationSelect={handleMapLocationSelect} 
                    isInteractive={isCreatingOrder} 
                  />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Store Pickup Marker */}
                  <Marker 
                    position={[
                      !isCreatingOrder && selectedOrder ? selectedOrder.pickupLat : pickupLat,
                      !isCreatingOrder && selectedOrder ? selectedOrder.pickupLng : pickupLng
                    ]} 
                    icon={pickupIcon}
                  >
                    <Popup>🏬 Store: {selectedStore ? selectedStore.name : pickupAddress}</Popup>
                  </Marker>

                  {/* Customer Doorstep Marker */}
                  <Marker 
                    position={[
                      !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLat : deliveryLat,
                      !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLng : deliveryLng
                    ]} 
                    icon={deliveryIcon}
                    draggable={isCreatingOrder}
                    ref={deliveryMarkerRef}
                    eventHandlers={{
                      dragend() {
                        const marker = deliveryMarkerRef.current;
                        if (marker) {
                          const latLng = marker.getLatLng();
                          handleMapLocationSelect(latLng.lat, latLng.lng);
                        }
                      },
                    }}
                  >
                    <Popup>🔴 Your Delivery Doorstep (Drag to adjust)</Popup>
                  </Marker>

                  {/* Live Moving Driver Marker */}
                  {driverLocation && !isCreatingOrder && (
                    <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
                      <Popup>🛵 Driver Live Position</Popup>
                    </Marker>
                  )}

                  {/* Real Road Curve Polyline */}
                  {routeCoordinates.length > 0 && (
                    <Polyline
                      positions={routeCoordinates}
                      color="#000000"
                      weight={4}
                      opacity={0.8}
                    />
                  )}
                </MapContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};