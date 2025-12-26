import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
interface BroadcastMessage {
  id: string;
  title: string;
  message: string;
  created_at: string;
}
const BroadcastNotification = () => {
  const {
    user
  } = useAuth();
  const [messages, setMessages] = useState<BroadcastMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [readMessages, setReadMessages] = useState<string[]>([]);
  useEffect(() => {
    if (user) {
      fetchMessages();
      // Load read messages from localStorage
      const stored = localStorage.getItem(`read_broadcasts_${user.id}`);
      if (stored) {
        setReadMessages(JSON.parse(stored));
      }
    }
  }, [user]);
  useEffect(() => {
    // Calculate unread count
    const unread = messages.filter(m => !readMessages.includes(m.id)).length;
    setUnreadCount(unread);
  }, [messages, readMessages]);
  const fetchMessages = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('broadcast_messages').select('*').order('created_at', {
        ascending: false
      }).limit(20);
      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching broadcast messages:', error);
    }
  };
  const markAsRead = (messageId: string) => {
    if (!readMessages.includes(messageId)) {
      const updated = [...readMessages, messageId];
      setReadMessages(updated);
      if (user) {
        localStorage.setItem(`read_broadcasts_${user.id}`, JSON.stringify(updated));
      }
    }
  };
  const markAllAsRead = () => {
    const allIds = messages.map(m => m.id);
    setReadMessages(allIds);
    if (user) {
      localStorage.setItem(`read_broadcasts_${user.id}`, JSON.stringify(allIds));
    }
  };
  if (messages.length === 0) return null;
  return <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-primary-foreground dark:text-foreground" />
          {unreadCount > 0 && <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
              {unreadCount}
            </Badge>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Notifications</span>
            {unreadCount > 0 && <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3">
            {messages.map(msg => <Card key={msg.id} className={`cursor-pointer transition-colors ${readMessages.includes(msg.id) ? 'opacity-70' : 'border-primary'}`} onClick={() => markAsRead(msg.id)}>
                <CardHeader className="py-2 px-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{msg.title}</CardTitle>
                    {!readMessages.includes(msg.id) && <Badge variant="secondary" className="text-xs">New</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(msg.created_at), 'MMM dd, yyyy HH:mm')}
                  </p>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{msg.message}</p>
                </CardContent>
              </Card>)}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>;
};
export default BroadcastNotification;