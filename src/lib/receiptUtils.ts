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
    case 'A7': return 0.55;
    case 'A6': return 0.7;
    case 'A5': return 0.85;
    case 'A4': return 1;
    default: return 1;
  }
};

// Generate PDF receipt with professional design
export const generateReceiptPDF = (data: ReceiptData, size: ReceiptSize): jsPDF => {
  const dimensions = RECEIPT_SIZES[size];
  const scale = getFontScale(size);
  const doc = new jsPDF({
    orientation: dimensions.width > dimensions.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [dimensions.width, dimensions.height],
  });

  const margin = 6 * scale;
  const pageWidth = dimensions.width;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper to add text with scaling
  const addText = (text: string, x: number, y: number, options: { fontSize?: number; fontStyle?: 'normal' | 'bold'; align?: 'left' | 'center' | 'right'; color?: number[] } = {}) => {
    const { fontSize = 10, fontStyle = 'normal', align = 'left', color = [0, 0, 0] } = options;
    doc.setFontSize(fontSize * scale);
    doc.setFont('helvetica', fontStyle);
    doc.setTextColor(color[0], color[1], color[2]);
    
    let xPos = x;
    if (align === 'center') {
      xPos = pageWidth / 2;
    } else if (align === 'right') {
      xPos = pageWidth - margin;
    }
    
    doc.text(text, xPos, y, { align });
    return y + (fontSize * scale * 0.45);
  };

  // Yellow Header Background
  doc.setFillColor(252, 211, 77); // Yellow
  doc.rect(0, 0, pageWidth, 22 * scale, 'F');

  // School Header (on yellow background)
  yPos = 5 * scale;
  doc.setTextColor(0, 0, 0);
  yPos = addText(data.schoolName?.toUpperCase() || 'SCHOOL NAME', margin, yPos, { fontSize: 14, fontStyle: 'bold', align: 'center' });
  yPos += 1;
  if (data.schoolAddress) {
    yPos = addText(data.schoolAddress, margin, yPos, { fontSize: 9, fontStyle: 'bold', align: 'center' });
  }
  if (data.schoolPhone) {
    yPos = addText(`Tel: ${data.schoolPhone}`, margin, yPos, { fontSize: 9, fontStyle: 'bold', align: 'center' });
  }
  
  yPos = 24 * scale;
  
  // Receipt Title with border
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  const titleWidth = 50 * scale;
  const titleX = (pageWidth - titleWidth) / 2;
  doc.rect(titleX, yPos - 4, titleWidth, 8 * scale);
  addText('PAYMENT RECEIPT', margin, yPos, { fontSize: 12, fontStyle: 'bold', align: 'center' });
  yPos += 8 * scale;

  // Receipt Info Box
  doc.setFillColor(245, 245, 245);
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPos, contentWidth, 14 * scale, 'FD');
  yPos += 4 * scale;
  
  addText(`Receipt No: ${data.receiptNumber}`, margin + 2, yPos, { fontSize: 9, fontStyle: 'bold' });
  // Date in RED
  addText(`Date: ${data.paymentDate}`, margin, yPos, { fontSize: 9, fontStyle: 'bold', align: 'right', color: [220, 38, 38] });
  yPos += 4 * scale;
  addText(`Payment Method: ${data.paymentMethod}`, margin + 2, yPos, { fontSize: 9, fontStyle: 'bold' });
  yPos += 8 * scale;

  // Family Receipt Label
  if (data.students.length > 1) {
    doc.setFillColor(219, 234, 254); // Light blue
    doc.setDrawColor(59, 130, 246);
    doc.rect(margin, yPos, contentWidth, 7 * scale, 'FD');
    yPos += 4.5 * scale;
    doc.setTextColor(30, 64, 175);
    addText('FAMILY RECEIPT - COMBINED PAYMENT', margin, yPos - 1, { fontSize: 10, fontStyle: 'bold', align: 'center' });
    doc.setTextColor(0, 0, 0);
    yPos += 5 * scale;
  }

  // Table for multiple students
  const colWidths = data.students.length > 1 
    ? [contentWidth * 0.28, contentWidth * 0.18, contentWidth * 0.18, contentWidth * 0.18, contentWidth * 0.18]
    : [contentWidth * 0.5, contentWidth * 0.5];

  if (data.students.length > 1) {
    // Table header
    doc.setFillColor(229, 231, 235);
    doc.rect(margin, yPos, contentWidth, 6 * scale, 'F');
    yPos += 4 * scale;
    
    const headers = ['Student', 'Adm. No.', 'Class', 'Amount', 'Balance'];
    let xOffset = margin + 1;
    doc.setFontSize(8 * scale);
    doc.setFont('helvetica', 'bold');
    headers.forEach((header, i) => {
      if (i === 4) doc.setTextColor(220, 38, 38); // Balance in red
      else doc.setTextColor(0, 0, 0);
      doc.text(header, xOffset, yPos - 1);
      xOffset += colWidths[i];
    });
    doc.setTextColor(0, 0, 0);
    yPos += 3 * scale;
    
    doc.setDrawColor(156, 163, 175);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 3 * scale;
    
    // Student rows
    data.students.forEach((student, idx) => {
      if (idx % 2 === 1) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, yPos - 3, contentWidth, 5 * scale, 'F');
      }
      
      let xOffset = margin + 1;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7 * scale);
      doc.text(student.studentName.slice(0, 18), xOffset, yPos);
      xOffset += colWidths[0];
      
      doc.setFont('helvetica', 'normal');
      doc.text(student.admissionNumber || '-', xOffset, yPos);
      xOffset += colWidths[1];
      doc.text(student.className, xOffset, yPos);
      xOffset += colWidths[2];
      
      doc.setTextColor(21, 128, 61); // Green for amount
      doc.setFont('helvetica', 'bold');
      doc.text(`KES ${student.amountPaid.toLocaleString()}`, xOffset, yPos);
      xOffset += colWidths[3];
      
      doc.setTextColor(220, 38, 38); // Red for balance
      doc.text(`KES ${student.balance.toLocaleString()}`, xOffset, yPos);
      doc.setTextColor(0, 0, 0);
      
      yPos += 5 * scale;
    });
  } else {
    // Single student info box
    const student = data.students[0];
    doc.setFillColor(249, 250, 251);
    doc.setDrawColor(200, 200, 200);
    doc.rect(margin, yPos, contentWidth, 16 * scale, 'FD');
    yPos += 4 * scale;
    
    yPos = addText(`Student Name: ${student?.studentName || 'N/A'}`, margin + 2, yPos, { fontSize: 10, fontStyle: 'bold' });
    yPos = addText(`Admission No: ${student?.admissionNumber || 'N/A'}`, margin + 2, yPos, { fontSize: 9 });
    yPos = addText(`Class: ${student?.className || 'N/A'}`, margin + 2, yPos, { fontSize: 9 });
    yPos += 2 * scale;
  }

  yPos += 3 * scale;
  doc.setDrawColor(156, 163, 175);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 5 * scale;

  // Payment Summary
  doc.setTextColor(0, 0, 0);
  addText('TOTAL AMOUNT PAID:', margin, yPos, { fontSize: 10, fontStyle: 'bold' });
  doc.setTextColor(21, 128, 61); // Green
  addText(`KES ${data.totalPaid.toLocaleString()}`, margin, yPos, { fontSize: 12, fontStyle: 'bold', align: 'right' });
  doc.setTextColor(0, 0, 0);
  yPos += 5 * scale;
  
  yPos = addText(`In Words: ${data.amountInWords} Shillings Only`, margin, yPos, { fontSize: 9 });
  
  // Balance in RED
  const totalBalance = data.students.reduce((sum, s) => sum + s.balance, 0);
  const balanceLabel = data.students.length === 1 ? 'Balance:' : 'Total Balance:';
  const balanceValue = data.students.length === 1 ? (data.students[0]?.balance || 0) : totalBalance;
  
  addText(balanceLabel, margin, yPos, { fontSize: 10, fontStyle: 'bold' });
  addText(`KES ${balanceValue.toLocaleString()}`, margin, yPos, { fontSize: 11, fontStyle: 'bold', align: 'right', color: [220, 38, 38] });
  yPos += 5 * scale;

  if (data.notes) {
    yPos += 2;
    yPos = addText(`Notes: ${data.notes}`, margin, yPos, { fontSize: 8 });
  }

  // Footer
  yPos = dimensions.height - margin - 18 * scale;
  doc.setDrawColor(156, 163, 175);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += 4 * scale;
  
  // Signature line
  const sigLineY = yPos + 10 * scale;
  doc.line(margin, sigLineY, margin + contentWidth * 0.4, sigLineY);
  yPos = addText(data.signatureLabel, margin, sigLineY + 3 * scale, { fontSize: 8 });

  // Thank you message
  yPos = dimensions.height - margin - 3 * scale;
  addText('Thank you for your payment!', margin, yPos, { fontSize: 9, fontStyle: 'bold', align: 'center' });

  return doc;
};

