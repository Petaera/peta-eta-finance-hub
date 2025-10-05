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
      .select('*')
      .or(`and(user_id.eq.${userId},status.eq.accepted),and(friend_id.eq.${userId},status.eq.accepted)`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Manually fetch friend profiles from profiles table
    const friendsWithProfiles = await Promise.all(
      (data || []).map(async (friend) => {
        // Determine which ID is the friend (not the current user)
        const friendId = friend.user_id === userId ? friend.friend_id : friend.user_id;
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('id', friendId)
          .maybeSingle();
        
        return {
          ...friend,
          friend_profile: profile
        };
      })
    );
    
    return friendsWithProfiles;
  },

  // Get pending friend requests (received)
  async getPendingRequests(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .eq('friend_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Manually fetch friend profiles from profiles table
    const friendsWithProfiles = await Promise.all(
      (data || []).map(async (friend) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('id', friend.user_id)
          .maybeSingle();
        
        return {
          ...friend,
          friend_profile: profile
        };
      })
    );
    
    return friendsWithProfiles;
  },

  // Get sent friend requests (pending)
  async getSentRequests(userId: string): Promise<Friend[]> {
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Manually fetch friend profiles from profiles table
    const friendsWithProfiles = await Promise.all(
      (data || []).map(async (friend) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('id', friend.friend_id)
          .maybeSingle();
        
        return {
          ...friend,
          friend_profile: profile
        };
      })
    );
    
    return friendsWithProfiles;
  },

  // Send friend request
  async sendFriendRequest(userId: string, friendEmail: string): Promise<void> {
    // First, find the user by email in profiles table
    const { data: friendData, error: friendError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', friendEmail)
      .maybeSingle();

    if (friendError) {
      console.error('Error searching for friend:', friendError);
      throw new Error('Failed to search for user. Please try again.');
    }

    if (!friendData) {
      throw new Error(`No user found with email "${friendEmail}". Make sure they have signed up for the app.`);
    }

    // Check if trying to add yourself
    if (friendData.id === userId) {
      throw new Error('You cannot add yourself as a friend.');
    }

    // Check if friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friends')
      .select('id, status')
      .or(`and(user_id.eq.${userId},friend_id.eq.${friendData.id}),and(user_id.eq.${friendData.id},friend_id.eq.${userId})`)
      .maybeSingle();

    if (existingFriendship) {
      if (existingFriendship.status === 'pending') {
        throw new Error('A friend request is already pending between you and this user.');
      } else if (existingFriendship.status === 'accepted') {
        throw new Error('You are already friends with this user.');
      } else if (existingFriendship.status === 'blocked') {
        throw new Error('This user has blocked you.');
      }
    }

    // Create friend request
    const { error } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendData.id,
        status: 'pending'
      });

    if (error) {
      console.error('Error creating friend request:', error);
      throw new Error('Failed to send friend request. Please try again.');
    }
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
  // Get all groups user owns
  async getUserGroups(userId: string): Promise<CategoryGroup[]> {
    const { data, error } = await supabase
      .from('category_groups')
      .select('id, user_id, name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Get group members
  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select('id, group_id, user_id, role, created_at')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch user profiles for each member
    const membersWithProfiles = await Promise.all(
      (data || []).map(async (member) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('id', member.user_id)
          .maybeSingle();

        return {
          ...member,
          user_profile: profile
        } as GroupMember;
      })
    );

    // Ensure owner (category_groups.user_id) appears as admin even if no membership row exists
    const { data: groupRow } = await supabase
      .from('category_groups')
      .select('user_id')
      .eq('id', groupId)
      .maybeSingle();

    const hasOwner = !!membersWithProfiles.find(m => m.user_id === groupRow?.user_id);
    if (groupRow?.user_id && !hasOwner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .eq('id', groupRow.user_id)
        .maybeSingle();

      membersWithProfiles.unshift({
        id: `owner-${groupId}`,
        group_id: groupId,
        user_id: groupRow.user_id,
        role: 'admin',
        created_at: new Date().toISOString(),
        user_profile: profile
      } as GroupMember);
    }

    return membersWithProfiles;
  },

  // Add member to group
  async addMemberToGroup(groupId: string, userId: string, role: 'member' | 'admin' = 'member'): Promise<void> {
    // Check if membership already exists
    const { data: existing, error: existingError } = await supabase
      .from('group_members')
      .select('id, role')
      .eq('group_id', groupId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError && existingError.code !== 'PGRST116') {
      // Non "no rows" error
      throw existingError;
    }

    if (existing) {
      // Update role if it changed
      if (existing.role !== role) {
        const { error: updateError } = await supabase
          .from('group_members')
          .update({ role })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      }
      return;
    }

    // Insert new membership; ignore duplicate key errors (23505) just in case
    const { error } = await supabase
      .from('group_members')
      .insert({
        group_id: groupId,
        user_id: userId,
        role
      });

    if (error && (error as any).code !== '23505') throw error;
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
      .maybeSingle();

    if (error) throw error;

    // Ensure owner is recorded as admin member for consistency
    if (data?.id) {
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({ group_id: data.id, user_id: userId, role: 'admin' })
        .select();
      // Ignore unique violations (23505) if already exists
      if (memberError && (memberError as any).code !== '23505') {
        // Non-fatal for group creation, but surface if needed
        console.warn('Failed to insert owner as member:', memberError);
      }
    }

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
      .maybeSingle();

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

// Transactions Service
export const transactionsService = {
  // Get transactions for a specific group (all members can see all transactions in the group)
  async getGroupTransactions(groupId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        categories(id, name, type)
      `)
      .eq('category_group_id', groupId) // Show all transactions in this group
      .order('transaction_date', { ascending: false })
      .limit(10); // Limit to recent 10 transactions

    if (error) throw error;
    return data || [];
  },

  // Get transactions for a specific group with payer information
  async getGroupTransactionsWithPayer(groupId: string, participants: any[], friends: any[], currentUserId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        categories(id, name, type)
      `)
      .eq('category_group_id', groupId)
      .order('transaction_date', { ascending: false })
      .limit(10);

    if (error) throw error;
    
    // Manually fetch user profiles for each transaction
    const enhancedTransactions = await Promise.all((data || []).map(async (transaction) => {
      let userProfile = null;
      if (transaction.user_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .eq('id', transaction.user_id)
          .maybeSingle();
        userProfile = profile;
      }
      
      const payerInfo = resolvePayer(transaction.paid_by, currentUserId, participants, friends);
      return {
        ...transaction,
        profiles: userProfile,
        payer_info: payerInfo
      };
    }));

    return enhancedTransactions;
  }
};

