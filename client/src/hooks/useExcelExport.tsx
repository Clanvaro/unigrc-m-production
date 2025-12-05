import ExcelJS from 'exceljs';
import { useToast } from "@/hooks/use-toast";

interface ExcelColumn {
  header: string;
  key: string;
  width: number;
}

interface ExcelExportOptions {
  sheetName: string;
  fileName: string;
  columns: ExcelColumn[];
  data: any[];
  successMessage?: string;
}

export function useExcelExport() {
  const { toast } = useToast();

  const exportToExcel = async ({
    sheetName,
    fileName,
    columns,
    data,
    successMessage
  }: ExcelExportOptions) => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(sheetName);

      // Define columns
      worksheet.columns = columns;

      // Style header row - Blue header with white text
      const headerRow = worksheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }
      };

      // Add data rows
      data.forEach(row => {
        worksheet.addRow(row);
      });

      // Generate file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Add timestamp to filename
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `${fileName}_${timestamp}.xlsx`;
      
      link.click();
      window.URL.revokeObjectURL(url);

      // Show success toast
      toast({
        title: "Exportación exitosa",
        description: successMessage || `Se exportaron ${data.length} registros a Excel.`,
      });

      return true;
    } catch (error) {
      toast({
        title: "Error en exportación",
        description: "No se pudo exportar el archivo. Intente nuevamente.",
        variant: "destructive"
      });
      console.error('Excel export error:', error);
      return false;
    }
  };

  return { exportToExcel };
}