// Print receipt using browser with professional design
export const printReceipt = (data: ReceiptData, size: ReceiptSize) => {
  const dimensions = RECEIPT_SIZES[size];
  const scale = getFontScale(size);
  const totalBalance = data.students.reduce((sum, s) => sum + s.balance, 0);
  
  const printContent = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 100%; padding: 0;">
      <!-- Yellow Header -->
      <div style="background-color: #FCD34D; padding: ${16 * scale}px; text-align: center;">
        <h1 style="margin: 0; font-size: ${18 * scale}px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">${data.schoolName || 'School Name'}</h1>
        ${data.schoolAddress ? `<p style="margin: 4px 0 0; font-size: ${11 * scale}px; font-weight: 700;">${data.schoolAddress}</p>` : ''}
        ${data.schoolPhone ? `<p style="margin: 2px 0 0; font-size: ${11 * scale}px; font-weight: 700;">Tel: ${data.schoolPhone}</p>` : ''}
      </div>
      
      <div style="padding: ${12 * scale}px;">
        <!-- Title -->
        <h2 style="text-align: center; font-size: ${14 * scale}px; margin: ${10 * scale}px 0; font-weight: 900; letter-spacing: 2px; border: 2px solid #000; display: inline-block; padding: 4px 16px; width: auto; margin-left: 50%; transform: translateX(-50%);">PAYMENT RECEIPT</h2>
        
        <!-- Receipt Info -->
        <div style="background: #f5f5f5; border: 1px solid #ccc; border-radius: 6px; padding: ${10 * scale}px; margin: ${10 * scale}px 0;">
          <div style="display: flex; justify-content: space-between; font-size: ${11 * scale}px; font-weight: 700;">
            <span><strong>Receipt No:</strong> ${data.receiptNumber}</span>
            <span><strong>Date:</strong> <span style="color: #DC2626; font-weight: 900;">${data.paymentDate}</span></span>
          </div>
          <p style="margin: 6px 0 0; font-size: ${11 * scale}px; font-weight: 700;"><strong>Payment Method:</strong> ${data.paymentMethod}</p>
        </div>
        
        ${data.students.length > 1 ? `
          <!-- Family Receipt Label -->
          <div style="text-align: center; background: #DBEAFE; border: 2px solid #3B82F6; padding: 8px; margin: ${10 * scale}px 0; font-weight: 900; font-size: ${11 * scale}px; color: #1E40AF; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px;">FAMILY RECEIPT - COMBINED PAYMENT</div>
          
          <!-- Family Table -->
          <table style="width: 100%; border-collapse: collapse; font-size: ${10 * scale}px; margin: ${10 * scale}px 0; border: 2px solid #9CA3AF;">
            <thead>
              <tr style="background: #E5E7EB;">
                <th style="text-align: left; padding: 8px 4px; font-weight: 900; border-bottom: 2px solid #9CA3AF;">Student</th>
                <th style="text-align: left; padding: 8px 4px; font-weight: 900; border-bottom: 2px solid #9CA3AF;">Adm. No.</th>
                <th style="text-align: left; padding: 8px 4px; font-weight: 900; border-bottom: 2px solid #9CA3AF;">Class</th>
                <th style="text-align: right; padding: 8px 4px; font-weight: 900; border-bottom: 2px solid #9CA3AF;">Amount</th>
                <th style="text-align: right; padding: 8px 4px; font-weight: 900; color: #DC2626; border-bottom: 2px solid #9CA3AF;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${data.students.map((s, idx) => `
                <tr style="background: ${idx % 2 === 1 ? '#F9FAFB' : 'white'}; border-bottom: 1px solid #E5E7EB;">
                  <td style="padding: 6px 4px; font-weight: 700;">${s.studentName}</td>
                  <td style="padding: 6px 4px; font-weight: 600;">${s.admissionNumber || '-'}</td>
                  <td style="padding: 6px 4px; font-weight: 600;">${s.className}</td>
                  <td style="padding: 6px 4px; text-align: right; font-weight: 700; color: #15803D;">KES ${s.amountPaid.toLocaleString()}</td>
                  <td style="padding: 6px 4px; text-align: right; font-weight: 700; color: #DC2626;">KES ${s.balance.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <!-- Single Student Info -->
          <div style="background: #F9FAFB; border: 1px solid #ccc; border-radius: 6px; padding: ${12 * scale}px; margin: ${10 * scale}px 0; font-size: ${11 * scale}px;">
            <p style="margin: 0 0 4px;"><strong style="font-weight: 900;">Student Name:</strong> <span style="font-weight: 700;">${data.students[0]?.studentName}</span></p>
            <p style="margin: 4px 0;"><strong style="font-weight: 900;">Admission No:</strong> <span style="font-weight: 700;">${data.students[0]?.admissionNumber || 'N/A'}</span></p>
            <p style="margin: 4px 0 0;"><strong style="font-weight: 900;">Class:</strong> <span style="font-weight: 700;">${data.students[0]?.className}</span></p>
          </div>
        `}
        
        <!-- Payment Summary -->
        <div style="border-top: 2px solid #9CA3AF; padding-top: ${10 * scale}px; margin-top: ${10 * scale}px;">
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: ${12 * scale}px;">
            <span style="font-weight: 900;">TOTAL AMOUNT PAID:</span>
            <span style="font-weight: 900; color: #15803D; font-size: ${14 * scale}px;">KES ${data.totalPaid.toLocaleString()}</span>
          </div>
          <p style="font-size: ${10 * scale}px; margin: 6px 0;"><strong style="font-weight: 900;">In Words:</strong> <span style="font-weight: 700; font-style: italic;">${data.amountInWords} Shillings Only</span></p>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: ${11 * scale}px;">
            <span style="font-weight: 900;">${data.students.length === 1 ? 'Balance:' : 'Total Balance:'}</span>
            <span style="font-weight: 900; color: #DC2626; font-size: ${13 * scale}px;">KES ${(data.students.length === 1 ? (data.students[0]?.balance || 0) : totalBalance).toLocaleString()}</span>
          </div>
          ${data.notes ? `<p style="font-size: ${9 * scale}px; color: #666; margin-top: 8px;"><strong style="font-weight: 900;">Notes:</strong> ${data.notes}</p>` : ''}
        </div>
        
        <!-- Footer -->
        <div style="margin-top: ${20 * scale}px; border-top: 2px solid #9CA3AF; padding-top: ${10 * scale}px;">
          <div style="width: 150px; border-top: 2px solid #000; margin-top: ${25 * scale}px;">
            <p style="font-size: ${9 * scale}px; font-weight: 700; color: #666; margin-top: 4px;">${data.signatureLabel}</p>
          </div>
          <p style="text-align: center; color: #666; font-size: ${10 * scale}px; font-weight: 700; margin-top: ${15 * scale}px;">Thank you for your payment!</p>
        </div>
      </div>
    </div>
  `;

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) return;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt - ${data.receiptNumber}</title>
        <style>
          @page { size: ${dimensions.width}mm ${dimensions.height}mm; margin: 0; }
          @media print { 
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; padding: 0; } 
            * { box-sizing: border-box; }
          }
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
