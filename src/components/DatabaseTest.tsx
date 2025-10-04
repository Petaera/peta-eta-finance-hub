import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DatabaseTest() {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    if (!user) return;
    
    setLoading(true);
    setTestResults([]);
    const results: string[] = [];

    try {
      // Test 1: Check if user exists
      results.push('✅ User authentication working');

      // Test 2: Check category_groups table
      try {
        const { data, error } = await supabase
          .from('category_groups')
          .select('count')
          .eq('user_id', user.id);

        if (error) {
          results.push(`❌ category_groups table error: ${error.message}`);
        } else {
          results.push('✅ category_groups table accessible');
        }
      } catch (err) {
        results.push(`❌ category_groups table error: ${err}`);
      }

      // Test 3: Check categories table
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('count')
          .eq('user_id', user.id);

        if (error) {
          results.push(`❌ categories table error: ${error.message}`);
        } else {
          results.push('✅ categories table accessible');
        }
      } catch (err) {
        results.push(`❌ categories table error: ${err}`);
      }

      // Test 4: Check budgets table
      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('count')
          .eq('user_id', user.id);

        if (error) {
          results.push(`❌ budgets table error: ${error.message}`);
        } else {
          results.push('✅ budgets table accessible');
        }
      } catch (err) {
        results.push(`❌ budgets table error: ${err}`);
      }

      // Test 5: Check transactions table
      try {
        const { data, error } = await supabase
          .from('transactions')
          .select('count')
          .eq('user_id', user.id);

        if (error) {
          results.push(`❌ transactions table error: ${error.message}`);
        } else {
          results.push('✅ transactions table accessible');
        }
      } catch (err) {
        results.push(`❌ transactions table error: ${err}`);
      }

    } catch (err) {
      results.push(`❌ General error: ${err}`);
    }

    setTestResults(results);
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Database Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runTests} disabled={loading}>
          {loading ? 'Running Tests...' : 'Test Database Connection'}
        </Button>
        
        {testResults.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Test Results:</h3>
            {testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono">
                {result}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
