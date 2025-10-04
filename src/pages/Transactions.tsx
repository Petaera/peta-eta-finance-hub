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
import { Plus, Pencil, Trash2, ArrowUpCircle, ArrowDownCircle, Filter, Calendar, Search, Users } from 'lucide-react';
import { groupsService, friendsService, resolvePayer } from '@/services/supabase';
import { PayerDisplay, GroupMemberList } from '@/components/ui/member-components';
import type { GroupMember, Friend } from '@/services/supabase';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string | null;
  transaction_date: string;
  category_id: string | null;
  catogory_group_id: string | null; // Note: matches the typo in your schema
  paid_by: string | null;
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
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState({
    dateFilter: 'all',
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
  });

  useEffect(() => {
    if (!user) return;
    fetchTransactions();
    fetchCategories();
    fetchParticipants(); 
    fetchCategoryGroups();
    fetchUserProfile();
    fetchGroupMembers();
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

  // Calculate date range based on filter
  const getDateRange = (filter: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    switch (filter) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'yesterday':
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        };
      case 'last7days':
        return {
          start: last7Days.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      case 'last30days':
        return {
          start: last30Days.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0]
        };
      default:
        return { start: '', end: '' };
    }
  };

  // Filter transactions based on selected filters
  const getFilteredTransactions = () => {
    let filtered = [...transactions];

    // Date filter
    if (selectedFilters.dateFilter !== 'all') {
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
        filtered = filtered.filter(transaction => {
          const transactionDate = transaction.transaction_date;
          return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
        });
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
        transaction.catogory_group_id === selectedFilters.groupFilter
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

    return filtered;
  };

  // Clear all filters
  const clearFilters = () => {
    setSelectedFilters({
      dateFilter: 'all',
      dateRange: { start: '', end: '' },
      categoryFilter: 'all',
      groupFilter: 'all',
      typeFilter: 'all',
      searchTerm: ''
    });
  };

  const fetchTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(id, name, type)
        `)
        .eq('user_id', user!.id)
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
        .select('id, name, type')
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

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('id, name, email, group_id')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching participants:', error);
        toast.error('Failed to fetch participants');
        return;
      }

      setParticipants(data || []);
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
      const { data, error } = await supabase
        .from('profiles')
        .select('id, default_group_id, default_category_id')
        .eq('id', user!.id)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data);
      // Update form data with defaults if available and form is reset
      if ((data?.default_group_id || data?.default_category_id) && !editingId && !isDialogOpen) {
        setFormData(prev => ({
          ...prev,
          category_group_id: data.default_group_id || 'none',
          category_id: data.default_category_id || 'none'
        }));
      }
    } catch (err) {
      console.error('Unexpected error:' , err);
    }
  };

  const fetchGroupMembers = async () => {
    try {
      const userGroups = await groupsService.getUserGroups(user!.id);
      const membersData: Record<string, GroupMember[]> = {};
      
      for (const group of userGroups) {
        const members = await groupsService.getGroupMembers(group.id);
        membersData[group.id] = members;
      }
      
      setGroupMembers(membersData);
    } catch (error) {
      console.error('Error fetching group members:', error);
      toast.error('Failed to fetch group members');
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
      catogory_group_id: formData.category_group_id === 'none' ? null : formData.category_group_id,
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
      category_group_id: transaction.catogory_group_id || 'none',
      paid_by: transaction.paid_by === user?.id ? 'user' : transaction.paid_by || 'user',
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
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">Manage your income and expenses</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => resetForm()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
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
                  <SelectTrigger>
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
                  step="0.01"
                  min="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Enter amount"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div className="space-y-2">
                  <Label>Category Group</Label>
                  <Select
                    value={formData.category_group_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, category_group_id: value })}
                  >
                    <SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

                <div className="space-y-2">
                  <Label>Paid By</Label>
                  <Select
                    value={formData.paid_by}
                    onValueChange={(value) => setFormData({ ...formData, paid_by: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Myself (Default)</SelectItem>
                      
                      {/* Group Members (Real Users) */}
                      {formData.category_group_id && formData.category_group_id !== 'none' && 
                        groupMembers[formData.category_group_id]?.map((member) => (
                          <SelectItem key={member.user_id} value={member.user_id}>
                            {member.user_profile?.full_name || member.user_profile?.email} (Group Member)
                          </SelectItem>
                        ))
                      }
                      
                      {/* Friends */}
                      {friends.map((friend) => (
                        <SelectItem key={friend.friend_profile?.id} value={friend.friend_profile?.id || ''}>
                          {friend.friend_profile?.full_name || friend.friend_profile?.email} (Friend)
                        </SelectItem>
                      ))}
                      
                      {/* Participants (Dummy Users) */}
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

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
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
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearFilters}
              >
                Clear All
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {showFilters && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

              {/* Date Filter */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select
                  value={selectedFilters.dateFilter}
                  onValueChange={(value) => setSelectedFilters({ ...selectedFilters, dateFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="yesterday">Yesterday</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Date Range */}
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

              {/* Type Filter */}
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select
                  value={selectedFilters.typeFilter}
                  onValueChange={(value) => setSelectedFilters({ ...selectedFilters, typeFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Group Filter */}
              <div className="space-y-2">
                <Label>Category Group</Label>
                <Select
                  value={selectedFilters.groupFilter}
                  onValueChange={(value) => setSelectedFilters({ ...selectedFilters, groupFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All groups" />
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

              {/* Category Filter */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={selectedFilters.categoryFilter}
                  onValueChange={(value) => setSelectedFilters({ ...selectedFilters, categoryFilter: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
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

      {/* Group Members Section */}
      {categoryGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Group Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryGroups.map((group) => {
                const members = groupMembers[group.id] || [];
                const groupParticipants = participants.filter(p => p.group_id === group.id);
                
                return (
                  <div key={group.id} className="space-y-2">
                    <h4 className="font-medium text-sm">{group.name}</h4>
                    <GroupMemberList
                      members={members}
                      participants={groupParticipants}
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {getFilteredTransactions().length === 0 ? (
          <Card>
            <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
              {transactions.length === 0 
                ? "No transactions yet. Add your first transaction above."
                : "No transactions match your filters. Try adjusting your search criteria."
              }
            </CardContent>
          </Card>
        ) : (
          getFilteredTransactions().map((transaction) => (
            <Card key={transaction.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  {transaction.type === 'income' ? (
                    <ArrowUpCircle className="h-8 w-8 text-success" />
                  ) : (
                    <ArrowDownCircle className="h-8 w-8 text-destructive" />
                  )}
                  <div>
                    <p>
                      <span className="font-medium">{transaction.categories?.name || 'Uncategorized'}</span>
                      {transaction.catogory_group_id && (() => {
                        const categoryGroup = categoryGroups.find(g => g.id === transaction.catogory_group_id);
                        return categoryGroup && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 px-1 rounded ml-2">
                            {categoryGroup.name}
                          </span>
                        );
                      })()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString('en-GB')}
                    </p>
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      <PayerDisplay
                        paidBy={transaction.paid_by}
                        userId={user?.id || ''}
                        participants={participants}
                        friends={friends}
                      />
                    </div>
                    {transaction.note && (
                      <p className="text-sm text-muted-foreground">{transaction.note}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-xl font-bold ${
                      transaction.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}
                  >
                    {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(transaction)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(transaction.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
