import { useState } from 'react';
import { 
  ClipboardList, Send, Loader2, X, ChevronDown, ChevronUp, 
  Clock, CheckCircle2, XCircle, Search, LayoutGrid, RotateCcw, Plus, Minus 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useProductRequests } from '@/hooks/useStore';
import { Product } from '@/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RequestMenuProps {
  products: Product[];
  archivedProducts: Product[];
  telegramUser: { id: string; first_name: string; username?: string } | null;
  onLoginRequired: () => void;
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
  noted: { label: 'Noted ✓', icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
  completed: { label: 'Finished 🏆', icon: CheckCircle2, color: 'text-zinc-500', bg: 'bg-zinc-50 dark:bg-zinc-900' },
};

export function RequestMenu({ products, archivedProducts, telegramUser, onLoginRequired }: RequestMenuProps) {
  const { requests, loading, submitRequest } = useProductRequests(telegramUser?.id);
  const [showForm, setShowForm] = useState(false);
  const [showMyRequests, setShowMyRequests] = useState(false);
  const [productName, setProductName] = useState('');
  const [productImage, setProductImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const myRequests = (telegramUser && Array.isArray(requests))
    ? requests.filter(r => r.telegram_id === telegramUser.id && r.status !== 'archived')
    : [];

  const allPreservedProducts = [...(products || []), ...(archivedProducts || [])];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!telegramUser) { onLoginRequired(); return; }
    if (!productName || !productName.trim()) return;
    if (quantity < 1) return;
    setSubmitting(true);
    const ok = await submitRequest(
      telegramUser.id,
      telegramUser.first_name,
      productName.trim(),
      description.trim(),
      quantity,
      telegramUser.username,
    );
    if (ok) {
      setProductName('');
      setProductImage(null);
      setDescription('');
      setQuantity(1);
      setShowForm(false);
      setShowMyRequests(true);
    }
    setSubmitting(false);
  };

  const filteredProducts = allPreservedProducts.filter(p => 
    (p?.name || '').toLowerCase().includes((searchTerm || '').toLowerCase())
  );

  return (
    <Card className="border border-amber-100 dark:border-amber-900/40 shadow-sm rounded-3xl overflow-hidden bg-gradient-to-br from-amber-50/80 via-orange-50/60 to-pink-50/40 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-pink-950/10 transition-colors">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-amber-400 via-orange-400 to-pink-400" />

      <CardHeader className="pb-3 pt-5 px-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md text-white">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-zinc-800 dark:text-zinc-100">
                Request a Baked Good
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Don't see what you want? Ask us to bake it! 🍞
              </CardDescription>
            </div>
          </div>

          {telegramUser && myRequests.length > 0 && (
            <button
              onClick={() => setShowMyRequests(prev => !prev)}
              className="flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
            >
              My Requests ({myRequests.length})
              {showMyRequests ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 space-y-3">
        {/* My Requests List */}
        {showMyRequests && myRequests.length > 0 && (
          <div className="rounded-2xl border border-amber-200/50 dark:border-amber-800/30 bg-white/60 dark:bg-zinc-900/40 divide-y divide-amber-100/50 dark:divide-amber-900/30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {myRequests.map(req => {
              const status = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending;
              const StatusIcon = status.icon;
              return (
                <div key={req.id} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-zinc-800 dark:text-zinc-100 truncate">
                      {req.product_name}
                      <span className="font-normal text-zinc-400 ml-1.5">×{req.quantity}</span>
                    </p>
                    {req.description && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                        {req.description}
                      </p>
                    )}
                    <p className="text-[10px] text-zinc-400 mt-1">
                      {new Date(req.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full whitespace-nowrap ${status.color} ${status.bg}`}>
                    <StatusIcon className="w-3 h-3" />
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Request Form */}
        {showForm ? (
          <form
            onSubmit={handleSubmit}
            className="space-y-3 bg-white/70 dark:bg-zinc-900/50 rounded-2xl p-4 border border-amber-200/50 dark:border-amber-800/30 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">New Baked Good Request</p>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                Product Name *
              </label>
              
              <Dialog open={isBrowseOpen} onOpenChange={setIsBrowseOpen}>
                <DialogTrigger asChild>
                  <button 
                    type="button"
                    className={`group w-full h-16 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between px-4 relative overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                      productName 
                      ? 'bg-amber-600 border-amber-600 shadow-amber-200' 
                      : 'bg-white border-zinc-200 hover:border-amber-400'
                    }`}
                  >
                    <span className="flex items-center gap-3 relative z-10 w-full overflow-hidden">
                      <span className={`w-12 h-12 rounded-xl border-2 overflow-hidden flex items-center justify-center shrink-0 ${
                        productName ? 'bg-white/20 border-white/20 shadow-inner' : 'bg-amber-50 border-amber-100'
                      }`}>
                        {productImage ? (
                          <img src={productImage} alt="Selection" className="w-full h-full object-cover" />
                        ) : productName ? (
                          <CheckCircle2 className="w-6 h-6 text-white" />
                        ) : (
                          <LayoutGrid className="w-6 h-6 text-amber-500" />
                        )}
                      </span>
                      <span className="flex flex-col items-start min-w-0">
                        <span className={`text-[9px] font-black uppercase tracking-widest ${
                          productName ? 'text-white/70' : 'text-amber-500'
                        }`}>
                          {productName ? "You're Requesting" : 'Choose from menu'}
                        </span>
                        <span className={`text-base font-bold truncate w-full ${
                          productName ? 'text-white' : 'text-zinc-400 italic'
                        }`}>
                          {productName || 'Click to select item...'}
                        </span>
                      </span>
                    </span>
                    
                    <span className="relative z-10 flex items-center ml-2 p-1.5 rounded-full bg-white/20 text-white">
                        {productName ? <RotateCcw className="w-4 h-4" /> : <ChevronDown className="w-4 h-4 text-amber-500" />}
                    </span>
                  </button>
                </DialogTrigger>
                <DialogContent 
                  onOpenAutoFocus={(e) => e.preventDefault()}
                  className="sm:max-w-[500px] max-h-[85vh] flex flex-col p-0 border-none rounded-3xl overflow-hidden shadow-2xl"
                >
                  <DialogHeader className="p-6 pb-2 bg-gradient-to-br from-amber-50 to-orange-50">
                    <DialogTitle className="text-xl font-bold text-amber-800 flex items-center gap-2">
                       Select Product
                    </DialogTitle>
                    <div className="relative mt-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                      <Input 
                        placeholder="Search our menu items..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 rounded-2xl bg-white border-amber-100 h-11 focus:border-amber-400"
                      />
                    </div>
                  </DialogHeader>

                  <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-amber-200">
                    {filteredProducts.length === 0 ? (
                      <div className="text-center py-10">
                        <p className="text-zinc-400 text-sm">No items matching your search found in our menu.</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4 pb-12">
                          {filteredProducts.map(p => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setProductName(p.name);
                                setProductImage(p.image || null);
                                setIsBrowseOpen(false);
                                setSearchTerm('');
                                if (!description) {
                                  setDescription('Requesting a fresh batch of this!');
                                }
                              }}
                              className="group flex flex-col items-center bg-white border border-amber-50 p-4 rounded-3xl hover:border-amber-400 hover:shadow-xl hover:-translate-y-1 transition-all text-center shadow-sm"
                            >
                              <div className="w-24 h-24 rounded-2xl overflow-hidden mb-3 bg-amber-50 border border-amber-100 shadow-sm relative">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-4xl group-hover:scale-125 transition-transform duration-500">🧁</div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                   <div className="bg-white/90 px-3 py-1.5 rounded-full text-[10px] font-bold text-amber-600 shadow-lg">SELECT</div>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-zinc-800 leading-tight line-clamp-2">{p.name}</span>
                              <span className="text-[10px] font-black text-amber-500 mt-1 block">{p.price.toFixed(2)} lei</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="p-4 bg-amber-50/50 text-center border-t border-amber-100/50 backdrop-blur-sm">
                    <p className="text-[10px] text-amber-600 font-bold italic tracking-wide lowercase">Our complete history of baked goods is available for request!</p>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Notes / Size / Flavor
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any specific details? (optional)"
                  rows={2}
                  maxLength={300}
                  className="text-sm resize-none rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 shadow-sm"
                />
              </div>
              <div className="w-24">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1 block">
                  Qty
                </label>
                <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
                  <button
                    type="button"
                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                    className="w-8 h-10 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Minus className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                  </button>
                  <div className="flex-1 text-center font-bold text-sm text-zinc-800 dark:text-zinc-200">
                    {quantity}
                  </div>
                  <button
                    type="button"
                    onClick={() => setQuantity(q => q + 1)}
                    className="w-8 h-10 flex items-center justify-center hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    <Plus className="w-3 h-3 text-zinc-600 dark:text-zinc-400" />
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={!(productName || '').trim() || submitting}
              className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Submit Request
            </Button>
          </form>
        ) : (
          <Button
            onClick={() => {
              if (!telegramUser) { onLoginRequired(); return; }
              setShowForm(true);
            }}
            className="w-full h-11 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold shadow-md hover:shadow-lg transition-all text-sm"
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Request a Menu Item
          </Button>
        )}

        {!telegramUser && (
          <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
            🔒 Log in via Telegram to submit a request
          </p>
        )}
      </CardContent>
    </Card>
  );
}
