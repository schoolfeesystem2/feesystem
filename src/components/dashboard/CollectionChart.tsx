import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

type TimeRange = "30days" | "2months" | "3months" | "6months" | "1year" | "custom";

interface CollectionChartProps {
  data?: { date: string; collected: number; expected: number }[];
}

const generateMockData = (range: TimeRange, customDays?: number) => {
  const data = [];
  let days = 30;
  
  switch (range) {
    case "30days": days = 30; break;
    case "2months": days = 60; break;
    case "3months": days = 90; break;
    case "6months": days = 180; break;
    case "1year": days = 365; break;
    case "custom": days = customDays || 30; break;
  }

  const groupBy = days > 90 ? "month" : days > 30 ? "week" : "day";
  const baseCollected = 50000;
  const baseExpected = 80000;

  if (groupBy === "month") {
    const months = Math.ceil(days / 30);
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        collected: Math.floor(baseCollected * (0.7 + Math.random() * 0.6) * 4),
        expected: baseExpected * 4,
      });
    }
  } else if (groupBy === "week") {
    const weeks = Math.ceil(days / 7);
    for (let i = weeks - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      data.push({
        date: `Week ${weeks - i}`,
        collected: Math.floor(baseCollected * (0.7 + Math.random() * 0.6)),
        expected: baseExpected,
      });
    }
  } else {
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        collected: Math.floor((baseCollected / 30) * (0.5 + Math.random())),
        expected: baseExpected / 30,
      });
    }
  }

  return data;
};

const CollectionChart = ({ data }: CollectionChartProps) => {
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");
  const [customDays, setCustomDays] = useState("30");
  const [chartType, setChartType] = useState<"area" | "bar">("area");

  const chartData = data || generateMockData(timeRange, Number(customDays));

  const totalCollected = chartData.reduce((sum, d) => sum + d.collected, 0);
  const totalExpected = chartData.reduce((sum, d) => sum + d.expected, 0);
  const growth = ((totalCollected / totalExpected) * 100).toFixed(1);

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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(215, 20%, 88%)' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(215, 20%, 88%)' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid hsl(215, 20%, 88%)',
                    boxShadow: '0 4px 6px -1px hsl(215 25% 15% / 0.1)'
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
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215, 20%, 88%)" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(215, 20%, 88%)' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }} 
                  tickLine={false}
                  axisLine={{ stroke: 'hsl(215, 20%, 88%)' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: '1px solid hsl(215, 20%, 88%)',
                    boxShadow: '0 4px 6px -1px hsl(215 25% 15% / 0.1)'
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
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionChart;
