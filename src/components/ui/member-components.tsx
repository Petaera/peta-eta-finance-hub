import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function UserAvatar({ name, email, avatarUrl, size = 'md', className }: UserAvatarProps) {
  const sizeClasses = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarUrl} alt={name} />
      <AvatarFallback className="bg-primary text-primary-foreground">
        {getInitials(name)}
      </AvatarFallback>
    </Avatar>
  );
}

interface MemberCardProps {
  name: string;
  email?: string;
  avatarUrl?: string;
  role?: 'admin' | 'member';
  isDummy?: boolean;
  className?: string;
}

export function MemberCard({ name, email, avatarUrl, role, isDummy = false, className }: MemberCardProps) {
  return (
    <Card className={cn('p-3', className)}>
      <CardContent className="flex items-center gap-3 p-0">
        {isDummy ? (
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        ) : (
          <UserAvatar name={name} email={email} avatarUrl={avatarUrl} size="md" />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{name}</p>
          {email && (
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          )}
        </div>
        {role && (
          <Badge variant={role === 'admin' ? 'default' : 'secondary'} className="text-xs">
            {role}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

interface PayerDisplayProps {
  paidBy: string | null;
  userId: string;
  participants: Array<{ id: string; name: string; email?: string }>;
  friends: Array<{ friend_profile?: { id: string; full_name?: string; email?: string; avatar_url?: string } }>;
  className?: string;
}

export function PayerDisplay({ paidBy, userId, participants, friends, className }: PayerDisplayProps) {
  if (!paidBy) {
    return <span className={cn('text-muted-foreground', className)}>Unknown</span>;
  }

  // Check if it's the current user
  if (paidBy === userId) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <UserAvatar name="Myself" size="sm" />
        <span className="text-sm">Myself</span>
      </div>
    );
  }

  // Check if it's a participant (dummy)
  const participant = participants.find(p => p.id === paidBy);
  if (participant) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
          <Users className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className="text-sm">{participant.name}</span>
      </div>
    );
  }

  // Check if it's a friend (real user)
  const friend = friends.find(f => f.friend_profile?.id === paidBy);
  if (friend) {
    const friendName = friend.friend_profile?.full_name || friend.friend_profile?.email || 'Unknown Friend';
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <UserAvatar 
          name={friendName} 
          email={friend.friend_profile?.email}
          avatarUrl={friend.friend_profile?.avatar_url} 
          size="sm" 
        />
        <span className="text-sm">{friendName}</span>
      </div>
    );
  }

  return <span className={cn('text-muted-foreground', className)}>Unknown</span>;
}

interface GroupMemberListProps {
  members: Array<{
    id: string;
    user_id: string;
    role: 'admin' | 'member';
    user_profile?: {
      id: string;
      email: string;
      full_name?: string;
      avatar_url?: string;
    };
  }>;
  participants: Array<{
    id: string;
    name: string;
    email?: string;
    group_id?: string;
  }>;
  className?: string;
}

export function GroupMemberList({ members, participants, className }: GroupMemberListProps) {
  const groupParticipants = participants.filter(p => p.group_id);

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Group Members</h4>
      
      {/* Real Users */}
      {members.map((member) => (
        <MemberCard
          key={member.id}
          name={member.user_profile?.full_name || member.user_profile?.email || 'Unknown User'}
          email={member.user_profile?.email}
          avatarUrl={member.user_profile?.avatar_url}
          role={member.role}
          isDummy={false}
        />
      ))}

      {/* Dummy Participants */}
      {groupParticipants.map((participant) => (
        <MemberCard
          key={participant.id}
          name={participant.name}
          email={participant.email || undefined}
          isDummy={true}
        />
      ))}

      {members.length === 0 && groupParticipants.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No members in this group
        </p>
      )}
    </div>
  );
}
