import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Building2, Users, CheckCircle, Clock, XCircle, LogOut, Send, Settings, Loader2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import ThemeToggle from "@/components/ThemeToggle";
import appIcon from "@/assets/app-icon.png";
interface School {
  id: string;
  school_name: string;
  email: string;
  school_phone: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_end_date: string | null;
  trial_end_date: string | null;
  last_active: string | null;
  max_students: number | null;
}
const SuperAdmin = () => {
  const {
    toast
  } = useToast();
  const {
    user,
    signOut
  } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [schools, setSchools] = useState<School[]>([]);
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [managePlan, setManagePlan] = useState("Small");
  const [manageStatus, setManageStatus] = useState("trial");
  const [manageMaxStudents, setManageMaxStudents] = useState(200);
  const [manageDuration, setManageDuration] = useState("1year");
  useEffect(() => {
    checkSuperAdminStatus();
  }, [user]);

  // Set up realtime subscription for profiles updates
  useEffect(() => {
    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        (payload) => {
          // Update the school in our local state
          setSchools(prev => prev.map(school => 
            school.id === payload.new.id 
              ? { ...school, ...payload.new as School }
              : school
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkSuperAdminStatus = async () => {
    if (!user) {
      navigate('/superadmin');
      return;
    }
    try {
      const {
        data,
        error
      } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle();
      if (error) throw error;
      if (!data) {
        toast({
          title: "Access Denied",
          description: "You don't have super admin privileges",
          variant: "destructive"
        });
        navigate('/superadmin');
        return;
      }
      setIsSuperAdmin(true);
      fetchSchools();
    } catch (error) {
      console.error('Error checking admin status:', error);
      navigate('/superadmin');
    }
  };
  const fetchSchools = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('profiles').select('id, school_name, email, school_phone, subscription_status, subscription_plan, subscription_end_date, trial_end_date, last_active, max_students').order('school_name');
      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoading(false);
    }
  };
  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">Active</Badge>;
      case 'trial':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">Trial</Badge>;
      case 'expired':
        return <Badge className="bg-red-500/20 text-red-500 border-red-500/30">Expired</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };
  const stats = {
    total: schools.length,
    active: schools.filter(s => s.subscription_status === 'active').length,
    trial: schools.filter(s => s.subscription_status === 'trial').length,
    expired: schools.filter(s => s.subscription_status === 'expired').length
  };
  const handleManageSchool = (school: School) => {
    setSelectedSchool(school);
    setManagePlan(school.subscription_plan || "Small");
    setManageStatus(school.subscription_status || "trial");
    setManageMaxStudents(school.max_students || 200);
    setManageDuration("1year");
    setManageDialogOpen(true);
  };
  const getDurationInMs = (duration: string) => {
    switch (duration) {
      case "1month":
        return 30 * 24 * 60 * 60 * 1000;
      case "3months":
        return 90 * 24 * 60 * 60 * 1000;
      case "6months":
        return 180 * 24 * 60 * 60 * 1000;
      case "1year":
        return 365 * 24 * 60 * 60 * 1000;
      case "2years":
        return 730 * 24 * 60 * 60 * 1000;
      default:
        return 365 * 24 * 60 * 60 * 1000;
    }
  };
  const handleSaveChanges = async () => {
    if (!selectedSchool) return;
    setUpdatingStatus(true);
    try {
      const updateData: any = {
        subscription_status: manageStatus,
        subscription_plan: managePlan,
        max_students: manageMaxStudents
      };
      if (manageStatus === 'active') {
        updateData.subscription_end_date = new Date(Date.now() + getDurationInMs(manageDuration)).toISOString();
      }
      const {
        error
      } = await supabase.from('profiles').update(updateData).eq('id', selectedSchool.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "School settings updated successfully"
      });
      setManageDialogOpen(false);
      fetchSchools();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedSchool) return;
    setUpdatingStatus(true);
    try {
      const updateData: any = {
        subscription_status: newStatus
      };
      if (newStatus === 'active') {
        // Set subscription end date to 1 year from now
        updateData.subscription_end_date = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
      }
      const {
        error
      } = await supabase.from('profiles').update(updateData).eq('id', selectedSchool.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: `School status updated to ${newStatus}`
      });
      setManageDialogOpen(false);
      fetchSchools();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(false);
    }
  };
  const handleDeleteSchool = async (schoolId: string) => {
    if (!confirm('Are you sure you want to delete this school? This action cannot be undone.')) return;
    try {
      const {
        error
      } = await supabase.from('profiles').delete().eq('id', schoolId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "School deleted successfully"
      });
      fetchSchools();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleSendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and message",
        variant: "destructive"
      });
      return;
    }
    setSendingBroadcast(true);
    try {
      const {
        error
      } = await supabase.from('broadcast_messages').insert({
        title: broadcastTitle,
        message: broadcastMessage,
        created_by: user?.id
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: "Broadcast message sent to all users"
      });
      setBroadcastDialogOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSendingBroadcast(false);
    }
  };
  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };
  if (loading || !isSuperAdmin) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>;
  }
  return <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img alt="App Icon" className="h-10 w-10" src="/lovable-uploads/77d96be0-92d3-4be6-aa44-c05c166d820a.png" />
            <div>
              <h1 className="text-xl font-bold">Super Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">School Management System</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Schools</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trial</p>
                <p className="text-2xl font-bold">{stats.trial}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-3 rounded-lg bg-red-500/10">
                <XCircle className="h-6 w-6 text-red-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{stats.expired}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="schools" className="space-y-4">
          <TabsList>
            <TabsTrigger value="schools" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Schools
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schools">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> All Schools
                </CardTitle>
                <p className="text-sm text-muted-foreground">Manage school subscriptions, plans, and access</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Max Students</TableHead>
                        <TableHead>Next Payment</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schools.map(school => <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.school_name || 'Unnamed School'}</TableCell>
                          <TableCell>{school.email}</TableCell>
                          <TableCell>{getStatusBadge(school.subscription_status)}</TableCell>
                          <TableCell>{school.subscription_plan || 'Small'}</TableCell>
                          <TableCell>{school.max_students || 200}</TableCell>
                          <TableCell>
                            {school.subscription_end_date ? format(new Date(school.subscription_end_date), 'MMM dd, yyyy') : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleManageSchool(school)}>
                                <Settings className="h-4 w-4 mr-1" /> Manage
                              </Button>
                              {school.subscription_status === 'trial' || school.subscription_status === 'expired' ? <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {
                            setSelectedSchool(school);
                            handleUpdateStatus('active');
                          }}>
                                  <CheckCircle className="h-4 w-4 mr-1" /> Activate
                                </Button> : <Button size="sm" variant="destructive" onClick={() => {
                            setSelectedSchool(school);
                            handleUpdateStatus('expired');
                          }}>
                                  <XCircle className="h-4 w-4 mr-1" /> Deactivate
                                </Button>}
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteSchool(school.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> All Users
                </CardTitle>
                <p className="text-sm text-muted-foreground">View user activity and contact information</p>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>School Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Active</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {schools.map(school => <TableRow key={school.id}>
                          <TableCell className="font-medium">{school.school_name || 'Unnamed'}</TableCell>
                          <TableCell>{school.email}</TableCell>
                          <TableCell>{school.school_phone || '-'}</TableCell>
                          <TableCell>{getStatusBadge(school.subscription_status)}</TableCell>
                          <TableCell>
                            {school.last_active ? format(new Date(school.last_active), 'MMM dd, yyyy HH:mm') : 'Never'}
                          </TableCell>
                        </TableRow>)}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Broadcast Message Button */}
        <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
          <DialogTrigger asChild>
            <Button className="fixed bottom-6 right-6 shadow-lg" size="lg">
              <Send className="h-4 w-4 mr-2" /> Broadcast Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Send Broadcast Message</DialogTitle>
              <DialogDescription>Send a message to all app users</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={broadcastTitle} onChange={e => setBroadcastTitle(e.target.value)} placeholder="Message title..." />
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} placeholder="Type your message here..." rows={4} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBroadcastDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSendBroadcast} disabled={sendingBroadcast}>
                {sendingBroadcast ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Send Message
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manage School Dialog */}
        <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage School</DialogTitle>
              <DialogDescription>Update subscription and plan settings for {selectedSchool?.school_name}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Plan Type</Label>
                <Select value={managePlan} onValueChange={setManagePlan}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="Small">Small (up to 200 students)</SelectItem>
                    <SelectItem value="Medium">Medium (up to 500 students)</SelectItem>
                    <SelectItem value="Large">Large (up to 1000 students)</SelectItem>
                    <SelectItem value="Enterprise">Enterprise (unlimited)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Subscription Status</Label>
                <Select value={manageStatus} onValueChange={setManageStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Max Students</Label>
                <Input type="number" value={manageMaxStudents} onChange={e => setManageMaxStudents(Number(e.target.value))} placeholder="200" />
              </div>

              <div className="space-y-2">
                <Label>Plan Duration</Label>
                <Select value={manageDuration} onValueChange={setManageDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover">
                    <SelectItem value="1month">1 Month</SelectItem>
                    <SelectItem value="3months">3 Months</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setManageDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveChanges} disabled={updatingStatus}>
                {updatingStatus ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>;
};
export default SuperAdmin;