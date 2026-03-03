import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  User as UserIcon, 
  LogOut, 
  Plus, 
  Trash2, 
  CreditCard, 
  Clock, 
  CheckCircle, 
  XCircle,
  ChevronRight,
  Store,
  Utensils
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Restaurant, MenuItem, Order, PaymentMethod, Role } from './types';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'restaurants' | 'orders' | 'admin'>('restaurants');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password');

  // Auth
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        localStorage.setItem('slooze_user', JSON.stringify(data));
      } else {
        alert('Login failed');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('slooze_user');
    setCart([]);
    setSelectedRestaurant(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem('slooze_user');
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // Data Fetching
  useEffect(() => {
    if (user) {
      fetchRestaurants();
      fetchOrders();
      if (user.role === 'Admin') fetchPaymentMethods();
    }
  }, [user]);

  const fetchRestaurants = async () => {
    if (!user) return;
    const res = await fetch('/api/restaurants', {
      headers: { 'x-user-id': user.id.toString() }
    });
    const data = await res.json();
    setRestaurants(data);
  };

  const fetchMenu = async (restaurantId: number) => {
    const res = await fetch(`/api/restaurants/${restaurantId}/menu`);
    const data = await res.json();
    setMenuItems(data);
  };

  const fetchOrders = async () => {
    if (!user) return;
    const res = await fetch('/api/orders', {
      headers: { 'x-user-id': user.id.toString() }
    });
    const data = await res.json();
    setOrders(data);
  };

  const fetchPaymentMethods = async () => {
    if (!user || user.role !== 'Admin') return;
    const res = await fetch('/api/payment-methods', {
      headers: { 'x-user-id': user.id.toString() }
    });
    const data = await res.json();
    setPaymentMethods(data);
  };

  // Actions
  const addToCart = (item: MenuItem) => {
    setCart(prev => {
      const existing = prev.find(p => p.item.id === item.id);
      if (existing) {
        return prev.map(p => p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(p => p.item.id !== itemId));
  };

  const placeOrder = async () => {
    if (!user || cart.length === 0) return;
    const totalAmount = cart.reduce((sum, p) => sum + p.item.price * p.quantity, 0);
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': user.id.toString()
      },
      body: JSON.stringify({ 
        items: cart.map(p => ({ id: p.item.id, quantity: p.quantity, price: p.item.price })),
        totalAmount,
        status: user.role === 'Member' ? 'Pending' : 'Paid'
      }),
    });
    if (res.ok) {
      setCart([]);
      fetchOrders();
      setView('orders');
      alert(user.role === 'Member' ? 'Order placed successfully!' : 'Order paid and completed!');
    }
  };

  const handleOrderAction = async (orderId: number, action: 'pay' | 'cancel') => {
    if (!user) return;
    const res = await fetch(`/api/orders/${orderId}/${action}`, {
      method: 'POST',
      headers: { 'x-user-id': user.id.toString() }
    });
    if (res.ok) {
      fetchOrders();
    } else {
      const data = await res.json();
      alert(data.error || 'Action failed');
    }
  };

  const addPaymentMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const form = e.target as HTMLFormElement;
    const type = (form.elements.namedItem('type') as HTMLInputElement).value;
    const details = (form.elements.namedItem('details') as HTMLInputElement).value;

    const res = await fetch('/api/payment-methods', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': user.id.toString()
      },
      body: JSON.stringify({ type, details }),
    });
    if (res.ok) {
      fetchPaymentMethods();
      form.reset();
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <ShoppingBag className="text-white w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">Slooze</h1>
            <p className="text-neutral-400 text-sm mt-1">Role-Based Food Ordering</p>
          </div>

          <form onSubmit={login} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Email</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@slooze.com"
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-neutral-800">
            <p className="text-xs text-neutral-500 text-center mb-4">DEMO ACCOUNTS (Password: password)</p>
            <div className="grid grid-cols-2 gap-2">
              {['admin@slooze.com', 'manager_in@slooze.com', 'member_in@slooze.com', 'member_us@slooze.com'].map(e => (
                <button 
                  key={e}
                  onClick={() => setEmail(e)}
                  className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-300 py-1 px-2 rounded-lg border border-neutral-700 transition-colors"
                >
                  {e.split('@')[0]}
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-neutral-900/50 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { setView('restaurants'); setSelectedRestaurant(null); }}>
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShoppingBag className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">Slooze</span>
          </div>

          <div className="flex items-center gap-6">
            <nav className="hidden md:flex items-center gap-1">
              <button 
                onClick={() => setView('restaurants')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'restaurants' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                Restaurants
              </button>
              <button 
                onClick={() => setView('orders')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'orders' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
              >
                Orders
              </button>
              {user.role === 'Admin' && (
                <button 
                  onClick={() => setView('admin')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'admin' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}
                >
                  Admin
                </button>
              )}
            </nav>

            <div className="flex items-center gap-4 pl-6 border-l border-neutral-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-white leading-none">{user.email.split('@')[0]}</p>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1 font-bold">
                  {user.role} • {user.country}
                </p>
              </div>
              <button 
                onClick={logout}
                className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-400 hover:text-white transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
        <AnimatePresence mode="wait">
          {view === 'restaurants' && (
            <motion.div 
              key="restaurants"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            >
              {/* Restaurant List */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Restaurants in {user.country}</h2>
                  <div className="flex items-center gap-2 text-xs text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                    <Store size={12} />
                    {restaurants.length} available
                  </div>
                </div>

                {!selectedRestaurant ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {restaurants.map(r => (
                      <motion.div 
                        key={r.id}
                        whileHover={{ y: -4 }}
                        onClick={() => { setSelectedRestaurant(r); fetchMenu(r.id); }}
                        className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-all group"
                      >
                        <div className="w-12 h-12 bg-neutral-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-500/10 transition-colors">
                          <Store className="text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">{r.name}</h3>
                        <p className="text-sm text-neutral-500 flex items-center gap-1">
                          {r.country} • Fast Delivery
                        </p>
                        <div className="mt-4 flex items-center text-emerald-500 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                          View Menu <ChevronRight size={16} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <button 
                      onClick={() => setSelectedRestaurant(null)}
                      className="text-sm text-neutral-500 hover:text-white flex items-center gap-1 transition-colors"
                    >
                      ← Back to Restaurants
                    </button>
                    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                      <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                        <Utensils className="text-emerald-500" />
                        {selectedRestaurant.name} Menu
                      </h3>
                      <div className="grid grid-cols-1 gap-3">
                        {menuItems.map(item => (
                          <div key={item.id} className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50 hover:border-neutral-600 transition-colors">
                            <div>
                              <p className="font-bold text-white">{item.name}</p>
                              <p className="text-sm text-emerald-500 font-mono">
                                {user.country === 'India' ? '₹' : '$'}{item.price.toFixed(2)}
                              </p>
                            </div>
                            <button 
                              onClick={() => addToCart(item)}
                              className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-all active:scale-90"
                            >
                              <Plus size={20} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Cart */}
              <div className="lg:col-span-1">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 sticky top-24">
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    <ShoppingBag size={20} className="text-emerald-500" />
                    Your Cart
                  </h2>
                  
                  {cart.length === 0 ? (
                    <div className="py-12 text-center">
                      <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                        <ShoppingBag size={32} />
                      </div>
                      <p className="text-neutral-500 text-sm">Your cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="max-h-[40vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                        {cart.map(p => (
                          <div key={p.item.id} className="flex items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-bold text-white line-clamp-1">{p.item.name}</p>
                              <p className="text-xs text-neutral-500">{p.quantity} x {user.country === 'India' ? '₹' : '$'}{p.item.price}</p>
                            </div>
                            <button 
                              onClick={() => removeFromCart(p.item.id)}
                              className="p-1.5 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      <div className="pt-4 border-t border-neutral-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-neutral-400 text-sm">Total</span>
                          <span className="text-xl font-bold text-white font-mono">
                            {user.country === 'India' ? '₹' : '$'}
                            {cart.reduce((sum, p) => sum + p.item.price * p.quantity, 0).toFixed(2)}
                          </span>
                        </div>
                        <button 
                          onClick={placeOrder}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                        >
                          {user.role === 'Member' ? 'Place Order' : 'Checkout & Pay'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'orders' && (
            <motion.div 
              key="orders"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Order History</h2>
                <button onClick={fetchOrders} className="text-xs text-emerald-500 hover:underline">Refresh</button>
              </div>

              {orders.length === 0 ? (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-12 text-center">
                  <Clock size={48} className="mx-auto mb-4 text-neutral-700" />
                  <p className="text-neutral-500">No orders found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          order.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' :
                          order.status === 'Cancelled' ? 'bg-red-500/10 text-red-500' :
                          'bg-amber-500/10 text-amber-500'
                        }`}>
                          {order.status === 'Paid' ? <CheckCircle /> : order.status === 'Cancelled' ? <XCircle /> : <Clock />}
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500">Order #{order.id} {order.user_email && order.user_email !== user.email && `• ${order.user_email}`}</p>
                          <p className="text-lg font-bold text-white">
                            {user.country === 'India' ? '₹' : '$'}{order.total_amount.toFixed(2)}
                          </p>
                          <p className="text-xs text-neutral-600">{new Date(order.created_at).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                          order.status === 'Paid' ? 'bg-emerald-500/20 text-emerald-500' :
                          order.status === 'Cancelled' ? 'bg-red-500/20 text-red-500' :
                          'bg-amber-500/20 text-amber-500'
                        }`}>
                          {order.status}
                        </span>

                        {order.status === 'Pending' && (
                          <div className="flex gap-2">
                            {(user.role === 'Admin' || user.role === 'Manager') && (
                              <>
                                <button 
                                  onClick={() => handleOrderAction(order.id, 'pay')}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors"
                                >
                                  Pay
                                </button>
                                <button 
                                  onClick={() => handleOrderAction(order.id, 'cancel')}
                                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold rounded-lg transition-colors"
                                >
                                  Cancel
                                </button>
                              </>
                            )}
                            {user.role === 'Member' && (
                              <span className="text-[10px] text-neutral-600 italic">Awaiting Manager Approval</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === 'admin' && user.role === 'Admin' && (
            <motion.div 
              key="admin"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-4xl mx-auto space-y-8"
            >
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <CreditCard className="text-emerald-500" />
                  Payment Methods Management
                </h2>
                
                <form onSubmit={addPaymentMethod} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Type</label>
                    <select name="type" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-white focus:outline-none">
                      <option>Credit Card</option>
                      <option>UPI</option>
                      <option>PayPal</option>
                      <option>Bank Transfer</option>
                    </select>
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Details</label>
                    <input name="details" placeholder="**** 1234" className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-white focus:outline-none" required />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl transition-colors">
                      Add Method
                    </button>
                  </div>
                </form>

                <div className="space-y-3">
                  {paymentMethods.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-4 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-neutral-700 rounded-lg flex items-center justify-center">
                          <CreditCard size={20} className="text-neutral-400" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{m.type}</p>
                          <p className="text-sm text-neutral-500">{m.details}</p>
                        </div>
                      </div>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold uppercase">Active</span>
                    </div>
                  ))}
                  {paymentMethods.length === 0 && <p className="text-center text-neutral-500 py-4">No payment methods added yet</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">System Status</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-400">Database</span>
                      <span className="text-xs font-bold text-emerald-500">CONNECTED</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-400">RBAC Engine</span>
                      <span className="text-xs font-bold text-emerald-500">ACTIVE</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-400">Country Filter</span>
                      <span className="text-xs font-bold text-emerald-500">{user.country} ONLY</span>
                    </div>
                  </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Role Permissions</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle size={12} className="text-emerald-500" />
                      <span>Modify Payment Methods</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle size={12} className="text-emerald-500" />
                      <span>Approve/Cancel Orders</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <CheckCircle size={12} className="text-emerald-500" />
                      <span>View All System Logs</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="bg-neutral-900 border-t border-neutral-800 py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 opacity-50">
            <ShoppingBag size={16} />
            <span className="text-sm font-bold tracking-tight">Slooze</span>
          </div>
          <p className="text-xs text-neutral-600">© 2026 Slooze Food Ordering. All rights reserved.</p>
          <div className="flex gap-4">
            <span className="text-[10px] text-neutral-700 uppercase font-bold tracking-widest">Privacy</span>
            <span className="text-[10px] text-neutral-700 uppercase font-bold tracking-widest">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
