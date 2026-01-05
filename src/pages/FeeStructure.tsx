import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Pencil, Trash2, DollarSign, Loader2, Bus } from "lucide-react";
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
  const [isBusDialogOpen, setIsBusDialogOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [editingBusStructure, setEditingBusStructure] = useState<FeeStructure | null>(null);
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStructureId, setDeletingStructureId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'fee' | 'bus'>('fee');

  const [formData, setFormData] = useState({
    name: "",
    monthly_fee: "",
    academic_year: new Date().getFullYear().toString(),
    term: "Term 1",
  });

  const [busFormData, setBusFormData] = useState({
    name: "",
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
      academic_year: new Date().getFullYear().toString(),
      term: "Term 1",
    });
    setEditingStructure(null);
  };

  const resetBusForm = () => {
    setBusFormData({ 
      name: "", 
      bus_fee: "",
      academic_year: new Date().getFullYear().toString(),
      term: "Term 1",
    });
    setEditingBusStructure(null);
  };

  const handleOpenDialog = (structure?: FeeStructure) => {
    if (structure) {
      setEditingStructure(structure);
      setFormData({
        name: structure.name,
        monthly_fee: structure.monthly_fee.toString(),
        academic_year: structure.academic_year,
        term: structure.term,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleOpenBusDialog = (structure?: FeeStructure) => {
    if (structure) {
      setEditingBusStructure(structure);
      setBusFormData({
        name: structure.name,
        bus_fee: structure.bus_fee.toString(),
        academic_year: structure.academic_year,
        term: structure.term,
      });
    } else {
      resetBusForm();
    }
    setIsBusDialogOpen(true);
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
            bus_fee: 0,
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

  const handleSaveBus = async () => {
    if (!busFormData.name || !busFormData.bus_fee) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingBusStructure) {
        const { error } = await supabase
          .from('classes')
          .update({
            bus_fee: Number(busFormData.bus_fee),
          })
          .eq('id', editingBusStructure.id);

        if (error) throw error;
        toast({ title: "Success", description: "Bus charges updated successfully" });
      } else {
        // Find or create the class first
        const existingClass = feeStructures.find(
          f => f.name === busFormData.name && 
          f.academic_year === busFormData.academic_year && 
          f.term === busFormData.term
        );

        if (existingClass) {
          // Update existing class with bus fee
          const { error } = await supabase
            .from('classes')
            .update({
              bus_fee: Number(busFormData.bus_fee),
            })
            .eq('id', existingClass.id);

          if (error) throw error;
        } else {
          toast({
            title: "Error",
            description: "Please create a fee structure for this class first before adding bus charges.",
            variant: "destructive",
          });
          setSaving(false);
          return;
        }
        toast({ title: "Success", description: "Bus charges added successfully" });
      }

      await fetchFeeStructures();
      setIsBusDialogOpen(false);
      resetBusForm();
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

  const handleDeleteClick = (id: string, type: 'fee' | 'bus') => {
    setDeletingStructureId(id);
    setDeleteType(type);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingStructureId) return;
    
    try {
      if (deleteType === 'bus') {
        // Just clear the bus fee, don't delete the class
        const { error } = await supabase
          .from('classes')
          .update({ bus_fee: 0 })
          .eq('id', deletingStructureId);

        if (error) throw error;
        toast({ title: "Success", description: "Bus charges removed successfully" });
      } else {
        const { error } = await supabase
          .from('classes')
          .delete()
          .eq('id', deletingStructureId);

        if (error) throw error;
        toast({ title: "Success", description: "Fee structure deleted successfully" });
      }
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
  const busStructures = feeStructures.filter(f => f.bus_fee > 0);

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
          <p className="text-muted-foreground">Manage class fees and bus charges</p>
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
              <CardTitle className="text-sm font-medium">Average Fee</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalMonthlyFees / feeStructures.length || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Classes with Bus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{busStructures.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="fees" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="fees" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Fee Structure
          </TabsTrigger>
          <TabsTrigger value="bus" className="flex items-center gap-2">
            <Bus className="h-4 w-4" /> Bus Charges
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fees">
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
                        <Label>School Fee (KES) *</Label>
                        <Input
                          type="number"
                          value={formData.monthly_fee}
                          onChange={(e) => setFormData({ ...formData, monthly_fee: e.target.value })}
                          placeholder="5000"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Academic Year *</Label>
                          <Select value={formData.academic_year} onValueChange={(val) => setFormData({ ...formData, academic_year: val })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select year" />
                            </SelectTrigger>
                            <SelectContent>
                              {yearOptions.map((year) => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Term *</Label>
                          <Select value={formData.term} onValueChange={(val) => setFormData({ ...formData, term: val })}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select term" />
                            </SelectTrigger>
                            <SelectContent>
                              {TERMS.map((term) => (
                                <SelectItem key={term} value={term}>{term}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
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
                      <TableHead>School Fee</TableHead>
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
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(structure)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(structure.id, 'fee')}>
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
        </TabsContent>

        <TabsContent value="bus">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bus className="h-5 w-5 text-amber-600" />
                    Bus Charges Structure
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Set bus charges for students who use school transport
                  </p>
                </div>
                <Dialog open={isBusDialogOpen} onOpenChange={setIsBusDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={() => handleOpenBusDialog()} variant="outline" className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                      <Plus className="h-4 w-4 mr-2" /> Add Bus Charges
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Bus className="h-5 w-5 text-amber-600" />
                        {editingBusStructure ? "Edit Bus Charges" : "Add Bus Charges"}
                      </DialogTitle>
                      <DialogDescription>
                        {editingBusStructure ? "Update bus charges for this class" : "Add bus charges to an existing class"}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select Class *</Label>
                        <Select 
                          value={busFormData.name} 
                          onValueChange={(val) => {
                            const selectedClass = feeStructures.find(f => f.name === val);
                            if (selectedClass) {
                              setBusFormData({ 
                                ...busFormData, 
                                name: val,
                                academic_year: selectedClass.academic_year,
                                term: selectedClass.term
                              });
                            }
                          }}
                          disabled={!!editingBusStructure}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select class" />
                          </SelectTrigger>
                          <SelectContent>
                            {feeStructures
                              .filter(f => editingBusStructure ? true : f.bus_fee === 0)
                              .map((structure) => (
                                <SelectItem key={structure.id} value={structure.name}>
                                  {structure.name} ({structure.academic_year} - {structure.term})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        {!editingBusStructure && (
                          <p className="text-xs text-muted-foreground">
                            Only classes without bus charges are shown
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Bus Charges (KES) *</Label>
                        <Input
                          type="number"
                          value={busFormData.bus_fee}
                          onChange={(e) => setBusFormData({ ...busFormData, bus_fee: e.target.value })}
                          placeholder="2000"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsBusDialogOpen(false)}>Cancel</Button>
                      <Button onClick={handleSaveBus} disabled={saving} className="bg-amber-600 hover:bg-amber-700">
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : editingBusStructure ? "Update" : "Add"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {busStructures.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Term</TableHead>
                      <TableHead>Bus Charges</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {busStructures.map((structure) => (
                      <TableRow key={structure.id}>
                        <TableCell className="font-medium">{structure.name}</TableCell>
                        <TableCell>{structure.academic_year}</TableCell>
                        <TableCell>{structure.term}</TableCell>
                        <TableCell className="text-amber-600 font-semibold">{formatCurrency(structure.bus_fee)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenBusDialog(structure)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(structure.id, 'bus')}>
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
                  <Bus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Bus Charges</h3>
                  <p className="text-muted-foreground mb-4">Add bus charges for classes that use school transport.</p>
                  <Button onClick={() => handleOpenBusDialog()} variant="outline" className="border-amber-500 text-amber-600">
                    <Plus className="h-4 w-4 mr-2" /> Add Bus Charges
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={deleteType === 'bus' ? "Remove Bus Charges" : "Delete Fee Structure"}
        description={deleteType === 'bus' 
          ? "Are you sure you want to remove bus charges for this class?" 
          : "Are you sure you want to delete this fee structure? This may affect students assigned to this class."}
      />
    </div>
  );
};

export default FeeStructure;