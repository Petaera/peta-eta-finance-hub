import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings as SettingsIcon, 
  User, 
  Mail,
  FolderOpen
} from 'lucide-react';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  default_group_id: string | null;
  default_category_id: string | null;
  created_at: string;
  updated_at?: string;
}

interface CategoryGroup {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [defaultGroupId, setDefaultGroupId] = useState<string>('none');
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('none');
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCategoryGroups();
      fetchCategories();
    }
  }, [user]);

  // Update existing profiles with email if missing
  useEffect(() => {
    if (user && profile && !profile.email) {
      updateProfileWithEmail();
    }
  }, [user, profile]);

  // Keep form state in sync with profile changes
  useEffect(() => {
    if (profile) {
      console.log('Profile changed, updating form state:', {
        full_name: profile.full_name,
        default_group_id: profile.default_group_id,
        default_category_id: profile.default_category_id
      });
      setFullName(profile.full_name || '');
      setDefaultGroupId(profile.default_group_id || 'none');
      setDefaultCategoryId(profile.default_category_id || 'none');
    }
  }, [profile]);

  // Update existing profiles with email if missing
  const updateProfileWithEmail = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          email: user!.email,
          // Preserve existing default values
          default_group_id: profile?.default_group_id || null,
          default_category_id: profile?.default_category_id || null
        })
        .eq('id', user!.id);

      if (error) {
        console.error('Error updating profile with email:', error);
        return;
      }

      // Update local profile state with email but preserve other values
      setProfile(prev => prev ? { 
        ...prev, 
        email: user!.email 
      } : null);
    } catch (err) {
      console.error('Unexpected error updating profile with email:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      console.log('Fetching profile for user:', user!.id);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, default_group_id, default_category_id, created_at, updated_at')
        .eq('id', user!.id)
        .single();

      if (error) {
        console.log('Profile fetch error:', error.code, error.message);
        
        // If profile doesn't exist, create a local one
        if (error.code === 'PGRST116') {
          console.log('No profile exists, creating temporary profile state');
          setProfile({
            id: user!.id,
            email: user!.email,
            full_name: null,
            default_group_id: null,
            default_category_id: null,
            created_at: new Date().toISOString(),
          });
          setFullName('');
          setDefaultGroupId('none');
          setDefaultCategoryId('none');
          return;
        }
        
        console.error('Error fetching profile:', error);
        toast.error('Failed to fetch profile: ' + error.message);
        return;
      }

      console.log('Profile fetched successfully:', data);
      
      setProfile(data);
      setFullName(data.full_name || '');
      setDefaultGroupId(data.default_group_id || 'none');
      setDefaultCategoryId(data.default_category_id || 'none');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Failed to fetch profile');
      
      // Set default profile data on error
      setProfile({
        id: user!.id,
        full_name: null,
        default_group_id: null,
        default_category_id: null,
        created_at: new Date().toISOString(),
      });
      setFullName('');
      setDefaultGroupId('none');
      setDefaultCategoryId('none');
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
      toast.error('Failed to fetch category groups');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user!.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to fetch categories');
        return;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Failed to fetch categories');
    }
  };

  // Helper function to safely convert string values to null for UUID fields
  const safeUuidValue = (value: string): string | null => {
    if (value === 'none' || value === '' || !value || value.trim() === '') {
      return null;
    }
    return value;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      console.log('Updating profile for user:', user.id);
      console.log('defaultGroupId value:', defaultGroupId, 'type:', typeof defaultGroupId);
      console.log('defaultCategoryId value:', defaultCategoryId, 'type:', typeof defaultCategoryId);
      
          // Try manual upsert with explicit error handling
          const { error: upsertError } = await supabase
            .from('profiles')
             .upsert({
               id: user.id,
               email: user.email,
               full_name: fullName.trim() || null,
               default_group_id: safeUuidValue(defaultGroupId),
               default_category_id: safeUuidValue(defaultCategoryId),
               created_at: profile?.created_at || new Date().toISOString(),
               updated_at: new Date().toISOString(),
             }, {
               onConflict: 'id'
             });

      if (upsertError) {
        console.error('Upsert error:', upsertError);
        toast.error('Failed to update profile: ' + upsertError.message);
        return;
      }

          // Update local state
           const updatedProfile = {
             id: user.id,
             email: user.email,
             full_name: fullName.trim() || null,
             default_group_id: safeUuidValue(defaultGroupId),
             default_category_id: safeUuidValue(defaultCategoryId),
             created_at: profile?.created_at || new Date().toISOString(),
             updated_at: new Date().toISOString(),
           };
      
      setProfile(updatedProfile);
      toast.success('Profile updated successfully');
      
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <CardTitle>Profile Information</CardTitle>
            </div>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
           <CardContent>
             <form onSubmit={handleUpdateProfile} className="space-y-6">
               {/* Full Name */}
               <div className="space-y-2">
                 <Label htmlFor="fullName">Full Name</Label>
                 <Input
                   id="fullName"
                   value={fullName}
                   onChange={(e) => setFullName(e.target.value)}
                   placeholder="Enter your full name"
                 />
               </div>

               <Button type="submit" disabled={loading}>
                 {loading ? 'Updating...' : 'Update Profile'}
               </Button>
             </form>
           </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>Account Details</CardTitle>
            </div>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={user?.id || ''} disabled className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Profile Created</Label>
              <Input 
                value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Not created'} 
                disabled 
              />
            </div>
          </CardContent>
        </Card>

        {/* Default Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              <CardTitle>Default Settings</CardTitle>
            </div>
            <CardDescription>Configure your default preferences</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="defaultGroup">Default Category Group for New Expenses</Label>
                <Select
                  value={defaultGroupId}
                  onValueChange={setDefaultGroupId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Default Group</SelectItem>
                    {categoryGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  When creating new expense transactions, this group will be pre-selected 
                  to help you quickly categorize your expenses.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultCategory">Default Category for New Expenses</Label>
                <Select
                  value={defaultCategoryId}
                  onValueChange={setDefaultCategoryId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Default Category</SelectItem>
                    {categories.filter(cat => cat.type === 'expense').map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  When creating new expense transactions, this category will be pre-selected 
                  to help you quickly categorize your expenses (e.g., Food, Water, etc.).
                </p>
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Settings'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* App Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <CardTitle>App Information</CardTitle>
          </div>
          <CardDescription>About Peta-eta Financial Hub</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Peta-eta is a modern expense tracker that helps you manage your finances
            effectively. Track your income, expenses, set budgets, organize categories,
            and never miss a payment with reminders.
          </p>
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm font-semibold">Version 1.0.0</p>
            <div className="text-xs text-muted-foreground">
              © 2024 Peta-eta Financial Hub
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}