import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Search, ChevronLeft, ChevronRight, Users } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface Student {
  id: string;
  admission_no: string;
  full_name: string;
  class_name: string;
  parent_contact: string;
  parent_name: string;
  total_fee: number;
}

const ITEMS_PER_PAGE = 10;

const Students = () => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Mock data
  const [students, setStudents] = useState<Student[]>([
    { id: "1", admission_no: "ADM001", full_name: "John Doe", class_name: "Grade 1", parent_contact: "+254 700 000 001", parent_name: "Jane Doe", total_fee: 50000 },
    { id: "2", admission_no: "ADM002", full_name: "Jane Smith", class_name: "Grade 2", parent_contact: "+254 700 000 002", parent_name: "John Smith", total_fee: 55000 },
    { id: "3", admission_no: "ADM003", full_name: "Michael Johnson", class_name: "Grade 3", parent_contact: "+254 700 000 003", parent_name: "Mary Johnson", total_fee: 60000 },
    { id: "4", admission_no: "ADM004", full_name: "Sarah Williams", class_name: "Grade 1", parent_contact: "+254 700 000 004", parent_name: "Tom Williams", total_fee: 50000 },
    { id: "5", admission_no: "ADM005", full_name: "David Brown", class_name: "Grade 4", parent_contact: "+254 700 000 005", parent_name: "Lisa Brown", total_fee: 65000 },
  ]);

  const classes = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];

  const [formData, setFormData] = useState({
    admission_no: "",
    full_name: "",
    class_name: "",
    parent_contact: "",
    parent_name: "",
  });

  const filteredStudents = students.filter(
    (student) =>
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.admission_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const resetForm = () => {
    setFormData({
      admission_no: "",
      full_name: "",
      class_name: "",
      parent_contact: "",
      parent_name: "",
    });
    setEditingStudent(null);
  };

  const handleOpenDialog = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        admission_no: student.admission_no,
        full_name: student.full_name,
        class_name: student.class_name,
        parent_contact: student.parent_contact,
        parent_name: student.parent_name,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.admission_no || !formData.full_name || !formData.class_name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingStudent) {
      setStudents(students.map(s => 
        s.id === editingStudent.id 
          ? { ...s, ...formData }
          : s
      ));
      toast({ title: "Success", description: "Student updated successfully" });
    } else {
      const newStudent: Student = {
        id: Date.now().toString(),
        ...formData,
        total_fee: 50000,
      };
      setStudents([...students, newStudent]);
      toast({ title: "Success", description: "Student added successfully" });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setStudents(students.filter(s => s.id !== id));
    toast({ title: "Success", description: "Student deleted successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Students</h1>
          <p className="text-muted-foreground">Manage student records and enrollments</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Student List ({filteredStudents.length})</CardTitle>
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
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
                      <Label>Admission Number *</Label>
                      <Input
                        value={formData.admission_no}
                        onChange={(e) => setFormData({ ...formData, admission_no: e.target.value })}
                        placeholder="ADM001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Full Name *</Label>
                      <Input
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Class *</Label>
                      <Select value={formData.class_name} onValueChange={(val) => setFormData({ ...formData, class_name: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls} value={cls}>{cls}</SelectItem>
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
                      <Label>Parent Contact</Label>
                      <Input
                        value={formData.parent_contact}
                        onChange={(e) => setFormData({ ...formData, parent_contact: e.target.value })}
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
                  <TableHead>Adm No</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">{student.admission_no}</TableCell>
                    <TableCell>{student.full_name}</TableCell>
                    <TableCell>{student.class_name}</TableCell>
                    <TableCell>{student.parent_name}</TableCell>
                    <TableCell>{student.parent_contact}</TableCell>
                    <TableCell>{formatCurrency(student.total_fee)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(student)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(student.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
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
    </div>
  );
};

export default Students;
