import jsPDF from 'jspdf';

// Receipt sizes in mm
export const RECEIPT_SIZES = {
  A7: { width: 74, height: 105, label: 'A7 (74 × 105 mm)' },
  A6: { width: 105, height: 148, label: 'A6 (105 × 148 mm)' },
  A5: { width: 148, height: 210, label: 'A5 (148 × 210 mm)' },
  A4: { width: 210, height: 297, label: 'A4 (210 × 297 mm)' },
} as const;

export type ReceiptSize = keyof typeof RECEIPT_SIZES;

export interface StudentPaymentData {
  studentName: string;
  admissionNumber: string | null;
  className: string;
  amountPaid: number;
  balance: number;
}

export interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  paymentMethod: string;
  students: StudentPaymentData[];
  totalPaid: number;
  amountInWords: string;
  notes: string;
  signatureLabel: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
}

// Convert number to words
export const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const convertHundreds = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convertHundreds(n % 100) : '');
  };
  
  const convertSection = (n: number, suffix: string): string => {
    if (n === 0) return '';
    return convertHundreds(n) + ' ' + suffix + ' ';
  };
  
  if (num >= 1000000000) {
    return convertSection(Math.floor(num / 1000000000), 'Billion') +
           convertSection(Math.floor((num % 1000000000) / 1000000), 'Million') +
           convertSection(Math.floor((num % 1000000) / 1000), 'Thousand') +
           convertHundreds(num % 1000);
  }
  if (num >= 1000000) {
    return convertSection(Math.floor(num / 1000000), 'Million') +
           convertSection(Math.floor((num % 1000000) / 1000), 'Thousand') +
           convertHundreds(num % 1000);
  }
  if (num >= 1000) {
    return convertSection(Math.floor(num / 1000), 'Thousand') +
           convertHundreds(num % 1000);
  }
  return convertHundreds(num);
};

// Generate unique receipt number
export const generateReceiptNumber = (): string => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `RCP-${year}${month}${day}-${random}`;
};

// Font scaling based on receipt size
export const getFontScale = (size: ReceiptSize): number => {
  switch (size) {
    case 'A7': return 0.6;
    case 'A6': return 0.75;
    case 'A5': return 0.9;
    case 'A4': return 1;
    default: return 1;
  }
};

