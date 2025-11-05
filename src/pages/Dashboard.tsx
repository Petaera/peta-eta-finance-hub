import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ArrowUpCircle, ArrowDownCircle, TrendingUp, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getOrCreateProfile } from '@/services/supabase';
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
  const [categories, setCategories] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{ id: string; name: string } | null>(null);
  const [categoryTransactions, setCategoryTransactions] = useState<any[]>([]);
  const [categoryTxnLimit, setCategoryTxnLimit] = useState(5);
  const [isLoadingCategoryTxns, setIsLoadingCategoryTxns] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [profileDefaultGroupId, setProfileDefaultGroupId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      // Calculate current month range (YYYY-MM-DD)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];

      // Fetch transactions with category data
      const { data: transactions } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(id, name, type)
        `)
        .eq('user_id', user.id)
        .gte('transaction_date', startOfMonth)
        .lte('transaction_date', endOfMonth);

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, type')
        .eq('user_id', user.id);

      // Fetch category groups
      const { data: groupsData } = await supabase
        .from('category_groups')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (categoriesData) {
        setCategories(categoriesData);
      }
      if (groupsData) {
        setCategoryGroups(groupsData);
      }

      if (transactions) {
        setTransactions(transactions);
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

        // categoryData is computed in an effect based on current view
      }

      // Fetch reminders
      const { data: reminders } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_paid', false)
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
        .order('due_date', { ascending: true })
        .limit(5);

      if (reminders) {
        setUpcomingReminders(reminders);
      }
    };

    fetchData();
  }, [user]);

  // Fetch user profile default group for initial view
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getOrCreateProfile(user!.id);
        const defaultGroup = profile?.default_group_id || null;
        setProfileDefaultGroupId(defaultGroup);
        setSelectedGroupId(defaultGroup || 'all');
      } catch (e) {
        setProfileDefaultGroupId(null);
        setSelectedGroupId('all');
      }
    };
    if (user) fetchProfile();
  }, [user]);

  // Recompute categoryData when transactions or selected group changes
  useEffect(() => {
    const groupedById: Record<string, { id: string; name: string; value: number }> = {};
    let source = transactions.filter(t => t.type === 'expense' && t.category_id);
    if (selectedGroupId && selectedGroupId !== 'all') {
      source = source.filter(t => String(t.category_group_id) === String(selectedGroupId));
    }
    for (const t of source) {
      const id = String(t.category_id);
      const name = t.categories?.name || 'Uncategorized';
      if (!groupedById[id]) {
        groupedById[id] = { id, name, value: 0 };
      }
      groupedById[id].value += t.amount;
    }
    setCategoryData(Object.values(groupedById));
  }, [transactions, selectedGroupId]);

  // Recompute stats when transactions or selected group changes
  useEffect(() => {
    let source = [...transactions];
    if (selectedGroupId && selectedGroupId !== 'all') {
      source = source.filter(t => String(t.category_group_id) === String(selectedGroupId));
    }
    const income = source
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const expense = source
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    setStats({ totalIncome: income, totalExpense: expense, balance: income - expense });
  }, [transactions, selectedGroupId]);

  const getCurrentMonthRange = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start, end };
  };

  const fetchCategoryTransactions = async (categoryId: string, limit: number) => {
    if (!user) return;
    setIsLoadingCategoryTxns(true);
    try {
      const { start, end } = getCurrentMonthRange();
      const { data } = await supabase
        .from('transactions')
        .select(`
          id, amount, note, transaction_date, type, category_id,
          categories(id, name)
        `)
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .eq('category_id', categoryId)
        .gte('transaction_date', start)
        .lte('transaction_date', end)
        .order('transaction_date', { ascending: false })
        .limit(limit);
      setCategoryTransactions(data || []);
    } finally {
      setIsLoadingCategoryTxns(false);
    }
  };

  const handleSliceClick = (_: any, index: number) => {
    const entry = categoryData[index];
    if (!entry) return;
    const sel = { id: entry.id, name: entry.name };
    setSelectedCategory(sel);
    setCategoryTxnLimit(5);
    fetchCategoryTransactions(sel.id, 5);
  };

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];

  return (
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Overview of your finances</p>
      </div>

      {/* Top Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Label className="text-sm">Category</Label>
          <Select value={selectedGroupId} onValueChange={(v) => setSelectedGroupId(v)}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Choose category" />
            </SelectTrigger>
            <SelectContent className="text-base sm:text-sm">
              {(() => {
                const defaultName = categoryGroups.find((g: any) => g.id === profileDefaultGroupId)?.name || 'Default category';
                return (
                  <>
                    {profileDefaultGroupId && (
                      <SelectItem className="py-3 sm:py-2" value={String(profileDefaultGroupId)}>{defaultName}</SelectItem>
                    )}
                    <SelectItem className="py-3 sm:py-2" value="all">All categories</SelectItem>
                    {categoryGroups
                      .filter((g: any) => !profileDefaultGroupId || String(g.id) !== String(profileDefaultGroupId))
                      .map((g: any) => (
                        <SelectItem className="py-3 sm:py-2" key={g.id} value={String(g.id)}>
                          {g.name}
                        </SelectItem>
                      ))}
                  </>
                );
              })()}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">₹{stats.totalExpense.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">₹{stats.totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">₹{stats.balance.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {categoryData.length > 0 ? (
              <>
              <ResponsiveContainer width="100%" height={isMobile ? 240 : 320}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    outerRadius={isMobile ? 90 : 100}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={handleSliceClick as any}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend 
                    layout={isMobile ? 'horizontal' : 'vertical'} 
                    verticalAlign={isMobile ? 'bottom' : 'middle'} 
                    align={isMobile ? 'center' : 'right'}
                    wrapperStyle={{ fontSize: isMobile ? 11 : 12 }}
                  />
                  <Tooltip 
                    formatter={(value: any, _name: any, props: any) => [
                      `₹${Number(value).toFixed(2)}`,
                      props?.payload?.name ? `Category: ${props.payload.name}` : 'Category'
                    ]}
                    contentStyle={{ fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Drill-down: recent transactions for selected category */}
              {selectedCategory && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Recent in {selectedCategory.name}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => { setSelectedCategory(null); setCategoryTransactions([]); }}
                    >
                      Clear
                    </Button>
                  </div>
                  {isLoadingCategoryTxns ? (
                    <div className="text-sm text-muted-foreground">Loading...</div>
                  ) : categoryTransactions.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No transactions found.</div>
                  ) : (
                    <div className="space-y-2">
                      {categoryTransactions.map(txn => (
                        <div key={txn.id} className="flex items-center justify-between rounded-md border p-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">₹{txn.amount.toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground truncate">{txn.note || 'No note'}</p>
                          </div>
                          <div className="text-xs text-muted-foreground ml-3 whitespace-nowrap">
                            {new Date(txn.transaction_date).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                      <div className="pt-1">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const newLimit = categoryTxnLimit + 5;
                            setCategoryTxnLimit(newLimit);
                            if (selectedCategory) fetchCategoryTransactions(selectedCategory.id, newLimit);
                          }}
                        >
                          Load more
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
              </>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
                No expense data yet
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {upcomingReminders.length > 0 ? (
              <div className="space-y-3">
                {upcomingReminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Bell className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{reminder.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        Due: {new Date(reminder.due_date).toLocaleDateString()}
                      </p>
                    </div>
                    {reminder.amount && (
                      <span className="font-semibold text-sm sm:text-base flex-shrink-0">₹{reminder.amount}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-[250px] items-center justify-center text-muted-foreground text-sm">
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
