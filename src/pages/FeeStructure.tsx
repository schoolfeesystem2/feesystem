import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, DollarSign, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";

interface FeeStructure {
  id: string;
  name: string;
  monthly_fee: number;
  bus_fee: number;
  academic_year: string;
  term: string;
}

const TERMS = ["Term 1", "Term 2", "Term 3"];

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  for (let i = currentYear - 2; i <= currentYear + 2; i++) {
    years.push(i.toString());
  }
  return years;
};

const FeeStructure = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStructureId, setDeletingStructureId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    monthly_fee: "",
    bus_fee: "",
    academic_year: new Date().getFullYear().toString(),
    term: "Term 1",
  });

  const yearOptions = generateYearOptions();

  useEffect(() => {
    if (user) {
      fetchFeeStructures();
    }
  }, [user]);

  const fetchFeeStructures = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name, monthly_fee, bus_fee, academic_year, term')
        .order('academic_year', { ascending: false })
        .order('term')
        .order('name');

      if (error) throw error;
      setFeeStructures(data || []);
    } catch (error) {
      console.error('Error fetching fee structures:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ 
      name: "", 
      monthly_fee: "",
      bus_fee: "",
      academic_year: new Date().getFullYear().toString(),
      term: "Term 1",
    });
    setEditingStructure(null);
  };

  const handleOpenDialog = (structure?: FeeStructure) => {
    if (structure) {
      setEditingStructure(structure);
      setFormData({
        name: structure.name,
        monthly_fee: structure.monthly_fee.toString(),
        bus_fee: structure.bus_fee.toString(),
        academic_year: structure.academic_year,
        term: structure.term,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.monthly_fee || !formData.academic_year || !formData.term) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingStructure) {
        const { error } = await supabase
          .from('classes')
          .update({
            name: formData.name,
            monthly_fee: Number(formData.monthly_fee),
            bus_fee: Number(formData.bus_fee) || 0,
            academic_year: formData.academic_year,
            term: formData.term,
          })
          .eq('id', editingStructure.id);

        if (error) {
          if (error.code === '23505') {
            throw new Error(`A fee structure for ${formData.name} in ${formData.academic_year} ${formData.term} already exists.`);
          }
          throw error;
        }
        toast({ title: "Success", description: "Fee structure updated successfully" });
      } else {
        const { error } = await supabase
          .from('classes')
          .insert({
            name: formData.name,
            monthly_fee: Number(formData.monthly_fee),
            bus_fee: Number(formData.bus_fee) || 0,
            academic_year: formData.academic_year,
            term: formData.term,
            user_id: user?.id,
          });

        if (error) {
          if (error.code === '23505') {
            throw new Error(`A fee structure for ${formData.name} in ${formData.academic_year} ${formData.term} already exists.`);
          }
          throw error;
        }
        toast({ title: "Success", description: "Fee structure added successfully" });
      }

      await fetchFeeStructures();
      setIsDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeletingStructureId(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStructureId) return;
    
    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', deletingStructureId);

      if (error) throw error;
      toast({ title: "Success", description: "Fee structure deleted successfully" });
      await fetchFeeStructures();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeletingStructureId(null);
    }
  };

  const totalMonthlyFees = feeStructures.reduce((sum, f) => sum + f.monthly_fee, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <DollarSign className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Fee Structure</h1>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Fee Structure</h1>
          <p className="text-muted-foreground">Manage class fees and payment structures</p>
        </div>
      </div>

      {feeStructures.length > 0 && (
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
              <CardTitle className="text-sm font-medium">Average Monthly Fee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMonthlyFees / feeStructures.length || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Highest Monthly Fee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(Math.max(...feeStructures.map(f => f.monthly_fee), 0))}</div>
            </CardContent>
          </Card>
        </div>
      )}

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
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Grade 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tuition Fee (KES) *</Label>
                    <Input
                      type="number"
                      value={formData.monthly_fee}
                      onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                      placeholder="5000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bus Charges (KES)</Label>
                    <Input
                      type="number"
                      value={formData.bus_fee}
                      onChange={(e) => setFormData({ ...formData, bus_fee: e.target.value })}
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground">Optional - Set if students use school transport</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingStructure ? "Update" : "Add"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {feeStructures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Tuition Fee</TableHead>
                  <TableHead>Bus Charges</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {feeStructures.map((structure) => (
                  <TableRow key={structure.id}>
                    <TableCell className="font-medium">{structure.name}</TableCell>
                    <TableCell>{structure.academic_year}</TableCell>
                    <TableCell>{structure.term}</TableCell>
                    <TableCell className="text-primary font-semibold">{formatCurrency(structure.monthly_fee)}</TableCell>
                    <TableCell className="text-amber-600 font-semibold">{formatCurrency(structure.bus_fee)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(structure)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(structure.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Fee Structures</h3>
              <p className="text-muted-foreground mb-4">Add a fee structure to get started.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" /> Add Fee Structure
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Fee Structure"
        description="Are you sure you want to delete this fee structure? This may affect students assigned to this class."
      />
    </div>
  );
};

export default FeeStructure;