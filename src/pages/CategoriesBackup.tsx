import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, FolderOpen, Layers, X } from 'lucide-react';

interface CategoryGroup {
  id: string;
  name: string;
  created_at: string;
}

interface Participant {
  id: string;
  group_id: string | null;
  name: string;
  email: string | null;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  group_id: string | null;
  category_groups?: CategoryGroup | null;
}

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [activeTab, setActiveTab] = useState<'categories' | 'groups'>('categories');
  
  // Category form states
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    group_id: 'none',
  });
  
  // Group form states
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupFormData, setGroupFormData] = useState({
    name: '',
  });
  
  const [participantFormData, setParticipantFormData] = useState({
    name: '',
    email: '',
    group_id: 'none',
  });
  
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [showParticipantForm, setShowParticipantForm] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCategories();
    fetchCategoryGroups();
    fetchParticipants();
  }, [user]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          category_groups(id, name, created_at)
        `)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to fetch categories');
        return;
      }

      // Transform the data to match our interface
      const transformedData = (data || []).map(item => ({
        ...item,
        category_groups: Array.isArray(item.category_groups) && item.category_groups.length > 0 
          ? item.category_groups[0] 
          : null
      }));
      setCategories(transformedData as Category[]);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('category_groups')
        .select('id, name, created_at')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

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

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id, group_id, name, email, created_at')
        .eq('group_id', categoryGroups?.[0]?.id); // For now, fetch participants for first group

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

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!categoryFormData.name.trim()) {
      toast.error('Category name is required');
      return;
    }
    
    try {
      setFormLoading(true);
      
      const payload = {
        user_id: user!.id,
        name: categoryFormData.name.trim(),
        type: categoryFormData.type,
        group_id: categoryFormData.group_id === 'none' ? null : categoryFormData.group_id,
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(payload)
          .eq('id', editingCategory);

        if (error) {
          console.error('Update error:', error);
          toast.error('Failed to update category');
          return;
        }
        toast.success('Category updated successfully');
      } else {
        const { error } = await supabase
          .from('categories')
          .insert(payload);

        if (error) {
          console.error('Insert error:', error);
          toast.error('Failed to create category');
          return;
        }
        toast.success('Category created successfully');
      }

      await fetchCategories();
      resetCategoryForm();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('An error occurred while saving category');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGroupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupFormData.name.trim()) {
      toast.error('Group name is required');
      return;
    }
    
    try {
      setFormLoading(true);
      
      const payload = {
        user_id: user!.id,
        name: groupFormData.name.trim(),
      };

      const { error } = await supabase
        .from('category_groups')
        .insert(payload);

      if (error) {
        console.error('Group insert error:', error);
        toast.error('Failed to create category group');
        return;
      }

      toast.success('Category group created successfully');
      await fetchCategoryGroups();
      resetGroupForm();
    } catch (err) {
      console.error('Group submit error:', err);
      toast.error('An error occurred while creating group');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    
    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete category');
        return;
      }

      toast.success('Category deleted successfully');
      await fetchCategories();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('An error occurred while deleting category');
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;
    
    try {
      const { error } = await supabase
        .from('category_groups')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Group delete error:', error);
        toast.error('Failed to delete category group');
        return;
      }

      toast.success('Category group deleted successfully');
      await fetchCategoryGroups();
      await fetchCategories(); // Refresh categories as they might be affected
    } catch (err) {
      console.error('Group delete error:', err);
      toast.error('An error occurred while deleting group');
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category.id);
    setCategoryFormData({
      name: category.name,
      type: category.type,
      group_id: category.group_id || 'none',
    });
    setShowCategoryForm(true);
  };

  const resetCategoryForm = () => {
      setCategoryFormData({
        name: '',
        type: 'expense',
        group_id: 'none',
      });
    setEditingCategory(null);
    setShowCategoryForm(false);
  };

  const resetGroupForm = () => {
    setGroupFormData({ name: '' });
    setShowGroupForm(false);
  };

  const groupedCategories = categories.reduce((acc, cat) => {
    const groupName = cat.category_groups?.name || 'Uncategorized';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(cat);
    return acc;
  }, {} as Record<string, Category[]>);

  if (loading) {
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
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Organize your transactions</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'categories' | 'groups')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          {/* Category Creation Form */}
          {showCategoryForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingCategory ? 'Edit' : 'Add'} Category</CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetCategoryForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="category-name">Name</Label>
                      <Input
                        id="category-name"
                        value={categoryFormData.name}
                        onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                        placeholder="Category name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category-type">Type</Label>
                      <Select
                        value={categoryFormData.type}
                        onValueChange={(value) =>
                          setCategoryFormData({ ...categoryFormData, type: value as 'income' | 'expense' })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="expense">Expense</SelectItem>
                          <SelectItem value="income">Income</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category-group">Group (Optional)</Label>
                    <Select
                      value={categoryFormData.group_id || "none"}
                      onValueChange={(value) => setCategoryFormData({ ...categoryFormData, group_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Group</SelectItem>
                        {categoryGroups.map((group) => (
                          <SelectItem key={group.id} value={group.id}>
                            {group.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={formLoading}>
                      {formLoading ? 'Saving...' : editingCategory ? 'Update' : 'Create'} Category
                    </Button>
                    <Button type="button" variant="outline" onClick={resetCategoryForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Categories List */}
          <div className="space-y-4">
            {!showCategoryForm && (
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Categories ({categories.length})</h2>
                <Button onClick={() => setShowCategoryForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </div>
            )}

            {Object.keys(groupedCategories).length === 0 ? (
              <Card>
                <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No categories yet</p>
                    <p className="text-sm">Create your first category above</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              Object.entries(groupedCategories).map(([groupName, cats]) => (
                <div key={groupName} className="space-y-3">
                  <h3 className="text-lg font-semibold">{groupName}</h3>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cats.map((category) => (
                      <Card key={category.id}>
                        <CardContent className="flex items-center justify-between p-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-medium bg-gray-500"
                            >
                              {category.type === 'income' ? '₹' : '-'}
                            </div>
                            <div>
                              <span className="font-medium">{category.name}</span>
                              <div className="text-xs text-muted-foreground capitalize">
                                {category.type}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditCategory(category)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteCategory(category.id)}
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
        </TabsContent>

        <TabsContent value="groups" className="space-y-4">
          {/* Group Creation Form */}
          {showGroupForm && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Add Category Group</CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetGroupForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGroupSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="group-name">Name</Label>
                    <Input
                      id="group-name"
                      value={groupFormData.name}
                      onChange={(e) => setGroupFormData({ name: e.target.value })}
                      placeholder="Group name (e.g., Personal, Business)"
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={formLoading}>
                      {formLoading ? 'Creating...' : 'Create Group'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetGroupForm}>
                      Cancel
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Groups List */}
          <div className="space-y-4">
            {!showGroupForm && (
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Groups ({categoryGroups.length})</h2>
                <Button onClick={() => setShowGroupForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Group
                </Button>
              </div>
            )}

            {categoryGroups.length === 0 ? (
              <Card>
                <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No groups yet</p>
                    <p className="text-sm">Create your first group above</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {categoryGroups.map((group) => (
                  <Card key={group.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                          <Layers className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-medium">{group.name}</span>
                          <div className="text-xs text-muted-foreground">
                            Created {new Date(group.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteGroup(group.id)}
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
        </TabsContent>
      </Tabs>
    </div>
  );
}