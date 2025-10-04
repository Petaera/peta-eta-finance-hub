import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, User, Mail, Database, AlertCircle } from 'lucide-react';

export default function FriendRequestDebugger() {
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);

  const debugFriendRequest = async () => {
    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    const results: any = {
      email: email.trim(),
      steps: []
    };

    try {
      // Step 1: Check if user exists in profiles table
      results.steps.push('Step 1: Checking profiles table...');
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email.trim())
        .maybeSingle();

      results.profileCheck = {
        found: !!profileData,
        data: profileData,
        error: profileError
      };

      if (profileData) {
        results.steps.push(`✅ Found user in profiles: ${profileData.full_name || profileData.email}`);
      } else {
        results.steps.push(`❌ No user found in profiles table with email: ${email.trim()}`);
      }

      // Step 2: Check if user exists in auth.users (if we have access)
      results.steps.push('Step 2: Checking auth.users table...');
      try {
        const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
        const foundUser = authData?.users?.find(u => u.email === email.trim());
        
        results.authCheck = {
          found: !!foundUser,
          data: foundUser ? { id: foundUser.id, email: foundUser.email } : null,
          error: authError
        };

        if (foundUser) {
          results.steps.push(`✅ Found user in auth.users: ${foundUser.email}`);
        } else {
          results.steps.push(`❌ No user found in auth.users with email: ${email.trim()}`);
        }
      } catch (err) {
        results.steps.push(`⚠️ Cannot access auth.users (admin only): ${err}`);
        results.authCheck = { found: false, error: 'Admin access required' };
      }

      // Step 3: Check existing friendships
      if (profileData && user) {
        results.steps.push('Step 3: Checking existing friendships...');
        const { data: friendshipData, error: friendshipError } = await supabase
          .from('friends')
          .select('id, status, user_id, friend_id')
          .or(`and(user_id.eq.${user.id},friend_id.eq.${profileData.id}),and(user_id.eq.${profileData.id},friend_id.eq.${user.id})`)
          .maybeSingle();

        results.friendshipCheck = {
          found: !!friendshipData,
          data: friendshipData,
          error: friendshipError
        };

        if (friendshipData) {
          results.steps.push(`⚠️ Existing friendship found: ${friendshipData.status}`);
        } else {
          results.steps.push(`✅ No existing friendship found`);
        }
      }

      // Step 4: Check if trying to add yourself
      if (profileData && user && profileData.id === user.id) {
        results.steps.push(`❌ Cannot add yourself as a friend`);
        results.selfCheck = true;
      } else {
        results.selfCheck = false;
      }

      // Step 5: Summary and recommendations
      results.steps.push('Step 5: Analysis complete');
      
      if (!profileData) {
        results.recommendation = 'User needs to sign up for the app first';
      } else if (results.selfCheck) {
        results.recommendation = 'Cannot add yourself as a friend';
      } else if (results.friendshipCheck?.found) {
        results.recommendation = `Friendship already exists with status: ${results.friendshipCheck.data.status}`;
      } else {
        results.recommendation = 'Should be able to send friend request';
      }

    } catch (error) {
      results.steps.push(`❌ Error during debug: ${error}`);
      results.error = error;
    }

    setDebugResults(results);
    setLoading(false);
  };

  const clearResults = () => {
    setDebugResults(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Friend Request Debugger</h1>
        <p className="text-muted-foreground">Debug why friend requests are failing</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Debug Friend Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="debug-email">Email Address to Debug</Label>
            <Input
              id="debug-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address to debug"
            />
            <p className="text-xs text-muted-foreground">
              Enter the email address that's causing friend request issues
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={debugFriendRequest} disabled={loading}>
              {loading ? 'Debugging...' : 'Debug Friend Request'}
            </Button>
            <Button onClick={clearResults} variant="outline">
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {debugResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Debug Results for: {debugResults.email}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Steps */}
            <div>
              <h4 className="font-medium mb-2">Debug Steps:</h4>
              <div className="space-y-1">
                {debugResults.steps.map((step: string, index: number) => (
                  <div key={index} className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {step}
                  </div>
                ))}
              </div>
            </div>

            {/* Profile Check */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile Check:
              </h4>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                <p><strong>Found:</strong> {debugResults.profileCheck?.found ? 'Yes' : 'No'}</p>
                {debugResults.profileCheck?.data && (
                  <div>
                    <p><strong>ID:</strong> {debugResults.profileCheck.data.id}</p>
                    <p><strong>Email:</strong> {debugResults.profileCheck.data.email}</p>
                    <p><strong>Name:</strong> {debugResults.profileCheck.data.full_name || 'Not set'}</p>
                  </div>
                )}
                {debugResults.profileCheck?.error && (
                  <p className="text-red-600"><strong>Error:</strong> {debugResults.profileCheck.error.message}</p>
                )}
              </div>
            </div>

            {/* Auth Check */}
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Auth Check:
              </h4>
              <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                <p><strong>Found:</strong> {debugResults.authCheck?.found ? 'Yes' : 'No'}</p>
                {debugResults.authCheck?.data && (
                  <div>
                    <p><strong>ID:</strong> {debugResults.authCheck.data.id}</p>
                    <p><strong>Email:</strong> {debugResults.authCheck.data.email}</p>
                  </div>
                )}
                {debugResults.authCheck?.error && (
                  <p className="text-red-600"><strong>Error:</strong> {debugResults.authCheck.error}</p>
                )}
              </div>
            </div>

            {/* Friendship Check */}
            {debugResults.friendshipCheck && (
              <div>
                <h4 className="font-medium mb-2">Friendship Check:</h4>
                <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                  <p><strong>Found:</strong> {debugResults.friendshipCheck.found ? 'Yes' : 'No'}</p>
                  {debugResults.friendshipCheck.data && (
                    <div>
                      <p><strong>Status:</strong> {debugResults.friendshipCheck.data.status}</p>
                      <p><strong>User ID:</strong> {debugResults.friendshipCheck.data.user_id}</p>
                      <p><strong>Friend ID:</strong> {debugResults.friendshipCheck.data.friend_id}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Recommendation */}
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Recommendation:
              </h4>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded text-sm">
                <p className="font-medium">{debugResults.recommendation}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
