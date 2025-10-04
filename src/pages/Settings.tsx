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
  Mail 
} from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at?: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

      const fetchProfile = async () => {
        try {
          console.log('Fetching profile for user:', user!.id);
          
          const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, created_at, updated_at')
            .eq('id', user!.id)
            .single();

          if (error) {
            console.log('Profile fetch error:', error.code, error.message);
            
            // If profile doesn't exist, create a local one
            if (error.code === 'PGRST116') {
              console.log('No profile exists, creating temporary profile state');
              setProfile({
                id: user!.id,
                full_name: null,
                created_at: new Date().toISOString(),
              });
              setFullName('');
              return;
            }
            
            console.error('Error fetching profile:', error);
            toast.error('Failed to fetch profile: ' + error.message);
            return;
          }

          console.log('Profile fetched successfully:', data);
          
          setProfile(data);
          setFullName(data.full_name || '');
        } catch (err) {
          console.error('Unexpected error:', err);
          toast.error('Failed to fetch profile');
          
          // Set default profile data on error
          setProfile({
            id: user!.id,
            full_name: null,
            created_at: new Date().toISOString(),
          });
          setFullName('');
        }
      };


  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      console.log('Updating profile for user:', user.id);
      
          // Try manual upsert with explicit error handling
          const { error: upsertError } = await supabase
            .from('profiles')
             .upsert({
               id: user.id,
               full_name: fullName.trim() || null,
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
             full_name: fullName.trim() || null,
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