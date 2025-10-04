import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, CheckCircle, XCircle } from 'lucide-react';

export default function SMTPTest() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<{
    passwordReset: boolean | null;
    signup: boolean | null;
  }>({ passwordReset: null, signup: null });

  const testPasswordReset = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        toast.error(`Password reset failed: ${error.message}`);
        setTestResults(prev => ({ ...prev, passwordReset: false }));
      } else {
        toast.success('Password reset email sent! Check your inbox.');
        setTestResults(prev => ({ ...prev, passwordReset: true }));
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
      setTestResults(prev => ({ ...prev, passwordReset: false }));
    } finally {
      setLoading(false);
    }
  };

  const testSignup = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email,
        password: 'TestPassword123!',
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        console.error('Signup error:', error);
        toast.error(`Signup failed: ${error.message}`);
        setTestResults(prev => ({ ...prev, signup: false }));
      } else {
        toast.success('Signup confirmation email sent! Check your inbox.');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SMTP Test</h1>
        <p className="text-muted-foreground">Test email functionality with your SMTP configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Configuration Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="test-email">Test Email Address</Label>
            <Input
              id="test-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address to test"
            />
            <p className="text-xs text-muted-foreground">
              Use a real email address you can access to test the configuration
            </p>
          </div>

          <div className="flex gap-4">
            <Button 
              onClick={testPasswordReset} 
              disabled={loading}
              variant="outline"
            >
              Test Password Reset
            </Button>
            <Button 
              onClick={testSignup} 
              disabled={loading}
              variant="outline"
            >
              Test Signup Email
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                {testResults.passwordReset === null ? (
                  <div className="h-4 w-4 rounded-full bg-gray-300" />
                ) : testResults.passwordReset ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Password Reset</span>
              </div>
              <div className="flex items-center gap-2">
                {testResults.signup === null ? (
                  <div className="h-4 w-4 rounded-full bg-gray-300" />
                ) : testResults.signup ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">Signup Email</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">If tests fail:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Check Supabase Authentication → Settings → SMTP Provider</li>
              <li>Verify AWS SES credentials are correct</li>
              <li>Ensure email is verified in AWS SES console</li>
              <li>Check AWS SES sending quotas and limits</li>
              <li>Wait 5-10 minutes after changing SMTP settings</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">SMTP Settings to verify:</h4>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm font-mono">
              Host: email-smtp.us-west-2.amazonaws.com<br/>
              Port: 587<br/>
              Username: AKIAR72PHKJWD4V5LI6W<br/>
              Password: BKFM6NPnALw5EOvY3rlosxOXBvKhfRYA68h3qPjMbWMP<br/>
              From Email: info@petaera.com
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
