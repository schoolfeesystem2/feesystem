import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Users, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

interface Student {
  id: string;
  admission_number: string | null;
  name: string;
  class_id: string | null;
  class_name: string;
  parent_name: string | null;
  phone: string | null;
  status: string;
  total_fee: number;
}

interface ClassOption {
  id: string;
  name: string;
  monthly_fee: number;
}

const ITEMS_PER_PAGE = 10;

const Students = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [maxStudents, setMaxStudents] = useState<number>(200);

  const [formData, setFormData] = useState({
    admission_number: "",
    name: "",
    class_id: "",
    parent_name: "",
    phone: "",
  });

  useEffect(() => {
    if (user) {
      fetchStudents();
      fetchClasses();
      fetchUserLimits();
    }
  }, [user]);

  const fetchUserLimits = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('max_students')
        .eq('id', user?.id)
        .single();

      if (error) throw error;
      setMaxStudents(data?.max_students || 200);
    } catch (error) {
      console.error('Error fetching user limits:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, classes(name, monthly_fee)')
        .order('name');

      if (error) throw error;

      const formattedStudents = data?.map(s => {
        const classData = s.classes as any;
        return {
          id: s.id,
          admission_number: s.admission_number,
          name: s.name,
          class_id: s.class_id,
          class_name: classData?.name || 'Unassigned',
          parent_name: s.parent_name,
          phone: s.phone,
          status: s.status || 'active',
          total_fee: classData?.monthly_fee || 0,
        };
      }) || [];

      setStudents(formattedStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, monthly_fee')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.admission_number && student.admission_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetForm = () => {
    setFormData({ admission_number: "", name: "", class_id: "", parent_name: "", phone: "" });
    setEditingStudent(null);
  };

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        admission_number: student.admission_number || "",
        name: student.name,
        class_id: student.class_id || "",
        parent_name: student.parent_name || "",
        phone: student.phone || "",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Please enter student name",
        variant: "destructive",
      });
      return;
    }

    // Check student limit when adding new student
    if (!editingStudent && students.length >= maxStudents) {
      toast({
        title: "Student Limit Reached",
        description: `You have reached your maximum limit of ${maxStudents} students. Please upgrade your plan to add more students.`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update({
            admission_number: formData.admission_number || null,
            name: formData.name,
            class_id: formData.class_id || null,
            parent_name: formData.parent_name || null,
            phone: formData.phone || null,
          })
          .eq('id', editingStudent.id);

        if (error) {
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            toast({
              title: "Error",
              description: "This admission number is already used by another student",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        toast({ title: "Success", description: "Student updated successfully" });
      } else {
        const { error } = await supabase
          .from('students')
          .insert({
            admission_number: formData.admission_number || null,
            name: formData.name,
            class_id: formData.class_id || null,
            parent_name: formData.parent_name || null,
            phone: formData.phone || null,
            user_id: user?.id,
          });

        if (error) {
          if (error.message.includes('duplicate') || error.message.includes('unique')) {
            toast({
              title: "Error",
              description: "This admission number is already used by another student",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        toast({ title: "Success", description: "Student added successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingStudentId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStudentId) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', deletingStudentId);

      if (error) throw error;
      toast({ title: "Success", description: "Student deleted successfully" });
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingStudentId(null);
    }
  };

  const studentsUsedPercentage = (students.length / maxStudents) * 100;
  const studentsRemaining = maxStudents - students.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student records and enrollments</p>
        </div>
      </div>

      {/* Student Usage Status Card */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student Usage</p>
                <p className="text-xl font-bold">{students.length} / {maxStudents}</p>
              </div>
            </div>
            <div className="flex-1 max-w-md">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Used: {students.length}</span>
                <span className="text-muted-foreground">Remaining: {studentsRemaining}</span>
              </div>
              <Progress value={studentsUsedPercentage} className="h-2" />
              {studentsUsedPercentage >= 90 && (
                <div className="flex items-center gap-1 mt-2 text-sm text-yellow-600 dark:text-yellow-400">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{studentsUsedPercentage >= 100 ? "Limit reached!" : "Approaching limit!"}</span>
                </div>
              )}
            </div>
            {studentsRemaining <= 0 && (
              <Badge variant="destructive">Limit Reached</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Student List ({filteredStudents.length})</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or admission no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" /> Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingStudent ? "Edit Student" : "Add New Student"}</DialogTitle>
                    <DialogDescription>
                      {editingStudent ? "Update student information" : "Enter the student details below"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Admission Number</Label>
                      <Input
                        value={formData.admission_number}
                        onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                        placeholder="e.g., 001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Class</Label>
                      <Select value={formData.class_id} onValueChange={(val) => setFormData({ ...formData, class_id: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Parent Name</Label>
                      <Input
                        value={formData.parent_name}
                        onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+254 700 000 000"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>{editingStudent ? "Update" : "Add"} Student</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Adm. No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : paginatedStudents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No students found. Add your first student to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-mono text-sm">{student.admission_number || "-"}</TableCell>
                      <TableCell className="font-medium">{student.name}</TableCell>
                      <TableCell>{student.class_name}</TableCell>
                      <TableCell>{student.parent_name || "-"}</TableCell>
                      <TableCell>{student.phone || "-"}</TableCell>
                      <TableCell>{formatCurrency(student.total_fee)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(student)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(student.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredStudents.length)} of {filteredStudents.length}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Student"
        description="Are you sure you want to delete this student? This action cannot be undone and will also delete all associated payment records."
      />
    </div>
  );
};

export default Students;