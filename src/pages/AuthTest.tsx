import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User, Mail, Key, CheckCircle, XCircle } from 'lucide-react';

export default function AuthTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    signup: boolean | null;
    signin: boolean | null;
    profile: boolean | null;
  }>({ signup: null, signin: null, profile: null });

  const testSignup = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        console.error('Signup error:', error);
        toast.error(`Signup failed: ${error.message}`);
        setTestResults(prev => ({ ...prev, signup: false }));
      } else {
        toast.success('Signup successful! Check your email for confirmation.');
        setTestResults(prev => ({ ...prev, signup: true }));
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
      setTestResults(prev => ({ ...prev, signup: false }));
    } finally {
      setLoading(false);
    }
  };

  const testSignin = async () => {
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) {
        console.error('Signin error:', error);
        toast.error(`Signin failed: ${error.message}`);
        setTestResults(prev => ({ ...prev, signin: false }));
      } else {
        toast.success('Signin successful!');
        setTestResults(prev => ({ ...prev, signin: true }));
        
        // Test profile fetch
        await testProfileFetch();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
      setTestResults(prev => ({ ...prev, signin: false }));
    } finally {
      setLoading(false);
    }
  };

  const testProfileFetch = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setTestResults(prev => ({ ...prev, profile: false }));
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        setTestResults(prev => ({ ...prev, profile: false }));
      } else {
        console.log('Profile data:', data);
        setTestResults(prev => ({ ...prev, profile: true }));
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setTestResults(prev => ({ ...prev, profile: false }));
    }
  };

  const clearResults = () => {
    setTestResults({ signup: null, signin: null, profile: null });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auth Test</h1>
        <p className="text-muted-foreground">Test authentication flow and database connections</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Authentication Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="test-email">Email Address</Label>
              <Input
                id="test-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="test-password">Password</Label>
              <Input
                id="test-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={testSignup} 
              disabled={loading}
              variant="outline"
            >
              <Mail className="h-4 w-4 mr-2" />
              Test Signup
            </Button>
            <Button 
              onClick={testSignin} 
              disabled={loading}
              variant="outline"
            >
              <Key className="h-4 w-4 mr-2" />
              Test Signin
            </Button>
            <Button 
              onClick={clearResults} 
              disabled={loading}
              variant="ghost"
            >
              Clear Results
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                {testResults.signup === null ? (
                  <div className="h-4 w-4 rounded-full bg-gray-300" />
                ) : testResults.signup ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Signup</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.signin === null ? (
                  <div className="h-4 w-4 rounded-full bg-gray-300" />
                ) : testResults.signin ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Signin</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.profile === null ? (
                  <div className="h-4 w-4 rounded-full bg-gray-300" />
                ) : testResults.profile ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Profile</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">If tests fail:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Run the database setup scripts in Supabase SQL Editor</li>
              <li>Check if profiles table exists</li>
              <li>Verify RLS policies are correct</li>
              <li>Check Supabase logs for detailed errors</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Required SQL Scripts:</h4>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
              <p>1. Run <code>quick_fix_profiles.sql</code></p>
              <p>2. Run <code>database_setup.sql</code></p>
              <p>3. Test with this page</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
