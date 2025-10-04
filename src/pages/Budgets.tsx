import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, PiggyBank, X } from 'lucide-react';

interface Budget {
  id: string;
  amount: number;
  period: 'weekly' | 'monthly';
  start_date: string;
  category_id: string | null;
  created_at: string;
  categories?: { 
    id: string;
    name: string; 
    type: string;
  };
}

export default function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    period: 'monthly' as 'weekly' | 'monthly',
    category_id: 'none',
    start_date: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchBudgets();
    fetchCategories();
  }, [user]);

  const fetchBudgets = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('budgets')
        .select(`
          *,
          categories(*)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching budgets:', error);
        toast.error('Failed to fetch budgets');
        return;
      }

      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        categories: Array.isArray(item.categories) && item.categories.length > 0 
          ? item.categories[0] 
          : null
      }));
      setBudgets(transformedData as Budget[]);
      
      // Fetch spending for each budget
      for (const budget of transformedData) {
        await fetchSpending(budget.id, budget.category_id, budget.period, budget.start_date);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchSpending = async (
    budgetId: string,
    categoryId: string | null,
    period: string,
    startDate: string
  ) => {
    try {
      const periodStart = new Date(startDate);
      const periodEnd = new Date();

      // Calculate period end based on budget period
      if (period === 'weekly') {
        periodEnd.setDate(periodStart.getDate() + 7);
      } else {
        periodEnd.setMonth(periodStart.getMonth() + 1);
      }

      let query = supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user!.id)
        .eq('type', 'expense')
        .gte('transaction_date', periodStart.toISOString())
        .lte('transaction_date', periodEnd.toISOString());

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data } = await query;

      if (data) {
        const total = data.reduce((sum, t) => sum + t.amount, 0);
        setSpending((prev) => ({ ...prev, [budgetId]: total }));
      }
    } catch (err) {
      console.error('Error fetching spending:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user!.id)
        .eq('type', 'expense')
        .order('name');

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to fetch categories');
        return;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      setFormLoading(true);
      
      const payload = {
        user_id: user!.id,
        amount: amount,
        period: formData.period,
        category_id: formData.category_id === 'none' ? null : formData.category_id,
        start_date: formData.start_date,
      };

      if (editingId) {
        const { error } = await supabase
          .from('budgets')
          .update(payload)
          .eq('id', editingId);

        if (error) {
          console.error('Update error:', error);
          toast.error('Failed to update budget');
          return;
        }
        toast.success('Budget updated successfully');
      } else {
        const { error } = await supabase
          .from('budgets')
          .insert(payload);

        if (error) {
          console.error('Insert error:', error);
          toast.error('Failed to create budget');
          return;
        }
        toast.success('Budget created successfully');
      }

      await fetchBudgets();
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('An error occurred while saving budget');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;
    
    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete budget');
        return;
      }

      toast.success('Budget deleted successfully');
      await fetchBudgets();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('An error occurred while deleting budget');
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setFormData({
      amount: budget.amount.toString(),
      period: budget.period,
      category_id: budget.category_id || 'none',
      start_date: budget.start_date,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      period: 'monthly',
      category_id: 'none',
      start_date: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setShowForm(false);
  };

  const formatPeriodEnd = (startDate: string, period: string) => {
    const start = new Date(startDate);
    if (period === 'weekly') {
      start.setDate(start.getDate() + 7);
    } else {
      start.setMonth(start.getMonth() + 1);
    }
    return start.toLocaleDateString();
  };

  if (loading && budgets.length === 0) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">Set and track your spending limits</p>
        </div>
      </div>

      {/* Budget Creation Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{editingId ? 'Edit' : 'Add'} Budget</CardTitle>
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget-amount">Amount</Label>
                  <Input
                    id="budget-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="Enter budget amount"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget-period">Period</Label>
                  <Select
                    value={formData.period}
                    onValueChange={(value) =>
                      setFormData({ ...formData, period: value as 'weekly' | 'monthly' })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="budget-category">Category (Optional)</Label>
                  <Select
                    value={formData.category_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All expense categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="budget-start-date">Start Date</Label>
                  <Input
                    id="budget-start-date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <strong>Budget period:</strong> {formData.start_date} - {formatPeriodEnd(formData.start_date, formData.period)}
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={formLoading}>
                  {formLoading ? 'Saving...' : editingId ? 'Update' : 'Create'} Budget
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Budgets List */}
      <div className="space-y-4">
        {!showForm && (
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Budgets ({budgets.length})</h2>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </div>
        )}

        {budgets.length === 0 ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PiggyBank className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No budgets yet</p>
                <p className="text-sm">Create your first budget above</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {budgets.map((budget) => {
              const spent = spending[budget.id] || 0;
              const percentage = Math.min((spent / budget.amount) * 100, 100);
              const isOverBudget = spent > budget.amount;
              const remaining = budget.amount - spent;

              return (
                <Card key={budget.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PiggyBank className={`h-5 w-5 ${isOverBudget ? 'text-destructive' : 'text-primary'}`} />
                        <CardTitle className="text-lg">
                          {budget.categories?.name || 'Overall Budget'}
                        </CardTitle>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(budget)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(budget.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl font-bold">
                        ₹{spent.toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">
                        of ₹{budget.amount.toFixed(2)}
                      </span>
                    </div>
                    
                    <Progress
                      value={percentage}
                      className={isOverBudget ? '[&>div]:bg-destructive' : ''}
                    />
                    
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span className="capitalize">{budget.period}</span>
                      <span>
                        {isOverBudget
                          ? `₹${(spent - budget.amount).toFixed(2)} over budget`
                          : `₹${remaining.toFixed(2)} remaining`}
                      </span>
                    </div>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Period: {budget.start_date} - {formatPeriodEnd(budget.start_date, budget.period)}</div>
                      <div>Created: {new Date(budget.created_at).toLocaleDateString()}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}