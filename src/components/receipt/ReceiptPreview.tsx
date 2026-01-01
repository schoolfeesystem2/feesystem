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
  const previewWidth = Math.min(380, dimensions.width * 2);
  const previewHeight = previewWidth * aspectRatio;
  
  const styles = {
    container: {
      width: previewWidth,
      height: previewHeight,
      minHeight: 280,
      maxHeight: 520,
    },
    header: { fontSize: `${16 * scale}px` },
    subHeader: { fontSize: `${11 * scale}px` },
    title: { fontSize: `${14 * scale}px` },
    normal: { fontSize: `${11 * scale}px` },
    small: { fontSize: `${10 * scale}px` },
    bold: { fontSize: `${12 * scale}px` },
  };

  return (
    <div 
      className="bg-white text-black border-2 border-gray-300 shadow-xl mx-auto overflow-hidden rounded-sm"
      style={styles.container}
    >
      <div className="p-4 h-full flex flex-col overflow-auto">
        {/* Header */}
        <div className="text-center border-b-2 border-gray-300 pb-3 mb-3">
          <h1 className="font-extrabold text-gray-900 leading-tight" style={styles.header}>
            {data.schoolName || 'School Name'}
          </h1>
          {data.schoolAddress && (
            <p className="text-gray-600 font-medium mt-1" style={styles.subHeader}>{data.schoolAddress}</p>
          )}
          {data.schoolPhone && (
            <p className="text-gray-600 font-medium" style={styles.subHeader}>Tel: {data.schoolPhone}</p>
          )}
        </div>

        {/* Title */}
        <div className="text-center mb-3">
          <h2 className="font-extrabold tracking-wider text-gray-900" style={styles.title}>PAYMENT RECEIPT</h2>
        </div>

        {/* Receipt Info */}
        <div className="border-t-2 border-b-2 border-gray-200 py-2 mb-3 flex justify-between" style={styles.normal}>
          <div>
            <span className="font-bold">Receipt No:</span> <span className="font-semibold">{data.receiptNumber}</span>
          </div>
          <div>
            <span className="font-bold">Date:</span> <span className="font-semibold">{data.paymentDate}</span>
          </div>
        </div>
        
        <div className="mb-3 font-semibold" style={styles.normal}>
          <span className="font-bold">Payment Method:</span> {data.paymentMethod}
        </div>

        {/* Family Receipt Label */}
        {data.students.length > 1 && (
          <div className="text-center bg-gray-100 py-2 mb-3 font-bold rounded" style={styles.normal}>
            FAMILY RECEIPT - COMBINED PAYMENT
          </div>
        )}

        {/* Students Table */}
        <div className="flex-1 overflow-auto">
          {data.students.length > 1 ? (
            <table className="w-full border-collapse" style={styles.small}>
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-2 px-1 font-bold">Student</th>
                  <th className="text-left py-2 px-1 font-bold">Adm. No.</th>
                  <th className="text-left py-2 px-1 font-bold">Class</th>
                  <th className="text-right py-2 px-1 font-bold">Amount</th>
                  <th className="text-right py-2 px-1 font-bold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((student, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2 px-1 font-semibold">{student.studentName}</td>
                    <td className="py-2 px-1 font-medium">{student.admissionNumber || '-'}</td>
                    <td className="py-2 px-1 font-medium">{student.className}</td>
                    <td className="py-2 px-1 text-right font-bold">{formatCurrency(student.amountPaid)}</td>
                    <td className="py-2 px-1 text-right font-semibold">{formatCurrency(student.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="space-y-2" style={styles.normal}>
              <p><span className="font-bold">Student Name:</span> <span className="font-semibold">{data.students[0]?.studentName}</span></p>
              <p><span className="font-bold">Admission No:</span> <span className="font-semibold">{data.students[0]?.admissionNumber || 'N/A'}</span></p>
              <p><span className="font-bold">Class:</span> <span className="font-semibold">{data.students[0]?.className}</span></p>
            </div>
          )}
        </div>

        {/* Payment Summary */}
        <div className="border-t-2 border-gray-300 pt-3 mt-3 space-y-2">
          <p className="font-extrabold text-gray-900" style={styles.bold}>
            Amount Paid: {formatCurrency(data.totalPaid)}
          </p>
          <p style={styles.small}>
            <span className="font-bold">In Words:</span> <span className="font-semibold italic">{data.amountInWords} Shillings Only</span>
          </p>
          {data.students.length === 1 ? (
            <p style={styles.normal}>
              <span className="font-bold">Balance:</span> <span className="font-semibold">{formatCurrency(data.students[0]?.balance || 0)}</span>
            </p>
          ) : (
            <p style={styles.normal}>
              <span className="font-bold">Total Balance:</span> <span className="font-semibold">{formatCurrency(data.students.reduce((sum, s) => sum + s.balance, 0))}</span>
            </p>
          )}
          {data.notes && (
            <p className="text-gray-600 font-medium" style={styles.small}>
              <span className="font-bold">Notes:</span> {data.notes}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-300 pt-3 mt-auto">
          <div className="flex justify-between items-end" style={styles.small}>
            <div>
              <div className="border-t-2 border-black w-36 mt-6"></div>
              <p className="text-gray-700 font-semibold mt-1">{data.signatureLabel}</p>
            </div>
          </div>
          <p className="text-center text-gray-500 font-semibold mt-3" style={styles.small}>
            Thank you for your payment!
          </p>
        </div>
      </div>
    </div>
  );
};
