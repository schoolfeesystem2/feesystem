import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, DollarSign, TrendingUp, AlertCircle, Calendar, Filter } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import appLogo from "@/assets/app-logo.png";
import MonthlyTargetCard from "@/components/dashboard/MonthlyTargetCard";
import CollectionChart from "@/components/dashboard/CollectionChart";
import MonthlyAnalysis from "@/components/dashboard/MonthlyAnalysis";

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type DatePreset = "last48h" | "lastWeek" | "lastMonth" | "month";
const YEARS = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    totalExpectedFees: 0,
    totalCollectedFees: 0,
    totalBalance: 0
  });
  const [recentPayments, setRecentPayments] = useState<RecentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [schoolName, setSchoolName] = useState("Dashboard");

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [datePreset, setDatePreset] = useState<DatePreset>("month");

  const [monthlyAnalysisData, setMonthlyAnalysisData] = useState<{
    month: string;
    collected: number;
    expected: number;
  }[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    status: string;
    expiryDate: Date | null;
  }>({ status: 'trial', expiryDate: null });

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchSchoolName();
    }
  }, [user, selectedMonth, selectedYear, datePreset]);

  const fetchSchoolName = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('school_name, subscription_status, trial_end_date, subscription_end_date').eq('id', user?.id).single();
      if (error) throw error;
      if (data?.school_name) setSchoolName(data.school_name);
      if (data) {
        const trialEnd = data.trial_end_date ? new Date(data.trial_end_date) : null;
        const subEnd = data.subscription_end_date ? new Date(data.subscription_end_date) : null;
        const now = new Date();
        let status = data.subscription_status || 'trial';
        let expiryDate = status === 'active' ? subEnd : trialEnd;
        if (status === 'trial' && trialEnd && trialEnd < now) status = 'expired';
        setSubscriptionStatus({ status, expiryDate });
      }
    } catch (error) {
      console.error('Error fetching school name:', error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, class_id, classes(monthly_fee)')
        .eq('status', 'active');
      if (studentsError) throw studentsError;

      let paymentsQuery = supabase
        .from('payments')
        .select('id, amount, payment_date, payment_month, payment_year, student_id, students(name)');

      if (datePreset === "last48h") {
        const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
        paymentsQuery = paymentsQuery.gte('payment_date', since);
      } else if (datePreset === "lastWeek") {
        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        paymentsQuery = paymentsQuery.gte('payment_date', since);
      } else if (datePreset === "lastMonth") {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        paymentsQuery = paymentsQuery.gte('payment_date', since);
      } else {
        // month preset - filter by selected month/year
        paymentsQuery = paymentsQuery
          .eq('payment_month', selectedMonth)
          .eq('payment_year', selectedYear);
      }

      const { data: payments, error: paymentsError } = await paymentsQuery
        .order('payment_date', { ascending: false });
      if (paymentsError) throw paymentsError;

      const totalStudents = students?.length || 0;
      const totalExpectedFees = students?.reduce((sum, s) => {
        const classData = s.classes as any;
        return sum + (classData?.monthly_fee || 0);
      }, 0) || 0;
      const totalCollectedFees = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
      const totalBalance = totalExpectedFees - totalCollectedFees;
      setStats({
        totalStudents,
        totalExpectedFees,
        totalCollectedFees,
        totalBalance: Math.max(0, totalBalance)
      });

      const formattedPayments = payments?.slice(0, 5).map(p => ({
        id: p.id,
        student_name: (p.students as any)?.name || 'Unknown',
        amount: p.amount,
        payment_date: p.payment_date
      })) || [];
      setRecentPayments(formattedPayments);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const [filterView, setFilterView] = useState<"main" | "months">("main");
  const [browseYear, setBrowseYear] = useState(currentDate.getFullYear());

  const handlePresetChange = (value: string) => {
    if (value.startsWith("year-")) {
      const year = parseInt(value.split("-")[1]);
      setBrowseYear(year);
      setFilterView("months");
    } else {
      setDatePreset(value as DatePreset);
      setFilterView("main");
    }
  };

  const handleMonthSelect = (value: string) => {
    const monthIndex = parseInt(value);
    setSelectedYear(browseYear);
    setSelectedMonth(monthIndex + 1);
    setDatePreset("month");
    setFilterView("main");
  };

  const getFilterLabel = () => {
    if (datePreset === "last48h") return "Last 48 Hours";
    if (datePreset === "lastWeek") return "Last Week";
    if (datePreset === "lastMonth") return "Last 30 Days";
    return `${MONTHS[selectedMonth - 1]} ${selectedYear}`;
  };

  const collectionRate = stats.totalExpectedFees > 0 ? Math.round(stats.totalCollectedFees / stats.totalExpectedFees * 100) : 0;

  if (loading) {
    return <div className="space-y-6">
      <div className="flex items-center gap-3">
        <img src={appLogo} alt="School Fee System" className="h-12 w-12 object-contain" />
        <div>
          <h1 className="text-2xl font-bold">{schoolName}</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    </div>;
  }

  const currentMonthName = MONTHS[currentDate.getMonth()];

  return <div className="space-y-6">
    {/* Current Date & Filter */}
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <div>
            <p className="text-lg font-semibold">
              {currentMonthName} {currentDate.getDate()}, {currentDate.getFullYear()}
            </p>
            <p className="text-sm text-muted-foreground">Current Date</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
         {filterView === "months" ? (
            <Select
              value=""
              onValueChange={handleMonthSelect}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={`Pick month in ${browseYear}`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="back" disabled className="text-xs text-muted-foreground font-semibold">
                  ← {browseYear}
                </SelectItem>
                {MONTHS.map((month, mi) => (
                  <SelectItem key={mi} value={`${mi}`}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select
              value={datePreset === "month" ? `selected-month` : datePreset}
              onValueChange={handlePresetChange}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Select period">
                  {getFilterLabel()}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="last48h">Last 48 Hours</SelectItem>
                <SelectItem value="lastWeek">Last Week</SelectItem>
                <SelectItem value="lastMonth">Last 30 Days</SelectItem>
                {YEARS.map(year => (
                  <SelectItem key={year} value={`year-${year}`}>
                    📅 {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Header with Subscription Status */}
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-3">
        <img src={appLogo} alt="School Fee System" className="h-12 w-12 object-contain" />
        <div>
          <h1 className="text-2xl font-bold">{schoolName}</h1>
          <p className="text-muted-foreground">Welcome back! Here's your school's financial overview.</p>
        </div>
      </div>
      <Card className="sm:w-auto">
        <CardContent className="p-3 flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-sm text-muted-foreground">Status:</span>
              {subscriptionStatus.status === 'active' ? <Badge className="bg-success hover:bg-success">ACTIVE</Badge> : subscriptionStatus.status === 'trial' ? <Badge className="bg-primary hover:bg-primary">FREE TRIAL</Badge> : <Badge variant="destructive">EXPIRED</Badge>}
            </div>
            {subscriptionStatus.expiryDate && <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1 justify-end">
              <Calendar className="h-3 w-3" />
              <span>
                {subscriptionStatus.status === 'active' ? 'Renews' : 'Expires'}: {subscriptionStatus.expiryDate.toLocaleDateString()}
              </span>
            </div>}
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Viewing data label */}
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Showing data for:</span>
      <Badge variant="outline" className="font-semibold">{getFilterLabel()}</Badge>
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
      selectedMonth={selectedMonth}
      selectedYear={selectedYear}
      onMonthChange={setSelectedMonth}
      onYearChange={setSelectedYear}
    />

    {/* Collection Chart */}
    <CollectionChart onMonthlyDataChange={setMonthlyAnalysisData} />

    {/* 12-Month Analysis */}
    <MonthlyAnalysis data={monthlyAnalysisData} />

    {/* Recent Payments */}
    <Card>
      <CardHeader>
        <CardTitle>Recent Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {recentPayments.length > 0 ? <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentPayments.map(payment => <TableRow key={payment.id}>
              <TableCell className="font-medium">{payment.student_name}</TableCell>
              <TableCell className="text-success">{formatCurrency(payment.amount)}</TableCell>
              <TableCell>{new Date(payment.payment_date).toLocaleDateString()}</TableCell>
            </TableRow>)}
          </TableBody>
        </Table> : <p className="text-center text-muted-foreground py-8">No payments recorded for this period</p>}
      </CardContent>
    </Card>
  </div>;
};
export default Dashboard;
