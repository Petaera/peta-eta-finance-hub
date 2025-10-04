import { supabase } from '@/integrations/supabase/client';

// Types
export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend_profile?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'member' | 'admin';
  created_at: string;
  user_profile?: {
    id: string;
    email: string;
    full_name?: string;
    avatar_url?: string;
  };
}

export interface CategoryGroup {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  members?: GroupMember[];
}

export interface Participant {
  id: string;
  name: string;
  email: string | null;
  group_id: string | null;
  created_at: string;
}

// Friends Service
export const friendsService = {
  // Get all friends (accepted status)
  async getFriends(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:friend_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get pending friend requests (received)
  async getPendingRequests(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get sent friend requests (pending)
  async getSentRequests(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        *,
        friend_profile:friend_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Send friend request
  async sendFriendRequest(userId: string, friendEmail: string): Promise<void> {
    // First, find the user by email
    const { data: friendData, error: friendError } = await supabase
      .from('auth.users')
      .select('id')
      .eq('email', friendEmail)
      .single();

    if (friendError || !friendData) {
      throw new Error('User not found with this email');
    }

    // Check if friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendData.id}),and(user_id.eq.${friendData.id},friend_id.eq.${userId})`)
      .single();

    if (existingFriendship) {
      throw new Error('Friendship already exists');
    }

    // Create friend request
    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendData.id,
        status: 'pending'
      });

    if (error) throw error;
  },

  // Accept friend request
  async acceptFriendRequest(friendshipId: string): Promise<void> {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', friendshipId);

    if (error) throw error;
  },

  // Reject friend request
  async rejectFriendRequest(friendshipId: string): Promise<void> {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
  },

  // Remove friend
  async removeFriend(friendshipId: string): Promise<void> {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) throw error;
  }
};

// Groups Service
export const groupsService = {
  // Get all groups user belongs to
  async getUserGroups(userId: string): Promise<CategoryGroup[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        group_id,
        role,
        category_groups!inner (
          id,
          user_id,
          name,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    return (data || []).map(item => ({
      ...item.category_groups,
      members: [] // Will be populated separately
    }));
  },

  // Get group members
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select(`
        *,
        user_profile:user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Add member to group
  async addMemberToGroup(groupId: string, userId: string, role: 'member' | 'admin' = 'member'): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role
      });

    if (error) throw error;
  },

  // Remove member from group
  async removeMemberFromGroup(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Update member role
  async updateMemberRole(groupId: string, userId: string, role: 'member' | 'admin'): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  // Create group
  async createGroup(userId: string, name: string): Promise<CategoryGroup> {
    const { data, error } = await supabase
      .from('category_groups')
      .insert({
        user_id: userId,
        name
      })
      .select()
      .single();

    if (error) throw error;

    // Add creator as admin
    await this.addMemberToGroup(data.id, userId, 'admin');

    return data;
  },

  // Delete group
  async deleteGroup(groupId: string): Promise<void> {
    const { error } = await supabase
      .from('category_groups')
      .delete()
      .eq('id', groupId);

    if (error) throw error;
  }
};

// Participants Service (for dummy participants)
export const participantsService = {
  // Get participants for a group
  async getGroupParticipants(groupId: string): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .eq('group_id', groupId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Get all participants
  async getAllParticipants(): Promise<Participant[]> {
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('name', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Create participant
  async createParticipant(name: string, email: string | null, groupId: string | null): Promise<Participant> {
    const { data, error } = await supabase
      .from('participants')
      .insert({
        name,
        email,
        group_id: groupId
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Update participant
  async updateParticipant(id: string, name: string, email: string | null, groupId: string | null): Promise<void> {
    const { error } = await supabase
      .from('participants')
      .update({
        name,
        email,
        group_id: groupId
      })
      .eq('id', id);

    if (error) throw error;
  },

  // Delete participant
  async deleteParticipant(id: string): Promise<void> {
    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};

// Helper function to resolve payer information
export const resolvePayer = (paidBy: string | null, userId: string, participants: Participant[], friends: Friend[]): { name: string; isUser: boolean; isDummy: boolean; avatar?: string } => {
  if (!paidBy) {
    return { name: 'Unknown', isUser: false, isDummy: false };
  }

  // Check if it's the current user
  if (paidBy === userId) {
    return { name: 'Myself', isUser: true, isDummy: false };
  }

  // Check if it's a participant (dummy)
  const participant = participants.find(p => p.id === paidBy);
  if (participant) {
    return { name: participant.name, isUser: false, isDummy: true };
  }

  // Check if it's a friend (real user)
  const friend = friends.find(f => f.friend_profile?.id === paidBy);
  if (friend) {
    return { 
      name: friend.friend_profile?.full_name || friend.friend_profile?.email || 'Unknown Friend', 
      isUser: true, 
      isDummy: false,
      avatar: friend.friend_profile?.avatar_url
    };
  }

  return { name: 'Unknown', isUser: false, isDummy: false };
};
