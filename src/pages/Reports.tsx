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
  LabelList,
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
  period: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'currentmonth' | 'lastmonth' | 'last3months' | 'week' | 'month' | 'year' | 'custom';
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
  const [isMobile, setIsMobile] = useState(false);
  
  const [filters, setFilters] = useState<FilterState>({
    period: 'currentmonth',
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
  const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
  const [selectedCategoryTxns, setSelectedCategoryTxns] = useState<any[]>([]);
  const [categoryTxnLimit, setCategoryTxnLimit] = useState(5);
  const [isLoadingCategoryTxns, setIsLoadingCategoryTxns] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);
  const getCurrentFilteredTransactions = () => {
    return getFilteredTransactions();
  };

  const loadCategoryTransactions = (categoryName: string, limit: number) => {
    setIsLoadingCategoryTxns(true);
    const base = getCurrentFilteredTransactions();
    const txns = base
      .filter((t) => t.type === 'expense' && (t.categories?.name || 'Uncategorized') === categoryName)
      .sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''))
      .slice(0, limit);
    setSelectedCategoryTxns(txns);
    setIsLoadingCategoryTxns(false);
  };


  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 640);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
      const toDateStr = (d: Date) => d.toISOString().split('T')[0];

      let startStr = '';
      let endStr = '';

      switch (filters.period) {
        case 'today': {
          const start = new Date(now);
          const end = new Date(now);
          startStr = toDateStr(start);
          endStr = toDateStr(end);
          break;
        }
        case 'yesterday': {
          const y = new Date(now);
          y.setDate(now.getDate() - 1);
          startStr = toDateStr(y);
          endStr = toDateStr(y);
          break;
        }
        case 'week':
        case 'last7days': {
          const start = new Date(now);
          start.setDate(now.getDate() - 7);
          startStr = toDateStr(start);
          endStr = toDateStr(now);
          break;
        }
        case 'last30days': {
          const start = new Date(now);
          start.setDate(now.getDate() - 30);
          startStr = toDateStr(start);
          endStr = toDateStr(now);
          break;
        }
        case 'month':
        case 'currentmonth': {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          startStr = toDateStr(startOfMonth);
          endStr = toDateStr(endOfMonth);
          break;
        }
        case 'lastmonth': {
          const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          startStr = toDateStr(startOfLastMonth);
          endStr = toDateStr(endOfLastMonth);
          break;
        }
        case 'last3months': {
          const startOfLast3Months = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          startStr = toDateStr(startOfLast3Months);
          endStr = toDateStr(endOfCurrentMonth);
          break;
        }
        case 'year': {
          const startOfYear = new Date(now.getFullYear(), 0, 1);
          const endOfYear = new Date(now.getFullYear(), 11, 31);
          startStr = toDateStr(startOfYear);
          endStr = toDateStr(endOfYear);
          break;
        }
        default: {
          // Fallback to today
          startStr = toDateStr(now);
          endStr = toDateStr(now);
        }
      }

      if (startStr && endStr) {
        filtered = filtered.filter(t => t.transaction_date >= startStr && t.transaction_date <= endStr);
      }
    }

  // Category group filter
  if (filters.categoryGroup !== 'all') {
    filtered = filtered.filter(t => String(t.category_group_id || '') === String(filters.categoryGroup));
  }

    // Transaction type filter
    if (filters.transactionType !== 'all') {
      filtered = filtered.filter(t => t.type === filters.transactionType);
    }

  // Category filter
  if (filters.category !== 'all') {
    filtered = filtered.filter(t => String(t.category_id || '') === String(filters.category));
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
    <div className="space-y-4 sm:space-y-6 px-4 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Comprehensive financial insights and trends</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 w-full sm:w-auto h-11"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 w-full sm:w-auto h-11"
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
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  <SelectContent className="text-base sm:text-sm">
                    <SelectItem className="py-3 sm:py-2" value="today">Today</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="yesterday">Yesterday</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="last7days">Last 7 Days</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="last30days">Last 30 Days</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="currentmonth">Current Month</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="lastmonth">Last Month</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="last3months">Last 3 Months</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="custom">Custom Range</SelectItem>
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
                  <SelectContent className="text-base sm:text-sm">
                    <SelectItem className="py-3 sm:py-2" value="all">All Groups</SelectItem>
                    {categoryGroups.map((group) => (
                      <SelectItem className="py-3 sm:py-2" key={group.id} value={group.id}>
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
                  <SelectContent className="text-base sm:text-sm">
                    <SelectItem className="py-3 sm:py-2" value="all">All Types</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="income">Income Only</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="expense">Expense Only</SelectItem>
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
                  <SelectContent className="text-base sm:text-sm">
                    <SelectItem className="py-3 sm:py-2" value="all">All Categories</SelectItem>
                    {getFilteredCategories().map((category) => (
                      <SelectItem className="py-3 sm:py-2" key={category.id} value={category.id}>
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
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 px-3">Overview</TabsTrigger>
          <TabsTrigger value="trends" className="text-xs sm:text-sm py-2 px-3">Trends</TabsTrigger>
          <TabsTrigger value="categories" className="text-xs sm:text-sm py-2 px-3">Categories</TabsTrigger>
          <TabsTrigger value="comparison" className="text-xs sm:text-sm py-2 px-3">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Income vs Expenses Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Income vs Expenses
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {incomeExpenseData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={isMobile ? 240 : 280}>
                    {isMobile ? (
                      <AreaChart data={incomeExpenseData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={11} interval="preserveStartEnd" tickCount={4} />
                        <YAxis fontSize={11} tickCount={4} />
                        <Tooltip 
                          formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, '']}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{ fontSize: '12px' }}
                        />
                        <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.5} name="Income" />
                        <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.5} name="Expenses" />
                      </AreaChart>
                    ) : (
                      <BarChart data={incomeExpenseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, '']}
                          labelFormatter={(label) => `Date: ${label}`}
                          contentStyle={{ fontSize: '12px' }}
                        />
                        <Legend />
                        <Bar dataKey="income" fill="#10b981" name="Income" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="expense" fill="#ef4444" name="Expenses" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
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
              <CardContent className="p-4 sm:p-6">
                {categoryData.length > 0 ? (
                  <div>
                    <ResponsiveContainer width="100%" height={isMobile ? 240 : 300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={isMobile ? false : ({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        outerRadius={isMobile ? 90 : 110}
                        fill="#8884d8"
                          dataKey="value"
                          onClick={(data: any) => {
                            const name = data?.name || data?.payload?.name;
                            if (!name || typeof name !== 'string') return;
                            setSelectedCategoryName(name);
                            setCategoryTxnLimit(5);
                            loadCategoryTransactions(name, 5);
                          }}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any, _name: any, props: any) => [
                          `${props?.payload?.name || 'Category'}: ₹${Number(value).toFixed(2)}`,
                          ''
                        ]}
                        contentStyle={{ fontSize: '12px' }}
                      />
                      <Legend 
                        layout={isMobile ? 'horizontal' : 'vertical'}
                        verticalAlign={isMobile ? 'bottom' : 'middle'}
                        align={isMobile ? 'center' : 'right'}
                        wrapperStyle={{ fontSize: isMobile ? 11 : 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                    {selectedCategoryName && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Recent in {selectedCategoryName}</p>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => { setSelectedCategoryName(null); setSelectedCategoryTxns([]); }}
                          >
                            Clear
                          </Button>
                        </div>
                        {isLoadingCategoryTxns ? (
                          <div className="text-sm text-muted-foreground">Loading...</div>
                        ) : selectedCategoryTxns.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No transactions found.</div>
                        ) : (
                          <div className="space-y-2">
                            {selectedCategoryTxns.map(txn => (
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
                                  if (selectedCategoryName) loadCategoryTransactions(selectedCategoryName, newLimit);
                                }}
                              >
                                Load more
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
                    No expense data for selected period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {monthlyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                  <AreaChart data={monthlyTrendData} margin={{ top: isMobile ? 10 : 20, right: isMobile ? 10 : 30, left: isMobile ? 0 : 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" fontSize={isMobile ? 11 : 12} interval="preserveStartEnd" tickCount={isMobile ? 4 : 8} />
                    <YAxis fontSize={isMobile ? 11 : 12} tickCount={isMobile ? 4 : 8} />
                    <Tooltip 
                      formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, '']}
                      labelFormatter={(label) => `Month: ${label}`}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    {!isMobile && <Legend />}
                    <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Income" />
                    <Area type="monotone" dataKey="expense" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[320px] items-center justify-center text-muted-foreground text-sm">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Top Categories Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Expense Categories</CardTitle>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                {categoryData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={isMobile ? 300 : 280}>
                    {isMobile ? (
                      <BarChart data={categoryData.slice(0, 6)} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" hide tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                        <YAxis dataKey="name" type="category" width={110} fontSize={12} />
                        <Tooltip 
                          formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Amount']} 
                          contentStyle={{ fontSize: '12px' }}
                        />
                        <Bar dataKey="value" fill="#8884d8" barSize={18} radius={[0, 4, 4, 0]}>
                          <LabelList dataKey="value" position="right" formatter={(v: any) => `₹${Number(v).toFixed(0)}`} style={{ fontSize: 11 }} />
                        </Bar>
                      </BarChart>
                    ) : (
                      <BarChart data={categoryData.slice(0, 6)} layout="horizontal" margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" fontSize={12} tickFormatter={(v) => `₹${Number(v).toFixed(0)}`} />
                        <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                        <Tooltip 
                          formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Amount']} 
                          contentStyle={{ fontSize: '12px' }}
                        />
                        <Bar dataKey="value" fill="#8884d8" barSize={24} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-[280px] items-center justify-center text-muted-foreground text-sm">
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
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  {categoryData.map((category, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                        <div 
                          className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium text-sm sm:text-base truncate">{category.name}</span>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-semibold text-sm sm:text-base">₹{category.value.toFixed(2)}</div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
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

        <TabsContent value="comparison" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expense Comparison</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              {incomeExpenseData.length > 0 ? (
                <ResponsiveContainer width="100%" height={isMobile ? 260 : 320}>
                  <LineChart data={incomeExpenseData} margin={{ top: isMobile ? 10 : 20, right: isMobile ? 10 : 30, left: isMobile ? 0 : 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" fontSize={isMobile ? 11 : 12} interval="preserveStartEnd" tickCount={isMobile ? 4 : 8} />
                    <YAxis fontSize={isMobile ? 11 : 12} tickCount={isMobile ? 4 : 8} />
                    <Tooltip 
                      formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, '']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{ fontSize: '12px' }}
                    />
                    {!isMobile && <Legend />}
                    <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={isMobile ? 2 : 3} dot={!isMobile} name="Income" />
                    <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={isMobile ? 2 : 3} dot={!isMobile} name="Expenses" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[320px] items-center justify-center text-muted-foreground text-sm">
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
