import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import type { User, Order } from '../types';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { 
  Store, 
  Package, 
  RefreshCw, 
  ArrowRight, 
  Navigation, 
  MapPin, 
} from 'lucide-react';

const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const deliveryIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Helper: Re-center map
const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1.0 });
  }, [center, map]);
  return null;
};

// Helper: Click map to adjust shop pin
const MapClickHandler: React.FC<{ onSelect: (lat: number, lng: number) => void }> = ({ onSelect }) => {
  useMapEvents({
    click(e) {
      onSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface PartnerDashboardProps {
  user: User;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [detectingGps, setDetectingGps] = useState(false);

  // Shop Location State (Saved in LocalStorage for persistence)
  const [shopAddress, setShopAddress] = useState(() => {
    return localStorage.getItem('partner_shop_address') || `${user.name} Bakery & Cafe`;
  });
  const [shopLat, setShopLat] = useState<number>(() => {
    const saved = localStorage.getItem('partner_shop_lat');
    return saved ? parseFloat(saved) : 17.6599;
  });
  const [shopLng, setShopLng] = useState<number>(() => {
    const saved = localStorage.getItem('partner_shop_lng');
    return saved ? parseFloat(saved) : 75.9064;
  });

  // Dispatch Order Form State
  const [deliveryAddress, setDeliveryAddress] = useState('Customer Residence, Main Road');
  const [deliveryLat, setDeliveryLat] = useState(17.6700);
  const [deliveryLng, setDeliveryLng] = useState(75.9100);
  const [itemName, setItemName] = useState('Large Margherita Pizza + Drink');
  const [itemPrice, setItemPrice] = useState('24.00');

  // Address Search Suggestions
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const shopMarkerRef = useRef<any>(null);

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

  // Save Shop GPS Coordinates
  const updateShopLocation = (lat: number, lng: number, address?: string) => {
    setShopLat(lat);
    setShopLng(lng);
    localStorage.setItem('partner_shop_lat', lat.toString());
    localStorage.setItem('partner_shop_lng', lng.toString());

    if (address) {
      setShopAddress(address);
      localStorage.setItem('partner_shop_address', address);
    } else {
      // Reverse Geocode
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.display_name) {
            const short = data.display_name.split(',').slice(0, 3).join(',');
            setShopAddress(`${user.name} (${short})`);
            localStorage.setItem('partner_shop_address', `${user.name} (${short})`);
          }
        })
        .catch(() => {});
    }
  };

  // 1-Click Detect Shop Live Location
  const handleDetectShopLocation = () => {
    setDetectingGps(true);
    if (navigator.geolocation && window.isSecureContext) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          updateShopLocation(pos.coords.latitude, pos.coords.longitude);
          setDetectingGps(false);
          alert('📍 Shop location updated to your physical GPS coordinates!');
        },
        () => {
          fetchIpFallback();
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      fetchIpFallback();
    }

    function fetchIpFallback() {
      fetch('https://ipapi.co/json/')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.latitude && data.longitude) {
            updateShopLocation(data.latitude, data.longitude, `${user.name} (${data.city})`);
            alert('📍 Shop location updated!');
          }
        })
        .catch(() => alert('Could not detect location'))
        .finally(() => setDetectingGps(false));
    }
  };

  // Search Address Autocomplete for Shop
  const handleAddressSearch = async (text: string) => {
    setShopAddress(text);
    if (text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`);
      const data = await res.json();
      setSuggestions(data || []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSuggestion = (s: any) => {
    const lat = parseFloat(s.lat);
    const lng = parseFloat(s.lon);
    updateShopLocation(lat, lng, `${user.name} (${s.display_name.split(',').slice(0, 2).join(',')})`);
    setSuggestions([]);
  };

  const handleDispatchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/orders', {
        pickupAddress: shopAddress,
        deliveryAddress,
        pickupLat: shopLat,
        pickupLng: shopLng,
        deliveryLat,
        deliveryLng,
        items: [{ name: itemName, quantity: 1, price: parseFloat(itemPrice) }],
        totalAmount: parseFloat(itemPrice),
      });

      await fetchOrders();
      alert('📦 Order Dispatched to Drivers with your exact Shop GPS!');
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
        {/* Header */}
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
          {/* Left Column: Store Setup & Dispatch Form (5 cols) */}
          <div className="lg:col-span-5 space-y-6 font-['JetBrains_Mono',monospace]">
            {/* Shop Location Settings Card */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Shop GPS Location
                </h2>

                <button
                  type="button"
                  onClick={handleDetectShopLocation}
                  disabled={detectingGps}
                  className="bg-black hover:bg-[#27272a] text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                >
                  <Navigation className={`w-3 h-3 ${detectingGps ? 'animate-spin' : ''}`} />
                  <span>{detectingGps ? 'LOCATING...' : 'MY SHOP GPS'}</span>
                </button>
              </div>

              {/* Shop Address Input with Live Suggestions */}
              <div className="relative">
                <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                  Shop Name & Street Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={shopAddress}
                    onChange={(e) => handleAddressSearch(e.target.value)}
                    placeholder="Search shop address or click map..."
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs focus:outline-none focus:border-black transition"
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5 w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-[#f8f8f9] border border-[#e4e4e7] rounded-xl shadow-xl z-[2000] overflow-hidden divide-y divide-[#e4e4e7]">
                    {suggestions.map((s, idx) => (
                      <div
                        key={idx}
                        onClick={() => selectSuggestion(s)}
                        className="p-2.5 text-xs text-black hover:bg-black hover:text-white cursor-pointer transition flex items-start gap-2"
                      >
                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                        <span className="truncate">{s.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-[#71717a] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-black" />
                <span>COORDINATES: {shopLat.toFixed(5)}, {shopLng.toFixed(5)}</span>
              </div>
            </div>

            {/* Dispatch Order Form */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md">
              <h2 className="text-sm font-black text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Dispatch Order to Drivers
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
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs focus:outline-none focus:border-black transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                    Package Item Description
                  </label>
                  <input
                    type="text"
                    required
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs focus:outline-none focus:border-black transition"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                    Order Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs focus:outline-none focus:border-black transition"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-black hover:bg-[#27272a] text-white text-xs font-bold tracking-widest uppercase py-3 rounded-xl transition duration-150 flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>DISPATCH TO DRIVERS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Interactive Shop Map (7 cols) */}
          <div className="lg:col-span-7 space-y-6 font-['JetBrains_Mono',monospace]">
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Store Location Pinpoint
                  </h2>
                  <p className="text-[10px] text-[#71717a] mt-0.5">CLICK MAP OR DRAG BLACK PIN TO ADJUST YOUR SHOP ENTRANCE</p>
                </div>
              </div>

              {/* Leaflet Store Map */}
              <div className="h-[420px] w-full rounded-xl overflow-hidden border border-[#e4e4e7] relative shadow-inner cursor-crosshair">
                <MapContainer
                  center={[shopLat, shopLng]}
                  zoom={15}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  <MapRecenter center={[shopLat, shopLng]} />
                  <MapClickHandler onSelect={(lat, lng) => updateShopLocation(lat, lng)} />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Shop Marker (Draggable!) */}
                  <Marker
                    position={[shopLat, shopLng]}
                    icon={storeIcon}
                    draggable={true}
                    ref={shopMarkerRef}
                    eventHandlers={{
                      dragend() {
                        const marker = shopMarkerRef.current;
                        if (marker) {
                          const latLng = marker.getLatLng();
                          updateShopLocation(latLng.lat, latLng.lng);
                        }
                      },
                    }}
                  >
                    <Popup>🏬 Your Store: {shopAddress}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>

            {/* Dispatched Orders Feed */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-3">
              <h2 className="text-sm font-black text-black uppercase tracking-wider">
                Store Dispatch Ledger ({orders.length})
              </h2>

              <div className="space-y-2.5 max-h-56 overflow-y-auto">
                {orders.length === 0 ? (
                  <p className="text-xs text-[#a1a1aa] py-6 text-center">NO ORDERS DISPATCHED YET</p>
                ) : (
                  orders.map((ord) => (
                    <div key={ord.id} className="p-3.5 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-black">#{ord.id.slice(0, 8).toUpperCase()}</span>
                        <p className="text-xs text-[#5D5F5F] truncate max-w-sm mt-0.5">🏁 {ord.deliveryAddress}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-black block">${ord.totalAmount.toFixed(2)}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-bold uppercase bg-black text-white">
                          {ord.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};