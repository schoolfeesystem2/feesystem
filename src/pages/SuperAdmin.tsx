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
import { Building2, Users, CheckCircle, Clock, XCircle, LogOut, Send, Settings, Loader2, Trash2, Calendar, Upload, Video, Smartphone, UserCircle } from "lucide-react";
import { format } from "date-fns";
import ThemeToggle from "@/components/ThemeToggle";
import appIcon from "@/assets/app-icon.png";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

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
  const [customEndDate, setCustomEndDate] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  
  // Targeted messaging
  const [broadcastTarget, setBroadcastTarget] = useState<string>("all");
  
  // App settings
  const [apkUrl, setApkUrl] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [uploadingApk, setUploadingApk] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  useEffect(() => {
    checkSuperAdminStatus();
    fetchAppSettings();
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
  
  const fetchAppSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings' as any)
        .select('key, value')
        .in('key', ['android_apk_url', 'demo_video_url']);

      if (error) throw error;

      (data as any[])?.forEach((setting: { key: string; value: string | null }) => {
        if (setting.key === 'android_apk_url') setApkUrl(setting.value || '');
        if (setting.key === 'demo_video_url') setVideoUrl(setting.value || '');
      });
    } catch (error) {
      console.error('Error fetching app settings:', error);
    }
  };

  const handleApkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.apk')) {
      toast({
        title: "Invalid file",
        description: "Please upload an APK file",
        variant: "destructive"
      });
      return;
    }

    setUploadingApk(true);
    toast({
      title: "Uploading...",
      description: "Please wait while the APK is being uploaded"
    });

    try {
      // Delete old APK if exists
      const { data: existingFiles } = await supabase.storage
        .from('app-files')
        .list('', { search: 'app' });

      if (existingFiles && existingFiles.length > 0) {
        await supabase.storage
          .from('app-files')
          .remove(existingFiles.map(f => f.name));
      }

      // Upload new APK
      const fileName = `app-${Date.now()}.apk`;
      const { error: uploadError } = await supabase.storage
        .from('app-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('app-files')
        .getPublicUrl(fileName);

      // Save URL to settings using upsert
      const { error: upsertError } = await supabase
        .from('app_settings' as any)
        .upsert({ 
          key: 'android_apk_url',
          value: publicUrl, 
          updated_at: new Date().toISOString(), 
          updated_by: user?.id 
        }, { onConflict: 'key' });

      if (upsertError) throw upsertError;

      setApkUrl(publicUrl);
      toast({
        title: "Upload Complete!",
        description: "APK has been uploaded and is now available for users to download"
      });
    } catch (error: any) {
      console.error('APK upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload APK. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploadingApk(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleSaveVideoUrl = async () => {
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('app_settings' as any)
        .upsert({ 
          key: 'demo_video_url',
          value: videoUrl, 
          updated_at: new Date().toISOString(), 
          updated_by: user?.id 
        }, { onConflict: 'key' });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Demo video URL saved successfully"
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSavingSettings(false);
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
        if (manageDuration === 'custom' && customEndDate) {
          updateData.subscription_end_date = new Date(customEndDate).toISOString();
        } else {
          updateData.subscription_end_date = new Date(Date.now() + getDurationInMs(manageDuration)).toISOString();
        }
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
  const handleDeleteClick = (schoolId: string) => {
    setDeletingSchoolId(schoolId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingSchoolId) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', deletingSchoolId);
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
    } finally {
      setDeleteDialogOpen(false);
      setDeletingSchoolId(null);
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
      const insertData: any = {
        title: broadcastTitle,
        message: broadcastMessage,
        created_by: user?.id,
        target_user_id: broadcastTarget === 'all' ? null : broadcastTarget
      };
      
      const {
        error
      } = await supabase.from('broadcast_messages').insert(insertData);
      if (error) throw error;
      toast({
        title: "Success",
        description: broadcastTarget === 'all' 
          ? "Broadcast message sent to all subscribed users" 
          : "Message sent to selected user"
      });
      setBroadcastDialogOpen(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastTarget("all");
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
            <TabsTrigger value="app-settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> App Settings
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
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(school.id)}>
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

          <TabsContent value="app-settings">
            <div className="grid md:grid-cols-2 gap-6">
              {/* APK Upload */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5" /> Android App (APK)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Current APK URL</Label>
                    <Input value={apkUrl} readOnly className="mt-1" placeholder="No APK uploaded yet" />
                  </div>
                  <div>
                    <Label>Upload New APK</Label>
                    <div className="mt-1">
                      <input
                        type="file"
                        accept=".apk"
                        onChange={handleApkUpload}
                        className="hidden"
                        id="apk-upload"
                        disabled={uploadingApk}
                      />
                      <Button asChild disabled={uploadingApk}>
                        <label htmlFor="apk-upload" className="cursor-pointer">
                          {uploadingApk ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          {uploadingApk ? "Uploading..." : "Choose APK File"}
                        </label>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Demo Video URL */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" /> Demo Video
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>YouTube Video URL</Label>
                    <Input 
                      value={videoUrl} 
                      onChange={(e) => setVideoUrl(e.target.value)}
                      className="mt-1" 
                      placeholder="https://www.youtube.com/watch?v=..." 
                    />
                  </div>
                  <Button onClick={handleSaveVideoUrl} disabled={savingSettings}>
                    {savingSettings ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save Video URL
                  </Button>
                </CardContent>
              </Card>
            </div>
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
              <DialogDescription>Send a message to subscribed users or a specific user</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Send To</Label>
                <Select value={broadcastTarget} onValueChange={setBroadcastTarget}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-popover max-h-60">
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        All Subscribed Users
                      </div>
                    </SelectItem>
                    {schools.filter(s => s.subscription_status === 'active').map(school => (
                      <SelectItem key={school.id} value={school.id}>
                        <div className="flex items-center gap-2">
                          <UserCircle className="h-4 w-4" />
                          {school.school_name || school.email}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                    <SelectItem value="custom">Custom Date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {manageDuration === 'custom' && (
                <div className="space-y-2">
                  <Label>Custom End Date</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>
              )}
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

        <DeleteConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteConfirm}
          title="Delete School"
          description="Are you sure you want to delete this school? This action cannot be undone and will remove all associated data."
        />
      </main>
    </div>;
};
export default SuperAdmin;