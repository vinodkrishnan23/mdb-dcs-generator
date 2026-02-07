import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found for PDF export');
    return;
  }

  try {
    // Try a different approach: use window.print() with specific styling
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Could not open print window');
    }

    // Clone the element and create a print-friendly version
    const clonedElement = element.cloneNode(true) as HTMLElement;
    
    // Create a complete HTML document for printing
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>DCS Export</title>
        <style>
          @media print {
            * { -webkit-print-color-adjust: exact !important; }
            body { margin: 0; font-family: Arial, sans-serif; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; page-break-inside: avoid; }
            td, th { border: 1px solid #333; padding: 8px; vertical-align: top; }
            .bg-gray-200 { background-color: #e5e7eb !important; }
            .bg-green-50 { background-color: #f0fdf4 !important; }
            .bg-blue-50 { background-color: #eff6ff !important; }
            .bg-purple-50 { background-color: #faf5ff !important; }
            .bg-amber-50 { background-color: #fffbeb !important; }
            .text-green-800 { color: #166534 !important; }
            .text-green-700 { color: #15803d !important; }
            .text-blue-700 { color: #1d4ed8 !important; }
            .text-purple-700 { color: #7c3aed !important; }
            .text-amber-700 { color: #a16207 !important; }
            .font-semibold { font-weight: 600 !important; }
            .font-bold { font-weight: 700 !important; }
          }
          @page { margin: 1in; }
        </style>
      </head>
      <body>
        ${clonedElement.outerHTML}
        <script>
          window.onload = function() {
            setTimeout(() => {
              window.print();
              setTimeout(() => window.close(), 1000);
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

  } catch (error) {
    console.error('Print approach failed, trying canvas fallback:', error);
    
    // Fallback: try html2canvas with minimal options
    try {
      const canvas = await html2canvas(element, {
        scale: 1,
        logging: true,
        useCORS: false,
        allowTaint: false,
        backgroundColor: '#ffffff'
      });

    const imgData = canvas.toDataURL('image/png');
    
    // Calculate PDF dimensions
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 295; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    let position = 0;

    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Save the PDF
    pdf.save(filename);
    } catch (canvasError) {
      console.error('Canvas fallback also failed:', canvasError);
      alert('Error generating PDF. Please try again.');
    }
  }
};