import { Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check local storage or system preference
    const saved = localStorage.getItem('bakeshop_theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('bakeshop_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('bakeshop_theme', 'light');
      }
      return next;
    });
  };

  return (
    <button 
      onClick={toggleTheme} 
      className="w-10 h-10 rounded-full bg-accent/50 dark:bg-zinc-800 hover:bg-accent hover:dark:bg-zinc-700 flex items-center justify-center text-foreground transition-colors shadow-sm"
      aria-label="Toggle dark mode"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Moon className="w-5 h-5 text-indigo-300" /> : <Sun className="w-5 h-5 text-amber-500" />}
    </button>
  );
}
