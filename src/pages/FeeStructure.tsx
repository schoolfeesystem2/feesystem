import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";

interface FeeStructure {
  id: string;
  class_name: string;
  fee_amount: number;
  description: string;
}

const FeeStructure = () => {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);

  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([
    { id: "1", class_name: "Grade 1", fee_amount: 50000, description: "Term 1 fees for Grade 1" },
    { id: "2", class_name: "Grade 2", fee_amount: 55000, description: "Term 1 fees for Grade 2" },
    { id: "3", class_name: "Grade 3", fee_amount: 60000, description: "Term 1 fees for Grade 3" },
    { id: "4", class_name: "Grade 4", fee_amount: 65000, description: "Term 1 fees for Grade 4" },
    { id: "5", class_name: "Grade 5", fee_amount: 70000, description: "Term 1 fees for Grade 5" },
    { id: "6", class_name: "Grade 6", fee_amount: 75000, description: "Term 1 fees for Grade 6" },
  ]);

  const [formData, setFormData] = useState({
    class_name: "",
    fee_amount: "",
    description: "",
  });

  const resetForm = () => {
    setFormData({ class_name: "", fee_amount: "", description: "" });
    setEditingStructure(null);
  };

  const handleOpenDialog = (structure?: FeeStructure) => {
    if (structure) {
      setEditingStructure(structure);
      setFormData({
        class_name: structure.class_name,
        fee_amount: structure.fee_amount.toString(),
        description: structure.description,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.class_name || !formData.fee_amount) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (editingStructure) {
      setFeeStructures(feeStructures.map(f =>
        f.id === editingStructure.id
          ? { ...f, class_name: formData.class_name, fee_amount: Number(formData.fee_amount), description: formData.description }
          : f
      ));
      toast({ title: "Success", description: "Fee structure updated successfully" });
    } else {
      const newStructure: FeeStructure = {
        id: Date.now().toString(),
        class_name: formData.class_name,
        fee_amount: Number(formData.fee_amount),
        description: formData.description,
      };
      setFeeStructures([...feeStructures, newStructure]);
      toast({ title: "Success", description: "Fee structure added successfully" });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setFeeStructures(feeStructures.filter(f => f.id !== id));
    toast({ title: "Success", description: "Fee structure deleted successfully" });
  };

  const totalFees = feeStructures.reduce((sum, f) => sum + f.fee_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Fee Structure</h1>
          <p className="text-muted-foreground">Manage class fees and payment structures</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{feeStructures.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalFees / feeStructures.length || 0)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Highest Fee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(Math.max(...feeStructures.map(f => f.fee_amount), 0))}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Fee Structures</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()}>
                  <Plus className="h-4 w-4 mr-2" /> Add Fee Structure
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingStructure ? "Edit Fee Structure" : "Add Fee Structure"}</DialogTitle>
                  <DialogDescription>
                    {editingStructure ? "Update the fee structure" : "Add a new class fee structure"}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Class Name *</Label>
                    <Input
                      value={formData.class_name}
                      onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                      placeholder="Grade 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fee Amount (KES) *</Label>
                    <Input
                      type="number"
                      value={formData.fee_amount}
                      onChange={(e) => setFormData({ ...formData, fee_amount: e.target.value })}
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Term 1 fees including tuition, meals, and activities"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave}>{editingStructure ? "Update" : "Add"}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Fee Amount</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {feeStructures.map((structure) => (
                <TableRow key={structure.id}>
                  <TableCell className="font-medium">{structure.class_name}</TableCell>
                  <TableCell className="text-primary font-semibold">{formatCurrency(structure.fee_amount)}</TableCell>
                  <TableCell className="text-muted-foreground">{structure.description}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(structure)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(structure.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default FeeStructure;
