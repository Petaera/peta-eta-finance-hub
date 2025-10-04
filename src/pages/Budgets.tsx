import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, PiggyBank } from 'lucide-react';

interface Budget {
  id: string;
  amount: number;
  period: 'weekly' | 'monthly';
  start_date: string;
  category_id: string | null;
  categories?: { name: string; color: string };
}

export default function Budgets() {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [spending, setSpending] = useState<Record<string, number>>({});
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    period: 'monthly' as 'weekly' | 'monthly',
    category_id: '',
    start_date: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    if (!user) return;
    fetchBudgets();
    fetchCategories();
  }, [user]);

  const fetchBudgets = async () => {
    const { data } = await supabase
      .from('budgets')
      .select('*, categories(name, color)')
      .eq('user_id', user!.id);

    if (data) {
      setBudgets(data);
      // Fetch spending for each budget
      for (const budget of data) {
        await fetchSpending(budget.id, budget.category_id, budget.period, budget.start_date);
      }
    }
  };

  const fetchSpending = async (
    budgetId: string,
    categoryId: string | null,
    period: string,
    startDate: string
  ) => {
    const periodStart = new Date(startDate);
    const periodEnd = new Date();

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
      .gte('date', periodStart.toISOString())
      .lte('date', periodEnd.toISOString());

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data } = await query;

    if (data) {
      const total = data.reduce((sum, t) => sum + t.amount, 0);
      setSpending((prev) => ({ ...prev, [budgetId]: total }));
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user!.id);

    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      user_id: user!.id,
      amount: parseFloat(formData.amount),
      period: formData.period,
      category_id: formData.category_id || null,
      start_date: formData.start_date,
    };

    if (editingId) {
      const { error } = await supabase
        .from('budgets')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update budget');
      } else {
        toast.success('Budget updated');
      }
    } else {
      const { error } = await supabase.from('budgets').insert(payload);

      if (error) {
        toast.error('Failed to create budget');
      } else {
        toast.success('Budget created');
      }
    }

    fetchBudgets();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('budgets').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete budget');
    } else {
      toast.success('Budget deleted');
      fetchBudgets();
    }
  };

  const handleEdit = (budget: Budget) => {
    setEditingId(budget.id);
    setFormData({
      amount: budget.amount.toString(),
      period: budget.period,
      category_id: budget.category_id || '',
      start_date: budget.start_date,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      period: 'monthly',
      category_id: '',
      start_date: new Date().toISOString().split('T')[0],
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">Set and track your spending limits</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Budget</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value: 'weekly' | 'monthly') =>
                    setFormData({ ...formData, period: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {budgets.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              No budgets yet. Create your first budget above.
            </CardContent>
          </Card>
        ) : (
          budgets.map((budget) => {
            const spent = spending[budget.id] || 0;
            const percentage = Math.min((spent / budget.amount) * 100, 100);
            const isOverBudget = spent > budget.amount;

            return (
              <Card key={budget.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PiggyBank className="h-5 w-5 text-primary" />
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
                      ${spent.toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      of ${budget.amount.toFixed(2)}
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
                        ? `$${(spent - budget.amount).toFixed(2)} over budget`
                        : `$${(budget.amount - spent).toFixed(2)} remaining`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
