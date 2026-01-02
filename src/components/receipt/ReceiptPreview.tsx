import { ReceiptData, ReceiptSize, RECEIPT_SIZES, getFontScale } from "@/lib/receiptUtils";
import { formatCurrency } from "@/lib/formatters";

interface ReceiptPreviewProps {
  data: ReceiptData;
  size: ReceiptSize;
}

export const ReceiptPreview = ({ data, size }: ReceiptPreviewProps) => {
  const dimensions = RECEIPT_SIZES[size];
  const scale = getFontScale(size);
  
  // Calculate preview dimensions that reflect actual paper proportions
  const aspectRatio = dimensions.height / dimensions.width;
  const previewWidth = Math.min(400, dimensions.width * 2.2);
  const previewHeight = previewWidth * aspectRatio;
  
  const styles = {
    container: {
      width: previewWidth,
      height: previewHeight,
      minHeight: 320,
      maxHeight: 600,
    },
    header: { fontSize: `${18 * scale}px` },
    subHeader: { fontSize: `${12 * scale}px` },
    title: { fontSize: `${16 * scale}px` },
    normal: { fontSize: `${13 * scale}px` },
    small: { fontSize: `${11 * scale}px` },
    bold: { fontSize: `${14 * scale}px` },
    tableHeader: { fontSize: `${11 * scale}px` },
    tableCell: { fontSize: `${10 * scale}px` },
  };

  const totalBalance = data.students.reduce((sum, s) => sum + s.balance, 0);

  return (
    <div 
      className="bg-white text-black border-2 border-gray-400 shadow-2xl mx-auto overflow-hidden rounded-sm"
      style={styles.container}
    >
      <div className="h-full flex flex-col overflow-auto">
        {/* Header - Yellow Background */}
        <div className="text-center py-4 px-4" style={{ backgroundColor: '#FCD34D' }}>
          <h1 className="font-black text-gray-900 leading-tight uppercase tracking-wide" style={styles.header}>
            {data.schoolName || 'School Name'}
          </h1>
          {data.schoolAddress && (
            <p className="text-gray-800 font-bold mt-1" style={styles.subHeader}>{data.schoolAddress}</p>
          )}
          {data.schoolPhone && (
            <p className="text-gray-800 font-bold" style={styles.subHeader}>Tel: {data.schoolPhone}</p>
          )}
        </div>

        <div className="flex-1 p-4 flex flex-col">
          {/* Title */}
          <div className="text-center mb-4">
            <h2 className="font-black tracking-widest text-gray-900 uppercase border-2 border-gray-900 inline-block px-4 py-1" style={styles.title}>
              PAYMENT RECEIPT
            </h2>
          </div>

          {/* Receipt Info */}
          <div className="border-2 border-gray-300 rounded-lg py-3 px-4 mb-4 bg-gray-50">
            <div className="flex justify-between items-center" style={styles.normal}>
              <div>
                <span className="font-black text-gray-900">Receipt No:</span>{" "}
                <span className="font-bold">{data.receiptNumber}</span>
              </div>
              <div>
                <span className="font-black text-gray-900">Date:</span>{" "}
                <span className="font-bold" style={{ color: '#DC2626' }}>{data.paymentDate}</span>
              </div>
            </div>
            <div className="mt-2" style={styles.normal}>
              <span className="font-black text-gray-900">Payment Method:</span>{" "}
              <span className="font-bold">{data.paymentMethod}</span>
            </div>
          </div>

          {/* Family Receipt Label */}
          {data.students.length > 1 && (
            <div className="text-center bg-blue-100 border-2 border-blue-400 py-2 px-3 mb-4 font-black rounded-lg uppercase tracking-wide" style={{ ...styles.normal, color: '#1E40AF' }}>
              FAMILY RECEIPT - COMBINED PAYMENT
            </div>
          )}

          {/* Students Table / Single Student */}
          <div className="flex-1 overflow-auto">
            {data.students.length > 1 ? (
              <div className="border-2 border-gray-400 rounded-lg overflow-hidden">
                <table className="w-full border-collapse" style={styles.tableCell}>
                  <thead>
                    <tr className="bg-gray-200 border-b-2 border-gray-400">
                      <th className="text-left py-2 px-2 font-black text-gray-900" style={styles.tableHeader}>Student</th>
                      <th className="text-left py-2 px-2 font-black text-gray-900" style={styles.tableHeader}>Adm. No.</th>
                      <th className="text-left py-2 px-2 font-black text-gray-900" style={styles.tableHeader}>Class</th>
                      <th className="text-right py-2 px-2 font-black text-gray-900" style={styles.tableHeader}>Amount</th>
                      <th className="text-right py-2 px-2 font-black" style={{ ...styles.tableHeader, color: '#DC2626' }}>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.students.map((student, idx) => (
                      <tr key={idx} className={`border-b border-gray-200 ${idx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                        <td className="py-2 px-2 font-bold">{student.studentName}</td>
                        <td className="py-2 px-2 font-semibold">{student.admissionNumber || '-'}</td>
                        <td className="py-2 px-2 font-semibold">{student.className}</td>
                        <td className="py-2 px-2 text-right font-bold text-green-700">{formatCurrency(student.amountPaid)}</td>
                        <td className="py-2 px-2 text-right font-bold" style={{ color: '#DC2626' }}>{formatCurrency(student.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-2 border-2 border-gray-300 rounded-lg p-4 bg-gray-50" style={styles.normal}>
                <p><span className="font-black text-gray-900">Student Name:</span> <span className="font-bold">{data.students[0]?.studentName}</span></p>
                <p><span className="font-black text-gray-900">Admission No:</span> <span className="font-bold">{data.students[0]?.admissionNumber || 'N/A'}</span></p>
                <p><span className="font-black text-gray-900">Class:</span> <span className="font-bold">{data.students[0]?.className}</span></p>
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="border-t-2 border-gray-400 pt-4 mt-4 space-y-2">
            <div className="flex justify-between items-center" style={styles.bold}>
              <span className="font-black text-gray-900">TOTAL AMOUNT PAID:</span>
              <span className="font-black text-green-700 text-lg">{formatCurrency(data.totalPaid)}</span>
            </div>
            <p style={styles.small}>
              <span className="font-black text-gray-900">In Words:</span>{" "}
              <span className="font-bold italic">{data.amountInWords} Shillings Only</span>
            </p>
            <div className="flex justify-between items-center" style={styles.normal}>
              <span className="font-black text-gray-900">
                {data.students.length === 1 ? 'Balance:' : 'Total Balance:'}
              </span>
              <span className="font-black text-lg" style={{ color: '#DC2626' }}>
                {formatCurrency(data.students.length === 1 ? (data.students[0]?.balance || 0) : totalBalance)}
              </span>
            </div>
            {data.notes && (
              <p className="text-gray-700 font-semibold mt-2" style={styles.small}>
                <span className="font-black text-gray-900">Notes:</span> {data.notes}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-400 pt-4 mt-auto">
            <div className="flex justify-between items-end" style={styles.small}>
              <div>
                <div className="border-t-2 border-black w-40 mt-8"></div>
                <p className="text-gray-800 font-bold mt-1">{data.signatureLabel}</p>
              </div>
            </div>
            <p className="text-center text-gray-600 font-bold mt-4" style={styles.small}>
              Thank you for your payment!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
