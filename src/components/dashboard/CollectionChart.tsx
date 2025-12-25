import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type TimeRange = "30days" | "2months" | "3months" | "6months" | "1year" | "custom";

interface ChartDataPoint {
  date: string;
  collected: number;
  expected: number;
}

interface CollectionChartProps {
  onMonthlyDataChange?: (data: { month: string; collected: number; expected: number }[]) => void;
}

const CollectionChart = ({ onMonthlyDataChange }: CollectionChartProps) => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");
  const [customDays, setCustomDays] = useState("30");
  const [chartType, setChartType] = useState<"area" | "bar">("area");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchChartData();
    }
  }, [user, timeRange, customDays]);

  const fetchChartData = async () => {
    setLoading(true);
    try {
      let days = 30;
      switch (timeRange) {
        case "30days": days = 30; break;
        case "2months": days = 60; break;
        case "3months": days = 90; break;
        case "6months": days = 180; break;
        case "1year": days = 365; break;
        case "custom": days = Number(customDays) || 30; break;
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Fetch payments within the date range
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount, payment_date')
        .gte('payment_date', startDate.toISOString().split('T')[0])
        .order('payment_date', { ascending: true });

      if (paymentsError) throw paymentsError;

      // Fetch students with their class fees for expected calculation
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, class_id, classes(monthly_fee)')
        .eq('status', 'active');

      if (studentsError) throw studentsError;

      const totalMonthlyExpected = students?.reduce((sum, s) => {
        const classData = s.classes as any;
        return sum + (classData?.monthly_fee || 0);
      }, 0) || 0;

      // Group data based on time range
      const groupBy = days > 90 ? "month" : days > 30 ? "week" : "day";
      const groupedData: { [key: string]: number } = {};

      // Initialize groups
      if (groupBy === "month") {
        const months = Math.ceil(days / 30);
        for (let i = months - 1; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const key = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          groupedData[key] = 0;
        }
      } else if (groupBy === "week") {
        const weeks = Math.ceil(days / 7);
        for (let i = weeks - 1; i >= 0; i--) {
          groupedData[`Week ${weeks - i}`] = 0;
        }
      } else {
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const key = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
          groupedData[key] = 0;
        }
      }

      // Aggregate payments
      payments?.forEach(payment => {
        const paymentDate = new Date(payment.payment_date);
        let key = '';
        
        if (groupBy === "month") {
          key = paymentDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        } else if (groupBy === "week") {
          const weekNumber = Math.ceil((days - Math.floor((new Date().getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24))) / 7);
          key = `Week ${Math.max(1, weekNumber)}`;
        } else {
          key = paymentDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
        }

        if (groupedData.hasOwnProperty(key)) {
          groupedData[key] += payment.amount;
        }
      });

      // Convert to chart data format
      const formattedData = Object.entries(groupedData).map(([date, collected]) => {
        let expected = totalMonthlyExpected;
        if (groupBy === "week") expected = totalMonthlyExpected / 4;
        if (groupBy === "day") expected = totalMonthlyExpected / 30;
        
        return {
          date,
          collected,
          expected: Math.round(expected),
        };
      });

      setChartData(formattedData);

      // Generate 12-month data for analysis
      if (onMonthlyDataChange) {
        const monthlyData: { month: string; collected: number; expected: number }[] = [];
        for (let i = 11; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
          
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          
          const monthPayments = payments?.filter(p => {
            const pDate = new Date(p.payment_date);
            return pDate >= monthStart && pDate <= monthEnd;
          }) || [];

          const monthCollected = monthPayments.reduce((sum, p) => sum + p.amount, 0);

          monthlyData.push({
            month: monthKey,
            collected: monthCollected,
            expected: totalMonthlyExpected,
          });
        }
        onMonthlyDataChange(monthlyData);
      }

    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalCollected = chartData.reduce((sum, d) => sum + d.collected, 0);
  const totalExpected = chartData.reduce((sum, d) => sum + d.expected, 0);
  const growth = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : "0";

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Fee Collection Trends</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="2months">Last 2 Months</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
            
            {timeRange === "custom" && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-48">
                  <div className="space-y-2">
                    <Label>Number of Days</Label>
                    <Input
                      type="number"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      min="7"
                      max="365"
                    />
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <div className="flex rounded-lg border overflow-hidden">
              <Button
                variant={chartType === "area" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("area")}
                className="rounded-none"
              >
                Area
              </Button>
              <Button
                variant={chartType === "bar" ? "default" : "ghost"}
                size="sm"
                onClick={() => setChartType("bar")}
                className="rounded-none"
              >
                Bar
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Total Collected</p>
            <p className="text-lg font-bold text-success">{formatCurrency(totalCollected)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Expected</p>
            <p className="text-lg font-bold">{formatCurrency(totalExpected)}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Collection Rate</p>
            <p className="text-lg font-bold text-primary">{growth}%</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              Loading chart data...
            </div>
          ) : chartData.length === 0 || totalCollected === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No payment data available. Start recording payments to see trends.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "area" ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.1}/>
                    </linearGradient>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(215, 85%, 35%)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="hsl(215, 85%, 35%)" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="expected" 
                    stroke="hsl(215, 85%, 35%)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorExpected)" 
                    name="Expected"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="collected" 
                    stroke="hsl(142, 70%, 45%)" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorCollected)" 
                    name="Collected"
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }} 
                    tickLine={false}
                    axisLine={{ stroke: 'hsl(var(--border))' }}
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--popover))',
                      color: 'hsl(var(--popover-foreground))'
                    }}
                  />
                  <Bar 
                    dataKey="expected" 
                    fill="hsl(215, 85%, 35%)" 
                    opacity={0.3}
                    name="Expected"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="collected" 
                    fill="hsl(142, 70%, 45%)" 
                    name="Collected"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionChart;
