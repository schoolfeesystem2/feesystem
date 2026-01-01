import { ReceiptData, ReceiptSize, RECEIPT_SIZES, getFontScale } from "@/lib/receiptUtils";
import { formatCurrency } from "@/lib/formatters";

interface ReceiptPreviewProps {
  data: ReceiptData;
  size: ReceiptSize;
}

export const ReceiptPreview = ({ data, size }: ReceiptPreviewProps) => {
  const dimensions = RECEIPT_SIZES[size];
  const scale = getFontScale(size);
  
  // Scale factor for preview (fit within container)
  const previewScale = Math.min(380 / dimensions.width, 500 / dimensions.height);
  
  const styles = {
    container: {
      width: dimensions.width * previewScale,
      height: dimensions.height * previewScale,
      fontSize: `${10 * scale * previewScale}px`,
    },
    header: { fontSize: `${14 * scale * previewScale}px` },
    subHeader: { fontSize: `${9 * scale * previewScale}px` },
    title: { fontSize: `${12 * scale * previewScale}px` },
    normal: { fontSize: `${9 * scale * previewScale}px` },
    small: { fontSize: `${8 * scale * previewScale}px` },
    bold: { fontSize: `${10 * scale * previewScale}px` },
  };

  return (
    <div 
      className="bg-white text-black border shadow-lg mx-auto overflow-hidden"
      style={styles.container}
    >
      <div className="p-3 h-full flex flex-col" style={{ padding: `${8 * previewScale}px` }}>
        {/* Header */}
        <div className="text-center border-b pb-2 mb-2">
          <h1 className="font-bold" style={styles.header}>
            {data.schoolName || 'School Name'}
          </h1>
          {data.schoolAddress && (
            <p className="text-gray-600" style={styles.subHeader}>{data.schoolAddress}</p>
          )}
          {data.schoolPhone && (
            <p className="text-gray-600" style={styles.subHeader}>Tel: {data.schoolPhone}</p>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-2">
          <h2 className="font-bold tracking-wide" style={styles.title}>PAYMENT RECEIPT</h2>
        </div>

        {/* Receipt Info */}
        <div className="border-t border-b py-2 mb-2 flex justify-between" style={styles.normal}>
          <div>
            <span className="font-semibold">Receipt No:</span> {data.receiptNumber}
          </div>
          <div>
            <span className="font-semibold">Date:</span> {data.paymentDate}
          </div>
        </div>
        
        <div className="mb-2" style={styles.normal}>
          <span className="font-semibold">Payment Method:</span> {data.paymentMethod}
        </div>

        {/* Family Receipt Label */}
        {data.students.length > 1 && (
          <div className="text-center bg-gray-100 py-1 mb-2 font-semibold" style={styles.normal}>
            FAMILY RECEIPT - COMBINED PAYMENT
          </div>
        )}

        {/* Students Table */}
        <div className="flex-1 overflow-auto">
          {data.students.length > 1 ? (
            <table className="w-full border-collapse" style={styles.small}>
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Student</th>
                  <th className="text-left py-1">Adm. No.</th>
                  <th className="text-left py-1">Class</th>
                  <th className="text-right py-1">Amount</th>
                  <th className="text-right py-1">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-1">{student.studentName}</td>
                    <td className="py-1">{student.admissionNumber || '-'}</td>
                    <td className="py-1">{student.className}</td>
                    <td className="py-1 text-right">{formatCurrency(student.amountPaid)}</td>
                    <td className="py-1 text-right">{formatCurrency(student.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-1" style={styles.normal}>
              <p><span className="font-semibold">Student Name:</span> {data.students[0]?.studentName}</p>
              <p><span className="font-semibold">Admission No:</span> {data.students[0]?.admissionNumber || 'N/A'}</p>
              <p><span className="font-semibold">Class:</span> {data.students[0]?.className}</p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="border-t pt-2 mt-2 space-y-1">
          <p className="font-bold" style={styles.bold}>
            Amount Paid: {formatCurrency(data.totalPaid)}
          </p>
          <p style={styles.small}>
            <span className="font-semibold">In Words:</span> {data.amountInWords} Shillings Only
          </p>
          {data.students.length === 1 ? (
            <p style={styles.normal}>
              <span className="font-semibold">Balance:</span> {formatCurrency(data.students[0]?.balance || 0)}
            </p>
          ) : (
            <p style={styles.normal}>
              <span className="font-semibold">Total Balance:</span> {formatCurrency(data.students.reduce((sum, s) => sum + s.balance, 0))}
            </p>
          )}
          {data.notes && (
            <p className="text-gray-600" style={styles.small}>
              <span className="font-semibold">Notes:</span> {data.notes}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t pt-2 mt-auto">
          <div className="flex justify-between items-end" style={styles.small}>
            <div>
              <div className="border-t border-black w-32 mt-6"></div>
              <p className="text-gray-600">{data.signatureLabel}</p>
            </div>
          </div>
          <p className="text-center text-gray-500 mt-2" style={styles.small}>
            Thank you for your payment!
          </p>
        </div>
      </div>
    </div>
  );
};
