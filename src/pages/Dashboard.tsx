import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
// import Todos from '@/components/Todos';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
  });
  const [upcomingReminders, setUpcomingReminders] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Fetch transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id);

      if (transactions) {
        const income = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const expense = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        setStats({
          totalIncome: income,
          totalExpense: expense,
          balance: income - expense,
        });

        // Group by category
        const grouped = transactions.reduce((acc: any, t) => {
          if (t.type === 'expense' && t.category_id) {
            acc[t.category_id] = (acc[t.category_id] || 0) + t.amount;
          }
          return acc;
        }, {});

        setCategoryData(
          Object.entries(grouped).map(([id, value]) => ({
            name: `Category ${id.slice(0, 6)}`,
            value,
          }))
        );
      }

      // Fetch reminders
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_paid', false)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      if (reminders) {
        setUpcomingReminders(reminders);
      }
    };

    fetchData();
  }, [user]);

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your finances</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">₹{stats.totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">₹{stats.totalExpense.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.balance.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
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
                    label={(entry) => `${entry.name}: ₹${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No expense data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReminders.length > 0 ? (
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Bell className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="font-medium">{reminder.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {new Date(reminder.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    {reminder.amount && (
                      <span className="font-semibold">₹{reminder.amount}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                No upcoming reminders
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Todos Section */}
      {/* <Todos /> */}
    </div>
  );
}
