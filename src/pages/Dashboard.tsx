import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, TrendingUp, AlertCircle, Target } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import appIcon from "@/assets/app-icon.png";

const Dashboard = () => {
  // Mock data for demonstration
  const stats = {
    totalStudents: 1234,
    totalExpectedFees: 3200000,
    totalCollectedFees: 2500000,
    totalBalance: 700000,
  };

  const recentPayments = [
    { id: "1", student_name: "John Doe", amount: 25000, payment_date: "2024-12-20" },
    { id: "2", student_name: "Jane Smith", amount: 15000, payment_date: "2024-12-19" },
    { id: "3", student_name: "Michael Johnson", amount: 30000, payment_date: "2024-12-18" },
    { id: "4", student_name: "Sarah Williams", amount: 20000, payment_date: "2024-12-17" },
    { id: "5", student_name: "David Brown", amount: 35000, payment_date: "2024-12-16" },
  ];

  const collectionRate = Math.round((stats.totalCollectedFees / stats.totalExpectedFees) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <img src={appIcon} alt="School Fee System" className="h-12 w-12 object-contain" />
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your school's financial overview.</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="interactive-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected Fees</CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{formatCurrency(stats.totalCollectedFees)}</div>
            <p className="text-xs text-muted-foreground">{collectionRate}% of expected</p>
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Fees</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalExpectedFees)}</div>
            <p className="text-xs text-muted-foreground">Total expected this term</p>
          </CardContent>
        </Card>

        <Card className="interactive-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatCurrency(stats.totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Pending collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Progress Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <CardTitle>Monthly Collection Target</CardTitle>
            </div>
            <span className="text-2xl font-bold text-primary">{collectionRate}%</span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="progress-bar h-4">
            <div 
              className="progress-fill" 
              style={{ width: `${collectionRate}%` }} 
            />
          </div>
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>Collected: {formatCurrency(stats.totalCollectedFees)}</span>
            <span>Target: {formatCurrency(stats.totalExpectedFees)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.student_name}</TableCell>
                  <TableCell className="text-success">{formatCurrency(payment.amount)}</TableCell>
                  <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
