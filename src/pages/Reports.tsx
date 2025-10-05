import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  AreaChart,
  Area,
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Calendar,
  Filter,
  Download,
  RefreshCw
} from 'lucide-react';

interface FilterState {
  period: 'week' | 'month' | 'year' | 'custom';
  customStartDate: string;
  customEndDate: string;
  categoryGroup: string;
  transactionType: string;
  category: string;
}

export default function Reports() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    period: 'month',
    customStartDate: '',
    customEndDate: '',
    categoryGroup: 'all',
    transactionType: 'all',
    category: 'all'
  });

  // Chart data states
  const [chartData, setChartData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([]);
  const [incomeExpenseData, setIncomeExpenseData] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  useEffect(() => {
    if (transactions.length > 0) {
      processAllChartData();
    }
  }, [transactions, filters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch transactions
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(id, name, type, group_id),
          category_groups(id, name)
        `)
        .eq('user_id', user!.id)
        .order('transaction_date', { ascending: false });

      // Fetch categories
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name, type, group_id')
        .eq('user_id', user!.id);

      // Fetch category groups
      const { data: groupsData } = await supabase
        .from('category_groups')
        .select('id, name')
        .eq('user_id', user!.id);

      setTransactions(transactionsData || []);
      setCategories(categoriesData || []);
      setCategoryGroups(groupsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Date filter
    if (filters.period === 'custom') {
      if (filters.customStartDate && filters.customEndDate) {
        filtered = filtered.filter(t => 
          t.transaction_date >= filters.customStartDate && 
          t.transaction_date <= filters.customEndDate
        );
      }
    } else {
      const now = new Date();
      let startDate = new Date();
      
      if (filters.period === 'week') {
        startDate.setDate(now.getDate() - 7);
      } else if (filters.period === 'month') {
        startDate.setMonth(now.getMonth() - 1);
      } else if (filters.period === 'year') {
        startDate.setFullYear(now.getFullYear() - 1);
      }
      
      filtered = filtered.filter(t => t.transaction_date >= startDate.toISOString());
    }

    // Category group filter
    if (filters.categoryGroup !== 'all') {
      filtered = filtered.filter(t => t.category_group_id === filters.categoryGroup);
    }

    // Transaction type filter
    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(t => t.type === filters.transactionType);
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(t => t.category_id === filters.category);
    }

    return filtered;
  };

  const processAllChartData = () => {
    const filteredTransactions = getFilteredTransactions();
    
    // Process income vs expenses over time
    processIncomeExpenseData(filteredTransactions);
    
    // Process category data for pie chart
    processCategoryData(filteredTransactions);
    
    // Process monthly trend data
    processMonthlyTrendData(filteredTransactions);
  };

  const processIncomeExpenseData = (data: any[]) => {
    const grouped = data.reduce((acc: any, t) => {
      const date = new Date(t.transaction_date).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit'
      });
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

    setIncomeExpenseData(Object.values(grouped).sort((a: any, b: any) => 
      new Date(a.date.split('/').reverse().join('-')).getTime() - 
      new Date(b.date.split('/').reverse().join('-')).getTime()
    ));
  };

  const processCategoryData = (data: any[]) => {
    const expenses = data.filter((t) => t.type === 'expense');
    const grouped = expenses.reduce((acc: any, t) => {
      const name = t.categories?.name || 'Uncategorized';
      if (!acc[name]) {
        acc[name] = { name, value: 0 };
      }
      acc[name].value += t.amount;
      return acc;
    }, {});

    // Sort by value and take top 8 categories
    const sorted = Object.values(grouped)
      .sort((a: any, b: any) => b.value - a.value)
      .slice(0, 8);

    // Assign colors
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff7300', 
      '#00ff00', '#ff00ff', '#00ffff', '#ffff00'
    ];
    
    setCategoryData(sorted.map((item: any, index) => ({
      ...item,
      color: colors[index % colors.length]
    })));
  };

  const processMonthlyTrendData = (data: any[]) => {
    const grouped = data.reduce((acc: any, t) => {
      const month = new Date(t.transaction_date).toLocaleDateString('en-GB', {
        month: 'short',
        year: 'numeric'
      });
      if (!acc[month]) {
        acc[month] = { month, income: 0, expense: 0, balance: 0 };
      }
      if (t.type === 'income') {
        acc[month].income += t.amount;
      } else {
        acc[month].expense += t.amount;
      }
      acc[month].balance = acc[month].income - acc[month].expense;
      return acc;
    }, {});

    setMonthlyTrendData(Object.values(grouped));
  };

  const getFilteredCategories = () => {
    if (filters.categoryGroup === 'all') {
      return categories;
    }
    return categories.filter(cat => cat.group_id === filters.categoryGroup);
  };

  const totalIncome = getFilteredTransactions()
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = getFilteredTransactions()
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;
  const transactionCount = getFilteredTransactions().length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive financial insights and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Period Filter */}
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select
                  value={filters.period}
                  onValueChange={(value) => setFilters({ ...filters, period: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Last Week</SelectItem>
                    <SelectItem value="month">Last Month</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
              {filters.period === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={filters.customStartDate}
                      onChange={(e) => setFilters({ ...filters, customStartDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={filters.customEndDate}
                      onChange={(e) => setFilters({ ...filters, customEndDate: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Category Group Filter */}
              <div className="space-y-2">
                <Label>Category Group</Label>
                <Select
                  value={filters.categoryGroup}
                  onValueChange={(value) => setFilters({ ...filters, categoryGroup: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Groups</SelectItem>
                    {categoryGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Transaction Type Filter */}
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select
                  value={filters.transactionType}
                  onValueChange={(value) => setFilters({ ...filters, transactionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income Only</SelectItem>
                    <SelectItem value="expense">Expense Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={filters.category}
                  onValueChange={(value) => setFilters({ ...filters, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {getFilteredCategories().map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{totalIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {getFilteredTransactions().filter(t => t.type === 'income').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingUp className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{totalExpense.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {getFilteredTransactions().filter(t => t.type === 'expense').length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{netBalance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {netBalance >= 0 ? 'Positive' : 'Negative'} balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{transactionCount}</div>
            <p className="text-xs text-muted-foreground">
              In selected period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
            {/* Income vs Expenses Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Income vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomeExpenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={incomeExpenseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`₹${value.toFixed(2)}`, '']}
                        labelFormatter={(label) => `Date: ${label}`}
                      />
                      <Legend />
                      <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No data for selected period
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Expenses by Category Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5" />
                  Expenses by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Amount']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No expense data for selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`₹${value.toFixed(2)}`, '']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Income" />
                    <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid gap-4 lg:gap-6 lg:grid-cols-2">
            {/* Top Categories Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={categoryData.slice(0, 6)} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value: any) => [`₹${value.toFixed(2)}`, 'Amount']} />
                      <Bar dataKey="value" fill="#8884d8" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[350px] items-center justify-center text-muted-foreground">
                    No category data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">₹{category.value.toFixed(2)}</div>
                        <div className="text-sm text-muted-foreground">
                          {((category.value / totalExpense) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expense Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              {incomeExpenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={incomeExpenseData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`₹${value.toFixed(2)}`, '']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={3} name="Income" />
                    <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={3} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[400px] items-center justify-center text-muted-foreground">
                  No comparison data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
