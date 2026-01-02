import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, CheckCircle, AlertCircle, Download, FileSpreadsheet, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { exportToPDF, exportToExcel } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";

interface StudentBalance {
  id: string;
  admission_no: string;
  full_name: string;
  class_name: string;
  total_fee: number;
  total_paid: number;
  balance: number;
}

const MONTHS = [
  { value: 0, label: "All Months" },
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
];

const Reports = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [studentsWithBalance, setStudentsWithBalance] = useState<StudentBalance[]>([]);
  const [fullyPaidStudents, setFullyPaidStudents] = useState<StudentBalance[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Month/Year filtering
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(0); // 0 = All months
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  useEffect(() => {
    if (user) {
      fetchReportsData();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchReportsData = async () => {
    setLoading(true);
    try {
      // Fetch students with their class info
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, name, admission_number, class_id, classes(name, monthly_fee, annual_fee)')
        .eq('status', 'active');

      if (studentsError) throw studentsError;

      // Fetch payments with optional month/year filter
      let paymentsQuery = supabase
        .from('payments')
        .select('student_id, amount, payment_month, payment_year');
      
      if (selectedMonth > 0) {
        paymentsQuery = paymentsQuery.eq('payment_month', selectedMonth);
      }
      paymentsQuery = paymentsQuery.eq('payment_year', selectedYear);

      const { data: payments, error: paymentsError } = await paymentsQuery;

      if (paymentsError) throw paymentsError;

      // Calculate balances
      const paymentsByStudent = payments?.reduce((acc, p) => {
        acc[p.student_id] = (acc[p.student_id] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>) || {};

      const allStudents = students?.map((s) => {
        const classData = s.classes as any;
        // For monthly view, use monthly fee; for all months, use annual fee or monthly * 12
        const totalFee = selectedMonth > 0 
          ? (classData?.monthly_fee || 0)
          : (classData?.annual_fee || 0) + ((classData?.monthly_fee || 0) * 12);
        const totalPaid = paymentsByStudent[s.id] || 0;
        
        return {
          id: s.id,
          admission_no: s.admission_number || `STD-${s.id.slice(0, 6).toUpperCase()}`,
          full_name: s.name,
          class_name: classData?.name || 'Unassigned',
          total_fee: totalFee,
          total_paid: totalPaid,
          balance: Math.max(0, totalFee - totalPaid),
        };
      }) || [];

      const withBalance = allStudents.filter(s => s.balance > 0);
      const fullyPaid = allStudents.filter(s => s.balance === 0 && s.total_fee > 0);

      setStudentsWithBalance(withBalance);
      setFullyPaidStudents(fullyPaid);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOutstanding = studentsWithBalance.reduce((sum, s) => sum + s.balance, 0);
  const totalCollected = [...studentsWithBalance, ...fullyPaidStudents].reduce((sum, s) => sum + s.total_paid, 0);

  const getReportTitle = () => {
    const monthName = selectedMonth > 0 ? MONTHS.find(m => m.value === selectedMonth)?.label : "All Months";
    return `${monthName} ${selectedYear}`;
  };

  const handleExportPDF = (type: 'outstanding' | 'paid') => {
    const students = type === 'outstanding' ? studentsWithBalance : fullyPaidStudents;
    const title = `${type === 'outstanding' ? 'Outstanding Balances' : 'Fully Paid Students'} - ${getReportTitle()}`;
    
    const data = {
      title,
      headers: ["Adm No", "Student Name", "Class", "Total Fee", "Paid", type === 'outstanding' ? "Balance" : "Status"],
      rows: students.map(s => [
        s.admission_no,
        s.full_name,
        s.class_name,
        formatCurrency(s.total_fee),
        formatCurrency(s.total_paid),
        type === 'outstanding' ? formatCurrency(s.balance) : "Fully Paid"
      ]),
    };
    exportToPDF(data, `${type}-students-report-${selectedYear}-${selectedMonth || 'all'}`);
    toast({ title: "Success", description: "PDF downloaded successfully" });
  };

  const handleExportExcel = (type: 'outstanding' | 'paid') => {
    const students = type === 'outstanding' ? studentsWithBalance : fullyPaidStudents;
    const title = type === 'outstanding' ? 'Outstanding' : 'Fully Paid';
    
    const data = {
      title: `${title} - ${getReportTitle()}`,
      headers: ["Adm No", "Student Name", "Class", "Total Fee", "Paid", type === 'outstanding' ? "Balance" : "Status"],
      rows: students.map(s => [
        s.admission_no,
        s.full_name,
        s.class_name,
        s.total_fee,
        s.total_paid,
        type === 'outstanding' ? s.balance : "Fully Paid"
      ]),
    };
    exportToExcel(data, `${type}-students-report-${selectedYear}-${selectedMonth || 'all'}`);
    toast({ title: "Success", description: "Excel file downloaded successfully" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View financial reports and student balances</p>
        </div>
      </div>

      {/* Month/Year Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="font-medium">Filter by:</span>
            </div>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {[2023, 2024, 2025, 2026, 2027].map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="ml-auto text-sm text-muted-foreground">
              Showing data for: <span className="font-semibold text-foreground">{getReportTitle()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{studentsWithBalance.length + fullyPaidStudents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(totalCollected)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(totalOutstanding)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Fully Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{fullyPaidStudents.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Fee Reports - {getReportTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="outstanding">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="outstanding" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Outstanding ({studentsWithBalance.length})
              </TabsTrigger>
              <TabsTrigger value="paid" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Fully Paid ({fullyPaidStudents.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="outstanding" className="mt-6">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleExportPDF('outstanding')}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportExcel('outstanding')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adm No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Total Fee</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : studentsWithBalance.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No students with outstanding balance for {getReportTitle()}
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentsWithBalance.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.admission_no}</TableCell>
                        <TableCell>{student.full_name}</TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell>{formatCurrency(student.total_fee)}</TableCell>
                        <TableCell className="text-success">{formatCurrency(student.total_paid)}</TableCell>
                        <TableCell className="text-warning font-semibold">{formatCurrency(student.balance)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="paid" className="mt-6">
              <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" size="sm" onClick={() => handleExportPDF('paid')}>
                  <Download className="h-4 w-4 mr-2" /> PDF
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportExcel('paid')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Adm No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Total Fee</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : fullyPaidStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No students have fully paid their fees for {getReportTitle()}
                      </TableCell>
                    </TableRow>
                  ) : (
                    fullyPaidStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.admission_no}</TableCell>
                        <TableCell>{student.full_name}</TableCell>
                        <TableCell>{student.class_name}</TableCell>
                        <TableCell>{formatCurrency(student.total_fee)}</TableCell>
                        <TableCell className="text-success">{formatCurrency(student.total_paid)}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success/10 text-success text-xs font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Fully Paid
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;