import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Component, ErrorInfo, ReactNode } from "react";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import BuyerDashboard from "./pages/BuyerDashboard.tsx";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean, error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-pink-50 dark:bg-zinc-950 p-6 text-center">
          <div className="bakery-card p-10 max-w-md animate-in fade-in zoom-in duration-300">
            <h1 className="text-4xl mb-4">🍰 Oops!</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-6">Something sweet went slightly wrong. Please refresh to start fresh!</p>
            <code className="text-[10px] text-red-500 bg-red-50 dark:bg-red-900/30 p-2 rounded block mb-6 text-left overflow-auto">
              {this.state.error}
            </code>
            <button 
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              className="w-full bg-pink-500 text-white py-3 rounded-2xl font-bold hover:bg-pink-400 shadow-lg"
            >
               Clear Settings & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<BuyerDashboard />} />
            <Route path="/manager" element={<Index />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
