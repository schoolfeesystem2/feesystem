import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, CheckCircle, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface StudentBalance {
  id: string;
  admission_no: string;
  full_name: string;
  class_name: string;
  total_fee: number;
  total_paid: number;
  balance: number;
}

const Reports = () => {
  // Mock data
  const studentsWithBalance: StudentBalance[] = [
    { id: "1", admission_no: "ADM001", full_name: "John Doe", class_name: "Grade 1", total_fee: 50000, total_paid: 25000, balance: 25000 },
    { id: "2", admission_no: "ADM002", full_name: "Jane Smith", class_name: "Grade 2", total_fee: 55000, total_paid: 40000, balance: 15000 },
    { id: "3", admission_no: "ADM004", full_name: "Sarah Williams", class_name: "Grade 1", total_fee: 50000, total_paid: 30000, balance: 20000 },
  ];

  const fullyPaidStudents: StudentBalance[] = [
    { id: "3", admission_no: "ADM003", full_name: "Michael Johnson", class_name: "Grade 3", total_fee: 60000, total_paid: 60000, balance: 0 },
    { id: "5", admission_no: "ADM005", full_name: "David Brown", class_name: "Grade 4", total_fee: 65000, total_paid: 65000, balance: 0 },
  ];

  const totalOutstanding = studentsWithBalance.reduce((sum, s) => sum + s.balance, 0);
  const totalCollected = [...studentsWithBalance, ...fullyPaidStudents].reduce((sum, s) => sum + s.total_paid, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">View financial reports and student balances</p>
        </div>
      </div>

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
          <CardTitle>Student Fee Reports</CardTitle>
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
                  {studentsWithBalance.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">{student.admission_no}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell>{student.class_name}</TableCell>
                      <TableCell>{formatCurrency(student.total_fee)}</TableCell>
                      <TableCell className="text-success">{formatCurrency(student.total_paid)}</TableCell>
                      <TableCell className="text-warning font-semibold">{formatCurrency(student.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {studentsWithBalance.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No students with outstanding balance</p>
              )}
            </TabsContent>

            <TabsContent value="paid" className="mt-6">
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
                  {fullyPaidStudents.map((student) => (
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
                  ))}
                </TableBody>
              </Table>
              {fullyPaidStudents.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No students have fully paid their fees</p>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