// Generate PDF receipt
export const generateReceiptPDF = (data: ReceiptData, size: ReceiptSize): jsPDF => {
  const dimensions = RECEIPT_SIZES[size];
  const scale = getFontScale(size);
  const doc = new jsPDF({
    orientation: dimensions.width > dimensions.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [dimensions.width, dimensions.height],
  });

  const margin = 8 * scale;
  const pageWidth = dimensions.width;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper to add text with scaling
  const addText = (text: string, x: number, y: number, options: { fontSize?: number; fontStyle?: 'normal' | 'bold'; align?: 'left' | 'center' | 'right' } = {}) => {
    const { fontSize = 10, fontStyle = 'normal', align = 'left' } = options;
    doc.setFontSize(fontSize * scale);
    doc.setFont('helvetica', fontStyle);
    
    let xPos = x;
    if (align === 'center') {
      xPos = pageWidth / 2;
    } else if (align === 'right') {
      xPos = pageWidth - margin;
    }
    
    doc.text(text, xPos, y, { align });
    return y + (fontSize * scale * 0.4);
  };

  // School Header
  yPos = addText(data.schoolName || 'School Name', margin, yPos, { fontSize: 14, fontStyle: 'bold', align: 'center' });
  yPos += 2;
  if (data.schoolAddress) {
    yPos = addText(data.schoolAddress, margin, yPos, { fontSize: 9, align: 'center' });
  }
  if (data.schoolPhone) {
    yPos = addText(`Tel: ${data.schoolPhone}`, margin, yPos, { fontSize: 9, align: 'center' });
  }
  
  yPos += 4;
  
  // Receipt Title
  yPos = addText('PAYMENT RECEIPT', margin, yPos, { fontSize: 12, fontStyle: 'bold', align: 'center' });
  yPos += 4;

  // Receipt Info
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;
  
  addText(`Receipt No: ${data.receiptNumber}`, margin, yPos, { fontSize: 9, fontStyle: 'bold' });
  yPos = addText(`Date: ${data.paymentDate}`, margin, yPos, { fontSize: 9, align: 'right' });
  yPos += 1;
  yPos = addText(`Payment Method: ${data.paymentMethod}`, margin, yPos, { fontSize: 9 });
  yPos += 4;
  
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Student Details Table Header
  if (data.students.length > 1) {
    yPos = addText('FAMILY RECEIPT - COMBINED PAYMENT', margin, yPos, { fontSize: 10, fontStyle: 'bold', align: 'center' });
    yPos += 4;
  }

  // Table
  const colWidths = data.students.length > 1 
    ? [contentWidth * 0.3, contentWidth * 0.2, contentWidth * 0.2, contentWidth * 0.15, contentWidth * 0.15]
    : [contentWidth * 0.5, contentWidth * 0.5];

  if (data.students.length > 1) {
    // Multi-student header
    const headers = ['Student', 'Adm. No.', 'Class', 'Amount', 'Balance'];
    let xOffset = margin;
    headers.forEach((header, i) => {
      doc.setFontSize(8 * scale);
      doc.setFont('helvetica', 'bold');
      doc.text(header, xOffset, yPos);
      xOffset += colWidths[i];
    });
    yPos += 4;
    doc.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
    
    // Student rows
    data.students.forEach((student) => {
      let xOffset = margin;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8 * scale);
      doc.text(student.studentName.slice(0, 20), xOffset, yPos);
      xOffset += colWidths[0];
      doc.text(student.admissionNumber || '-', xOffset, yPos);
      xOffset += colWidths[1];
      doc.text(student.className, xOffset, yPos);
      xOffset += colWidths[2];
      doc.text(`KES ${student.amountPaid.toLocaleString()}`, xOffset, yPos);
      xOffset += colWidths[3];
      doc.text(`KES ${student.balance.toLocaleString()}`, xOffset, yPos);
      yPos += 4;
    });
  } else {
    // Single student
    const student = data.students[0];
    yPos = addText(`Student Name: ${student.studentName}`, margin, yPos, { fontSize: 9 });
    yPos = addText(`Admission No: ${student.admissionNumber || 'N/A'}`, margin, yPos, { fontSize: 9 });
    yPos = addText(`Class: ${student.className}`, margin, yPos, { fontSize: 9 });
    yPos += 2;
  }

  yPos += 2;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4;

  // Payment Details
  yPos = addText(`Amount Paid: KES ${data.totalPaid.toLocaleString()}`, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
  yPos = addText(`Amount in Words: ${data.amountInWords} Shillings Only`, margin, yPos, { fontSize: 9 });
  
  if (data.students.length === 1) {
    yPos = addText(`Balance: KES ${data.students[0].balance.toLocaleString()}`, margin, yPos, { fontSize: 9 });
  } else {
    const totalBalance = data.students.reduce((sum, s) => sum + s.balance, 0);
    yPos = addText(`Total Balance: KES ${totalBalance.toLocaleString()}`, margin, yPos, { fontSize: 9 });
  }

  if (data.notes) {
    yPos += 2;
    yPos = addText(`Notes: ${data.notes}`, margin, yPos, { fontSize: 8 });
  }

  // Footer
  yPos = dimensions.height - margin - 20;
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 6;
  
  // Signature line
  const sigLineY = yPos + 10;
  doc.line(margin, sigLineY, margin + contentWidth * 0.4, sigLineY);
  yPos = addText(data.signatureLabel, margin, sigLineY + 4, { fontSize: 8 });

  // Thank you message
  yPos = dimensions.height - margin - 4;
  addText('Thank you for your payment!', margin, yPos, { fontSize: 8, align: 'center' });

  return doc;
};

// Print receipt using browser
export const printReceipt = (contentHtml: string, size: ReceiptSize) => {
  const dimensions = RECEIPT_SIZES[size];
  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Receipt</title>
        <style>
          @page {
            size: ${dimensions.width}mm ${dimensions.height}mm;
            margin: 8mm;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: 'Segoe UI', Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body>
        ${contentHtml}
        <script>
          window.onload = function() {
            window.print();
            window.onafterprint = function() { window.close(); };
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
};