// Helper function to safely get or create user profile
export const getOrCreateProfile = async (userId: string) => {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  if (!profile) {
    console.log('No profile found, creating one...');
    const { data: newProfile, error: createError } = await supabase
      .from('profiles')
      .insert({ 
        id: userId,
        email: '', // Will be updated by trigger
        full_name: 'User'
      })
      .select()
      .maybeSingle();

    if (createError) {
      console.error('Error creating profile:', createError);
      return null;
    }

    return newProfile;
  }

  return profile;
};

// Helper function to resolve payer information
export const resolvePayer = (paidBy: string | null, userId: string, participants: Participant[] = [], friends: Friend[] = []): { name: string; isUser: boolean; isDummy: boolean; avatar?: string } => {
  if (!paidBy) {
    return { name: 'Unknown', isUser: false, isDummy: false };
  }

  // Check if it's the current user
  if (paidBy === userId) {
    return { name: 'Myself', isUser: true, isDummy: false };
  }

  // Check if it's a participant (dummy) - with safety check
  if (participants && participants.length > 0) {
    const participant = participants.find(p => p.id === paidBy);
    if (participant) {
      return { name: participant.name, isUser: false, isDummy: true };
    }
  }

  // Check if it's a friend (real user) - with safety check
  if (friends && friends.length > 0) {
    const friend = friends.find(f => f.friend_profile?.id === paidBy);
    if (friend) {
      return { 
        name: friend.friend_profile?.full_name || friend.friend_profile?.email || 'Unknown Friend', 
        isUser: true, 
        isDummy: false,
        avatar: friend.friend_profile?.avatar_url
      };
    }
  }

  return { name: 'Unknown', isUser: false, isDummy: false };
};
