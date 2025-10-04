import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  UserPlus, 
  Users, 
  UserCheck, 
  UserX, 
  Mail, 
  Clock, 
  Trash2,
  Send,
  Check,
  X
} from 'lucide-react';
import { friendsService } from '@/services/supabase';
import { UserAvatar, MemberCard } from '@/components/ui/member-components';
import type { Friend } from '@/services/supabase';

export default function Friends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'friends' | 'pending' | 'sent'>('friends');
  
  // Form states
  const [showSendRequestForm, setShowSendRequestForm] = useState(false);
  const [requestFormData, setRequestFormData] = useState({ email: '' });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchFriendsData();
  }, [user]);

  const fetchFriendsData = async () => {
    try {
      setLoading(true);
      
      const [friendsData, pendingData, sentData] = await Promise.all([
        friendsService.getFriends(user!.id),
        friendsService.getPendingRequests(user!.id),
        friendsService.getSentRequests(user!.id)
      ]);
      
      setFriends(friendsData);
      setPendingRequests(pendingData);
      setSentRequests(sentData);
    } catch (error) {
      console.error('Error fetching friends data:', error);
      toast.error('Failed to fetch friends data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestFormData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    try {
      setFormLoading(true);
      await friendsService.sendFriendRequest(user!.id, requestFormData.email.trim());
      await fetchFriendsData();
      setRequestFormData({ email: '' });
      setShowSendRequestForm(false);
      toast.success('Friend request sent successfully');
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.message || 'Failed to send friend request');
    } finally {
      setFormLoading(false);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await friendsService.acceptFriendRequest(friendshipId);
      await fetchFriendsData();
      toast.success('Friend request accepted');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await friendsService.rejectFriendRequest(friendshipId);
      await fetchFriendsData();
      toast.success('Friend request rejected');
    } catch (error) {
      console.error('Error rejecting friend request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  const handleRemoveFriend = async (friendshipId: string) => {
    if (!confirm('Are you sure you want to remove this friend?')) return;

    try {
      await friendsService.removeFriend(friendshipId);
      await fetchFriendsData();
      toast.success('Friend removed successfully');
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold">Friends</h1>
          <p className="text-muted-foreground">Manage your friends and friend requests</p>
        </div>
        <Dialog open={showSendRequestForm} onOpenChange={setShowSendRequestForm}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Send Request
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Friend Request</DialogTitle>
              <DialogDescription>
                Enter the email address of the person you want to add as a friend.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="friend-email">Friend's Email</Label>
                <Input
                  id="friend-email"
                  type="email"
                  value={requestFormData.email}
                  onChange={(e) => setRequestFormData({ email: e.target.value })}
                  placeholder="Enter friend's email address"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Enter the email address of the person you want to add as a friend. They must have already signed up for the app.
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={formLoading}>
                  {formLoading ? 'Sending...' : 'Send Request'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowSendRequestForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'friends' | 'pending' | 'sent')}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Requests ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent ({sentRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-4">
          {friends.length === 0 ? (
            <Card>
              <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No friends yet</p>
                  <p className="text-sm">Send friend requests to get started</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => (
                <Card key={friend.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={friend.friend_profile?.full_name || friend.friend_profile?.email || 'Unknown'}
                        email={friend.friend_profile?.email}
                        avatarUrl={friend.friend_profile?.avatar_url}
                        size="md"
                      />
                      <div>
                        <p className="font-medium">
                          {friend.friend_profile?.full_name || friend.friend_profile?.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Friends since {new Date(friend.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveFriend(friend.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending requests</p>
                  <p className="text-sm">You have no friend requests waiting for approval</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={request.friend_profile?.full_name || request.friend_profile?.email || 'Unknown'}
                        email={request.friend_profile?.email}
                        avatarUrl={request.friend_profile?.avatar_url}
                        size="md"
                      />
                      <div>
                        <p className="font-medium">
                          {request.friend_profile?.full_name || request.friend_profile?.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Sent {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAcceptRequest(request.id)}
                        className="text-green-600 hover:text-green-600"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRejectRequest(request.id)}
                        className="text-red-600 hover:text-red-600"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4">
          {sentRequests.length === 0 ? (
            <Card>
              <CardContent className="flex h-40 items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sent requests</p>
                  <p className="text-sm">You haven't sent any friend requests yet</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sentRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        name={request.friend_profile?.full_name || request.friend_profile?.email || 'Unknown'}
                        email={request.friend_profile?.email}
                        avatarUrl={request.friend_profile?.avatar_url}
                        size="md"
                      />
                      <div>
                        <p className="font-medium">
                          {request.friend_profile?.full_name || request.friend_profile?.email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Sent {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>How to Add Friends</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Steps to add friends:</h4>
            <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
              <li>Make sure your friend has signed up for the app</li>
              <li>Use the exact email address they used to sign up</li>
              <li>They will receive a friend request notification</li>
              <li>Once they accept, you can add them to groups</li>
            </ol>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Common error messages:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>"No user found"</strong> - Friend hasn't signed up yet</li>
              <li><strong>"Already friends"</strong> - You're already connected</li>
              <li><strong>"Request pending"</strong> - Waiting for them to accept</li>
              <li><strong>"Cannot add yourself"</strong> - You can't friend yourself</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
