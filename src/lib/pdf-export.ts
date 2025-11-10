import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface LegalDocument {
  id: string;
  type: string;
  version: number;
  title: string;
  content: string;
  effective_date: string;
  published_at: string | null;
  status: string;
}

export async function exportToPDF(legalDocument: LegalDocument) {
  try {
    // Create a temporary container for the content
    const container = document.createElement('div');
    container.style.width = '210mm'; // A4 width
    container.style.padding = '20mm';
    container.style.backgroundColor = 'white';
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.fontFamily = 'Arial, sans-serif';
    
    // Add content to container
    container.innerHTML = `
      <div style="margin-bottom: 30px;">
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #333;">${legalDocument.title}</h1>
        <p style="color: #666; font-size: 12px;">Version ${legalDocument.version}</p>
        <p style="color: #666; font-size: 12px;">Effective Date: ${new Date(legalDocument.effective_date).toLocaleDateString()}</p>
      </div>
      <div style="line-height: 1.6; color: #333; white-space: pre-wrap;">${legalDocument.content}</div>
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #999; font-size: 10px;">
          Downloaded from Print Power Purpose<br>
          Generated on ${new Date().toLocaleDateString()}
        </p>
      </div>
    `;
    
    document.body.appendChild(container);
    
    // Convert to canvas
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
    });
    
    // Remove temporary container
    document.body.removeChild(container);
    
    // Create PDF
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });
    
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= 297; // A4 height in mm
    
    // Add additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }
    
    // Save the PDF
    const fileName = `${legalDocument.type}-policy-v${legalDocument.version}.pdf`;
    pdf.save(fileName);
    
    return { success: true };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, error };
  }
}
