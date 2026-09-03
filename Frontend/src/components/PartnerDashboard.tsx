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
  MapPin, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  AlertCircle,
  Power,
  Navigation
} from 'lucide-react';

const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const relocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const MapRecenter: React.FC<{ center: [number, number] }> = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1.0 });
  }, [center, map]);
  return null;
};

const MapClickHandler: React.FC<{ onSelect: (lat: number, lng: number) => void; isInteractive: boolean }> = ({ 
  onSelect, 
  isInteractive 
}) => {
  useMapEvents({
    click(e) {
      if (isInteractive) {
        onSelect(e.latlng.lat, e.latlng.lng);
      }
    },
  });
  return null;
};

interface PartnerDashboardProps {
  user: User;
}

export const PartnerDashboard: React.FC<PartnerDashboardProps> = ({ user }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [storeData, setStoreData] = useState<any | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  // Shop Coordinates State
  const [shopAddress, setShopAddress] = useState('');
  const [shopLat, setShopLat] = useState<number>(20.5937);
  const [shopLng, setShopLng] = useState<number>(78.9629);

  // New Menu Item State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Relocation Request Modal State
  const [showRelocationModal, setShowRelocationModal] = useState(false);
  const [relocationAddress, setRelocationAddress] = useState('');
  const [relocationLat, setRelocationLat] = useState<number>(20.5937);
  const [relocationLng, setRelocationLng] = useState<number>(78.9629);
  const [relocationReason, setRelocationReason] = useState('');

  // Dispatch Order Form State
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLat] = useState(20.5937);
  const [deliveryLng] = useState(78.9629);
  const [dispatchItemName, setDispatchItemName] = useState('');
  const [dispatchItemPrice, setDispatchItemPrice] = useState('25.00');

  const shopMarkerRef = useRef<any>(null);
  const relocationMarkerRef = useRef<any>(null);

  const fetchStoreData = async () => {
    try {
      setLoading(true);
      const [storeRes, ordersRes] = await Promise.all([
        api.get('/stores/my-store'),
        api.get('/orders'),
      ]);
      const s = storeRes.data.store;
      setStoreData(s);
      setMenuItems(s.menuItems || []);
      setOrders(ordersRes.data.orders);

      if (s.latitude && s.longitude) {
        setShopLat(s.latitude);
        setShopLng(s.longitude);
        setShopAddress(s.address || `${user.name} Store`);
      } else {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((pos) => {
            setShopLat(pos.coords.latitude);
            setShopLng(pos.coords.longitude);
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`)
              .then((res) => res.json())
              .then((d) => {
                if (d && d.display_name) {
                  setShopAddress(d.display_name.split(',').slice(0, 3).join(','));
                }
              })
              .catch(() => {});
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  // 1. Toggle Store Status (Accepting Orders vs Closed)
  const handleToggleStoreStatus = async () => {
    try {
      setIsTogglingStatus(true);
      const res = await api.post('/stores/toggle-status');
      setStoreData(res.data.store);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to change store status');
    } finally {
      setIsTogglingStatus(false);
    }
  };

  // 2. Lock Initial Location
  const handleLockInitialLocation = async () => {
    try {
      await api.post('/stores/location/initial', {
        address: shopAddress || `${user.name} Store`,
        latitude: shopLat,
        longitude: shopLng,
      });
      await fetchStoreData();
      alert('🔒 Shop Location Successfully Locked! It cannot be changed without Admin approval.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to lock location');
    }
  };

  // 3. Relocation Map Click & Reverse Geocode
  const handleRelocationMapSelect = (lat: number, lng: number) => {
    setRelocationLat(lat);
    setRelocationLng(lng);
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.display_name) {
          setRelocationAddress(d.display_name.split(',').slice(0, 3).join(','));
        }
      })
      .catch(() => {});
  };
    // 3b. Use Live GPS in Relocation Modal
  const handleUseCurrentLocationForRelocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          handleRelocationMapSelect(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          alert('Could not retrieve device location. Make sure location permissions are enabled.');
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    } else {
      alert('Geolocation not supported by this browser.');
    }
  };

  // 4. Submit Relocation Request
  const handleSubmitRelocationRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/stores/location/request-change', {
        requestedAddress: relocationAddress || shopAddress,
        requestedLat: relocationLat,
        requestedLng: relocationLng,
        reason: relocationReason,
      });
      setShowRelocationModal(false);
      await fetchStoreData();
      alert('📝 Relocation request submitted to Admin for approval!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit relocation request');
    }
  };

  // 5. Add Menu Item
  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;
    try {
      await api.post('/stores/menu', {
        name: newItemName,
        price: parseFloat(newItemPrice),
        description: newItemDesc,
      });
      setNewItemName('');
      setNewItemPrice('');
      setNewItemDesc('');
      await fetchStoreData();
      alert('✅ Menu item added to your store!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add item');
    }
  };

  // 6. Delete Menu Item
  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item?')) return;
    try {
      await api.delete(`/stores/menu/${itemId}`);
      await fetchStoreData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  // 7. Dispatch Order
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
        items: [{ name: dispatchItemName || 'Store Order', quantity: 1, price: parseFloat(dispatchItemPrice) }],
        totalAmount: parseFloat(dispatchItemPrice),
      });
      await fetchStoreData();
      alert('📦 Order Dispatched to Drivers with your exact Shop GPS!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch order');
    }
  };

  const isLocked = storeData?.isLocationLocked;
  const isOpen = storeData?.isOpen ?? true;
  const pendingChange = storeData?.pendingChange;

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
        {/* Header with Store Status Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-black uppercase font-['Hanken_Grotesk',sans-serif]">
              Partner Store Hub
            </h1>
            <p className="text-xs text-[#5D5F5F] font-['JetBrains_Mono',monospace]">
              STORE: {user.name.toUpperCase()} | GOVERNED LOCATION & MENUS
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* 🟢 STORE OPEN / CLOSED TOGGLE SWITCH */}
            <button
              onClick={handleToggleStoreStatus}
              disabled={isTogglingStatus}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-['JetBrains_Mono',monospace] transition flex items-center gap-2 shadow-sm border ${
                isOpen
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                  : 'bg-red-600 hover:bg-red-700 text-white border-red-700'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOpen ? '🟢 ACCEPTING ORDERS' : '🔴 STORE CLOSED'}</span>
            </button>

            <button
              onClick={fetchStoreData}
              className="bg-[#f8f8f9] hover:bg-black hover:text-white text-[#5D5F5F] p-2.5 rounded-xl border border-[#e4e4e7] transition shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Relocation Request Notice */}
        {pendingChange && pendingChange.status === 'PENDING' && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between font-['JetBrains_Mono',monospace]">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <span className="text-xs font-bold text-amber-900 block uppercase">
                  Relocation Request Under Admin Review
                </span>
                <span className="text-[11px] text-amber-800">
                  Requested: {pendingChange.requestedAddress} ({pendingChange.reason})
                </span>
              </div>
            </div>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-2.5 py-1 rounded font-bold uppercase">
              PENDING
            </span>
          </div>
        )}

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-['JetBrains_Mono',monospace]">
          {/* Left Column: Location & Menus (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Shop Location Governance */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <Store className="w-4 h-4" />
                  Shop GPS Location
                </h2>

                {isLocked ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-black text-white px-2 py-0.5 rounded">
                    <Lock className="w-3 h-3" />
                    LOCKED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded">
                    <Unlock className="w-3 h-3" />
                    SETUP REQUIRED
                  </span>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                  Store Street Address
                </label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={shopAddress}
                  placeholder="Click map to pick your shop location"
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#71717a]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-black" />
                  <span>GPS: {shopLat.toFixed(5)}, {shopLng.toFixed(5)}</span>
                </div>
                {isLocked && <span className="text-black font-semibold">Protected Coordinates</span>}
              </div>

              {!isLocked ? (
                <button
                  type="button"
                  onClick={handleLockInitialLocation}
                  className="w-full bg-black hover:bg-[#27272a] text-white text-xs font-bold uppercase py-2.5 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>LOCK & SAVE INITIAL LOCATION</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRelocationAddress(shopAddress);
                    setRelocationLat(shopLat);
                    setRelocationLng(shopLng);
                    setShowRelocationModal(true);
                  }}
                  className="w-full bg-[#f0f0f2] hover:bg-black hover:text-white text-black text-xs font-bold uppercase py-2.5 rounded-xl transition border border-[#e4e4e7] flex items-center justify-center gap-2"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>REQUEST RELOCATION FROM ADMIN</span>
                </button>
              )}
            </div>

            {/* 2. Menu Items Management */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Store Menu ({menuItems.length})
                </h2>
                <span className="text-[10px] text-[#71717a]">LIVE FOR CUSTOMERS</span>
              </div>

              {/* Add Item Form */}
              <form onSubmit={handleAddMenuItem} className="p-3.5 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7] space-y-2.5">
                <span className="text-[10px] font-bold uppercase text-black block">Add Product / Dish</span>

                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Item Name"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="col-span-2 bg-[#f8f8f9] border border-[#e4e4e7] rounded-lg px-2.5 py-1.5 text-xs text-black"
                  />
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Price ($)"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-lg px-2.5 py-1.5 text-xs text-black"
                  />
                </div>

                <input
                  type="text"
                  placeholder="Short description"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full bg-[#f8f8f9] border border-[#e4e4e7] rounded-lg px-2.5 py-1.5 text-xs text-black"
                />

                <button
                  type="submit"
                  className="w-full bg-black hover:bg-[#27272a] text-white text-[11px] font-bold uppercase py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD ITEM TO MENU</span>
                </button>
              </form>

              {/* Menu Items List */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {menuItems.length === 0 ? (
                  <p className="text-xs text-[#a1a1aa] text-center py-6">NO ITEMS IN MENU YET</p>
                ) : (
                  menuItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7] flex items-center justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-black block">{item.name}</span>
                        {item.description && <span className="text-[10px] text-[#71717a] block">{item.description}</span>}
                        <span className="text-xs font-black text-black block mt-0.5">${item.price.toFixed(2)}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDeleteMenuItem(item.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 3. Dispatch Order Form */}
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
                    placeholder="Enter customer street address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                    Item Description
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sourdough Loaf + Drink"
                    value={dispatchItemName}
                    onChange={(e) => setDispatchItemName(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                    Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={dispatchItemPrice}
                    onChange={(e) => setDispatchItemPrice(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 bg-black hover:bg-[#27272a] text-white text-xs font-bold tracking-widest uppercase py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>DISPATCH TO DRIVERS</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Interactive Map & Orders (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    Store Location Pinpoint
                  </h2>
                  <p className="text-[10px] text-[#71717a] mt-0.5">
                    {isLocked ? '🔒 LOCATION LOCKED — SUBMIT REQUEST TO ADMIN TO RELOCATE' : 'CLICK MAP OR DRAG PIN TO YOUR SHOP ENTRANCE'}
                  </p>
                </div>
              </div>

              {/* Leaflet Store Map */}
              <div className="h-[440px] w-full rounded-xl overflow-hidden border border-[#e4e4e7] relative shadow-inner cursor-crosshair">
                <MapContainer
                  center={[shopLat, shopLng]}
                  zoom={15}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  <MapRecenter center={[shopLat, shopLng]} />
                  <MapClickHandler 
                    onSelect={(lat, lng) => {
                      if (!isLocked) {
                        setShopLat(lat);
                        setShopLng(lng);
                        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                          .then((r) => r.json())
                          .then((d) => {
                            if (d && d.display_name) setShopAddress(d.display_name.split(',').slice(0, 3).join(','));
                          })
                          .catch(() => {});
                      }
                    }} 
                    isInteractive={!isLocked} 
                  />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  <Marker
                    position={[shopLat, shopLng]}
                    icon={storeIcon}
                    draggable={!isLocked}
                    ref={shopMarkerRef}
                    eventHandlers={{
                      dragend() {
                        const marker = shopMarkerRef.current;
                        if (marker && !isLocked) {
                          const latLng = marker.getLatLng();
                          setShopLat(latLng.lat);
                          setShopLng(latLng.lng);
                          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latLng.lat}&lon=${latLng.lng}`)
                            .then((r) => r.json())
                            .then((d) => {
                              if (d && d.display_name) setShopAddress(d.display_name.split(',').slice(0, 3).join(','));
                            })
                            .catch(() => {});
                        }
                      },
                    }}
                  >
                    <Popup>🏬 {shopAddress || 'My Shop'}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>

            {/* Orders Feed */}
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
                        <span className="text-xs font-bold text-black">{ord.id}</span>
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

        {/* 🗺️ RELOCATION REQUEST MODAL WITH INTERACTIVE MAP */}
        {showRelocationModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 font-['JetBrains_Mono',monospace]">
            <div className="bg-[#f8f8f9] border border-black rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
                    <Unlock className="w-4 h-4" />
                    Select New Store Location on Map
                  </h3>
                  <p className="text-[10px] text-[#71717a] mt-0.5">
                    CLICK MAP OR USE GPS TO PINPOINT YOUR NEW SHOP ENTRANCE
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* 📍 1-CLICK CURRENT LOCATION BUTTON */}
                  <button
                    type="button"
                    onClick={handleUseCurrentLocationForRelocation}
                    className="bg-black hover:bg-[#27272a] text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Navigation className="w-3 h-3 text-emerald-400" />
                    <span>MY CURRENT GPS</span>
                  </button>

                  <button 
                    onClick={() => setShowRelocationModal(false)} 
                    className="text-black font-bold p-1 hover:bg-[#e4e4e7] rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Interactive Modal Leaflet Map */}
              <div className="h-[280px] w-full rounded-xl overflow-hidden border border-[#e4e4e7] relative shadow-inner cursor-crosshair">
                <MapContainer
                  center={[relocationLat, relocationLng]}
                  zoom={15}
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  <MapRecenter center={[relocationLat, relocationLng]} />
                  <MapClickHandler onSelect={handleRelocationMapSelect} isInteractive={true} />

                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Relocation Marker */}
                  <Marker
                    position={[relocationLat, relocationLng]}
                    icon={relocationIcon}
                    draggable={true}
                    ref={relocationMarkerRef}
                    eventHandlers={{
                      dragend() {
                        const marker = relocationMarkerRef.current;
                        if (marker) {
                          const latLng = marker.getLatLng();
                          handleRelocationMapSelect(latLng.lat, latLng.lng);
                        }
                      },
                    }}
                  >
                    <Popup>📍 New Store Location: {relocationAddress}</Popup>
                  </Marker>
                </MapContainer>
              </div>

              <form onSubmit={handleSubmitRelocationRequest} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-[#71717a] uppercase block mb-1">
                      New Street Address
                    </label>
                    <input
                      type="text"
                      required
                      value={relocationAddress}
                      onChange={(e) => setRelocationAddress(e.target.value)}
                      placeholder="Click map or type street address..."
                      className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-black"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[#71717a] uppercase block mb-1">
                      Selected GPS Coordinates
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${relocationLat.toFixed(5)}, ${relocationLng.toFixed(5)}`}
                      className="w-full bg-[#e4e4e7]/60 border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-[#5D5F5F] cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#71717a] uppercase block mb-1">
                    Reason for Relocation (Required for Admin Approval)
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Relocating to new commercial market on 5th Avenue..."
                    value={relocationReason}
                    onChange={(e) => setRelocationReason(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-black h-16"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRelocationModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#71717a] hover:text-black border border-[#e4e4e7]"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-[#27272a] shadow-sm"
                  >
                    SUBMIT TO ADMIN
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};