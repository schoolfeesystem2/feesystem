import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Receipt, ChevronLeft, ChevronRight, Pencil, Download, FileSpreadsheet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";

interface Payment {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_type: string;
  notes: string;
}

interface Student {
  id: string;
  name: string;
  admission_number: string | null;
  class_id: string | null;
}

interface Class {
  id: string;
  name: string;
}

const ITEMS_PER_PAGE = 10;

const Payments = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassId, setSelectedClassId] = useState("");

  const paymentMethods = ["Cash", "M-Pesa", "Bank Transfer", "Cheque"];

  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_method: "",
    notes: "",
  });

  useEffect(() => {
    if (user) {
      fetchPayments();
      fetchStudents();
      fetchClasses();
    }
  }, [user]);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, students(name, admission_number)')
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const formattedPayments = data?.map(p => ({
        id: p.id,
        student_id: p.student_id,
        student_name: (p.students as any)?.name || 'Unknown',
        admission_number: (p.students as any)?.admission_number || null,
        amount: p.amount,
        payment_date: p.payment_date,
        payment_method: p.payment_method || 'Cash',
        payment_type: p.payment_type || 'Tuition',
        notes: p.notes || '',
      })) || [];

      setPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, admission_number, class_id')
        .eq('status', 'active');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  // Filter students by selected class
  const filteredStudentsByClass = selectedClassId 
    ? students.filter(s => s.class_id === selectedClassId)
    : [];

  const filteredPayments = payments.filter(
    (payment) =>
      payment.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.payment_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (payment.admission_number && payment.admission_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredPayments.length / ITEMS_PER_PAGE);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);

  const resetForm = () => {
    setFormData({ student_id: "", amount: "", payment_method: "", notes: "" });
    setSelectedClassId("");
    setEditingPayment(null);
  };

  const handleOpenDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      // Find the student to get their class_id
      const student = students.find(s => s.id === payment.student_id);
      if (student?.class_id) {
        setSelectedClassId(student.class_id);
      }
      setFormData({
        student_id: payment.student_id,
        amount: payment.amount.toString(),
        payment_method: payment.payment_method,
        notes: payment.notes,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setFormData({ ...formData, student_id: "" }); // Reset student selection when class changes
  };

  const handleSave = async () => {
    if (!selectedClassId || !formData.student_id || !formData.amount || !formData.payment_method) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingPayment) {
        const { error } = await supabase
          .from('payments')
          .update({
            student_id: formData.student_id,
            amount: Number(formData.amount),
            payment_method: formData.payment_method,
            notes: formData.notes,
          })
          .eq('id', editingPayment.id);

        if (error) throw error;
        toast({ title: "Success", description: "Payment updated successfully" });
      } else {
        const { error } = await supabase
          .from('payments')
          .insert({
            student_id: formData.student_id,
            amount: Number(formData.amount),
            payment_method: formData.payment_method,
            notes: formData.notes,
            user_id: user?.id,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Payment recorded successfully" });
      }

      setIsDialogOpen(false);
      resetForm();
      fetchPayments();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportPDF = () => {
    const data = {
      title: "Payment History",
      headers: ["Adm. No.", "Student", "Amount", "Method", "Date", "Notes"],
      rows: filteredPayments.map(p => [
        p.admission_number || "-",
        p.student_name,
        formatCurrency(p.amount),
        p.payment_method,
        formatDate(p.payment_date),
        p.notes || "-"
      ]),
    };
    exportToPDF(data, "payments-report");
    toast({ title: "Success", description: "PDF downloaded successfully" });
  };

  const handleExportExcel = () => {
    const data = {
      title: "Payments",
      headers: ["Adm. No.", "Student", "Amount", "Method", "Date", "Notes"],
      rows: filteredPayments.map(p => [
        p.admission_number || "",
        p.student_name,
        p.amount,
        p.payment_method,
        p.payment_date,
        p.notes || ""
      ]),
    };
    exportToExcel(data, "payments-report");
    toast({ title: "Success", description: "Excel file downloaded successfully" });
  };

  // Get selected student for display
  const selectedStudent = students.find(s => s.id === formData.student_id);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Track and manage fee payments</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalAmount)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount / payments.length || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Payment History</CardTitle>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or admission no..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                />
              </div>
              <Button variant="outline" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-2" /> PDF
              </Button>
              <Button variant="outline" onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => handleOpenDialog()}>
                    <Plus className="h-4 w-4 mr-2" /> Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>{editingPayment ? "Edit Payment" : "Record New Payment"}</DialogTitle>
                    <DialogDescription>
                      {editingPayment ? "Update the payment details" : "Enter the payment details below"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Class *</Label>
                      <Select value={selectedClassId} onValueChange={handleClassChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select class first" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((cls) => (
                            <SelectItem key={cls.id} value={cls.id}>
                              {cls.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Student *</Label>
                      <Select 
                        value={formData.student_id} 
                        onValueChange={(val) => setFormData({ ...formData, student_id: val })}
                        disabled={!selectedClassId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={selectedClassId ? "Select student" : "Select class first"} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredStudentsByClass.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.admission_number ? `${student.admission_number} - ` : ''}{student.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedStudent && (
                      <Card className="bg-muted/50">
                        <CardContent className="p-4 space-y-2">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Student Name:</span>
                              <p className="font-medium">{selectedStudent.name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Admission No:</span>
                              <p className="font-medium">{selectedStudent.admission_number || 'N/A'}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="space-y-2">
                      <Label>Amount (KES) *</Label>
                      <Input
                        type="number"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="Enter amount"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Payment Method *</Label>
                      <Select value={formData.payment_method} onValueChange={(val) => setFormData({ ...formData, payment_method: val })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentMethods.map((method) => (
                            <SelectItem key={method} value={method}>{method}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Notes (Optional)</Label>
                      <Textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        placeholder="Additional notes..."
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>{editingPayment ? "Update" : "Record"} Payment</Button>
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
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Notes</TableHead>
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
                ) : paginatedPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.admission_number || "-"}</TableCell>
                      <TableCell className="font-medium">{payment.student_name}</TableCell>
                      <TableCell className="text-success font-semibold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{payment.payment_method}</TableCell>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell className="text-muted-foreground max-w-32 truncate">{payment.notes || "-"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(payment)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredPayments.length)} of {filteredPayments.length}
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

export default Payments;