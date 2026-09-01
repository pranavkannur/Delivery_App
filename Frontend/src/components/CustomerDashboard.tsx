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
  Plus
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

// Helper: Smoothly fly and zoom to building level (zoom: 16)
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

  // Mode: true = Creating New Order (Pin placement active), false = Tracking selected order
  const [isCreatingOrder, setIsCreatingOrder] = useState(true);

  // Address Search Autocomplete State
  const [addressInput, setAddressInput] = useState('Select address on map or type here');
  const [pickupAddress, setPickupAddress] = useState('Local Store & Bakery');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Default Center Coordinates (Precision Pin)
  const [pickupLat, setPickupLat] = useState(37.7749);
  const [pickupLng, setPickupLng] = useState(-122.4194);
  const [deliveryLat, setDeliveryLat] = useState(37.7889);
  const [deliveryLng, setDeliveryLng] = useState(-122.4014);
  const [totalAmount, setTotalAmount] = useState('32.00');

  const deliveryMarkerRef = useRef<any>(null);

  // Fetch Orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders');
      setOrders(res.data.orders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
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

  // Re-fetch route when in tracking mode
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

  // Reverse Geocode helper
  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        const short = data.display_name.split(',').slice(0, 3).join(',');
        setAddressInput(short);
        setPickupAddress('Bakery near ' + data.display_name.split(',')[0]);
      }
    } catch {
      setAddressInput(`Pinpoint (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
    }
  };

  // Handle User Clicking or Dragging Pin on Map (100% Precision)
  const handleMapLocationSelect = (lat: number, lng: number) => {
    setDeliveryLat(lat);
    setDeliveryLng(lng);
    setPickupLat(lat - 0.005);
    setPickupLng(lng - 0.005);
    reverseGeocode(lat, lng);
  };

  // Live Address Autocomplete Search
  const handleAddressSearch = async (text: string) => {
    setAddressInput(text);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    setIsSearchingAddress(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`
      );
      const data = await res.json();
      setSuggestions(data || []);
    } catch (err) {
      console.error(err);
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
    setPickupLat(lat - 0.005);
    setPickupLng(lng - 0.005);
    setSuggestions([]);
  };

  // Detect Current Location (Smart Fallback)
  const handleUseMyLocation = () => {
    setDetectingGps(true);
    if (navigator.geolocation && window.isSecureContext) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleMapLocationSelect(pos.coords.latitude, pos.coords.longitude);
          setDetectingGps(false);
        },
        async () => {
          await fetchIpFallback();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      fetchIpFallback();
    }

    async function fetchIpFallback() {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.latitude && data.longitude) {
          handleMapLocationSelect(data.latitude, data.longitude);
        }
      } catch {
        alert('Could not determine city');
      } finally {
        setDetectingGps(false);
      }
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/orders', {
        pickupAddress,
        deliveryAddress: addressInput,
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
      setIsCreatingOrder(false);
      alert('🎉 Order Placed Successfully!');
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
              PRECISION PINPOINT DELIVERY & LIVE ROAD ROUTING
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* New Order Switcher Button */}
            <button
              onClick={() => {
                setIsCreatingOrder(true);
                setSelectedOrder(null);
                setDriverLocation(null);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-['JetBrains_Mono',monospace] transition shadow-sm flex items-center gap-1.5 ${
                isCreatingOrder
                  ? 'bg-black text-white'
                  : 'bg-[#f8f8f9] hover:bg-black hover:text-white text-black border border-[#e4e4e7]'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW ORDER (PIN DROP)</span>
            </button>

            <div className="relative w-56">
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
            <div className={`bg-[#f8f8f9] border rounded-2xl p-6 shadow-md transition ${isCreatingOrder ? 'border-black ring-1 ring-black' : 'border-[#e4e4e7]'}`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-black uppercase tracking-wider font-['JetBrains_Mono',monospace] flex items-center gap-2">
                  <Package className="w-4 h-4 text-black" />
                  Place Delivery Order
                </h2>

                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={detectingGps}
                  className="bg-black hover:bg-[#27272a] text-white text-[10px] font-bold font-['JetBrains_Mono',monospace] px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <Navigation className={`w-3 h-3 ${detectingGps ? 'animate-spin' : ''}`} />
                  <span>{detectingGps ? 'LOCATING...' : 'MY CITY'}</span>
                </button>
              </div>

              <form onSubmit={handleCreateOrder} className="space-y-3">
                {/* Delivery Address with Live Autocomplete */}
                <div className="relative">
                  <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                    Delivery Address (Type or Click Map)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Search street, apartment, or click map..."
                      value={addressInput}
                      onChange={(e) => handleAddressSearch(e.target.value)}
                      onFocus={() => setIsCreatingOrder(true)}
                      className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs font-['JetBrains_Mono',monospace] focus:outline-none focus:border-black transition"
                    />
                    {isSearchingAddress && (
                      <div className="absolute right-3 top-2.5 w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>

                  {/* Autocomplete Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-[#f8f8f9] border border-[#e4e4e7] rounded-xl shadow-2xl z-[2000] overflow-hidden divide-y divide-[#e4e4e7]">
                      {suggestions.map((s, idx) => (
                        <div
                          key={idx}
                          onClick={() => selectSuggestion(s)}
                          className="p-2.5 text-xs text-black hover:bg-black hover:text-white cursor-pointer transition font-['JetBrains_Mono',monospace] flex items-start gap-2"
                        >
                          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span className="truncate">{s.display_name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pickup Location */}
                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] font-['JetBrains_Mono',monospace] tracking-wider uppercase mb-1">
                    Pickup Store Location
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
                  <span>CONFIRM & PLACE ORDER</span>
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
                        setIsCreatingOrder(false);
                        setDriverLocation(null);
                      }}
                      className={`p-3.5 rounded-xl border cursor-pointer transition font-['JetBrains_Mono',monospace] ${
                        selectedOrder?.id === ord.id && !isCreatingOrder
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
                            selectedOrder?.id === ord.id && !isCreatingOrder
                              ? 'bg-white text-black'
                              : 'bg-black text-white'
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
                          <span className={`text-xs tracking-wider ${selectedOrder?.id === ord.id && !isCreatingOrder ? 'text-white' : 'text-black'}`}>
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
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4 font-['JetBrains_Mono',monospace]">
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
              ) : (null)}

              {/* Leaflet Precision Map */}
              <div className="h-[460px] w-full rounded-xl overflow-hidden border border-[#e4e4e7] relative shadow-inner">
                <MapContainer
                  center={[
                    !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLat : deliveryLat,
                    !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLng : deliveryLng
                  ]}
                  zoom={15}
                  scrollWheelZoom={true}
                  className="w-full h-full cursor-crosshair"
                >
                  <MapRecenter 
                    center={[
                      !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLat : deliveryLat,
                      !isCreatingOrder && selectedOrder ? selectedOrder.deliveryLng : deliveryLng
                    ]} 
                    zoom={15}
                  />

                  {/* Click on Map to Drop Pin (Active when in New Order Mode) */}
                  <MapClickHandler 
                    onLocationSelect={handleMapLocationSelect} 
                    isInteractive={isCreatingOrder} 
                  />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Pickup Marker */}
                  <Marker 
                    position={[
                      !isCreatingOrder && selectedOrder ? selectedOrder.pickupLat : pickupLat,
                      !isCreatingOrder && selectedOrder ? selectedOrder.pickupLng : pickupLng
                    ]} 
                    icon={pickupIcon}
                  >
                    <Popup>🟢 Pickup Location</Popup>
                  </Marker>

                  {/* Delivery Marker (Draggable with 100% precision!) */}
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
                    <Popup>🔴 Delivery Pinpoint (Drag to adjust)</Popup>
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

                {driverLocation && !isCreatingOrder && (
                  <div className="absolute top-3 right-3 z-[1000] bg-black text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-[11px] font-bold shadow-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE DRIVER GPS CONNECTED
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};