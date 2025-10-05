import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function Reports() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
  }, [user, period]);

  const fetchTransactions = async () => {
    const now = new Date();
    let startDate = new Date();

    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    const { data } = await supabase
      .from('transactions')
      .select('*, categories(name, color)')
      .eq('user_id', user!.id)
      .gte('date', startDate.toISOString())
      .order('date', { ascending: true });

    if (data) {
      setTransactions(data);
      processChartData(data);
      processCategoryData(data);
    }
  };

  const processChartData = (data: any[]) => {
    const grouped = data.reduce((acc: any, t) => {
      const date = new Date(t.date).toLocaleDateString();
      if (!acc[date]) {
        acc[date] = { date, income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        acc[date].income += t.amount;
      } else {
        acc[date].expense += t.amount;
      }
      return acc;
    }, {});

    setChartData(Object.values(grouped));
  };

  const processCategoryData = (data: any[]) => {
    const expenses = data.filter((t) => t.type === 'expense');
    const grouped = expenses.reduce((acc: any, t) => {
      const name = t.categories?.name || 'Uncategorized';
      if (!acc[name]) {
        acc[name] = { name, value: 0, color: t.categories?.color || '#ccc' };
      }
      acc[name].value += t.amount;
      return acc;
    }, {});

    setCategoryData(Object.values(grouped));
  };

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Analyze your spending patterns</p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Last Week</SelectItem>
            <SelectItem value="month">Last Month</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalExpense.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Net</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalIncome - totalExpense).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="income" fill="hsl(var(--success))" name="Income" />
                <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Expenses" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No data for selected period
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expenses by Category</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ₹${entry.value.toFixed(2)}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
              No expense data for selected period
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
