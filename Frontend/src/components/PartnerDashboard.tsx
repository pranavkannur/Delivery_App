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
} from 'lucide-react';

const storeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
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
  //const [detectingGps, setDetectingGps] = useState(false);

  // Shop Coordinates State
  const [shopAddress, setShopAddress] = useState('');
  const [shopLat, setShopLat] = useState(17.6599);
  const [shopLng, setShopLng] = useState(75.9064);

  // New Menu Item State
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');

  // Relocation Request Modal State
  const [showRelocationModal, setShowRelocationModal] = useState(false);
  const [relocationAddress, setRelocationAddress] = useState('');
  const [relocationLat, setRelocationLat] = useState(17.6599);
  const [relocationLng, setRelocationLng] = useState(75.9064);
  const [relocationReason, setRelocationReason] = useState('');

  // Dispatch Order Form State
  const [deliveryAddress, setDeliveryAddress] = useState('Customer Residence, Main Road');
  const [deliveryLat] = useState(17.6700);
  const [deliveryLng] = useState(75.9100);
  const [dispatchItemName, setDispatchItemName] = useState('');
  const [dispatchItemPrice, setDispatchItemPrice] = useState('25.00');

  const shopMarkerRef = useRef<any>(null);

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
      setShopAddress(s.address || `${user.name}, High Street`);
      setShopLat(s.latitude || 17.6599);
      setShopLng(s.longitude || 75.9064);
      setOrders(ordersRes.data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStoreData();
  }, []);

  // 1. Initial One-Time Location Setup & Permanent Lock
  const handleLockInitialLocation = async () => {
    try {
      await api.post('/stores/location/initial', {
        address: shopAddress,
        latitude: shopLat,
        longitude: shopLng,
      });
      await fetchStoreData();
      alert('🔒 Shop Location Successfully Locked! Any future changes must be approved by an Admin.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to lock location');
    }
  };

  // 2. Submit Relocation Request to Admin
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
      alert('📝 Relocation request submitted! An Admin will review and approve it.');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit relocation request');
    }
  };

  // 3. Add Menu Item
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
      alert('✅ Menu item added successfully!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add item');
    }
  };

  // 4. Delete Menu Item
  const handleDeleteMenuItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to remove this item from your store menu?')) return;
    try {
      await api.delete(`/stores/menu/${itemId}`);
      await fetchStoreData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete item');
    }
  };

  // 5. Dispatch Order
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
      alert('📦 Order Dispatched with your locked Shop GPS!');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to dispatch order');
    }
  };

  const isLocked = storeData?.isLocationLocked;
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-black uppercase font-['Hanken_Grotesk',sans-serif]">
              Partner Store Hub
            </h1>
            <p className="text-xs text-[#5D5F5F] font-['JetBrains_Mono',monospace]">
              STORE: {user.name.toUpperCase()} | GOVERNED LOCATION & MENUS
            </p>
          </div>

          <button
            onClick={fetchStoreData}
            className="bg-[#f8f8f9] hover:bg-black hover:text-white text-[#5D5F5F] p-2.5 rounded-xl border border-[#e4e4e7] transition shadow-sm self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Status Notification Banner */}
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

        {/* 2-Column Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 font-['JetBrains_Mono',monospace]">
          {/* Left Column: Location Lock & Menu Management (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* 1. Shop Location Governance Card */}
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

              {/* Action Buttons based on Lock Status */}
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

            {/* 2. Menu Item Management Card (Add & Delete) */}
            <div className="bg-[#f8f8f9] border border-[#e4e4e7] rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-black uppercase tracking-wider flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Store Menu ({menuItems.length})
                </h2>
                <span className="text-[10px] text-[#71717a]">CUSTOMERS SEE LIVE</span>
              </div>

              {/* Add Item Form */}
              <form onSubmit={handleAddMenuItem} className="p-3.5 bg-[#f0f0f2] rounded-xl border border-[#e4e4e7] space-y-2.5">
                <span className="text-[10px] font-bold uppercase text-black block">Add New Dish / Product</span>

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
                  placeholder="Short description (e.g., fresh organic herbs)"
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  className="w-full bg-[#f8f8f9] border border-[#e4e4e7] rounded-lg px-2.5 py-1.5 text-xs text-black"
                />

                <button
                  type="submit"
                  className="w-full bg-black hover:bg-[#27272a] text-white text-[11px] font-bold uppercase py-2 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ADD TO STORE MENU</span>
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
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3.5 py-2 text-black text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#71717a] uppercase mb-1">
                    Item Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sourdough Loaf + Pastries"
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
                    {isLocked ? '🔒 LOCATION LOCKED — CLICK "REQUEST RELOCATION" TO CHANGE' : 'CLICK MAP OR DRAG PIN TO YOUR ENTRANCE'}
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
                        }
                      },
                    }}
                  >
                    <Popup>🏬 {shopAddress}</Popup>
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

        {/* Relocation Request Modal */}
        {showRelocationModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 font-['JetBrains_Mono',monospace]">
            <div className="bg-[#f8f8f9] border border-black rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-black flex items-center gap-2">
                  <Unlock className="w-4 h-4" />
                  Request Store Relocation
                </h3>
                <button onClick={() => setShowRelocationModal(false)} className="text-black font-bold">✕</button>
              </div>

              <form onSubmit={handleSubmitRelocationRequest} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-[#71717a] uppercase block mb-1">
                    New Store Address
                  </label>
                  <input
                    type="text"
                    required
                    value={relocationAddress}
                    onChange={(e) => setRelocationAddress(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-black"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#71717a] uppercase block mb-1">
                    Reason for Relocation
                  </label>
                  <textarea
                    required
                    placeholder="e.g. Moved to larger commercial space in North Solapur"
                    value={relocationReason}
                    onChange={(e) => setRelocationReason(e.target.value)}
                    className="w-full bg-[#f0f0f2] border border-[#e4e4e7] rounded-xl px-3 py-2 text-xs text-black h-20"
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
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-black text-white hover:bg-[#27272a]"
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