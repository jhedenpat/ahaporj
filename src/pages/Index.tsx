import { useState } from 'react';
import { useProducts, useOrders, useExpenses, useProductRequests } from '@/hooks/useStore';
import { ProductManager } from '@/components/ProductManager';
import { OrderEntry } from '@/components/OrderEntry';
import { OrderList } from '@/components/OrderList';
import { SimplifiedDatabase } from '@/components/SimplifiedDatabase';
import { CustomerErrorBoundary } from '@/components/CustomerErrorBoundary';
import { ExpenseTracker } from '@/components/ExpenseTracker';
import { ThemeToggle } from '@/components/ThemeToggle';
import { AdminRequests } from '@/components/AdminRequests';
import { AdminAccount } from '@/components/AdminAccount';
import { MonthlySummary } from '@/components/MonthlySummary';
import { ChefHat, ShoppingCart, DollarSign, Store, ClipboardList, Settings, Users, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'products' | 'orders' | 'customers' | 'expenses' | 'requests' | 'account' | 'summary';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'orders', label: 'Orders', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'products', label: 'Products', icon: <ChefHat className="w-4 h-4" /> },
  { id: 'summary', label: 'Summary', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'customers', label: 'Customers', icon: <Users className="w-4 h-4" /> },
  { id: 'expenses', label: 'Expenses', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'requests', label: 'Requests', icon: <ClipboardList className="w-4 h-4" /> },
  { id: 'account', label: 'Account', icon: <Settings className="w-4 h-4" /> },
];

const Index = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('orders');
  const { products, archivedProducts, addProduct, removeProduct, restoreProduct, updateProduct } = useProducts();
  const { orders, addOrder, toggleStatus, removeOrder } = useOrders();
  const { expenses, addExpense, removeExpense } = useExpenses();
  const { requests } = useProductRequests();

  return (
    <div className="min-h-screen bg-background">
      {/* Decorative scallop top */}
      <div className="h-5 scallop-border bg-accent" />

      {/* Header with pattern background */}
      <header className="relative overflow-hidden border-b border-border bg-card">
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: 'url(/images/bakery-pattern.jpg)', backgroundSize: '300px', backgroundRepeat: 'repeat' }} />
        <div className="relative container max-w-4xl mx-auto px-4 py-5 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full pink-gradient flex items-center justify-center text-2xl shadow-lg">
            🧁
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl italic pink-text">Patricia Bakeshop</h1>
            <p className="text-xs text-muted-foreground font-medium tracking-wider uppercase">Order & Management</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button 
              onClick={() => navigate('/')} 
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-950/30 rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors"
            >
              <Store className="w-4 h-4" />
              <span className="hidden sm:inline">Buyer Shop</span>
            </button>
            <ThemeToggle />
            <div className="hidden sm:flex gap-1">
              <span className="text-2xl animate-float" style={{ animationDelay: '0s' }}>🌸</span>
              <span className="text-xl animate-float" style={{ animationDelay: '0.5s' }}>🍰</span>
              <span className="text-2xl animate-float" style={{ animationDelay: '1s' }}>🧁</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-4xl mx-auto flex flex-wrap justify-center sm:justify-start">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold whitespace-nowrap transition-all border-b-3 ${
                tab === t.id
                  ? 'border-primary text-primary border-b-[3px]'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="container max-w-4xl mx-auto py-4 md:py-6 px-4 space-y-4">
        {tab === 'products' && (
          <ProductManager products={products} archivedProducts={archivedProducts} addProduct={addProduct} removeProduct={removeProduct} restoreProduct={restoreProduct} updateProduct={updateProduct} />
        )}
        {tab === 'summary' && (
          <MonthlySummary orders={orders} expenses={expenses} products={products} requests={requests} />
        )}
        {tab === 'orders' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <OrderEntry products={products} addOrder={addOrder} />
            <OrderList orders={orders} toggleStatus={toggleStatus} removeOrder={removeOrder} />
          </div>
        )}
        {tab === 'customers' && (
          <CustomerErrorBoundary>
            <SimplifiedDatabase orders={orders} toggleStatus={toggleStatus} />
          </CustomerErrorBoundary>
        )}
        {tab === 'expenses' && <ExpenseTracker expenses={expenses} addExpense={addExpense} removeExpense={removeExpense} />}
        {tab === 'requests' && <AdminRequests />}
        {tab === 'account' && <AdminAccount />}
      </main>

      {/* Footer scallop */}
      <div className="h-5 scallop-border bg-accent rotate-180" />
    </div>
  );
};

export default Index;
