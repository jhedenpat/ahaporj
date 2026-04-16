import { useState, useRef, useEffect } from 'react';
import { Product } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, Trash2, Edit2, Check, X, Image as ImageIcon, 
  RotateCcw, ChevronDown, Archive, LayoutGrid, Search, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ProductReviews } from '@/components/ProductReviews';

interface Props {
  products: Product[];
  archivedProducts: Product[];
  addProduct: (name: string, price: number, stock: number, image?: string) => void;
  removeProduct: (id: string) => void;
  restoreProduct: (id: string) => void;
  updateProduct: (id: string, name: string, price: number, stock: number, image?: string) => void;
}

export function ProductManager({ products, archivedProducts, addProduct, removeProduct, restoreProduct, updateProduct }: Props) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [image, setImage] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editStock, setEditStock] = useState('');
  const [editImage, setEditImage] = useState<string>('');
  const [showArchived, setShowArchived] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: (s: string) => void) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setter(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAdd = () => {
    if (!name.trim() || !price || !stock) {
      toast.error('Please fill in the product name, price, and stock!');
      return;
    }
    if (parseFloat(price) < 0 || parseInt(stock, 10) < 0) {
      toast.error('Price and stock cannot be negative numbers.');
      return;
    }
    addProduct(name.trim(), parseFloat(price), parseInt(stock, 10) || 0, image);
    toast.success('Product added to menu!');
    setName('');
    setPrice('');
    setStock('');
    setImage('');
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(p.price.toString());
    setEditStock((p.stock || 0).toString());
    setEditImage(p.image || '');
  };

  const saveEdit = () => {
    if (editingId && editName.trim() && editPrice && editStock) {
      updateProduct(editingId, editName.trim(), parseFloat(editPrice), parseInt(editStock, 10) || 0, editImage);
      setEditingId(null);
    }
  };

  const [isRestoring, setIsRestoring] = useState<Product | null>(null);
  const [restorationStock, setRestorationStock] = useState('0');

  const handleRestore = () => {
    if (isRestoring) {
      const stockNum = parseInt(restorationStock, 10) || 0;
      restoreProduct(isRestoring.id);
      // We also update the product with the new stock
      updateProduct(isRestoring.id, isRestoring.name, isRestoring.price, stockNum, isRestoring.image || '');
      setIsRestoring(null);
      setRestorationStock('0');
      setIsMenuOpen(false);
      toast.success(`${isRestoring.name} restored with ${stockNum} in stock! 🥐`);
    }
  };

  const selectFromMenu = (p: Product) => {
    setName(p.name);
    setPrice(p.price.toString()); // Use historical price as default
    setStock(''); 
    setImage(p.image || '');
    setIsMenuOpen(false);
    setSearchTerm(''); 
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredArchived = archivedProducts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bakery-card rounded-2xl p-4 md:p-6 animate-fade-in shadow-xl bg-white/80 backdrop-blur-md border border-white/20">
      <h2 className="font-display text-xl md:text-2xl pink-text mb-6 flex items-center gap-2">
        <span className="p-2 bg-pink-100 rounded-lg">🧁</span> Product Management
      </h2>

      {/* Add Product Form Row */}
      <div className="flex flex-col lg:flex-row gap-3 mb-8 bg-pink-50/50 p-4 rounded-2xl border border-pink-100/50">
        <div className="flex-1">
          <label className="text-[10px] font-bold uppercase text-pink-400 mb-1 ml-1 block">Product Name</label>
          <Input
            placeholder="e.g., Ube Cheese Pandesal"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full rounded-xl bg-white border-pink-100 focus:border-pink-300 h-11"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
        </div>

        <div className="flex flex-row gap-2">
          <div className="w-24">
            <label className="text-[10px] font-bold uppercase text-pink-400 mb-1 ml-1 block">Price</label>
            <Input
              type="number"
              placeholder="0.00"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="rounded-xl bg-white border-pink-100 h-11"
            />
          </div>
          <div className="w-24">
            <label className="text-[10px] font-bold uppercase text-pink-400 mb-1 ml-1 block">Stock</label>
            <Input
              type="number"
              placeholder="0"
              value={stock}
              onChange={e => setStock(e.target.value)}
              className="rounded-xl bg-white border-pink-100 h-11"
            />
          </div>
          <div className="flex flex-col justify-end">
            <label className="text-[10px] font-bold uppercase text-pink-400 mb-1 ml-1 block">Img</label>
            <label className="cursor-pointer bg-white border border-pink-100 rounded-xl flex items-center px-3 h-11 text-muted-foreground hover:bg-pink-50 transition-colors shrink-0" title="Attach Image">
              <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, setImage)} />
              {image ? <img src={image} alt="preview" className="w-6 h-6 object-cover rounded shadow-sm" /> : <ImageIcon className="w-5 h-5 text-pink-300" />}
            </label>
          </div>
        </div>
        
        <div className="flex flex-row lg:flex-col gap-2 min-w-[140px] justify-end">
          <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="h-11 lg:h-8 text-[10px] font-bold uppercase tracking-wider rounded-xl border-pink-200 text-pink-600 hover:bg-pink-100 transition-all flex items-center justify-center gap-2 flex-1 lg:flex-none shadow-sm"
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Browse Menu
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
              <DialogHeader className="p-6 pb-2 bg-pink-50/50">
                <DialogTitle className="font-display text-2xl italic pink-text flex items-center gap-2">
                   Browse Bakery Menu
                </DialogTitle>
                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-300" />
                  <Input 
                    placeholder="Search by product name..." 
                    className="pl-10 rounded-2xl bg-white border-pink-100 focus:border-pink-300 h-11"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-pink-200">
                {filteredProducts.length === 0 && filteredArchived.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-4xl mb-4">🥐</div>
                    <p className="text-muted-foreground">No products found for "{searchTerm}"</p>
                  </div>
                ) : (
                  <div className="space-y-8 pb-10">
                    {filteredProducts.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase text-pink-400 tracking-widest mb-4 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-pink-400" /> Currently Active
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {filteredProducts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => selectFromMenu(p)}
                              className="group flex flex-col bg-white border border-pink-50 rounded-2xl overflow-hidden hover:border-pink-300 hover:shadow-xl transition-all text-left relative"
                            >
                              <div className="aspect-square w-full overflow-hidden bg-pink-50 relative">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-4xl group-hover:scale-125 transition-transform duration-500">🧁</div>
                                )}
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                   <div className="bg-white/90 px-3 py-1.5 rounded-full text-[10px] font-bold text-pink-600 shadow-lg">SELECT TO EDIT</div>
                                </div>
                              </div>
                              <div className="p-3">
                                <span className="text-sm font-bold text-gray-800 block truncate leading-tight mb-1">{p.name}</span>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-pink-500">₱ {p.price.toFixed(2)}</span>
                                  <span className="text-[10px] text-muted-foreground bg-gray-50 px-1.5 py-0.5 rounded-md">Stock: {p.stock}</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {filteredArchived.length > 0 && (
                      <div className="mt-8 border-t border-dashed border-gray-200 pt-6">
                        <h3 className="text-xs font-bold uppercase text-gray-500 tracking-widest mb-4 flex items-center gap-2">
                          <Archive className="w-4 h-4" /> Archived Bakery Items
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                          {filteredArchived.map(p => (
                            <button
                              key={p.id}
                              onClick={() => {
                                setIsRestoring(p);
                                setRestorationStock('0');
                              }}
                              className="group flex flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden hover:border-pink-300 hover:shadow-xl transition-all text-left relative"
                            >
                              <div className="aspect-square w-full overflow-hidden bg-pink-50 relative">
                                {p.image ? (
                                  <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-4xl group-hover:scale-125 transition-transform duration-500">🧁</div>
                                )}
                                <div className="absolute top-2 right-2 bg-zinc-800/80 text-[8px] font-black text-white px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/20 uppercase tracking-widest">
                                  Archived
                                </div>
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                   <div className="bg-white/90 px-3 py-1.5 rounded-full text-[10px] font-bold text-pink-600 shadow-lg">RESTORE & SET STOCK</div>
                                </div>
                              </div>
                              <div className="p-3">
                                <span className="text-sm font-bold text-gray-800 block truncate leading-tight mb-1">{p.name}</span>
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-gray-400">₱ {p.price.toFixed(2)}</span>
                                  <span className="text-[9px] font-black text-pink-500/60 uppercase">History</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="p-4 bg-pink-50/30 text-center border-t border-pink-100/50 backdrop-blur-sm">
                <p className="text-[10px] text-pink-400 font-bold italic tracking-wide">✨ Click any product to fill the management form! ✨</p>
              </div>
            </DialogContent>
          </Dialog>

          {/* Restoration Stock Dialog */}
          <Dialog open={!!isRestoring} onOpenChange={(open) => !open && setIsRestoring(null)}>
            <DialogContent className="sm:max-w-[400px] rounded-3xl p-6 border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl pink-text flex items-center gap-2">
                   Restore {isRestoring?.name}
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-2">How many {isRestoring?.name} are available for sale today?</p>
              </DialogHeader>
              <div className="py-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-pink-400 tracking-wider">Initial Stock Quantity</label>
                  <Input 
                    type="number" 
                    value={restorationStock} 
                    onChange={(e) => setRestorationStock(e.target.value)}
                    className="h-12 rounded-2xl border-pink-100 focus:border-pink-300 text-lg font-bold"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleRestore()}
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setIsRestoring(null)} className="flex-1 h-12 rounded-2xl font-bold">Cancel</Button>
                <Button onClick={handleRestore} className="flex-1 h-12 rounded-2xl font-bold pink-gradient text-white shadow-lg hover:shadow-pink-200/50 transition-all">
                   Restore to Menu
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={handleAdd} className="pink-gradient h-11 rounded-xl text-primary-foreground font-bold shadow-lg hover:shadow-pink-200/50 transition-all flex items-center justify-center gap-2 flex-1">
            <Plus className="w-5 h-5" /> Add to Menu
          </Button>
        </div>
      </div>

      {/* Quick View Grid of Active Products */}
      <div className="mt-4 pt-6 border-t border-pink-100/50">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-sm font-bold text-gray-700">Currently in Shop ({products.length})</h3>
          <button 
            onClick={() => setShowArchived(!showArchived)}
            className="text-[10px] font-bold text-pink-400 hover:text-pink-600 flex items-center gap-1 uppercase tracking-wider"
          >
            <Archive className="w-3 h-3" /> {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(p => (
            <div key={p.id} className="flex items-center justify-between bg-white border border-pink-100/30 rounded-2xl p-3 shadow-sm hover:shadow-md transition-all group">
              {editingId === p.id ? (
                <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer shrink-0">
                      <input type="file" accept="image/*" className="hidden" onChange={e => handleImageUpload(e, setEditImage)} />
                      {editImage ? <img src={editImage} alt="preview" className="w-10 h-10 object-cover rounded-lg shadow-sm" /> : <ImageIcon className="w-6 h-6 text-pink-200" />}
                    </label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9 text-sm rounded-xl border-pink-100" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex gap-1 items-center">
                      <span className="text-[10px] text-pink-400 font-bold">lei</span>
                      <Input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} className="h-8 text-sm rounded-lg border-pink-100" />
                    </div>
                    <div className="flex-1 flex gap-1 items-center">
                      <span className="text-[10px] text-pink-400 font-bold">STK</span>
                      <Input type="number" value={editStock} onChange={e => setEditStock(e.target.value)} className="h-8 text-sm rounded-lg border-pink-100" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={saveEdit} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg hover:bg-gray-100 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-14 h-14 bg-pink-50 rounded-2xl overflow-hidden shadow-inner flex items-center justify-center shrink-0 border border-pink-100/50">
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                      ) : (
                        <div className="text-2xl opacity-80">🧁</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-base truncate leading-tight mb-1">{p.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-pink-600 bg-pink-50 px-2 py-0.5 rounded-lg shadow-sm border border-pink-100/30">₱ {p.price.toFixed(2)}</span>
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded-md">
                          <span className="w-1 h-1 rounded-full bg-green-400" />
                          Stock: {p.stock}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="p-2 transition-colors hover:text-blue-500 bg-blue-50/50 rounded-lg text-blue-400" title="View Reviews">
                          <MessageSquare className="w-4 h-4" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] rounded-3xl">
                        <DialogHeader>
                          <DialogTitle>Reviews for {p.name}</DialogTitle>
                        </DialogHeader>
                        <ProductReviews productId={p.id} productName={p.name} />
                      </DialogContent>
                    </Dialog>

                    <button onClick={() => startEdit(p)} className="p-2 transition-colors hover:text-amber-500 bg-amber-50/50 rounded-lg text-amber-400" title="Edit Product"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => removeProduct(p.id)} className="p-2 transition-colors hover:text-rose-500 bg-rose-50/50 rounded-lg text-rose-400" title="Archive Product"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {showArchived && archivedProducts.length > 0 && (
          <div className="mt-8 pt-6 border-t border-dashed border-gray-200 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Archive className="w-3 h-3" /> Archived Products (Preserved History)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {archivedProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between bg-zinc-50 border border-zinc-100/50 rounded-2xl p-3 opacity-80 hover:opacity-100 transition-all group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-zinc-100 grayscale rounded-xl overflow-hidden shadow-inner flex items-center justify-center shrink-0 border border-zinc-200">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" /> : <div className="text-xl">🧁</div>}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-zinc-500 text-sm truncate leading-tight mb-0.5">{p.name}</p>
                      <p className="text-[10px] text-zinc-400 font-medium tracking-tight">₱ {p.price.toFixed(2)} · Stock: {p.stock}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="p-2 transition-colors hover:text-blue-500 bg-blue-50/50 rounded-lg text-blue-400" title="View Reviews">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px] rounded-3xl">
                        <DialogHeader>
                          <DialogTitle>Historical Reviews: {p.name}</DialogTitle>
                        </DialogHeader>
                        <ProductReviews productId={p.id} productName={p.name} />
                      </DialogContent>
                    </Dialog>

                    <button 
                      onClick={() => restoreProduct(p.id)} 
                      className="p-2 transition-colors hover:text-green-500 bg-green-50/50 rounded-lg text-green-400" 
                      title="Restore Product"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
