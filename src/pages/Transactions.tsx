import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Filter, Calendar, Search } from 'lucide-react';
import { groupsService, friendsService, resolvePayer, getOrCreateProfile } from '@/services/supabase';
import { PayerDisplay } from '@/components/ui/member-components';
import type { Friend } from '@/services/supabase';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  transaction_date: string;
  category_id: string | null;
  category_group_id: string | null;
  paid_by: string | null;
  payment_method?: 'upi' | 'cash' | 'card';
  created_at: string;
  categories?: { 
    id: string;
    name: string;
    type: string;
  };
}

interface Participant {
  id: string;
  name: string;
  email: string | null;
  group_id: string | null;
  created_at: string;
}

interface CategoryGroup {
  id: string;
  name: string;
}

interface Profile {
  id: string;
  default_group_id: string | null;
  default_category_id: string | null;
}

export default function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    dateFilter: 'today',
    dateRange: {
      start: '',
      end: ''
    },
    categoryFilter: 'all',
    groupFilter: 'all',
    typeFilter: 'all',
    searchTerm: ''
  });
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    note: '',
    transaction_date: new Date().toISOString().split('T')[0],
    category_id: 'none',
    category_group_id: 'none',
    paid_by: 'user',
    payment_method: 'upi' as 'upi' | 'cash' | 'card',
  });
  const [expensesSortOrder, setExpensesSortOrder] = useState<'asc' | 'desc'>('desc');
  const [transactionsSortOrder, setTransactionsSortOrder] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc');

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
    fetchCategories();
    fetchParticipants(); 
    fetchCategoryGroups();
    fetchUserProfile();
    fetchFriends();
  }, [user]);

  // Reset paid_by when category group changes
  useEffect(() => {
    if (formData.category_group_id && formData.paid_by !== 'user') {
      const availableParticipants = participants.filter(participant => 
        !formData.category_group_id || 
        formData.category_group_id === 'none' || 
        participant.group_id === formData.category_group_id
      );
      
      if (!availableParticipants.find(p => p.id === formData.paid_by)) {
        setFormData(prev => ({ ...prev, paid_by: 'user' }));
      }
    }
  }, [formData.category_group_id, participants]);

  // Reset category when group changes if selected category doesn't belong to new group
  useEffect(() => {
    if (formData.category_group_id && formData.category_id && formData.category_id !== 'none') {
      const filteredCategories = getFilteredCategories();
      const isCategoryValid = filteredCategories.some(cat => cat.id === formData.category_id);
      
      if (!isCategoryValid) {
        setFormData(prev => ({ ...prev, category_id: 'none' }));
      }
    }
  }, [formData.category_group_id, categories]);

  // Calculate date range based on filter
  const getDateRange = (filter: string) => {
    const today = new Date();
    const toDateStr = (d: Date) => d.toISOString().split('T')[0];
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const startOfLast3Months = new Date(today.getFullYear(), today.getMonth() - 2, 1);

    switch (filter) {
      case 'today':
        return { start: toDateStr(today), end: toDateStr(today) };
      case 'yesterday':
        return { start: toDateStr(yesterday), end: toDateStr(yesterday) };
      case 'last7days':
        return { start: toDateStr(last7Days), end: toDateStr(today) };
      case 'last30days':
        return { start: toDateStr(last30Days), end: toDateStr(today) };
      case 'currentmonth':
        return { start: toDateStr(startOfCurrentMonth), end: toDateStr(endOfCurrentMonth) };
      case 'lastmonth':
        return { start: toDateStr(startOfLastMonth), end: toDateStr(endOfLastMonth) };
      case 'last3months':
        return { start: toDateStr(startOfLast3Months), end: toDateStr(endOfCurrentMonth) };
      default:
        return { start: '', end: '' };
    }
  };

  // Filter transactions based on selected filters
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

  // Date filter
  if (selectedFilters.dateFilter) {
      if (selectedFilters.dateFilter === 'custom') {
        if (selectedFilters.dateRange.start && selectedFilters.dateRange.end) {
          filtered = filtered.filter(transaction => {
            const transactionDate = transaction.transaction_date;
            return transactionDate >= selectedFilters.dateRange.start && 
                   transactionDate <= selectedFilters.dateRange.end;
          });
        }
      } else {
        const dateRange = getDateRange(selectedFilters.dateFilter);
      if (dateRange.start && dateRange.end) {
        filtered = filtered.filter(transaction => {
          const transactionDate = transaction.transaction_date;
          return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
        });
      }
      }
    }

    // Category filter
    if (selectedFilters.categoryFilter !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.category_id === selectedFilters.categoryFilter
      );
    }

    // Group filter
    if (selectedFilters.groupFilter !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.category_group_id === selectedFilters.groupFilter
      );
    }

    // Type filter
    if (selectedFilters.typeFilter !== 'all') {
      filtered = filtered.filter(transaction => 
        transaction.type === selectedFilters.typeFilter
      );
    }


    // Search term filter
    if (selectedFilters.searchTerm.trim()) {
      const searchLower = selectedFilters.searchTerm.toLowerCase();
      filtered = filtered.filter(transaction => 
        transaction.note?.toLowerCase().includes(searchLower) ||
        transaction.categories?.name.toLowerCase().includes(searchLower) ||
        transaction.amount.toString().includes(searchLower)
      );
    }

    // Always show latest payments first (by transaction_date, then created_at)
    filtered.sort((a, b) => {
      const d = (b.transaction_date || '').localeCompare(a.transaction_date || '');
      if (d !== 0) return d;
      return (b.created_at || '').localeCompare(a.created_at || '');
    });

    return filtered;
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedFilters({
      dateFilter: 'today',
      dateRange: { start: '', end: '' },
      categoryFilter: 'all',
      groupFilter: 'all',
      typeFilter: 'all',
      searchTerm: ''
    });
  };

  const fetchTransactions = async () => {
    try {
      // Get user's groups first
      const userGroups = await groupsService.getUserGroups(user!.id);
      const groupIds = userGroups.map(group => group.id);
      
      // Fetch transactions where user is either the creator OR it's a group transaction
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(id, name, type)
        `)
        .or(`user_id.eq.${user!.id}${groupIds.length > 0 ? `,category_group_id.in.(${groupIds.join(',')})` : ''}`)
        .order('transaction_date', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        toast.error('Failed to fetch transactions');
        return;
      }

      setTransactions(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, type, group_id')
        .eq('user_id', user!.id);

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to fetch categories');
        return;
      }

      setCategories(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    }
  };

  // Get categories filtered by selected group
  const getFilteredCategories = () => {
    if (!formData.category_group_id || formData.category_group_id === 'none') {
      // If no group selected, show all categories
      return categories;
    }
    
    // Show only categories that belong to the selected group
    return categories.filter(category => category.group_id === formData.category_group_id);
  };

  // Get categories for Filters section based on selected group filter
  const getFilterCategoriesForGroup = () => {
    if (!selectedFilters.groupFilter || selectedFilters.groupFilter === 'all') {
      return categories;
    }
    return categories.filter(category => category.group_id === selectedFilters.groupFilter);
  };

  // Ensure category filter stays valid when group filter changes
  useEffect(() => {
    if (selectedFilters.groupFilter === 'all' || selectedFilters.categoryFilter === 'all') return;
    const isValid = categories.some(cat => 
      cat.id === selectedFilters.categoryFilter && cat.group_id === selectedFilters.groupFilter
    );
    if (!isValid) {
      setSelectedFilters(prev => ({ ...prev, categoryFilter: 'all' }));
    }
  }, [selectedFilters.groupFilter, selectedFilters.categoryFilter, categories]);

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id, name, email, group_id, created_at')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        toast.error('Failed to fetch participants');
        return;
      }

      setParticipants((data || []).map(participant => ({
        ...participant,
        created_at: participant.created_at || new Date().toISOString()
      })));
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    }
  };

  const fetchCategoryGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('category_groups')
        .select('id, name')
        .eq('user_id', user!.id)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching category groups:', error);
        toast.error('Failed to fetch category groups');
        return;
      }

      setCategoryGroups(data || []);
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Unexpected error occurred');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const profile = await getOrCreateProfile(user!.id);

      if (profile) {
        setUserProfile(profile);
        // Update form data with defaults if available and form is reset
        if ((profile?.default_group_id || profile?.default_category_id) && !editingId && !isDialogOpen) {
          setFormData(prev => ({
            ...prev,
            category_group_id: profile.default_group_id || 'none',
            category_id: profile.default_category_id || 'none'
          }));
        }
      }
    } catch (err) {
      console.error('Unexpected error:' , err);
    }
  };

  const fetchFriends = async () => {
    try {
      const friendsData = await friendsService.getFriends(user!.id);
      setFriends(friendsData);
    } catch (error) {
      console.error('Error fetching friends:', error);
      toast.error('Failed to fetch friends');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const payload: any = {
      user_id: user!.id,
      type: formData.type,
      amount: amount,
      note: formData.note || null,
      transaction_date: formData.transaction_date,
      category_id: formData.category_id === 'none' ? null : formData.category_id,
      category_group_id: formData.category_group_id === 'none' ? null : formData.category_group_id,
      payment_method: formData.payment_method,
    };

    // Set paid_by to user ID for Myself, participant ID for others
    if (formData.paid_by === 'user') {
      payload.paid_by = user!.id; // Store actual user ID for "Myself"
    } else {
      payload.paid_by = formData.paid_by; // Store participant ID
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('transactions')
          .update(payload)
          .eq('id', editingId);

        if (error) {
          console.error('Update error:', error);
          toast.error('Failed to update transaction');
          return;
        }
        toast.success('Transaction updated successfully');
      } else {
        const { error } = await supabase.from('transactions').insert(payload);

        if (error) {
          console.error('Insert error:', error);
          toast.error('Failed to create transaction');
          return;
        }
        toast.success('Transaction created successfully');
      }

      await fetchTransactions();
      resetForm();
    } catch (err) {
      console.error('Submit error:', err);
      toast.error('An error occurred while saving transaction');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete transaction');
        return;
      }
      toast.success('Transaction deleted successfully');
      await fetchTransactions();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('An error occurred while deleting transaction');
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setFormData({
      type: transaction.type,
      amount: transaction.amount.toString(),
      note: transaction.note || '',
      transaction_date: transaction.transaction_date,
      category_id: transaction.category_id || 'none',
      category_group_id: transaction.category_group_id || 'none',
      paid_by: transaction.paid_by === user?.id ? 'user' : transaction.paid_by || 'user',
      payment_method: transaction.payment_method || 'upi',
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      type: 'expense',
      amount: '',
      note: '',
      transaction_date: new Date().toISOString().split('T')[0],
      category_id: userProfile?.default_category_id || 'none',
      category_group_id: userProfile?.default_group_id || 'none',
      paid_by: 'user',
      payment_method: 'upi',
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-4 sm:space-y-6 overflow-x-hidden px-4 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Transactions</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your income and expenses</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()} className="w-full sm:w-auto h-11">
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-md mx-auto p-4 max-h-[90vh] overflow-y-auto overflow-x-hidden sm:w-full sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Edit' : 'Add'} Transaction</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as 'income' | 'expense' })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  pattern="[0-9]*"
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">

                <div className="space-y-2">
                  <Label>Category Group</Label>
                  <Select
                    value={formData.category_group_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category_group_id: value, category_id: 'none', paid_by: 'user' })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category Group</SelectItem>
                      {categoryGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={formData.category_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {getFilteredCategories().map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {formData.category_group_id && formData.category_group_id !== 'none' 
                      ? `Showing categories from ${categoryGroups.find(g => g.id === formData.category_group_id)?.name || 'selected'} group only.`
                      : 'Showing all your categories.'
                    }
                  </p>
                </div>
              </div>

                <div className="space-y-2">
                  <Label>Paid By</Label>
                  <Select
                    value={formData.paid_by}
                    onValueChange={(value) => setFormData({ ...formData, paid_by: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Myself (Default)</SelectItem>
                      {friends.map((friend) => (
                        <SelectItem key={friend.friend_profile?.id} value={friend.friend_profile?.id || ''}>
                          {friend.friend_profile?.full_name || friend.friend_profile?.email} (Friend)
                        </SelectItem>
                      ))}
                      {participants
                        .filter(participant => 
                          !formData.category_group_id || 
                          formData.category_group_id === 'none' || 
                          participant.group_id === formData.category_group_id
                        )
                        .map((participant) => (
                          <SelectItem key={participant.id} value={participant.id}>
                            {participant.name} (Participant)
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Leave as "Myself" unless someone else paid for this transaction
                    {formData.category_group_id && formData.category_group_id !== 'none' && 
                      `. Showing members from ${categoryGroups.find(g => g.id === formData.category_group_id)?.name || 'selected'} group.`
                    }
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={formData.payment_method}
                    onValueChange={(value) => setFormData({ ...formData, payment_method: value as 'upi' | 'cash' | 'card' })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upi">UPI (Default)</SelectItem>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Note</Label>
                <Textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Optional note"
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
                <Button type="submit" className="w-full sm:flex-1 h-11">
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto h-11">
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
                className="w-full sm:w-auto"
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
                className="w-full sm:w-auto"
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={selectedFilters.searchTerm}
                    onChange={(e) => setSelectedFilters({ ...selectedFilters, searchTerm: e.target.value })}
                    placeholder="Search transactions..."
                    className="pl-10"
                  />
                </div>
              </div>

              

              {/* Type Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Transaction Type</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFilters(prev => ({ ...prev, typeFilter: 'all' }))}
                  >
                    Reset
                  </Button>
                </div>
                <Select
                  value={selectedFilters.typeFilter}
                  onValueChange={(value) => setSelectedFilters({ ...selectedFilters, typeFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent className="text-base sm:text-sm">
                    <SelectItem className="py-3 sm:py-2" value="all">All Types</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="income">Income</SelectItem>
                    <SelectItem className="py-3 sm:py-2" value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Group Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Category Group</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFilters(prev => ({ ...prev, groupFilter: 'all' }))}
                  >
                    Reset
                  </Button>
                </div>
                <Select
                  value={selectedFilters.groupFilter}
                  onValueChange={(value) => setSelectedFilters({ ...selectedFilters, groupFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All groups" />
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

              {/* Category Filter */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Category</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFilters(prev => ({ ...prev, categoryFilter: 'all' }))}
                  >
                    Reset
                  </Button>
                </div>
                <Select
                  value={selectedFilters.categoryFilter}
                  onValueChange={(value) => setSelectedFilters({ ...selectedFilters, categoryFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent className="text-base sm:text-sm">
                    <SelectItem className="py-3 sm:py-2" value="all">All Categories</SelectItem>
                    {getFilterCategoriesForGroup().map((category) => (
                      <SelectItem className="py-3 sm:py-2" key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </CardContent>
        )}
      </Card>


      {/* Date Range (always visible) */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Date Range</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFilters(prev => ({ ...prev, dateFilter: 'today', dateRange: { start: '', end: '' } }))}
                >
                  Reset
                </Button>
              </div>
              <Select
                value={selectedFilters.dateFilter}
                onValueChange={(value) => setSelectedFilters({ ...selectedFilters, dateFilter: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select date range" />
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

            {selectedFilters.dateFilter === 'custom' && (
              <>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={selectedFilters.dateRange.start}
                    onChange={(e) => setSelectedFilters({ 
                      ...selectedFilters, 
                      dateRange: { ...selectedFilters.dateRange, start: e.target.value }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={selectedFilters.dateRange.end}
                    onChange={(e) => setSelectedFilters({ 
                      ...selectedFilters, 
                      dateRange: { ...selectedFilters.dateRange, end: e.target.value }
                    })}
                  />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Sort (always visible) */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base sm:text-lg font-semibold">Sort Transactions</h2>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Label className="text-sm">Sort Order</Label>
              <Select value={transactionsSortOrder} onValueChange={(v) => setTransactionsSortOrder(v as any)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Choose order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Date: Descending (Latest first)</SelectItem>
                  <SelectItem value="date_asc">Date: Ascending (Oldest first)</SelectItem>
                  <SelectItem value="amount_desc">Amount: High to Low</SelectItem>
                  <SelectItem value="amount_asc">Amount: Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Count */}
      <div className="px-4 sm:px-6">
        <p className="text-sm text-muted-foreground">{getFilteredTransactions().length} transactions</p>
      </div>


      <div className="grid gap-4">
        {(() => {
          const base = [...getFilteredTransactions()];
          const sorted = (() => {
            switch (transactionsSortOrder) {
              case 'amount_asc':
                return base.sort((a, b) => a.amount - b.amount);
              case 'amount_desc':
                return base.sort((a, b) => b.amount - a.amount);
              case 'date_asc':
                return base.sort((a, b) => {
                  const d = (a.transaction_date || '').localeCompare(b.transaction_date || '');
                  if (d !== 0) return d;
                  return (a.created_at || '').localeCompare(b.created_at || '');
                });
              case 'date_desc':
              default:
                return base.sort((a, b) => {
                  const d = (b.transaction_date || '').localeCompare(a.transaction_date || '');
                  if (d !== 0) return d;
                  return (b.created_at || '').localeCompare(a.created_at || '');
                });
            }
          })();
          if (sorted.length === 0) {
            return (
              <Card>
                <CardContent className="flex h-32 sm:h-40 items-center justify-center text-muted-foreground p-4 sm:p-6">
                  <p className="text-center text-sm sm:text-base">
                    {transactions.length === 0 
                      ? "No transactions yet. Add your first transaction above."
                      : "No transactions match your filters. Try adjusting your search criteria."
                    }
                  </p>
                </CardContent>
              </Card>
            );
          }
          return sorted.map((transaction) => (
            <Card key={transaction.id} className="w-full">
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {transaction.type === 'income' ? (
                      <ArrowUpCircle className="h-8 w-8 text-green-600 shrink-0 mt-1" />
                    ) : (
                      <ArrowDownCircle className="h-8 w-8 text-red-600 shrink-0 mt-1" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                        <span className="font-medium text-sm sm:text-base">{transaction.categories?.name || 'Uncategorized'}</span>
                        {transaction.category_group_id && (() => {
                          const categoryGroup = categoryGroups.find(g => g.id === transaction.category_group_id);
                          return categoryGroup && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-full inline-block w-fit">
                              {categoryGroup.name}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        {new Date(transaction.transaction_date).toLocaleDateString('en-GB')}
                      </p>
                      <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                        <PayerDisplay
                          payerId={transaction.paid_by}
                          payerInfo={resolvePayer(transaction.paid_by, user?.id || '', participants, friends)}
                          size="xs"
                        />
                      </div>
                      {transaction.note && (
                        <p className="text-xs sm:text-sm text-muted-foreground break-words mt-2">{transaction.note}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-2 mt-2 sm:mt-0">
                    <span
                      className={`text-lg sm:text-xl font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      ₹{transaction.amount.toFixed(2)}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        title="Edit"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9"
                        title="Delete"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ));
        })()}
      </div>

      {/* Removed expenses-only section; list above now supports sorting */}
    </div>
  );
}
