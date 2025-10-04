import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { friendsService, groupsService } from '@/services/supabase';

export default function DatabaseTest() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    if (!user) {
      toast.error('Please log in to run tests');
      return;
    }

    setLoading(true);
    const results: Record<string, any> = {};

    try {
      // Test 1: Fetch friends
      console.log('Testing friends service...');
      const friends = await friendsService.getFriends(user.id);
      results.friends = { success: true, count: friends.length, data: friends };
      console.log('Friends test passed:', friends);
    } catch (error: any) {
      results.friends = { success: false, error: error.message };
      console.error('Friends test failed:', error);
    }

    try {
      // Test 2: Fetch groups
      console.log('Testing groups service...');
      const groups = await groupsService.getUserGroups(user.id);
      results.groups = { success: true, count: groups.length, data: groups };
      console.log('Groups test passed:', groups);
    } catch (error: any) {
      results.groups = { success: false, error: error.message };
      console.error('Groups test failed:', error);
    }

    try {
      // Test 3: Fetch pending requests
      console.log('Testing pending requests...');
      const pending = await friendsService.getPendingRequests(user.id);
      results.pendingRequests = { success: true, count: pending.length, data: pending };
      console.log('Pending requests test passed:', pending);
    } catch (error: any) {
      results.pendingRequests = { success: false, error: error.message };
      console.error('Pending requests test failed:', error);
    }

    setTestResults(results);
    setLoading(false);
    
    const successCount = Object.values(results).filter(r => r.success).length;
    const totalCount = Object.keys(results).length;
    
    if (successCount === totalCount) {
      toast.success(`All tests passed! (${successCount}/${totalCount})`);
    } else {
      toast.error(`Some tests failed. (${successCount}/${totalCount} passed)`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Database Test</h1>
          <p className="text-muted-foreground">Test the new database tables and services</p>
        </div>
        <Button onClick={runTests} disabled={loading}>
          {loading ? 'Running Tests...' : 'Run Tests'}
        </Button>
      </div>

      <div className="grid gap-4">
        {Object.entries(testResults).map(([testName, result]) => (
          <Card key={testName}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                {testName.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.success ? (
                <div>
                  <p className="text-green-600 font-medium">✅ Test Passed</p>
                  <p className="text-sm text-muted-foreground">
                    Count: {result.count}
                  </p>
                  {result.data && result.data.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-blue-600">View Data</summary>
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-red-600 font-medium">❌ Test Failed</p>
                  <p className="text-sm text-muted-foreground">
                    Error: {result.error}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {Object.keys(testResults).length === 0 && (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>No tests run yet</p>
              <p className="text-sm">Click "Run Tests" to test the database connections</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
