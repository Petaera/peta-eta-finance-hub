import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  transaction_date: string;
  category_id: string | null;
  paid_by: string | null;
  created_at: string;
  categories?: { 
    id: string;
    name: string;
    type: string;
    category_groups?: { name: string } | null;
  };
  participants?: { 
    id: string;
    name: string;
    email: string | null;
  };
}

interface Participant {
  id: string;
  name: string;
  email: string | null;
  group_id: string | null;
}

interface CategoryGroup {
  id: string;
  name: string;
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    note: '',
    transaction_date: new Date().toISOString().split('T')[0],
    category_id: 'none',
    paid_by: 'none',
  });

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
    fetchCategories();
    fetchParticipants();
    fetchCategoryGroups();
  }, [user]);

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(id, name, type, category_groups(id, name)),
          participants(id, name, email)
        `)
        .eq('user_id', user!.id)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to fetch transactions');
        return;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          id, 
          name, 
          type,
          category_groups(id, name)
        `)
        .eq('user_id', user!.id);

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

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id, name, email, group_id')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        toast.error('Failed to fetch participants');
        return;
      }

      setParticipants(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    }
  };

  const fetchCategoryGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('category_groups')
        .select('id, name')
        .eq('user_id', user!.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching category groups:', error);
        toast.error('Failed to fetch category groups');
        return;
      }

      setCategoryGroups(data || []);
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

    const payload = {
      user_id: user!.id,
      type: formData.type,
      amount: amount,
      note: formData.note || null,
      transaction_date: formData.transaction_date,
      category_id: formData.category_id === 'none' ? null : formData.category_id,
      paid_by: formData.paid_by === 'none' ? null : formData.paid_by,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', editingId);

        if (error) {
          console.error('Update error:', error);
          toast.error('Failed to update transaction');
          return;
        }
        toast.success('Transaction updated successfully');
      } else {
        const { error } = await supabase.from('transactions').insert(payload);

        if (error) {
          console.error('Insert error:', error);
          toast.error('Failed to create transaction');
          return;
        }
        toast.success('Transaction created successfully');
      }

      await fetchTransactions();
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('An error occurred while saving transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete transaction');
        return;
      }
      toast.success('Transaction deleted successfully');
      await fetchTransactions();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('An error occurred while deleting transaction');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      note: transaction.note || '',
      transaction_date: transaction.transaction_date,
      category_id: transaction.category_id || 'none',
      paid_by: transaction.paid_by || 'none',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      note: '',
      transaction_date: new Date().toISOString().split('T')[0],
      category_id: 'none',
      paid_by: 'none',
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">Manage your income and expenses</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as 'income' | 'expense' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols R-2 gap-4">
                <div className="space-y-2">
                  <Label>Category Group (Filter)</Label>
                  <Select
                    value="all"
                    onValueChange={() => {}} // We could implement filtering here
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Groups" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Groups</SelectItem>
                      {categoryGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.category_groups?.name ? `${cat.name} (${cat.category_groups.name})` : cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Paid By</Label>
                <Select
                  value={formData.paid_by || "none"}
                  onValueChange={(value) => setFormData({ ...formData, paid_by: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select participant" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Myself (Default)</SelectItem>
                    {participants.map((participant) => (
                      <SelectItem key={participant.id} value={participant.id}>
                        {participant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Optional note"
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

      <div className="grid gap-4">
        {transactions.length === 0 ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              No transactions yet. Add your first transaction above.
            </CardContent>
          </Card>
        ) : (
          transactions.map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {transaction.type === 'income' ? (
                    <ArrowUpCircle className="h-8 w-8 text-success" />
                  ) : (
                    <ArrowDownCircle className="h-8 w-8 text-destructive" />
                  )}
                  <div>
                    <p className="font-medium">
                      {transaction.categories?.name || 'Uncategorized'}
                      {transaction.categories?.category_groups?.name && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded ml-2">
                          {transaction.categories.category_groups.name}
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString()}
                    </p>
                    {transaction.participants?.name && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        Paid by: {transaction.participants.name}
                      </p>
                    )}
                    {transaction.note && (
                      <p className="text-sm text-muted-foreground">{transaction.note}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xl font-bold ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
