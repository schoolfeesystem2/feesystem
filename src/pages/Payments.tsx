import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Search, Receipt, ChevronLeft, ChevronRight, Pencil, Download, FileSpreadsheet, Trash2, Printer, Bus } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { ReceiptModal } from "@/components/receipt/ReceiptModal";

interface Payment {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string | null;
  class_id: string | null;
  class_name: string;
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
  monthly_fee: number;
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);
  const [studentFeeInfo, setStudentFeeInfo] = useState<{ totalFee: number; busFee: number; alreadyPaid: number; balance: number } | null>(null);
  const [loadingFeeInfo, setLoadingFeeInfo] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [includesBus, setIncludesBus] = useState(false);
  
  // Global bus charge from app_settings
  const [globalBusCharge, setGlobalBusCharge] = useState<number>(0);

  const paymentMethodOptions = [
    { value: "cash", label: "Cash" },
    { value: "mobile_money", label: "Mobile Money (M-Pesa)" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "card", label: "Card" },
  ] as const;

  const getPaymentMethodLabel = (value: string) =>
    paymentMethodOptions.find((o) => o.value === value)?.label ?? value;

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  
  const [formData, setFormData] = useState({
    student_id: "",
    amount: "",
    payment_method: "",
    notes: "",
    payment_month: currentDate.getMonth() + 1,
    payment_year: currentDate.getFullYear(),
    payment_type: "school_fee" as "school_fee" | "bus" | "both",
  });

  useEffect(() => {
    if (user) {
      fetchPayments();
      fetchStudents();
      fetchClasses();
      fetchGlobalBusCharge();
    }
  }, [user]);

  const fetchGlobalBusCharge = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'bus_charge')
        .maybeSingle();

      if (error) throw error;
      setGlobalBusCharge(data?.value ? parseFloat(data.value) : 0);
    } catch (error) {
      console.error('Error fetching bus charge:', error);
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

  const fetchStudentFeeInfo = async (studentId: string, classId: string, withBus: boolean) => {
    setLoadingFeeInfo(true);
    try {
      const selectedClass = classes.find(c => c.id === classId);
      const schoolFee = selectedClass?.monthly_fee || 0;
      const busFee = globalBusCharge;
      const totalFee = schoolFee + (withBus ? busFee : 0);

      // Get total payments for this student
      const { data: paymentsData, error } = await supabase
        .from('payments')
        .select('amount, payment_type')
        .eq('student_id', studentId);

      if (error) throw error;

      const alreadyPaid = paymentsData?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const balance = totalFee - alreadyPaid;

      setStudentFeeInfo({ totalFee, busFee, alreadyPaid, balance });
    } catch (error) {
      console.error('Error fetching student fee info:', error);
      setStudentFeeInfo(null);
    } finally {
      setLoadingFeeInfo(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*, students(name, admission_number, class_id)')
        .order('payment_date', { ascending: false });

      if (error) throw error;

      const formattedPayments = data?.map((p) => {
        const studentClassId = (p.students as any)?.class_id || null;
        const classInfo = classes.find(c => c.id === studentClassId);
        return {
          id: p.id,
          student_id: p.student_id,
          student_name: (p.students as any)?.name || "Unknown",
          admission_number: (p.students as any)?.admission_number || null,
          class_id: studentClassId,
          class_name: classInfo?.name || "N/A",
          amount: p.amount,
          payment_date: p.payment_date,
          payment_method: p.payment_method || "cash",
          payment_type: p.payment_type || "school_fee",
          notes: p.notes || "",
        };
      }) || [];

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
    const now = new Date();
    setFormData({ 
      student_id: "", 
      amount: "", 
      payment_method: "", 
      notes: "",
      payment_month: now.getMonth() + 1,
      payment_year: now.getFullYear(),
      payment_type: "school_fee",
    });
    setSelectedClassId("");
    setEditingPayment(null);
    setStudentFeeInfo(null);
    setIncludesBus(false);
  };

  const handleOpenDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      const student = students.find(s => s.id === payment.student_id);
      if (student?.class_id) {
        setSelectedClassId(student.class_id);
      }
      const paymentDate = new Date(payment.payment_date);
      const pType = payment.payment_type || 'school_fee';
      setIncludesBus(pType === 'bus' || pType === 'both');
      setFormData({
        student_id: payment.student_id,
        amount: payment.amount.toString(),
        payment_method: payment.payment_method,
        notes: payment.notes,
        payment_month: paymentDate.getMonth() + 1,
        payment_year: paymentDate.getFullYear(),
        payment_type: pType as "school_fee" | "bus" | "both",
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    setFormData({ ...formData, student_id: "" });
    setStudentFeeInfo(null);
    setIncludesBus(false);
  };

  const handleStudentChange = (studentId: string) => {
    setFormData({ ...formData, student_id: studentId });
    if (studentId && selectedClassId) {
      fetchStudentFeeInfo(studentId, selectedClassId, includesBus);
    } else {
      setStudentFeeInfo(null);
    }
  };

  const handleBusToggle = (checked: boolean) => {
    setIncludesBus(checked);
    const newPaymentType = checked ? "both" : "school_fee";
    setFormData({ ...formData, payment_type: newPaymentType });
    
    if (formData.student_id && selectedClassId) {
      fetchStudentFeeInfo(formData.student_id, selectedClassId, checked);
    }
  };

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const hasBusCharges = globalBusCharge > 0;

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
            payment_type: formData.payment_type,
            notes: formData.notes,
            payment_month: formData.payment_month,
            payment_year: formData.payment_year,
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
            payment_type: formData.payment_type,
            notes: formData.notes,
            payment_month: formData.payment_month,
            payment_year: formData.payment_year,
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


  const handleDeleteClick = (paymentId: string) => {
    setDeletingPaymentId(paymentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPaymentId) return;

    try {
      const { error } = await supabase
        .from('payments')
        .delete()
        .eq('id', deletingPaymentId);

      if (error) throw error;
      toast({ title: "Success", description: "Payment deleted successfully" });
      fetchPayments();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingPaymentId(null);
    }
  };

  const handleExportPDF = () => {
    const data = {
      title: "Payment History",
      headers: ["Adm. No.", "Student", "Amount", "Method", "Date", "Notes"],
      rows: filteredPayments.map((p) => [
        p.admission_number || "-",
        p.student_name,
        formatCurrency(p.amount),
        getPaymentMethodLabel(p.payment_method),
        formatDate(p.payment_date),
        p.notes || "-",
      ]),
    };
    exportToPDF(data, "payments-report");
    toast({ title: "Success", description: "PDF downloaded successfully" });
  };

  const handleExportExcel = () => {
    const data = {
      title: "Payments",
      headers: ["Adm. No.", "Student", "Amount", "Method", "Date", "Notes"],
      rows: filteredPayments.map((p) => [
        p.admission_number || "",
        p.student_name,
        p.amount,
        getPaymentMethodLabel(p.payment_method),
        p.payment_date,
        p.notes || "",
      ]),
    };
    exportToExcel(data, "payments-report");
    toast({ title: "Success", description: "Excel file downloaded successfully" });
  };

  const selectedStudent = students.find(s => s.id === formData.student_id);

  const getPaymentTypeLabel = (type: string) => {
    switch (type) {
      case 'bus': return 'Bus Only';
      case 'both': return 'Fee + Bus';
      case 'tuition': return 'School Fee'; // Legacy support
      default: return 'School Fee';
    }
  };

  const getPaymentTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'bus': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'both': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      default: return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

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
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingPayment ? "Edit Payment" : "Record New Payment"}</DialogTitle>
                    <DialogDescription>
                      {editingPayment ? "Update the payment details" : "Enter the payment details below"}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
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
                        onValueChange={handleStudentChange}
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
                      <Card className="bg-muted/50 border-primary/20">
                        <CardContent className="p-4 space-y-3">
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

                          {/* Bus Option - Only show if class has bus charges */}
                          {hasBusCharges && (
                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Bus className="h-4 w-4 text-amber-600" />
                                  <div>
                                    <Label htmlFor="bus-toggle" className="text-sm font-medium cursor-pointer">
                                      Student uses school bus
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                      Bus charges: {formatCurrency(globalBusCharge)}
                                    </p>
                                  </div>
                                </div>
                                <Switch
                                  id="bus-toggle"
                                  checked={includesBus}
                                  onCheckedChange={handleBusToggle}
                                />
                              </div>
                            </div>
                          )}
                          
                          {loadingFeeInfo ? (
                            <div className="text-sm text-muted-foreground">Loading fee info...</div>
                          ) : studentFeeInfo && (
                            <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                              <div className="text-center">
                                <span className="text-xs text-muted-foreground block">
                                  {includesBus ? "Total (Fee + Bus)" : "School Fee"}
                                </span>
                                <p className="font-semibold text-sm">{formatCurrency(studentFeeInfo.totalFee)}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-xs text-muted-foreground block">Already Paid</span>
                                <p className="font-semibold text-sm text-green-600">{formatCurrency(studentFeeInfo.alreadyPaid)}</p>
                              </div>
                              <div className="text-center">
                                <span className="text-xs text-muted-foreground block">Balance</span>
                                <p className={`font-semibold text-sm ${studentFeeInfo.balance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                  {formatCurrency(studentFeeInfo.balance)}
                                </p>
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Month and Year Selection */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Payment Month *</Label>
                        <Select 
                          value={formData.payment_month.toString()} 
                          onValueChange={(val) => setFormData({ ...formData, payment_month: parseInt(val) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select month" />
                          </SelectTrigger>
                          <SelectContent>
                            {[
                              { value: 1, label: "January" },
                              { value: 2, label: "February" },
                              { value: 3, label: "March" },
                              { value: 4, label: "April" },
                              { value: 5, label: "May" },
                              { value: 6, label: "June" },
                              { value: 7, label: "July" },
                              { value: 8, label: "August" },
                              { value: 9, label: "September" },
                              { value: 10, label: "October" },
                              { value: 11, label: "November" },
                              { value: 12, label: "December" },
                            ].map((month) => (
                              <SelectItem key={month.value} value={month.value.toString()}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Year *</Label>
                        <Select 
                          value={formData.payment_year.toString()} 
                          onValueChange={(val) => setFormData({ ...formData, payment_year: parseInt(val) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select year" />
                          </SelectTrigger>
                          <SelectContent>
                            {[2023, 2024, 2025, 2026, 2027].map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

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
                          {paymentMethodOptions.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Date</TableHead>
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
                      <TableCell>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getPaymentTypeBadgeClass(payment.payment_type)}`}>
                          {getPaymentTypeLabel(payment.payment_type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-success font-semibold">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getPaymentMethodLabel(payment.payment_method)}</TableCell>
                      <TableCell>{formatDate(payment.payment_date)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                              setSelectedPaymentForReceipt(payment);
                              setReceiptModalOpen(true);
                            }}
                            title="Print Receipt"
                          >
                            <Printer className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(payment)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(payment.id)}>
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

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Payment"
        description="Are you sure you want to delete this payment record? This action cannot be undone."
      />

      <ReceiptModal
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        payment={selectedPaymentForReceipt}
        allStudents={students}
        classes={classes}
      />
    </div>
  );
};

export default Payments;