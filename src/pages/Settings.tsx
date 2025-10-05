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
  FolderOpen,
  Camera,
  X
} from 'lucide-react';

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  default_group_id: string | null;
  default_category_id: string | null;
  avatar_url: string | null;
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
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
        default_category_id: profile.default_category_id,
        avatar_url: profile.avatar_url
      });
      setFullName(profile.full_name || '');
      setDefaultGroupId(profile.default_group_id || 'none');
      setDefaultCategoryId(profile.default_category_id || 'none');
      setAvatarPreview(profile.avatar_url);
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
        .select('id, email, full_name, default_group_id, default_category_id, avatar_url, created_at, updated_at')
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
            avatar_url: null,
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
        email: user!.email,
        full_name: null,
        default_group_id: null,
        default_category_id: null,
        avatar_url: null,
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

  // Handle avatar file selection
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setAvatarPreview(previewUrl);
    }
  };

  // Upload avatar to Supabase storage
  const uploadAvatar = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      console.log('Uploading avatar:', {
        fileName,
        filePath,
        fileSize: file.size,
        fileType: file.type,
        userId: user!.id
      });

      const { data, error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', {
          error: uploadError,
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          errorCode: uploadError.error
        });
        
        // Provide more specific error messages
        if (uploadError.message.includes('row-level security policy')) {
          toast.error('Storage access denied. Please check RLS policies for the avatar bucket.');
        } else if (uploadError.message.includes('not found')) {
          toast.error('Avatar storage bucket not found. Please create the "avatar" bucket in Supabase Storage.');
        } else {
          toast.error('Failed to upload avatar: ' + uploadError.message);
        }
        return null;
      }

      console.log('Upload successful:', data);

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatar')
        .getPublicUrl(filePath);

      console.log('Public URL generated:', urlData.publicUrl);
      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload avatar: ' + (err as Error).message);
      return null;
    }
  };

  // Remove avatar
  const removeAvatar = async () => {
    if (!profile?.avatar_url) return;

    setUploadingAvatar(true);
    try {
      // Extract file path from URL
      const url = new URL(profile.avatar_url);
      const pathParts = url.pathname.split('/');
      const filePath = pathParts.slice(-2).join('/'); // Get 'avatars/filename'

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('avatar')
        .remove([filePath]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        toast.error('Failed to remove avatar from storage');
        return;
      }

      // Update profile to remove avatar_url
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', user!.id);

      if (updateError) {
        console.error('Update error:', updateError);
        toast.error('Failed to update profile');
        return;
      }

      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
      setAvatarPreview(null);
      setAvatarFile(null);
      toast.success('Avatar removed successfully');
    } catch (err) {
      console.error('Remove avatar error:', err);
      toast.error('Failed to remove avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      console.log('Updating profile for user:', user.id);
      console.log('defaultGroupId value:', defaultGroupId, 'type:', typeof defaultGroupId);
      console.log('defaultCategoryId value:', defaultCategoryId, 'type:', typeof defaultCategoryId);
      
      let avatarUrl = profile?.avatar_url || null;
      
      // Upload avatar if a new file is selected
      if (avatarFile) {
        setUploadingAvatar(true);
        const uploadedUrl = await uploadAvatar(avatarFile);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          setAvatarFile(null); // Clear the file after successful upload
        } else {
          setLoading(false);
          setUploadingAvatar(false);
          return; // Stop if avatar upload failed
        }
        setUploadingAvatar(false);
      }
      
          // Try manual upsert with explicit error handling
          const { error: upsertError } = await supabase
            .from('profiles')
             .upsert({
               id: user.id,
               email: user.email,
               full_name: fullName.trim() || null,
               default_group_id: safeUuidValue(defaultGroupId),
               default_category_id: safeUuidValue(defaultCategoryId),
               avatar_url: avatarUrl,
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
             avatar_url: avatarUrl,
             created_at: profile?.created_at || new Date().toISOString(),
             updated_at: new Date().toISOString(),
           };
      
      setProfile(updatedProfile);
      setAvatarPreview(avatarUrl);
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
               {/* Avatar Upload */}
               <div className="space-y-4">
                 <Label>Profile Photo</Label>
                 <div className="flex items-center gap-4">
                   {/* Avatar Display */}
                   <div className="relative">
                     {avatarPreview ? (
                       <div className="relative group">
                         <img
                           src={avatarPreview}
                           alt="Profile"
                           className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                         />
                         {profile?.avatar_url && (
                           <button
                             type="button"
                             onClick={removeAvatar}
                             disabled={uploadingAvatar}
                             className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                           >
                             <X className="h-3 w-3" />
                           </button>
                         )}
                       </div>
                     ) : (
                       <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                         <User className="h-8 w-8 text-gray-400" />
                       </div>
                     )}
                   </div>
                   
                   {/* Upload Controls */}
                   <div className="space-y-2">
                     <input
                       type="file"
                       id="avatar"
                       accept="image/*"
                       onChange={handleAvatarChange}
                       className="hidden"
                     />
                     <div className="flex gap-2">
                       <Button
                         type="button"
                         variant="outline"
                         onClick={() => document.getElementById('avatar')?.click()}
                         disabled={uploadingAvatar}
                       >
                         <Camera className="h-4 w-4 mr-2" />
                         {avatarPreview ? 'Change Photo' : 'Upload Photo'}
                       </Button>
                       {profile?.avatar_url && (
                         <Button
                           type="button"
                           variant="outline"
                           onClick={removeAvatar}
                           disabled={uploadingAvatar}
                           className="text-red-600 hover:text-red-700"
                         >
                           <X className="h-4 w-4 mr-2" />
                           Remove
                         </Button>
                       )}
                     </div>
                     <p className="text-xs text-muted-foreground">
                       JPG, PNG or GIF. Max size 5MB.
                     </p>
                   </div>
                 </div>
               </div>

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

               <Button type="submit" disabled={loading || uploadingAvatar}>
                 {loading || uploadingAvatar ? 'Updating...' : 'Update Profile'}
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