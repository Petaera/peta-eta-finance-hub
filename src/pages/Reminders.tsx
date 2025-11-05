import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Bell, CheckCircle2, Tag } from 'lucide-react';

interface Reminder {
  id: string;
  title: string;
  amount: number | null;
  due_date: string;
  category_id: string | null;
  is_paid: boolean;
  created_at: string;
  categories?: {
    id: string;
    name: string;
    type: string;
  };
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function Reminders() {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    category_id: 'none',
  });

  useEffect(() => {
    if (!user) return;
    fetchReminders();
    fetchCategories();
  }, [user]);

  const fetchReminders = async () => {
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select(`
          *,
          categories(id, name, type)
        `)
        .eq('user_id', user!.id)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Error fetching reminders:', error);
        toast.error('Failed to fetch reminders');
        return;
      }

      setReminders(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    const payload = {
      user_id: user!.id,
      title: formData.title.trim(),
      amount: formData.amount ? parseFloat(formData.amount) : null,
      due_date: formData.due_date,
      category_id: formData.category_id === 'none' ? null : formData.category_id,
      is_paid: false,
    };

    if (editingId) {
      const { error } = await supabase
        .from('reminders')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update reminder');
      } else {
        toast.success('Reminder updated');
      }
    } else {
      const { error } = await supabase.from('reminders').insert(payload);

      if (error) {
        toast.error('Failed to create reminder');
      } else {
        toast.success('Reminder created');
      }
    }

    fetchReminders();
    resetForm();
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('reminders')
      .update({ is_paid: !currentStatus })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update reminder');
    } else {
      toast.success(currentStatus ? 'Marked as incomplete' : 'Marked as complete');
      fetchReminders();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('reminders').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete reminder');
    } else {
      toast.success('Reminder deleted');
      fetchReminders();
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingId(reminder.id);
    setFormData({
      title: reminder.title,
      amount: reminder.amount?.toString() || '',
      due_date: reminder.due_date,
      category_id: reminder.category_id || 'none',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      amount: '',
      due_date: new Date().toISOString().split('T')[0],
      category_id: 'none',
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const upcomingReminders = reminders.filter((r) => !r.is_paid);
  const completedReminders = reminders.filter((r) => r.is_paid);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reminders</h1>
          <p className="text-muted-foreground">Never miss a payment</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Reminder
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Reminder</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Payment title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Amount (Optional)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label>Category (Optional)</Label>
                <Select
                  value={formData.category_id || "none"}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent className="text-base sm:text-sm">
                    <SelectItem className="py-3 sm:py-2" value="none">No Category</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem className="py-3 sm:py-2" key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
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

      <div className="space-y-6">
        <div className="space-y-3">
          <h2 className="text-xl font-semibold">Upcoming</h2>
          {upcomingReminders.length === 0 ? (
            <Card>
              <CardContent className="flex h-32 items-center justify-center text-muted-foreground">
                No upcoming reminders
              </CardContent>
            </Card>
          ) : (
            upcomingReminders.map((reminder) => (
              <Card key={reminder.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={reminder.is_paid}
                      onCheckedChange={() =>
                        toggleComplete(reminder.id, reminder.is_paid)
                      }
                    />
                    <Bell className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{reminder.title}</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Due: {new Date(reminder.due_date).toLocaleDateString()}</p>
                        {reminder.categories && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span>{reminder.categories.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {reminder.amount && (
                      <span className="font-semibold">₹{reminder.amount.toFixed(2)}</span>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(reminder)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(reminder.id)}
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

        {completedReminders.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold">Completed</h2>
            {completedReminders.map((reminder) => (
              <Card key={reminder.id} className="opacity-60">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={reminder.is_paid}
                      onCheckedChange={() =>
                        toggleComplete(reminder.id, reminder.is_paid)
                      }
                    />
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium line-through">{reminder.title}</p>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>Due: {new Date(reminder.due_date).toLocaleDateString()}</p>
                        {reminder.categories && (
                          <div className="flex items-center gap-1">
                            <Tag className="h-3 w-3" />
                            <span>{reminder.categories.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {reminder.amount && (
                      <span className="font-semibold">₹{reminder.amount.toFixed(2)}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(reminder.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
