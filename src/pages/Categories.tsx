import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderOpen } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  group: string;
  color: string;
  icon: string | null;
}

const COLORS = ['#0EA5E9', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'];
const GROUPS = ['Personal', 'Business', 'Travel', 'Food', 'Entertainment', 'Other'];

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    group: 'Personal',
    color: COLORS[0],
  });

  useEffect(() => {
    if (!user) return;
    fetchCategories();
  }, [user]);

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user!.id)
      .order('group');

    if (data) setCategories(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      user_id: user!.id,
      name: formData.name,
      group: formData.group,
      color: formData.color,
    };

    if (editingId) {
      const { error } = await supabase
        .from('categories')
        .update(payload)
        .eq('id', editingId);

      if (error) {
        toast.error('Failed to update category');
      } else {
        toast.success('Category updated');
      }
    } else {
      const { error } = await supabase.from('categories').insert(payload);

      if (error) {
        toast.error('Failed to create category');
      } else {
        toast.success('Category created');
      }
    }

    fetchCategories();
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);

    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success('Category deleted');
      fetchCategories();
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      group: category.group,
      color: category.color,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      group: 'Personal',
      color: COLORS[0],
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const groupedCategories = categories.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Organize your transactions</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Category</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Category name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Group</Label>
                <Select
                  value={formData.group}
                  onValueChange={(value) => setFormData({ ...formData, group: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUPS.map((group) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <div className="grid grid-cols-6 gap-2">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`h-10 w-10 rounded-lg border-2 ${
                        formData.color === color ? 'border-foreground' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
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
        {Object.keys(groupedCategories).length === 0 ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              No categories yet. Create your first category above.
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedCategories).map(([group, cats]) => (
            <div key={group} className="space-y-3">
              <h2 className="text-xl font-semibold">{group}</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {cats.map((category) => (
                  <Card key={category.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: category.color }}
                        >
                          <FolderOpen className="h-5 w-5 text-white" />
                        </div>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
