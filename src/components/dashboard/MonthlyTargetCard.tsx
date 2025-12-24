import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Target, Settings2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { motion } from "framer-motion";

interface MonthlyTargetCardProps {
  expectedFees: number;
  collectedFees: number;
  monthlyTarget: number;
  onTargetChange: (target: number) => void;
}

const MonthlyTargetCard = ({ expectedFees, collectedFees, monthlyTarget, onTargetChange }: MonthlyTargetCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetType, setTargetType] = useState<"expected" | "custom">("expected");
  const [customTarget, setCustomTarget] = useState(monthlyTarget.toString());

  const progress = monthlyTarget > 0 ? Math.min((collectedFees / monthlyTarget) * 100, 100) : 0;

  const handleSave = () => {
    const newTarget = targetType === "expected" ? expectedFees : Number(customTarget) || expectedFees;
    onTargetChange(newTarget);
    setDialogOpen(false);
  };

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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: isHovered ? 360 : 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <Target className="h-5 w-5 text-primary" />
              </motion.div>
              <CardTitle className="text-lg">Monthly Collection Target</CardTitle>
            </div>
            <div className="flex items-center gap-3">
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
                    <motion.div
                      animate={{ rotate: isHovered ? 90 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Settings2 className="h-4 w-4" />
                    </motion.div>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Monthly Target</DialogTitle>
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
        </CardHeader>
        <CardContent>
          <div className="relative h-4 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/50 to-accent/50 rounded-full blur-sm"
              animate={{ 
                width: `${progress}%`,
                opacity: isHovered ? 0.8 : 0.4,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="flex justify-between mt-3 text-sm">
            <motion.span 
              className="text-muted-foreground"
              animate={{ x: isHovered ? 5 : 0 }}
              transition={{ duration: 0.2 }}
            >
              Collected: <span className="font-medium text-success">{formatCurrency(collectedFees)}</span>
            </motion.span>
            <motion.span 
              className="text-muted-foreground"
              animate={{ x: isHovered ? -5 : 0 }}
              transition={{ duration: 0.2 }}
            >
              Target: <span className="font-medium text-foreground">{formatCurrency(monthlyTarget)}</span>
            </motion.span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default MonthlyTargetCard;
