import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title: string;
}

export const exportToPDF = (data: ExportData, filename: string) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(18);
  doc.setTextColor(33, 37, 41);
  doc.text(data.title, 14, 22);
  
  // Date
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
  
  // Table
  autoTable(doc, {
    head: [data.headers],
    body: data.rows,
    startY: 38,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
  });
  
  doc.save(`${filename}.pdf`);
};

export const exportToExcel = (data: ExportData, filename: string) => {
  const worksheet = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, data.title);
  
  // Style headers (bold)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    if (cell) {
      cell.s = { font: { bold: true } };
    }
  }
  
  // Auto-size columns
  const colWidths = data.headers.map((header, i) => {
    const maxLength = Math.max(
      header.length,
      ...data.rows.map(row => String(row[i] || '').length)
    );
    return { wch: Math.min(maxLength + 2, 50) };
  });
  worksheet['!cols'] = colWidths;
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
