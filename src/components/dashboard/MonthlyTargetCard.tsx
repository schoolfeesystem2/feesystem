import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Settings2, Calendar, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MonthlyTargetCardProps {
  expectedFees: number;
  collectedFees: number;
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
}

const MONTHS = [
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

const MonthlyTargetCard = ({ 
  expectedFees, 
  collectedFees, 
  selectedMonth, 
  selectedYear,
  onMonthChange,
  onYearChange 
}: MonthlyTargetCardProps) => {
  const { user } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetType, setTargetType] = useState<"expected" | "custom">("expected");
  const [customTarget, setCustomTarget] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState(0);
  const [yearlyTarget, setYearlyTarget] = useState(0);
  const [yearlyCollected, setYearlyCollected] = useState(0);
  const [activeTab, setActiveTab] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    if (user) {
      fetchTargets();
      fetchYearlyCollected();
    }
  }, [user, selectedMonth, selectedYear]);

  const fetchTargets = async () => {
    try {
      // Fetch monthly target
      const { data: monthlyData } = await supabase
        .from('fee_targets')
        .select('target_amount')
        .eq('user_id', user?.id)
        .eq('target_type', 'monthly')
        .eq('target_month', selectedMonth)
        .eq('target_year', selectedYear)
        .maybeSingle();

      // Fetch yearly target
      const { data: yearlyData } = await supabase
        .from('fee_targets')
        .select('target_amount')
        .eq('user_id', user?.id)
        .eq('target_type', 'yearly')
        .eq('target_year', selectedYear)
        .maybeSingle();

      setMonthlyTarget(monthlyData?.target_amount || expectedFees);
      setYearlyTarget(yearlyData?.target_amount || expectedFees * 12);
      setCustomTarget((monthlyData?.target_amount || expectedFees).toString());
    } catch (error) {
      console.error('Error fetching targets:', error);
    }
  };

  const fetchYearlyCollected = async () => {
    try {
      const { data } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_year', selectedYear);

      const total = data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      setYearlyCollected(total);
    } catch (error) {
      console.error('Error fetching yearly collected:', error);
    }
  };

  const progress = monthlyTarget > 0 ? Math.min((collectedFees / monthlyTarget) * 100, 100) : 0;
  const yearlyProgress = yearlyTarget > 0 ? Math.min((yearlyCollected / yearlyTarget) * 100, 100) : 0;

  const handleSave = async () => {
    const newTarget = targetType === "expected" ? expectedFees : Number(customTarget) || expectedFees;
    
    try {
      // Upsert monthly target
      await supabase
        .from('fee_targets')
        .upsert({
          user_id: user?.id,
          target_type: 'monthly',
          target_month: selectedMonth,
          target_year: selectedYear,
          target_amount: newTarget,
        }, {
          onConflict: 'user_id,target_type,target_month,target_year'
        });

      setMonthlyTarget(newTarget);
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving target:', error);
    }
  };

  const handleSaveYearlyTarget = async (amount: number) => {
    try {
      await supabase
        .from('fee_targets')
        .upsert({
          user_id: user?.id,
          target_type: 'yearly',
          target_month: null,
          target_year: selectedYear,
          target_amount: amount,
        }, {
          onConflict: 'user_id,target_type,target_month,target_year'
        });

      setYearlyTarget(amount);
    } catch (error) {
      console.error('Error saving yearly target:', error);
    }
  };

  const currentMonthName = MONTHS.find(m => m.value === selectedMonth)?.label || "";

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      animate={{
        scale: isHovered ? 1.02 : 1,
        boxShadow: isHovered 
          ? "0 20px 40px -10px hsl(215 85% 35% / 0.2)" 
          : "0 4px 6px -1px hsl(215 25% 15% / 0.1)",
      }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="rounded-lg"
    >
      <Card className="overflow-hidden border-2 border-transparent hover:border-primary/20 transition-colors duration-300">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: isHovered ? 360 : 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <Target className="h-5 w-5 text-primary" />
              </motion.div>
              <CardTitle className="text-lg">Collection Targets</CardTitle>
            </div>
            
            {/* Month/Year Selectors */}
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedMonth.toString()} onValueChange={(v) => onMonthChange(parseInt(v))}>
                <SelectTrigger className="w-32">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((month) => (
                    <SelectItem key={month.value} value={month.value.toString()}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedYear.toString()} onValueChange={(v) => onYearChange(parseInt(v))}>
                <SelectTrigger className="w-24">
                  <SelectValue />
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
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "monthly" | "yearly")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly" className="gap-2">
                <Calendar className="h-4 w-4" />
                Monthly
              </TabsTrigger>
              <TabsTrigger value="yearly" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Yearly
              </TabsTrigger>
            </TabsList>

            <TabsContent value="monthly" className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{currentMonthName} {selectedYear}</span>
                <div className="flex items-center gap-2">
                  <motion.span 
                    className="text-2xl font-bold text-primary"
                    animate={{ scale: isHovered ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    {Math.round(progress)}%
                  </motion.span>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Monthly Target for {currentMonthName} {selectedYear}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as "expected" | "custom")}>
                          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                            <RadioGroupItem value="expected" id="expected" />
                            <div className="flex-1">
                              <Label htmlFor="expected" className="cursor-pointer font-medium">
                                Use Expected Fees
                              </Label>
                              <p className="text-sm text-muted-foreground mt-1">
                                Target: {formatCurrency(expectedFees)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-start space-x-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                            <RadioGroupItem value="custom" id="custom" />
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="custom" className="cursor-pointer font-medium">
                                Set Custom Target
                              </Label>
                              <Input
                                type="number"
                                placeholder="Enter amount"
                                value={customTarget}
                                onChange={(e) => setCustomTarget(e.target.value)}
                                disabled={targetType !== "custom"}
                                className="mt-2"
                              />
                            </div>
                          </div>
                        </RadioGroup>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save Target</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Collected: <span className="font-medium text-success">{formatCurrency(collectedFees)}</span>
                </span>
                <span className="text-muted-foreground">
                  Target: <span className="font-medium text-foreground">{formatCurrency(monthlyTarget)}</span>
                </span>
              </div>
            </TabsContent>

            <TabsContent value="yearly" className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Year {selectedYear}</span>
                <motion.span 
                  className="text-2xl font-bold text-primary"
                  animate={{ scale: isHovered ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {Math.round(yearlyProgress)}%
                </motion.span>
              </div>

              <div className="relative h-4 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-success to-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${yearlyProgress}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Collected: <span className="font-medium text-success">{formatCurrency(yearlyCollected)}</span>
                </span>
                <span className="text-muted-foreground">
                  Target: <span className="font-medium text-foreground">{formatCurrency(yearlyTarget)}</span>
                </span>
              </div>
              
              <div className="pt-2">
                <Label className="text-xs text-muted-foreground">Set Yearly Target</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="Enter yearly target"
                    value={yearlyTarget}
                    onChange={(e) => setYearlyTarget(Number(e.target.value))}
                    className="flex-1"
                  />
                  <Button size="sm" onClick={() => handleSaveYearlyTarget(yearlyTarget)}>
                    Save
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MonthlyTargetCard;