import { useState, useEffect, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Download, X, Users, User, Search, Eye, EyeOff } from "lucide-react";
import { 
  ReceiptData, 
  ReceiptSize, 
  RECEIPT_SIZES, 
  StudentPaymentData,
  generateReceiptNumber, 
  numberToWords,
  generateReceiptPDF,
  getFontScale,
} from "@/lib/receiptUtils";
import { ReceiptPreview } from "./ReceiptPreview";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PaymentWithStudent {
  id: string;
  student_id: string;
  student_name: string;
  admission_number: string | null;
  class_name: string;
  class_id: string | null;
  amount: number;
  payment_date: string;
  payment_method: string;
  notes: string;
}

interface FamilyStudent {
  id: string;
  name: string;
  admission_number: string | null;
  class_id: string | null;
  class_name: string;
  totalPaid: number;
  balance: number;
}

interface ReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithStudent | null;
  allStudents: { id: string; name: string; admission_number: string | null; class_id: string | null }[];
  classes: { id: string; name: string; monthly_fee: number }[];
}

const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  mobile_money: "Mobile Money (M-Pesa)",
  bank_transfer: "Bank Transfer",
  card: "Card",
};

export const ReceiptModal = ({ 
  open, 
  onOpenChange, 
  payment, 
  allStudents,
  classes,
}: ReceiptModalProps) => {
  const { user } = useAuth();
  const [receiptSize, setReceiptSize] = useState<ReceiptSize>("A5");
  const [receiptMode, setReceiptMode] = useState<"individual" | "family">("individual");
  const [receiptNumber] = useState(() => generateReceiptNumber());
  
  // Editable fields
  const [paymentDate, setPaymentDate] = useState("");
  const [amountInWords, setAmountInWords] = useState("");
  const [notes, setNotes] = useState("");
  const [signatureLabel, setSignatureLabel] = useState("Authorized Signature / School Stamp");
  
  // School info
  const [schoolInfo, setSchoolInfo] = useState({
    school_name: "",
    school_address: "",
    school_phone: "",
  });

  // Family receipt - selected siblings
  const [familyStudents, setFamilyStudents] = useState<FamilyStudent[]>([]);
  const [selectedFamilyStudents, setSelectedFamilyStudents] = useState<Set<string>>(new Set());
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Filter students based on search
  const filteredFamilyStudents = useMemo(() => {
    if (!studentSearch.trim()) return familyStudents;
    const searchLower = studentSearch.toLowerCase();
    return familyStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(searchLower) ||
        (s.admission_number && s.admission_number.toLowerCase().includes(searchLower))
    );
  }, [familyStudents, studentSearch]);

  // Fetch school info
  useEffect(() => {
    const fetchSchoolInfo = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("school_name, school_address, school_phone")
        .eq("id", user.id)
        .maybeSingle();
      
      if (data) {
        setSchoolInfo({
          school_name: data.school_name || "",
          school_address: data.school_address || "",
          school_phone: data.school_phone || "",
        });
      }
    };
    fetchSchoolInfo();
  }, [user]);

  // Initialize editable fields when payment changes
  useEffect(() => {
    if (payment) {
      setPaymentDate(formatDate(payment.payment_date));
      setAmountInWords(numberToWords(Math.round(payment.amount)));
      setNotes(payment.notes || "");
      setReceiptMode("individual");
      setSelectedFamilyStudents(new Set([payment.student_id]));
    }
  }, [payment]);

  // Fetch potential family members (students with same parent contact info would be ideal, but for now we'll show all students)
  useEffect(() => {
    const fetchFamilyData = async () => {
      if (!payment || !user) return;
      setLoadingFamily(true);
      
      try {
        // Get all students for this user with their payment data
        const studentsWithPayments = await Promise.all(
          allStudents.map(async (student) => {
            const classInfo = classes.find(c => c.id === student.class_id);
            const totalFee = classInfo?.monthly_fee || 0;
            
            // Get total paid for this student
            const { data: payments } = await supabase
              .from("payments")
              .select("amount")
              .eq("student_id", student.id);
            
            const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
            
            return {
              id: student.id,
              name: student.name,
              admission_number: student.admission_number,
              class_id: student.class_id,
              class_name: classInfo?.name || "N/A",
              totalPaid,
              balance: totalFee - totalPaid,
            };
          })
        );
        
        setFamilyStudents(studentsWithPayments);
      } catch (error) {
        console.error("Error fetching family data:", error);
      } finally {
        setLoadingFamily(false);
      }
    };
    
    if (open && receiptMode === "family") {
      fetchFamilyData();
    }
  }, [open, receiptMode, payment, user, allStudents, classes]);

  const toggleFamilyStudent = (studentId: string) => {
    const newSet = new Set(selectedFamilyStudents);
    if (newSet.has(studentId)) {
      // Don't allow deselecting the original payment's student
      if (studentId === payment?.student_id) return;
      newSet.delete(studentId);
    } else {
      newSet.add(studentId);
    }
    setSelectedFamilyStudents(newSet);
  };

  // Build receipt data
  const buildReceiptData = (): ReceiptData => {
    const students: StudentPaymentData[] = [];
    let totalPaid = 0;

    if (receiptMode === "individual" && payment) {
      const classInfo = classes.find(c => c.id === payment.class_id);
      const totalFee = classInfo?.monthly_fee || 0;
      
      // Calculate balance (we need to fetch all payments for this student)
      const studentData = familyStudents.find(s => s.id === payment.student_id);
      const balance = studentData?.balance ?? 0;
      
      students.push({
        studentName: payment.student_name,
        admissionNumber: payment.admission_number,
        className: payment.class_name,
        amountPaid: payment.amount,
        balance: balance,
      });
      totalPaid = payment.amount;
    } else if (receiptMode === "family") {
      familyStudents
        .filter(s => selectedFamilyStudents.has(s.id))
        .forEach(student => {
          // For family receipt, use the most recent payment amount for each selected student
          const studentPayment = student.id === payment?.student_id ? payment.amount : 0;
          students.push({
            studentName: student.name,
            admissionNumber: student.admission_number,
            className: student.class_name,
            amountPaid: studentPayment,
            balance: student.balance,
          });
          totalPaid += studentPayment;
        });
    }

    return {
      receiptNumber,
      paymentDate,
      paymentMethod: paymentMethodLabels[payment?.payment_method || "cash"] || payment?.payment_method || "Cash",
      students,
      totalPaid,
      amountInWords,
      notes,
      signatureLabel,
      schoolName: schoolInfo.school_name,
      schoolAddress: schoolInfo.school_address,
      schoolPhone: schoolInfo.school_phone,
    };
  };

  const handlePrint = () => {
    const receiptData = buildReceiptData();
    const scale = getFontScale(receiptSize);
    
    const printContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 100%; padding: 20px;">
        <div style="text-align: center; border-bottom: 1px solid #ccc; padding-bottom: 10px; margin-bottom: 10px;">
          <h1 style="margin: 0; font-size: ${18 * scale}px;">${receiptData.schoolName}</h1>
          ${receiptData.schoolAddress ? `<p style="margin: 4px 0; font-size: ${12 * scale}px; color: #666;">${receiptData.schoolAddress}</p>` : ''}
          ${receiptData.schoolPhone ? `<p style="margin: 4px 0; font-size: ${12 * scale}px; color: #666;">Tel: ${receiptData.schoolPhone}</p>` : ''}
        </div>
        <h2 style="text-align: center; font-size: ${16 * scale}px; margin: 15px 0;">PAYMENT RECEIPT</h2>
        <div style="display: flex; justify-content: space-between; border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 8px 0; font-size: ${12 * scale}px;">
          <span><strong>Receipt No:</strong> ${receiptData.receiptNumber}</span>
          <span><strong>Date:</strong> ${receiptData.paymentDate}</span>
        </div>
        <p style="font-size: ${12 * scale}px;"><strong>Payment Method:</strong> ${receiptData.paymentMethod}</p>
        ${receiptData.students.length > 1 ? `<div style="text-align: center; background: #f5f5f5; padding: 8px; margin: 10px 0; font-weight: bold;">FAMILY RECEIPT - COMBINED PAYMENT</div>` : ''}
        ${receiptData.students.length > 1 ? `
          <table style="width: 100%; border-collapse: collapse; font-size: ${11 * scale}px; margin: 10px 0;">
            <thead>
              <tr style="border-bottom: 1px solid #ccc;">
                <th style="text-align: left; padding: 8px 4px;">Student</th>
                <th style="text-align: left; padding: 8px 4px;">Adm. No.</th>
                <th style="text-align: left; padding: 8px 4px;">Class</th>
                <th style="text-align: right; padding: 8px 4px;">Amount</th>
                <th style="text-align: right; padding: 8px 4px;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${receiptData.students.map(s => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 6px 4px;">${s.studentName}</td>
                  <td style="padding: 6px 4px;">${s.admissionNumber || '-'}</td>
                  <td style="padding: 6px 4px;">${s.className}</td>
                  <td style="padding: 6px 4px; text-align: right;">KES ${s.amountPaid.toLocaleString()}</td>
                  <td style="padding: 6px 4px; text-align: right;">KES ${s.balance.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div style="font-size: ${12 * scale}px; margin: 15px 0;">
            <p><strong>Student Name:</strong> ${receiptData.students[0]?.studentName}</p>
            <p><strong>Admission No:</strong> ${receiptData.students[0]?.admissionNumber || 'N/A'}</p>
            <p><strong>Class:</strong> ${receiptData.students[0]?.className}</p>
          </div>
        `}
        <div style="border-top: 1px solid #ccc; padding-top: 10px; margin-top: 10px;">
          <p style="font-size: ${14 * scale}px; font-weight: bold;">Amount Paid: KES ${receiptData.totalPaid.toLocaleString()}</p>
          <p style="font-size: ${11 * scale}px;"><strong>In Words:</strong> ${receiptData.amountInWords} Shillings Only</p>
          <p style="font-size: ${12 * scale}px;"><strong>Balance:</strong> KES ${receiptData.students.reduce((sum, s) => sum + s.balance, 0).toLocaleString()}</p>
          ${receiptData.notes ? `<p style="font-size: ${11 * scale}px; color: #666;"><strong>Notes:</strong> ${receiptData.notes}</p>` : ''}
        </div>
        <div style="margin-top: 40px; border-top: 1px solid #ccc; padding-top: 10px;">
          <div style="width: 200px; border-top: 1px solid #000; margin-top: 30px;">
            <p style="font-size: ${10 * scale}px; color: #666; margin-top: 4px;">${receiptData.signatureLabel}</p>
          </div>
          <p style="text-align: center; color: #888; font-size: ${10 * scale}px; margin-top: 20px;">Thank you for your payment!</p>
        </div>
      </div>
    `;

    const dimensions = RECEIPT_SIZES[receiptSize];
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${receiptData.receiptNumber}</title>
          <style>
            @page { size: ${dimensions.width}mm ${dimensions.height}mm; margin: 8mm; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            window.onload = function() { window.print(); window.onafterprint = function() { window.close(); }; };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    const receiptData = buildReceiptData();
    const pdf = generateReceiptPDF(receiptData, receiptSize);
    pdf.save(`Receipt-${receiptData.receiptNumber}.pdf`);
  };

  if (!payment) return null;

  const receiptData = buildReceiptData();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Receipt Preview
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-4 h-full">
            {/* Left Panel - Settings */}
            <ScrollArea className="h-[calc(85vh-120px)] pr-4">
              <div className="space-y-4">
                {/* Receipt Type */}
                <Tabs value={receiptMode} onValueChange={(v) => setReceiptMode(v as "individual" | "family")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="individual" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Individual
                    </TabsTrigger>
                    <TabsTrigger value="family" className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Family
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="family" className="mt-4">
                    <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                      <Label className="text-base font-bold block">Select siblings/family members:</Label>
                      
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <Input
                          placeholder="Search by name or admission number..."
                          value={studentSearch}
                          onChange={(e) => setStudentSearch(e.target.value)}
                          className="pl-10 text-base font-semibold"
                        />
                      </div>
                      
                      {loadingFamily ? (
                        <p className="text-base font-medium text-muted-foreground py-4 text-center">Loading...</p>
                      ) : (
                        <ScrollArea className="h-48 border rounded-md bg-background">
                          <div className="p-2 space-y-1">
                            {filteredFamilyStudents.map((student) => {
                              const isSelected = selectedFamilyStudents.has(student.id);
                              const isOriginal = student.id === payment.student_id;
                              return (
                                <div 
                                  key={student.id} 
                                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer transition-colors ${
                                    isSelected 
                                      ? "bg-primary/15 border border-primary/30" 
                                      : "hover:bg-muted/50 border border-transparent"
                                  } ${isOriginal ? "opacity-70" : ""}`}
                                  onClick={() => !isOriginal && toggleFamilyStudent(student.id)}
                                >
                                  <Checkbox
                                    id={student.id}
                                    checked={isSelected}
                                    onCheckedChange={() => toggleFamilyStudent(student.id)}
                                    disabled={isOriginal}
                                    className="h-5 w-5"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-bold text-base truncate">{student.name}</p>
                                    <p className="text-sm text-muted-foreground font-semibold">
                                      {student.admission_number || "No Adm. No."} • {student.class_name}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                            {filteredFamilyStudents.length === 0 && (
                              <p className="text-center py-4 text-muted-foreground font-semibold">
                                No students found
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      )}
                      
                      <p className="text-sm font-bold text-muted-foreground">
                        {selectedFamilyStudents.size} student(s) selected
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Receipt Size */}
                <div className="space-y-2">
                  <Label className="text-base font-bold">Receipt Size (Paper Size)</Label>
                  <Select value={receiptSize} onValueChange={(v) => setReceiptSize(v as ReceiptSize)}>
                    <SelectTrigger className="text-base font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RECEIPT_SIZES).map(([key, value]) => (
                        <SelectItem key={key} value={key} className="text-base font-medium">
                          {value.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm font-semibold text-muted-foreground">
                    The PDF and print will use this exact paper size
                  </p>
                </div>

                {/* Editable Fields */}
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-bold text-base">Editable Fields</h3>
                  
                  <div className="space-y-2">
                    <Label className="font-semibold text-base">Date of Payment</Label>
                    <Input
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="text-base font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-base">Amount in Words</Label>
                    <Input
                      value={amountInWords}
                      onChange={(e) => setAmountInWords(e.target.value)}
                      className="text-base font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-base">Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes..."
                      rows={2}
                      className="text-base font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="font-semibold text-base">Signature Label</Label>
                    <Input
                      value={signatureLabel}
                      onChange={(e) => setSignatureLabel(e.target.value)}
                      className="text-base font-medium"
                    />
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Right Panel - Preview */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="text-base font-bold text-foreground">
                  Receipt Preview
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="font-semibold"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Show Preview
                    </>
                  )}
                </Button>
              </div>
              
              {showPreview ? (
                <div className="flex-1 flex flex-col overflow-auto bg-muted/30 rounded-lg p-4">
                  <div className="text-sm font-semibold text-muted-foreground mb-3 text-center">
                    Paper Size: {RECEIPT_SIZES[receiptSize].label}
                  </div>
                  <div className="flex-1 flex items-start justify-center">
                    <ReceiptPreview data={receiptData} size={receiptSize} />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg p-8 min-h-[300px]">
                  <div className="text-center text-muted-foreground">
                    <Eye className="h-16 w-16 mx-auto mb-4 opacity-40" />
                    <p className="font-bold text-lg">Click "Show Preview" to see the receipt</p>
                    <p className="text-sm font-medium mt-2">Preview will update in real-time as you make changes</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-semibold">
            <X className="h-4 w-4 mr-2" /> Close
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} className="font-semibold">
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
          <Button onClick={handlePrint} className="font-bold">
            <Printer className="h-4 w-4 mr-2" /> Print Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
