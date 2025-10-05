import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Users, Settings, Trash2, UserPlus, Crown, User, ArrowUpCircle, ArrowDownCircle, Receipt } from 'lucide-react';
import { groupsService, participantsService, friendsService, transactionsService, resolvePayer } from '@/services/supabase';
import { GroupMemberList, MemberCard, PayerDisplay } from '@/components/ui/member-components';
import type { CategoryGroup, GroupMember, Participant, Friend } from '@/services/supabase';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<CategoryGroup[]>([]);
  const [groupMembers, setGroupMembers] = useState<Record<string, GroupMember[]>>({});
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [groupTransactions, setGroupTransactions] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  
  // Form states
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [groupFormData, setGroupFormData] = useState({ name: '' });
  const [memberFormData, setMemberFormData] = useState({
    type: 'friend' as 'friend' | 'participant',
    friendId: '',
    participantId: '',
    role: 'member' as 'member' | 'admin'
  });

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch user's groups
      const userGroups = await groupsService.getUserGroups(user.id);
      setGroups(userGroups);

      // Fetch participants and friends for adding members
      const [participantsData, friendsData] = await Promise.all([
        participantsService.getAllParticipants(),
        friendsService.getFriends(user.id)
      ]);

      // Fetch members and transactions for each group
      const membersData: Record<string, GroupMember[]> = {};
      const transactionsData: Record<string, any[]> = {};
      for (const group of userGroups) {
        const members = await groupsService.getGroupMembers(group.id);
        membersData[group.id] = members;
        
        // Get group participants for this group
        const groupParticipants = participantsData.filter(p => p.group_id === group.id);
        
        // Fetch transactions with payer information
        const transactions = await transactionsService.getGroupTransactionsWithPayer(group.id, groupParticipants, friendsData, user.id);
        transactionsData[group.id] = transactions;
      }
      setGroupMembers(membersData);
      setGroupTransactions(transactionsData);
      
      setParticipants(participantsData);
      setFriends(friendsData);
    } catch (error) {
      console.error('Error fetching groups data:', error);
      toast.error('Failed to fetch groups data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupFormData.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const newGroup = await groupsService.createGroup(user!.id, groupFormData.name.trim());
      setGroups(prev => [newGroup, ...prev]);
      setGroupMembers(prev => ({ ...prev, [newGroup.id]: [] }));
      setGroupTransactions(prev => ({ ...prev, [newGroup.id]: [] }));
      setGroupFormData({ name: '' });
      setShowCreateGroupForm(false);
      toast.success('Group created successfully');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedGroup) {
      toast.error('Please select a group');
      return;
    }

    try {
      if (memberFormData.type === 'friend') {
        if (!memberFormData.friendId) {
          toast.error('Please select a friend');
          return;
        }
        await groupsService.addMemberToGroup(selectedGroup, memberFormData.friendId, memberFormData.role);
      } else {
        if (!memberFormData.participantId) {
          toast.error('Please select a participant');
          return;
        }
        // For participants, we need to add them to the group
        const participant = participants.find(p => p.id === memberFormData.participantId);
        if (participant) {
          await participantsService.updateParticipant(
            participant.id,
            participant.name,
            participant.email,
            selectedGroup
          );
        }
      }

      // Refresh data
      await fetchData();
      setMemberFormData({
        type: 'friend',
        friendId: '',
        participantId: '',
        role: 'member'
      });
      setShowAddMemberForm(false);
      toast.success('Member added successfully');
    } catch (error) {
      console.error('Error adding member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) return;

    try {
      await groupsService.removeMemberFromGroup(groupId, userId);
      await fetchData();
      toast.success('Member removed successfully');
    } catch (error) {
      console.error('Error removing member:', error);
      toast.error('Failed to remove member');
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!confirm('Are you sure you want to delete this group? This action cannot be undone.')) return;

    try {
      await groupsService.deleteGroup(groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
      const newGroupMembers = { ...groupMembers };
      const newGroupTransactions = { ...groupTransactions };
      delete newGroupMembers[groupId];
      delete newGroupTransactions[groupId];
      setGroupMembers(newGroupMembers);
      setGroupTransactions(newGroupTransactions);
      toast.success('Group deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      toast.error('Failed to delete group');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-40 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Groups</h1>
          <p className="text-muted-foreground">Manage your expense groups and members</p>
        </div>
        <Dialog open={showCreateGroupForm} onOpenChange={setShowCreateGroupForm}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Group</DialogTitle>
              <DialogDescription>
                Create a new group to organize your expenses and add members.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="group-name">Group Name</Label>
                <Input
                  id="group-name"
                  value={groupFormData.name}
                  onChange={(e) => setGroupFormData({ name: e.target.value })}
                  placeholder="Enter group name"
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  Create Group
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowCreateGroupForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {groups.length === 0 ? (
        <Card>
          <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No groups yet</p>
              <p className="text-sm">Create your first group to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => {
            const members = groupMembers[group.id] || [];
            const groupParticipants = participants.filter(p => p.group_id === group.id);
            const isAdmin = members.some(m => m.user_id === user?.id && m.role === 'admin');

            return (
              <Card key={group.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{group.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {members.length + groupParticipants.length} members
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Dialog open={showAddMemberForm && selectedGroup === group.id} onOpenChange={(open) => {
                          setShowAddMemberForm(open);
                          if (open) setSelectedGroup(group.id);
                          else setSelectedGroup(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Member to {group.name}</DialogTitle>
                              <DialogDescription>
                                Add a friend or participant to this group.
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleAddMember} className="space-y-4">
                              <div className="space-y-2">
                                <Label>Member Type</Label>
                                <Select
                                  value={memberFormData.type}
                                  onValueChange={(value) => setMemberFormData({ ...memberFormData, type: value as 'friend' | 'participant' })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="friend">Friend (Registered User)</SelectItem>
                                    <SelectItem value="participant">Participant (Dummy User)</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {memberFormData.type === 'friend' ? (
                                <div className="space-y-2">
                                  <Label>Select Friend</Label>
                                  <Select
                                    value={memberFormData.friendId}
                                    onValueChange={(value) => setMemberFormData({ ...memberFormData, friendId: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a friend" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {friends.map((friend) => (
                                        <SelectItem key={friend.friend_profile?.id} value={friend.friend_profile?.id || ''}>
                                          {friend.friend_profile?.full_name || friend.friend_profile?.email}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <Label>Select Participant</Label>
                                  <Select
                                    value={memberFormData.participantId}
                                    onValueChange={(value) => setMemberFormData({ ...memberFormData, participantId: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Choose a participant" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {participants.filter(p => !p.group_id).map((participant) => (
                                        <SelectItem key={participant.id} value={participant.id}>
                                          {participant.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}

                              <div className="space-y-2">
                                <Label>Role</Label>
                                <Select
                                  value={memberFormData.role}
                                  onValueChange={(value) => setMemberFormData({ ...memberFormData, role: value as 'member' | 'admin' })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="member">Member</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="flex gap-2">
                                <Button type="submit" className="flex-1">
                                  Add Member
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setShowAddMemberForm(false)}>
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteGroup(group.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GroupMemberList
                    members={members}
                    participants={groupParticipants}
                  />
                  
                  {/* Recent Transactions */}
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <h4 className="text-sm font-medium text-muted-foreground">Recent Transactions</h4>
                    </div>
                    
                    {groupTransactions[group.id]?.length > 0 ? (
                      <div className="space-y-2">
                        {groupTransactions[group.id].slice(0, 3).map((transaction) => (
                          <div key={transaction.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2">
                              {transaction.type === 'income' ? (
                                <ArrowUpCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <ArrowDownCircle className="h-4 w-4 text-red-600" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {transaction.categories?.name || 'Uncategorized'}
                                </p>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs text-muted-foreground truncate">
                                    {transaction.note || 'No description'}
                                  </p>
                                  {transaction.payer_info && (
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-muted-foreground">•</span>
                                      <PayerDisplay 
                                        payerId={transaction.paid_by}
                                        payerInfo={transaction.payer_info}
                                        size="xs"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-medium ${
                                transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ₹{transaction.amount.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(transaction.transaction_date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                        {groupTransactions[group.id].length > 3 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{groupTransactions[group.id].length - 3} more transactions
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No transactions yet</p>
                        <p className="text-xs">Add expenses to this group to see them here</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
