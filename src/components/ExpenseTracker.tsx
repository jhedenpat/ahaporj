import { useState } from 'react';
import { Expense } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  removeExpense: (id: string) => void;
}

const CATEGORIES = ['Ingredients', 'Packaging', 'Utilities', 'Equipment', 'Transport', 'Other'];

export function ExpenseTracker({ expenses, addExpense, removeExpense }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Ingredients');

  const handleAdd = () => {
    if (!description.trim() || !amount) return;
    addExpense({ description: description.trim(), amount: parseFloat(amount), date: new Date().toISOString(), category });
    setDescription('');
    setAmount('');
  };

  const sorted = [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="bakery-card rounded-2xl p-4 md:p-6 animate-fade-in">
      <h2 className="font-display text-xl md:text-2xl pink-text mb-4 flex items-center gap-2">
        <span>💸</span> Expenses
      </h2>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} className="flex-1 rounded-xl bg-blush border-border" />
        <Input type="number" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} className="w-full sm:w-28 rounded-xl bg-blush border-border" />
        <select value={category} onChange={e => setCategory(e.target.value)} className="bg-blush border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={handleAdd} className="pink-gradient rounded-xl text-primary-foreground font-bold shadow-md">
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">No expenses recorded 🌸</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {sorted.map(e => (
            <div key={e.id} className="flex items-center justify-between bg-accent/30 border border-border rounded-xl px-3 py-2.5 group hover:bg-accent/50 transition-colors">
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-sm font-semibold block truncate">{e.description}</span>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  <span className="bg-accent rounded-full px-2 py-0.5">{e.category}</span>
                  <span>{new Date(e.date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-warning font-bold text-sm">-₱ {e.amount.toFixed(2)}</span>
                <button onClick={() => removeExpense(e.id)} className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
