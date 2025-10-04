import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Settings as SettingsIcon, 
  User, 
  Mail, 
  Upload, 
  Trash2,
  Image as ImageIcon
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single();

      if (error) {
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          await createProfile();
          return;
        }
        console.error('Error fetching profile:', error);
        toast.error('Failed to fetch profile');
        return;
      }

      setProfile(data);
      setFullName(data.full_name || '');
      setAvatarUrl(data.avatar_url);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Failed to fetch profile');
    }
  };

  const createProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          id: user!.id,
          full_name: null,
          avatar_url: null,
        });

      if (error) {
        console.error('Error creating profile:', error);
        toast.error('Failed to create profile');
        return;
      }

      // Fetch the newly created profile
      await fetchProfile();
      toast.success('Profile created successfully');
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Failed to create profile');
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq('id', user!.id);

      if (error) {
        console.error('Update error:', error);
        toast.error('Failed to update profile');
        return;
      }

      setProfile(prev => prev ? { ...prev, full_name: fullName.trim() || null, avatar_url: avatarUrl } : null);
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('An error occurred while updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingAvatar(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload file to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('avatar')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Failed to upload avatar');
        return;
      }

      // Get public URL
      const { data } = supabase.storage
        .from('avatar')
        .getPublicUrl(filePath);

      const newAvatarUrl = data.publicUrl;

      // Delete old avatar if it exists
      if (avatarUrl) {
        try {
          await supabase.storage
            .from('avatar')
            .remove([avatarUrl.split('/').pop()!]);
        } catch (err) {
          // Ignore errors when deleting old avatars
          console.log('Could not delete old avatar:', err);
        }
      }

      setAvatarUrl(newAvatarUrl);

      // Auto-save avatar URL to profile
      if (profile) {
        await supabase
          .from('profiles')
          .update({ avatar_url: newAvatarUrl })
          .eq('id', user!.id);
        
        setProfile(prev => prev ? { ...prev, avatar_url: newAvatarUrl } : null);
        toast.success('Avatar updated successfully');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('An error occurred while uploading avatar');
    } finally {
      setUploadingAvatar(false);
      // Clear the file input
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    if (!avatarUrl) return;

    try {
      // Delete file from storage
      const fileName = avatarUrl.split('/').pop()!;
      const { error: deleteError } = await supabase.storage
        .from('avatar')
        .remove([fileName]);

      if (deleteError) {
        console.error('Delete error:', deleteError);
        toast.error('Failed to remove avatar');
        return;
      }

      // Update profile
      setAvatarUrl(null);
      if (profile) {
        await supabase
          .from('profiles')
          .update({ avatar_url: null })
          .eq('id', user!.id);
        
        setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
      }
      
      toast.success('Avatar removed successfully');
    } catch (err) {
      console.error('Remove error:', err);
      toast.error('An error occurred while removing avatar');
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
              {/* Avatar Section */}
              <div className="space-y-4">
                <Label>Avatar</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="Profile Avatar"
                        className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Label htmlFor="avatar-upload" className="cursor-pointer">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={uploadingAvatar}
                          className="cursor-pointer"
                          asChild
                        >
                          <div>
                            <Upload className="h-4 w-4 mr-2" />
                            {uploadingAvatar ? 'Uploading...' : 'Upload'}
                          </div>
                        </Button>
                      </Label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                      {avatarUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleRemoveAvatar}
                          disabled={uploadingAvatar}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or GIF. Max size 5MB.
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