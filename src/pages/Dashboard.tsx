import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, DollarSign, TrendingUp, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import appIcon from "@/assets/app-icon.png";
import MonthlyTargetCard from "@/components/dashboard/MonthlyTargetCard";
import CollectionChart from "@/components/dashboard/CollectionChart";

interface DashboardStats {
  totalStudents: number;
  totalExpectedFees: number;
  totalCollectedFees: number;
  totalBalance: number;
}

interface RecentPayment {
  id: string;
  student_name: string;
  amount: number;
  payment_date: string;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalExpectedFees: 0,
    totalCollectedFees: 0,
    totalBalance: 0,
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch students count and classes for expected fees
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, class_id, classes(monthly_fee, annual_fee)')
        .eq('status', 'active');

      if (studentsError) throw studentsError;

      // Fetch payments
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('id, amount, payment_date, student_id, students(name)')
        .order('payment_date', { ascending: false });

      if (paymentsError) throw paymentsError;

      const totalStudents = students?.length || 0;
      const totalExpectedFees = students?.reduce((sum, s) => {
        const classData = s.classes as any;
        return sum + (classData?.monthly_fee || 0) + (classData?.annual_fee || 0);
      }, 0) || 0;
      const totalCollectedFees = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalBalance = totalExpectedFees - totalCollectedFees;

      setStats({
        totalStudents,
        totalExpectedFees,
        totalCollectedFees,
        totalBalance: Math.max(0, totalBalance),
      });

      // Set initial monthly target to expected fees
      if (monthlyTarget === 0) {
        setMonthlyTarget(totalExpectedFees);
      }

      // Format recent payments
      const formattedPayments = payments?.slice(0, 5).map(p => ({
        id: p.id,
        student_name: (p.students as any)?.name || 'Unknown',
        amount: p.amount,
        payment_date: p.payment_date,
      })) || [];

      setRecentPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const collectionRate = stats.totalExpectedFees > 0 
    ? Math.round((stats.totalCollectedFees / stats.totalExpectedFees) * 100) 
    : 0;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <img src={appIcon} alt="School Fee System" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <p className="text-xs text-muted-foreground">Active enrolled students</p>
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

      {/* Monthly Target Card */}
      <MonthlyTargetCard
        expectedFees={stats.totalExpectedFees}
        collectedFees={stats.totalCollectedFees}
        monthlyTarget={monthlyTarget}
        onTargetChange={setMonthlyTarget}
      />

      {/* Collection Chart */}
      <CollectionChart />

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {recentPayments.length > 0 ? (
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
          ) : (
            <p className="text-center text-muted-foreground py-8">No payments recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
