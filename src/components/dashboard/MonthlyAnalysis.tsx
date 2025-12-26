import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface MonthlyData {
  month: string;
  collected: number;
  expected: number;
}

interface MonthlyAnalysisProps {
  data: MonthlyData[];
}

const MonthlyAnalysis = ({ data }: MonthlyAnalysisProps) => {
  const getChangeIndicator = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    
    if (change > 0) {
      return (
        <span className="flex items-center text-success text-sm">
          <TrendingUp className="h-3 w-3 mr-1" />
          +{change.toFixed(1)}%
        </span>
      );
    } else if (change < 0) {
      return (
        <span className="flex items-center text-destructive text-sm">
          <TrendingDown className="h-3 w-3 mr-1" />
          {change.toFixed(1)}%
        </span>
      );
    }
    return (
      <span className="flex items-center text-muted-foreground text-sm">
        <Minus className="h-3 w-3 mr-1" />
        0%
      </span>
    );
  };

  const totalCollected = data.reduce((sum, d) => sum + d.collected, 0);
  const totalExpected = data.reduce((sum, d) => sum + d.expected, 0);
  const overallRate = totalExpected > 0 ? ((totalCollected / totalExpected) * 100).toFixed(1) : "0";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          12-Month Fee Collection Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Collected</TableHead>
                    <TableHead>Expected</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item, index) => {
                    const rate = item.expected > 0 
                      ? ((item.collected / item.expected) * 100).toFixed(1) 
                      : "0";
                    const prevItem = data[index - 1];
                    
                    return (
                      <TableRow key={item.month}>
                        <TableCell className="font-medium">{item.month}</TableCell>
                        <TableCell className="text-success">{formatCurrency(item.collected)}</TableCell>
                        <TableCell>{formatCurrency(item.expected)}</TableCell>
                        <TableCell>
                          <span className={`font-semibold ${Number(rate) >= 80 ? 'text-success' : Number(rate) >= 50 ? 'text-warning' : 'text-destructive'}`}>
                            {rate}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {prevItem ? getChangeIndicator(item.collected, prevItem.collected) : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            No payment data available. Start recording payments to see your analysis.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyAnalysis;
