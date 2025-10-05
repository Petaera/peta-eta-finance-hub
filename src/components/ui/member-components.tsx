import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Users, Trash2 } from 'lucide-react';
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
  payerId: string | null;
  payerInfo: { name: string; isUser: boolean; isDummy: boolean; avatar?: string };
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function PayerDisplay({ payerId, payerInfo, size = 'sm', className }: PayerDisplayProps) {
  if (!payerId || !payerInfo) {
    return <span className={cn('text-muted-foreground', className)}>Unknown</span>;
  }

  const sizeClasses = {
    xs: 'h-4 w-4 text-xs',
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };

  // If it's a dummy participant
  if (payerInfo.isDummy) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <div className={cn('rounded-full bg-muted flex items-center justify-center', sizeClasses[size])}>
          <Users className="h-3 w-3 text-muted-foreground" />
        </div>
        <span className={cn('text-muted-foreground', size === 'xs' ? 'text-xs' : 'text-sm')}>{payerInfo.name}</span>
      </div>
    );
  }

  // If it's a real user (including current user)
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <UserAvatar 
        name={payerInfo.name} 
        avatarUrl={payerInfo.avatar}
        size={size === 'xs' ? 'sm' : size} 
      />
      <span className={cn('text-muted-foreground', size === 'xs' ? 'text-xs' : 'text-sm')}>{payerInfo.name}</span>
    </div>
  );
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
  canRemove?: boolean;
  onRemoveMember?: (userId: string) => void;
}

export function GroupMemberList({ members, participants, className, canRemove = false, onRemoveMember }: GroupMemberListProps) {
  const groupParticipants = participants.filter(p => p.group_id);

  return (
    <div className={cn('space-y-2', className)}>
      <h4 className="text-sm font-medium text-muted-foreground mb-2">Group Members</h4>
      {/* Real Users */}
      {members.map((member) => (
        <div key={member.id} className="flex items-center gap-2">
          <div className="flex-1">
            <MemberCard
              name={member.user_profile?.full_name || member.user_profile?.email || 'Unknown User'}
              email={member.user_profile?.email}
              avatarUrl={member.user_profile?.avatar_url}
              role={member.role}
              isDummy={false}
            />
          </div>
          {canRemove && onRemoveMember && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => onRemoveMember(member.user_id)}
              aria-label="Remove member"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
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
