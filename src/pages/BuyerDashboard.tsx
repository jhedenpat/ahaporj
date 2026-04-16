import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useProducts, useOrders, useProductRequests, useReviews } from '@/hooks/useStore';
import { supabase } from '@/lib/supabase';
import { Product, OrderItem } from '@/types';
import { toast } from 'sonner';
import { ShoppingBag, LogOut, Plus, Minus, Send, User, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProductReviews } from '@/components/ProductReviews';
import { RequestMenu } from '@/components/RequestMenu';
import { Footer } from '@/components/Footer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

const TelegramWidget = ({ onAuth }: { onAuth: (u: any) => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    (window as any).onTelegramAuth = onAuth;
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'PatriciaBakeShopBot';
      script.setAttribute('data-telegram-login', botName); 
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '20');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.async = true;
      containerRef.current.appendChild(script);
    }
  }, [onAuth]);
  return <div ref={containerRef} className="flex flex-col items-center justify-center mb-6 min-h-[40px]"></div>;
};

export default function BuyerDashboard() {
  const [telegramUser, setTelegramUser] = useState<{ id: string, first_name: string, username?: string } | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { products, archivedProducts, deductStock, loading: productsLoading } = useProducts();
  const { addOrder } = useOrders();
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isNativeTelegram, setIsNativeTelegram] = useState(false);
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  // ── Upsert user into telegram_profiles table ──────────────────────────
  const upsertProfile = useCallback(async (user: { id: string; first_name: string; username?: string }) => {
    await supabase.from('telegram_profiles').upsert(
      { id: user.id, first_name: user.first_name, username: user.username ?? null },
      { onConflict: 'id' }
    );
  }, []);

  useEffect(() => {
    // 1. Auto Login if inside Telegram Mini App!
    const webApp = window.Telegram?.WebApp;
    if (webApp && webApp.initDataUnsafe?.user) {
      const tgUser = webApp.initDataUnsafe.user;
      const formattedUser = {
        id: tgUser.id.toString(),
        first_name: tgUser.first_name,
        username: tgUser.username
      };
      setTelegramUser(formattedUser);
      setIsNativeTelegram(true);
      upsertProfile(formattedUser); // ← save to DB
      webApp.expand();
      webApp.ready();
      return;
    }

    // 2. Fallback to LocalStorage for Standard Browsers
    const stored = localStorage.getItem('bakeshop_telegram_buyer');
    if (stored && stored !== 'undefined') {
      try {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && parsed.id) {
          setTelegramUser(parsed);
          upsertProfile(parsed);
        }
      } catch (e) {
        console.error('Auth cache parse error:', e);
        localStorage.removeItem('bakeshop_telegram_buyer');
      }
    }

    // Scroll to hero after a small delay to skip the header
    setTimeout(() => {
      heroRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [upsertProfile]);
  const [pendingQuickRequest, setPendingQuickRequest] = useState<{ productName: string, quantity: number } | null>(null);

  const submitQuickRequest = async (tid: string, fname: string, pName: string, qty: number, uname?: string) => {
    setIsSubmittingQuick(true);
    const ok = await submitRequest(tid, fname, pName, `Quick request for sold-out item`, qty, uname);
    if (ok) {
      toast.success(`Request for ${pName} noted! 🥖`);
      setIsQuickRequestOpen(false);
    }
    setIsSubmittingQuick(false);
  };

  const handleQuickRequestSubmit = async () => {
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AHAINNOVATION_bot';
    if (!telegramUser) {
      toast.info('Please first log in via Telegram to complete your request! 🥨');
      // Small delay to let them read the toast, then redirect to the bot
      setTimeout(() => {
        window.location.href = `https://t.me/${botName}`;
      }, 1200);
      return;
    }
    
    await submitQuickRequest(telegramUser.id, telegramUser.first_name, quickRequestProduct, quickRequestQty, telegramUser.username);
  };

  const handleTelegramAuth = useCallback((user: any) => {
    const formattedUser = {
      id: user.id.toString(),
      first_name: user.first_name,
      username: user.username
    };
    localStorage.setItem('bakeshop_telegram_buyer', JSON.stringify(formattedUser));
    setTelegramUser(formattedUser);
    upsertProfile(formattedUser); // ← save to DB
    setShowLoginModal(false);
    toast.success('Successfully logged in!');

    if (pendingQuickRequest) {
      const q = pendingQuickRequest;
      setPendingQuickRequest(null);
      submitQuickRequest(formattedUser.id, formattedUser.first_name, q.productName, q.quantity, formattedUser.username);
    }
  }, [upsertProfile, pendingQuickRequest, submitQuickRequest]);


  const handleLogout = () => {
    localStorage.removeItem('bakeshop_telegram_buyer');
    setTelegramUser(null);
    setCart([]);
    toast('Logged out successfully');
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) return;

    const { data, error } = await supabase
      .from('admins')
      .select('id')
      .eq('username', adminUsername.trim())
      .eq('password', adminPassword)
      .maybeSingle();

    if (error) {
      toast.error('Login error: ' + error.message);
      return;
    }

    if (data) {
      toast.success('Welcome back, Admin!');
      setShowAdminModal(false);
      navigate('/manager');
    } else {
      toast.error('Invalid username or password');
    }
  };

  const addToCart = (product: Product) => {
    const botName = import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AHAINNOVATION_bot';
    if (!telegramUser) {
      if (!isNativeTelegram) {
        window.location.href = `https://t.me/${botName}`;
        return;
      }
      setShowLoginModal(true);
      return;
    }
    if ((product.stock || 0) <= 0) {
      toast.error('This product is sold out');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (existing.quantity >= (product.stock || 0)) {
          toast.error(`Only ${product.stock} pieces available`);
          return prev;
        }
        return prev.map(item => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId: product.id, productName: product.name, price: product.price, quantity: 1 }];
    });
    // Removed duplicate success toast inside if logic, put it here but only trigger if it correctly added
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
    toast('Item removed from cart');
  };

  const updateQuantity = (productId: string, delta: number) => {
    const product = products.find(p => p.id === productId);
    setCart(prev => {
      return prev.map(item => {
        if (item.productId === productId) {
          let newQty = item.quantity + delta;
          if (product && newQty > (product.stock || 0)) {
            newQty = product.stock || 0;
            toast.error(`Only ${product.stock} pieces available`);
          }
          return { ...item, quantity: Math.max(0, newQty) };
        }
        return item;
      }).filter(item => item.quantity > 0);
    });
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    addOrder({
      customerName: telegramUser?.first_name || 'Anonymous',
      telegram_id: telegramUser?.id,
      username: telegramUser?.username || null,
      items: cart,
      total,
      status: 'unpaid',
      date: new Date().toISOString()
    });

    cart.forEach(item => {
      deductStock(item.productId, item.quantity);
    });

    setCart([]);
    toast.success('Order placed successfully! We will contact you soon.');
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const { requests, submitRequest } = useProductRequests();
  const { reviews } = useReviews();
  const [activeFilter, setActiveFilter] = useState<'all' | 'best' | 'top' | 'requested' | null>(null);
  const [quickRequestProduct, setQuickRequestProduct] = useState<string | null>(null);
  const [quickRequestQty, setQuickRequestQty] = useState(1);
  const [isQuickRequestOpen, setIsQuickRequestOpen] = useState(false);
  const [isSubmittingQuick, setIsSubmittingQuick] = useState(false);

  const getFilteredProducts = useCallback(() => {
    let list = [...products];
    
    if (activeFilter === null) {
      return list; // Default: Show everything
    }

    if (activeFilter === 'all') {
      return list.filter(p => (p.stock || 0) > 0); // Clicked "Available": Only show buyable
    }
    
    if (activeFilter === 'best') {
      return list.sort((a, b) => (b.stock || 0) - (a.stock || 0)).slice(0, 3);
    }

    if (activeFilter === 'top') {
      return list.sort((a, b) => {
        const aReviews = reviews.filter(r => r.product_id === a.id);
        const bReviews = reviews.filter(r => r.product_id === b.id);
        const aRating = aReviews.length ? aReviews.reduce((sum, r) => sum + r.rating, 0) / aReviews.length : 0;
        const bRating = bReviews.length ? bReviews.reduce((sum, r) => sum + r.rating, 0) / bReviews.length : 0;
        return bRating - aRating;
      }).slice(0, 3);
    }

    if (activeFilter === 'requested') {
      const allPossible = [...products, ...archivedProducts];
      // ONLY items that have at least 1 request in the history
      return allPossible
        .filter(p => {
           const reqCount = requests.filter(r => r.product_name.toLowerCase() === p.name.toLowerCase()).length;
           return reqCount > 0;
        })
        .sort((a, b) => {
          const aReqs = requests.filter(r => r.product_name.toLowerCase() === a.name.toLowerCase()).length;
          const bReqs = requests.filter(r => r.product_name.toLowerCase() === b.name.toLowerCase()).length;
          return bReqs - aReqs;
        }).slice(0, 3);
    }

    return list;
  }, [activeFilter, products, archivedProducts, reviews, requests]);

  const displayProducts = useMemo(() => getFilteredProducts(), [getFilteredProducts]);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-80 transition-colors duration-300 w-full overflow-x-hidden">
      {/* Header */}
      <header className="bg-white/90 dark:bg-zinc-900/90 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-20 shadow-sm backdrop-blur-lg">
        <div className="container max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2ba3e3] to-[#1c8ec9] text-white flex items-center justify-center shadow-md border-2 border-white dark:border-zinc-800">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm leading-tight text-zinc-800 dark:text-zinc-100">
                {telegramUser ? telegramUser.first_name : 'Guest User'}
              </p>
              {telegramUser?.username && <p className="text-xs text-[#2ba3e3] font-medium">{telegramUser.username}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowAdminModal(true)} className="text-zinc-500 dark:text-zinc-400 font-bold">
              Admin
            </Button>
            <ThemeToggle />
            {!isNativeTelegram && telegramUser ? (
              <Button variant="ghost" size="sm" onClick={handleLogout} className="text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full">
                <LogOut className="w-4 h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            ) : !isNativeTelegram ? (
              <Button variant="ghost" size="sm" onClick={() => window.location.href = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AHAINNOVATION_bot'}`} className="text-[#2ba3e3] font-bold hover:bg-[#2ba3e3]/10 rounded-full">
                Log In
              </Button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Welcome Hero */}
        <div ref={heroRef} className="bg-white dark:bg-zinc-900 rounded-3xl p-6 md:p-10 shadow-sm border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden transition-colors">
          <div className="absolute right-[-5%] top-[-20%] w-64 h-64 bg-pink-100/50 dark:bg-pink-900/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10 space-y-2 text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
              {telegramUser ? (
                <>Welcome back, <span className="text-pink-600 dark:text-pink-400 font-display italic">{telegramUser.first_name}</span>! 👋</>
              ) : (
                <>Welcome to <span className="text-pink-600 dark:text-pink-400 font-display italic">AHA SWEETS</span>! 👋</>
              )}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-lg">What sweet treats are you craving today?</p>
          </div>
          <div className="text-6xl animate-bounce drop-shadow-xl" style={{ animationDuration: '3s' }}>
            🧁
          </div>
        </div>

        {/* Telegram Login Prompt (If not logged in) */}
        {!telegramUser && (
          <Card className="border-none shadow-xl overflow-hidden rounded-3xl bg-gradient-to-br from-[#2ba3e3] to-[#1c8ec9] text-white animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <Send className="w-32 h-32" />
            </div>
            <CardHeader className="text-center pb-2 relative z-10">
              <CardTitle className="text-2xl font-bold">Ready to order?</CardTitle>
              <CardDescription className="text-white/80">Sign in with Telegram to start shopping</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center pb-8 sticky z-10">
              <Button 
                onClick={() => window.location.href = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AHAINNOVATION_bot'}`}
                className="bg-white text-[#2ba3e3] hover:bg-white/90 rounded-full px-8 h-12 font-bold shadow-lg transition-all"
              >
                <Send className="w-4 h-4 mr-2" />
                Open in Telegram
              </Button>
              <p className="text-[11px] mt-4 font-bold uppercase tracking-widest text-white/60">Tap to log in securely</p>
            </CardContent>
          </Card>
        )}

        {/* 3D Discover Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
          <button 
            onClick={() => setActiveFilter(activeFilter === 'all' ? null : 'all')}
            className={`group relative h-20 rounded-2xl transition-all duration-200 active:translate-y-1 active:shadow-none overflow-hidden ${
              activeFilter === 'all' 
              ? 'bg-pink-500 shadow-[0_6px_0_rgb(190,24,93)] translate-y-[-2px]' 
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_4px_0_rgba(0,0,0,0.05)] hover:translate-y-[-1px]'
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-2xl mb-1">🏪</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'all' ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>Available</span>
            </div>
          </button>

          <button 
             onClick={() => setActiveFilter(activeFilter === 'best' ? null : 'best')}
             className={`group relative h-20 rounded-2xl transition-all duration-200 active:translate-y-1 active:shadow-none overflow-hidden ${
              activeFilter === 'best' 
              ? 'bg-amber-500 shadow-[0_6px_0_rgb(180,83,9)] translate-y-[-2px]' 
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_4px_0_rgba(0,0,0,0.05)] hover:translate-y-[-1px]'
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-2xl mb-1">🔥</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'best' ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>Best Seller</span>
            </div>
          </button>

          <button 
             onClick={() => setActiveFilter(activeFilter === 'top' ? null : 'top')}
             className={`group relative h-20 rounded-2xl transition-all duration-200 active:translate-y-1 active:shadow-none overflow-hidden ${
              activeFilter === 'top' 
              ? 'bg-teal-500 shadow-[0_6px_0_rgb(15,118,110)] translate-y-[-2px]' 
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_4px_0_rgba(0,0,0,0.05)] hover:translate-y-[-1px]'
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-2xl mb-1">⭐</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'top' ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>Top Rated</span>
            </div>
          </button>

          <button 
             onClick={() => setActiveFilter(activeFilter === 'requested' ? null : 'requested')}
             className={`group relative h-20 rounded-2xl transition-all duration-200 active:translate-y-1 active:shadow-none overflow-hidden ${
              activeFilter === 'requested' 
              ? 'bg-red-500 shadow-[0_6px_0_rgb(185,28,28)] translate-y-[-2px]' 
              : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-[0_4px_0_rgba(0,0,0,0.05)] hover:translate-y-[-1px]'
            }`}
          >
            <div className="flex flex-col items-center justify-center h-full">
              <span className="text-2xl mb-1">❤️</span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeFilter === 'requested' ? 'text-white' : 'text-zinc-500 dark:text-zinc-400'}`}>Most Requested</span>
            </div>
          </button>
        </div>

        {/* Menu Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
              <span className="text-pink-500">
                {(activeFilter === 'all' || activeFilter === null) ? '✨' : activeFilter === 'best' ? '🔥' : activeFilter === 'top' ? '⭐' : '❤️'}
              </span> 
              {(activeFilter === 'all' || activeFilter === null) ? 'Freshly Baked Menu' : activeFilter === 'best' ? 'Best Sellers' : activeFilter === 'top' ? 'Top Rated' : 'Most Requested History'}
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 pb-20">
            {displayProducts.map(product => {
              const cartItem = cart.find(item => item.productId === product.id);
              const isArchived = !product.is_available;
              const isSoldOut = (product.stock || 0) <= 0 || isArchived;
              const showQuickRequest = (isSoldOut || isArchived) && (activeFilter === 'best' || activeFilter === 'top' || activeFilter === 'requested');

              return (
                <Card key={product.id} className="border border-zinc-100/50 dark:border-zinc-800 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col group rounded-2xl bg-white dark:bg-zinc-900">
                  <div className="h-32 md:h-44 bg-zinc-100 overflow-hidden relative group">
                    {product.image ? (
                      <img 
                        src={product.image} 
                        alt={product.name} 
                        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-110`} 
                        onClick={() => !isSoldOut && setSelectedImage(product.image as string)}
                      />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-br from-pink-50 to-orange-50 dark:from-pink-950/30 dark:to-orange-950/30 flex items-center justify-center text-5xl md:text-7xl group-hover:scale-110 transition-transform duration-500`}>
                        🍰
                      </div>
                    )}
                    
                    {/* Big Sold Out Overlay */}
                    {isSoldOut && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10 pointer-events-none">
                        <div className="border-4 border-white/80 px-4 py-2 rotate-[-12deg] shadow-2xl">
                          <span className="text-white text-xl md:text-2xl font-black uppercase tracking-widest drop-shadow-lg">
                            Sold Out
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Quick Request Button (Bottom Right) */}
                    {showQuickRequest && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickRequestProduct(product.name);
                          setQuickRequestQty(1);
                          setIsQuickRequestOpen(true);
                        }}
                        className="absolute bottom-2 right-2 z-20 bg-amber-500 text-white shadow-[0_4px_0_rgb(180,83,9)] rounded-xl px-2.5 py-1.5 active:translate-y-1 active:shadow-none transition-all flex items-center gap-1.5 border border-amber-400 group/btn"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3px]" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Request</span>
                      </button>
                    )}
                  </div>
                  <CardContent className="p-3 md:p-5 flex-1 flex flex-col gap-3">
                    <div className="flex flex-col h-full justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm md:text-lg text-zinc-800 dark:text-zinc-100 truncate leading-tight">{product.name}</h3>
                        <p className="text-pink-600 dark:text-pink-400 font-black text-base md:text-xl mt-0.5">₱{product.price.toFixed(2)}</p>
                        <p className="text-[9px] md:text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                          {isArchived ? 'Restocking Soon' : `Stock: ${product.stock || 0}`}
                        </p>
                      </div>

                      <div className="w-full">
                        {isSoldOut ? (
                          <div className="w-full text-center py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 text-[10px] font-black rounded-full uppercase tracking-widest border border-zinc-200 dark:border-zinc-700">
                            {isArchived ? 'Sold Out' : 'Out of Stock'}
                          </div>
                        ) : cartItem ? (
                          <div className="flex items-center justify-between bg-white dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700 p-0.5 shadow-sm">
                            <button 
                              onClick={() => updateQuantity(product.id, -1)} 
                              className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-pink-600 transition-colors"
                            >
                              <Minus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                            <span className="font-bold text-sm md:text-base w-6 text-center text-zinc-800 dark:text-zinc-100">{cartItem.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(product.id, 1)} 
                              className="w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-pink-600 transition-colors"
                            >
                              <Plus className="w-3 h-3 md:w-3.5 md:h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <Button 
                            onClick={() => addToCart(product)} 
                            className="w-full bg-zinc-900 dark:bg-zinc-100 hover:bg-pink-600 dark:hover:bg-pink-500 text-white dark:text-zinc-900 rounded-full h-8 md:h-10 px-0 font-bold text-[10px] md:text-xs tracking-wider shadow-sm transition-all"
                          >
                            BUY
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* ── Product Reviews ───────────────────── */}
                    <ProductReviews
                      productId={product.id}
                      productName={product.name}
                      telegramUser={telegramUser}
                      onLoginRequired={() => {
                        if (!isNativeTelegram) {
                          window.location.href = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AHAINNOVATION_bot'}`;
                        } else {
                          setShowLoginModal(true);
                        }
                      }}
                    />
                  </CardContent>
                </Card>
              );
            })}
            {!productsLoading && products.length === 0 && (
              <div className="col-span-full py-20 px-6 text-center bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl transition-colors">
                <div className="text-6xl mb-4 opacity-50 grayscale">👨‍🍳</div>
                <h3 className="text-xl font-bold text-zinc-700 dark:text-zinc-300 mb-2">The oven is empty!</h3>
                <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">We don't have any products available right now. Please check back later when our fresh batches finish baking.</p>
              </div>
            )}

            {productsLoading && products.length === 0 && (
              <div className="col-span-full py-24 text-center">
                <Loader2 className="w-10 h-10 animate-spin text-pink-500 mx-auto mb-4" />
                <p className="text-zinc-400 font-medium">Opening the oven...</p>
              </div>
            )}
            
            {/* Invisible Mobile Spacer to push past fixed bottom cart */}
            {cart.length > 0 && <div className="col-span-full h-44 sm:h-56 w-full pointer-events-none" aria-hidden="true" />}
          </div>
        </div>

        {/* ── Request a Menu Item ────────────────────────────────── */}
        <RequestMenu
          products={products}
          archivedProducts={archivedProducts}
          telegramUser={telegramUser}
          onLoginRequired={() => {
            if (!isNativeTelegram) {
              window.location.href = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AHAINNOVATION_bot'}`;
            } else {
              setShowLoginModal(true);
            }
          }}
        />
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <Footer 
        telegramUser={telegramUser} 
        onLoginRequired={() => {
          if (!isNativeTelegram) {
            window.location.href = `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_NAME || 'AHAINNOVATION_bot'}`;
          } else {
            setShowLoginModal(true);
          }
        }}
      />

      {/* Floating Cart Panel */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border-t border-zinc-200/50 dark:border-zinc-800 shadow-[0_-20px_50px_rgba(0,0,0,0.1)] p-4 md:p-6 transform transition-all z-50 animate-in slide-in-from-bottom duration-300">
          <div className="container max-w-4xl mx-auto space-y-4">
            
            {/* Cart Items List */}
            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
              {cart.map(item => (
                <div key={item.productId} className="flex-shrink-0 flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 pl-3 pr-2 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-700 group transition-all hover:border-pink-300">
                   <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                   <span className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate max-w-[100px]">{item.productName}</span>
                   <span className="text-[10px] font-black text-pink-600 dark:text-pink-400 bg-pink-100/50 dark:bg-pink-900/30 px-1.5 py-0.5 rounded">x{item.quantity}</span>
                   <button 
                    onClick={() => removeFromCart(item.productId)}
                    className="w-5 h-5 rounded-full flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-rose-500 transition-all"
                   >
                     <X className="w-3 h-3" />
                   </button>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex sm:flex-col items-center sm:items-start w-full sm:w-auto justify-between sm:justify-center">
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase tracking-widest font-bold">Total Amount</p>
                <p className="text-2xl md:text-3xl font-black text-zinc-900 dark:text-white leading-none">₱ {cartTotal.toFixed(2)}</p>
              </div>
              <Button 
                onClick={handleCheckout} 
                className="w-full sm:w-auto bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white px-12 h-14 rounded-full shadow-[0_10px_25px_rgba(236,72,153,0.3)] hover:shadow-xl transition-all font-bold text-lg"
              >
                 <ShoppingBag className="w-5 h-5 mr-3" />
                 Checkout
              </Button>
            </div>

          </div>
        </div>
      )}
      
      {/* Lightbox / Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setSelectedImage(null)}
        >
          <img 
            src={selectedImage} 
            alt="Full view" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
          />
          <button 
            className="absolute top-6 right-6 md:top-10 md:right-10 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition-colors cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setSelectedImage(null); }}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Login Modal Overlay */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowLoginModal(false)}></div>
          
          <Card className="w-full max-w-md border-0 shadow-2xl overflow-hidden rounded-3xl relative z-10 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl animate-in fade-in zoom-in duration-200">
            <button 
              className="absolute top-4 right-4 z-20 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors"
              onClick={() => setShowLoginModal(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="h-40 bg-gradient-to-br from-[#2ba3e3] to-[#1c8ec9] flex flex-col items-center justify-center p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white rounded-full"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-white rounded-full"></div>
              </div>
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg transform -translate-y-2 relative z-10">
                <Send className="w-10 h-10 text-[#2ba3e3] translate-x-1 translate-y-[2px]" />
              </div>
            </div>
            <CardHeader className="text-center pt-8 pb-2">
              <CardTitle className="text-3xl font-display font-bold text-zinc-800 dark:text-zinc-100">AHA SWEETS</CardTitle>
              <CardDescription className="text-base text-zinc-500 dark:text-zinc-400 mt-2">Sign in to place your sweet orders</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-10 flex justify-center flex-col items-center gap-4">
              <TelegramWidget onAuth={handleTelegramAuth} />
              

              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-2 text-center uppercase tracking-wider font-bold">
                Log in to securely place your orders
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Admin Modal Overlay */}
      {showAdminModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAdminModal(false)}></div>
          
          <Card className="w-full max-w-sm border-0 shadow-2xl overflow-hidden rounded-3xl relative z-10 bg-white dark:bg-zinc-900 animate-in fade-in zoom-in duration-200">
            <button 
              className="absolute top-4 right-4 z-20 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
              onClick={() => setShowAdminModal(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="h-2 bg-gradient-to-r from-pink-500 to-orange-400"></div>
            <CardHeader className="text-center pt-8">
              <CardTitle className="text-2xl font-display font-bold text-zinc-800 dark:text-zinc-100">Manager Access</CardTitle>
              <CardDescription>Enter administrator credentials to proceed</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <Input 
                    type="text" 
                    placeholder="Username" 
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="bg-zinc-50 border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <div>
                  <Input 
                    type="password" 
                    placeholder="Password" 
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="bg-zinc-50 border-zinc-200 dark:bg-zinc-800/50 dark:border-zinc-700 rounded-xl"
                  />
                </div>
                <Button type="submit" className="w-full bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-xl font-bold h-12 shadow-lg hover:shadow-xl transition-all">
                  Sign In
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Request Dialog */}
      <Dialog open={isQuickRequestOpen} onOpenChange={setIsQuickRequestOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl border-none shadow-2xl p-0 overflow-hidden bg-white dark:bg-zinc-900">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-bounce">
              <Plus className="w-8 h-8 text-white stroke-[3px]" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-white">Quick Request</DialogTitle>
            <p className="text-white/80 mt-1 font-medium italic">We'll bake a fresh batch of {quickRequestProduct} for you!</p>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Select Quantity</label>
              <div className="flex items-center justify-between gap-4">
                <button 
                  onClick={() => setQuickRequestQty(q => Math.max(1, q - 1))}
                  className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.05)] active:translate-y-1 active:shadow-none transition-all"
                >
                  <Minus className="w-5 h-5" />
                </button>
                <div className="flex-1 text-center">
                  <span className="text-4xl font-black text-zinc-800 dark:text-white">{quickRequestQty}</span>
                </div>
                <button 
                  onClick={() => setQuickRequestQty(q => q + 1)}
                  className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shadow-[0_4px_0_rgba(0,0,0,0.05)] active:translate-y-1 active:shadow-none transition-all"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>

            <Button 
               onClick={handleQuickRequestSubmit}
               disabled={isSubmittingQuick}
               className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-white font-black uppercase tracking-widest shadow-[0_6px_0_rgb(180,83,9)] active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-3"
            >
              {isSubmittingQuick ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Confirm Request
                </>
              )}
            </Button>
            <button 
              onClick={() => setIsQuickRequestOpen(false)}
              className="w-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest text-center py-2"
            >
              Skip for now
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Global styles for generic effects */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .mask-edges { -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%); mask-image: linear-gradient(to right, black 85%, transparent 100%); }
      `}} />
    </div>
  );
}
