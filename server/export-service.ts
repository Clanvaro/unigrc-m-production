// Lazy imports for memory optimization - these libraries are loaded only when needed
import type jsPDF from 'jspdf';
import type ExcelJS from 'exceljs';
import type { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { 
  type ReportType, 
  type ReportParameters, 
  type ReportGenerationStatus,
  type AuditorPerformanceSummary,
  type RiskTrendingSummary,
  type TeamPerformanceSummary,
  type WorkflowEfficiencySummary
} from "@shared/schema";
import { format } from 'date-fns';

export class ExportService {
  private chartJSNodeCanvas: ChartJSNodeCanvas | null = null;

  constructor() {
    // ChartJS instance created lazily when needed for memory efficiency
  }

  // Lazy load ChartJS (only when charts are needed)
  private async getChartRenderer(): Promise<ChartJSNodeCanvas> {
    if (!this.chartJSNodeCanvas) {
      const { ChartJSNodeCanvas } = await import('chartjs-node-canvas');
      this.chartJSNodeCanvas = new ChartJSNodeCanvas({ 
        width: 800, 
        height: 400,
        backgroundColour: 'white'
      });
    }
    return this.chartJSNodeCanvas;
  }

  // ============= PDF GENERATION =============

  async generatePDFReport(
    reportType: ReportType,
    parameters: ReportParameters,
    data: any
  ): Promise<Buffer> {
    // Lazy load jsPDF for memory efficiency
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    // Add header
    this.addPDFHeader(doc, parameters.title || this.getDefaultTitle(reportType));
    
    switch (reportType) {
      case 'auditor_performance':
        return this.generateAuditorPerformancePDF(doc, data, parameters);
      case 'team_comparison':
        return this.generateTeamComparisonPDF(doc, data, parameters);
      case 'risk_trending':
        return this.generateRiskTrendingPDF(doc, data, parameters);
      case 'workflow_efficiency':
        return this.generateWorkflowEfficiencyPDF(doc, data, parameters);
      case 'executive_summary':
        return this.generateExecutiveSummaryPDF(doc, data, parameters);
      case 'compliance_report':
        return this.generateCompliancePDF(doc, data, parameters);
      default:
        return this.generateGenericPDF(doc, data, parameters);
    }
  }

  private addPDFHeader(doc: jsPDF, title: string): void {
    // Company logo and header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Audit Analytics Report', 20, 30);
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(title, 20, 45);
    
    // Date and time
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), 'PPpp')}`, 20, 55);
    
    // Separator line
    doc.setLineWidth(0.5);
    doc.line(20, 65, 190, 65);
  }

  private async generateAuditorPerformancePDF(
    doc: jsPDF, 
    data: AuditorPerformanceSummary[], 
    parameters: ReportParameters
  ): Promise<Buffer> {
    let yPosition = 80;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Auditor Performance Summary', 20, yPosition);
    yPosition += 20;

    // Performance table
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Table headers
    const headers = ['Auditor', 'Completion Rate', 'On-Time Rate', 'Quality Score', 'Productivity'];
    const colWidths = [50, 30, 30, 30, 30];
    let xPosition = 20;

    doc.setFont('helvetica', 'bold');
    headers.forEach((header, index) => {
      doc.text(header, xPosition, yPosition);
      xPosition += colWidths[index];
    });
    yPosition += 15;

    // Table data
    doc.setFont('helvetica', 'normal');
    data.forEach((auditor) => {
      xPosition = 20;
      const rowData = [
        auditor.auditorName,
        `${auditor.completionRate.toFixed(1)}%`,
        `${auditor.onTimeRate.toFixed(1)}%`,
        auditor.qualityScore.toFixed(1),
        auditor.productivityScore.toFixed(1)
      ];

      rowData.forEach((cell, index) => {
        doc.text(cell, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      yPosition += 12;

      // Add new page if needed
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
    });

    // Add charts if requested
    if (parameters.includeCharts) {
      await this.addPerformanceChartToPDF(doc, data, yPosition);
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateTeamComparisonPDF(
    doc: jsPDF, 
    data: TeamPerformanceSummary[], 
    parameters: ReportParameters
  ): Promise<Buffer> {
    let yPosition = 80;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Team Performance Comparison', 20, yPosition);
    yPosition += 20;

    // Team performance data
    data.forEach((team) => {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${team.departmentName} Department`, 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Members: ${team.memberCount}`, 20, yPosition);
      doc.text(`Completion Rate: ${team.completionRate.toFixed(1)}%`, 120, yPosition);
      yPosition += 12;
      
      doc.text(`Quality Score: ${team.qualityScore.toFixed(1)}`, 20, yPosition);
      doc.text(`Productivity: ${team.productivityScore.toFixed(1)}`, 120, yPosition);
      yPosition += 20;

      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateRiskTrendingPDF(
    doc: jsPDF, 
    data: RiskTrendingSummary[], 
    parameters: ReportParameters
  ): Promise<Buffer> {
    let yPosition = 80;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Risk Trending Analysis', 20, yPosition);
    yPosition += 20;

    // Risk summary table
    doc.setFontSize(10);
    const headers = ['Risk Name', 'Current Level', 'Trend', 'Coverage', 'Findings'];
    const colWidths = [60, 25, 25, 25, 25];
    let xPosition = 20;

    doc.setFont('helvetica', 'bold');
    headers.forEach((header, index) => {
      doc.text(header, xPosition, yPosition);
      xPosition += colWidths[index];
    });
    yPosition += 15;

    doc.setFont('helvetica', 'normal');
    data.forEach((risk) => {
      xPosition = 20;
      const rowData = [
        risk.riskName,
        risk.currentLevel.toFixed(1),
        risk.trend,
        `${risk.auditCoverage.toFixed(1)}%`,
        risk.findingsCount.toString()
      ];

      rowData.forEach((cell, index) => {
        doc.text(cell, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      yPosition += 12;

      if (yPosition > 270) {
        doc.addPage();
        yPosition = 30;
      }
    });

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateWorkflowEfficiencyPDF(
    doc: jsPDF, 
    data: WorkflowEfficiencySummary, 
    parameters: ReportParameters
  ): Promise<Buffer> {
    let yPosition = 80;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Workflow Efficiency Analysis', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Key metrics
    doc.text(`Average Completion Time: ${data.averageCompletionTime.toFixed(1)} hours`, 20, yPosition);
    yPosition += 15;
    doc.text(`Median Completion Time: ${data.medianCompletionTime.toFixed(1)} hours`, 20, yPosition);
    yPosition += 15;
    doc.text(`On-Time Percentage: ${data.onTimePercentage.toFixed(1)}%`, 20, yPosition);
    yPosition += 15;

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateExecutiveSummaryPDF(
    doc: jsPDF, 
    data: any, 
    parameters: ReportParameters
  ): Promise<Buffer> {
    let yPosition = 80;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 25;

    // Key Performance Indicators
    doc.setFontSize(12);
    doc.text('Key Performance Indicators', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('• Overall audit completion rate has improved by 15% this quarter', 25, yPosition);
    yPosition += 12;
    doc.text('• Average risk levels have decreased across all departments', 25, yPosition);
    yPosition += 12;
    doc.text('• Team productivity has increased with new workflow processes', 25, yPosition);
    yPosition += 20;

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateCompliancePDF(
    doc: jsPDF, 
    data: any, 
    parameters: ReportParameters
  ): Promise<Buffer> {
    let yPosition = 80;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Report', 20, yPosition);
    yPosition += 25;

    // Executive Summary Section
    doc.setFontSize(14);
    doc.text('Executive Summary', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Reports Received: ${data.totalReports}`, 20, yPosition);
    yPosition += 12;
    doc.text(`Total Cases Created: ${data.totalCases}`, 20, yPosition);
    yPosition += 12;
    doc.text(`Active Cases: ${data.activeCases}`, 20, yPosition);
    yPosition += 12;
    doc.text(`Resolved Cases: ${data.resolvedCases}`, 20, yPosition);
    yPosition += 12;
    doc.text(`Average Resolution Time: ${data.averageResolutionTime.toFixed(1)} days`, 20, yPosition);
    yPosition += 20;

    // Reports by Category Section
    if (Object.keys(data.reportsByCategory).length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Reports by Category', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      Object.entries(data.reportsByCategory).forEach(([category, count]) => {
        doc.text(`• ${category}: ${count} reports`, 25, yPosition);
        yPosition += 12;
      });
      yPosition += 10;
    }

    // Reports by Priority Section
    if (Object.keys(data.reportsByPriority).length > 0) {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 30;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Reports by Priority', 20, yPosition);
      yPosition += 15;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      Object.entries(data.reportsByPriority).forEach(([priority, count]) => {
        doc.text(`• ${priority}: ${count} reports`, 25, yPosition);
        yPosition += 12;
      });
      yPosition += 10;
    }

    // Compliance Metrics Section
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 30;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Compliance Metrics', 20, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Response Time (avg): ${data.complianceMetrics.reportResponseTime.toFixed(1)} hours`, 20, yPosition);
    yPosition += 12;
    doc.text(`Resolution Rate: ${data.complianceMetrics.caseResolutionRate.toFixed(1)}%`, 20, yPosition);
    yPosition += 12;
    doc.text(`Escalation Rate: ${data.complianceMetrics.escalationRate.toFixed(1)}%`, 20, yPosition);
    yPosition += 12;
    doc.text(`Reoccurrence Rate: ${data.complianceMetrics.reoccurrenceRate.toFixed(1)}%`, 20, yPosition);
    yPosition += 20;

    // Investigator Performance Section
    if (data.investigatorPerformance.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 30;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Investigator Performance', 20, yPosition);
      yPosition += 15;

      // Performance table headers
      doc.setFontSize(8);
      const headers = ['Investigator', 'Assigned', 'Resolved', 'Avg. Time', 'Resolution Rate'];
      const colWidths = [50, 25, 25, 25, 35];
      let xPosition = 20;

      doc.setFont('helvetica', 'bold');
      headers.forEach((header, index) => {
        doc.text(header, xPosition, yPosition);
        xPosition += colWidths[index];
      });
      yPosition += 12;

      // Performance table data
      doc.setFont('helvetica', 'normal');
      data.investigatorPerformance.slice(0, 10).forEach((investigator) => {
        xPosition = 20;
        const rowData = [
          investigator.investigatorName,
          investigator.assignedCases.toString(),
          investigator.resolvedCases.toString(),
          `${investigator.averageResolutionTime.toFixed(1)}d`,
          `${investigator.resolutionRate.toFixed(1)}%`
        ];

        rowData.forEach((cell, index) => {
          doc.text(cell, xPosition, yPosition);
          xPosition += colWidths[index];
        });
        yPosition += 10;

        if (yPosition > 270) {
          doc.addPage();
          yPosition = 30;
        }
      });
    }

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async generateGenericPDF(
    doc: jsPDF, 
    data: any, 
    parameters: ReportParameters
  ): Promise<Buffer> {
    let yPosition = 80;

    doc.setFontSize(12);
    doc.text('Report Data', 20, yPosition);
    yPosition += 20;

    doc.setFontSize(10);
    doc.text(JSON.stringify(data, null, 2), 20, yPosition);

    return Buffer.from(doc.output('arraybuffer'));
  }

  private async addPerformanceChartToPDF(
    doc: jsPDF, 
    data: AuditorPerformanceSummary[], 
    yPosition: number
  ): Promise<void> {
    // Generate chart image
    const chartConfig = {
      type: 'bar' as const,
      data: {
        labels: data.map(d => d.auditorName),
        datasets: [{
          label: 'Completion Rate (%)',
          data: data.map(d => d.completionRate),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: 'Auditor Completion Rates'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      }
    };

    try {
      const chartRenderer = await this.getChartRenderer();
      const chartBuffer = await chartRenderer.renderToBuffer(chartConfig);
      
      // Add new page for chart
      doc.addPage();
      
      // Add chart to PDF
      const chartDataURL = `data:image/png;base64,${chartBuffer.toString('base64')}`;
      doc.addImage(chartDataURL, 'PNG', 20, 30, 160, 80);
    } catch (error) {
      console.error('Error adding chart to PDF:', error);
    }
  }

  // ============= EXCEL GENERATION =============

  async generateExcelReport(
    reportType: ReportType,
    parameters: ReportParameters,
    data: any
  ): Promise<Buffer> {
    // Lazy load ExcelJS for memory efficiency
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    
    // Set workbook properties
    workbook.creator = 'Audit Analytics System';
    workbook.created = new Date();
    workbook.modified = new Date();

    switch (reportType) {
      case 'auditor_performance':
        return this.generateAuditorPerformanceExcel(workbook, data, parameters);
      case 'team_comparison':
        return this.generateTeamComparisonExcel(workbook, data, parameters);
      case 'risk_trending':
        return this.generateRiskTrendingExcel(workbook, data, parameters);
      case 'workflow_efficiency':
        return this.generateWorkflowEfficiencyExcel(workbook, data, parameters);
      case 'compliance_report':
        return this.generateComplianceExcel(workbook, data, parameters);
      default:
        return this.generateGenericExcel(workbook, data, parameters);
    }
  }

  private async generateAuditorPerformanceExcel(
    workbook: any, // ExcelJS.Workbook loaded dynamically
    data: AuditorPerformanceSummary[],
    parameters: ReportParameters
  ): Promise<Buffer> {
    const worksheet = workbook.addWorksheet('Auditor Performance');

    // Add title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Auditor Performance Report';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add headers
    const headers = ['Auditor Name', 'Department', 'Completion Rate (%)', 'On-Time Rate (%)', 'Quality Score', 'Productivity Score'];
    worksheet.addRow(headers);
    
    // Style headers
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data
    data.forEach((auditor) => {
      worksheet.addRow([
        auditor.auditorName,
        auditor.department || 'N/A',
        auditor.completionRate,
        auditor.onTimeRate,
        auditor.qualityScore,
        auditor.productivityScore
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 20;
    });

    // Add conditional formatting for completion rates
    worksheet.addConditionalFormatting({
      ref: `C3:C${data.length + 2}`,
      rules: [
        {
          priority: 1,
          type: 'colorScale',
          cfvo: [
            { type: 'num', value: 0 },
            { type: 'num', value: 50 },
            { type: 'num', value: 100 }
          ],
          color: [
            { argb: 'FFFF0000' }, // Red
            { argb: 'FFFFFF00' }, // Yellow
            { argb: 'FF00FF00' }  // Green
          ]
        }
      ]
    });

    // Add chart if requested
    if (parameters.includeCharts) {
      await this.addPerformanceChartToExcel(worksheet, data);
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateTeamComparisonExcel(
    workbook: any, // ExcelJS.Workbook loaded dynamically
    data: TeamPerformanceSummary[],
    parameters: ReportParameters
  ): Promise<Buffer> {
    const worksheet = workbook.addWorksheet('Team Comparison');

    // Add title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Team Performance Comparison';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add headers
    const headers = ['Department', 'Members', 'Total Tests', 'Completion Rate (%)', 'Quality Score', 'Productivity', 'Workload Distribution'];
    worksheet.addRow(headers);
    
    // Style headers
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data
    data.forEach((team) => {
      worksheet.addRow([
        team.departmentName,
        team.memberCount,
        team.totalTests,
        team.completionRate,
        team.qualityScore,
        team.productivityScore,
        team.workloadDistribution
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateRiskTrendingExcel(
    workbook: any, // ExcelJS.Workbook loaded dynamically
    data: RiskTrendingSummary[],
    parameters: ReportParameters
  ): Promise<Buffer> {
    const worksheet = workbook.addWorksheet('Risk Trending');

    // Add title
    worksheet.mergeCells('A1:H1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Risk Trending Analysis';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add headers
    const headers = ['Risk Name', 'Current Level', 'Trend', 'Audit Coverage (%)', 'Control Effectiveness', 'Findings', 'Critical Findings', 'Last Audit'];
    worksheet.addRow(headers);
    
    // Style headers
    const headerRow = worksheet.getRow(2);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFE6E6' }
    };

    // Add data
    data.forEach((risk) => {
      worksheet.addRow([
        risk.riskName,
        risk.currentLevel,
        risk.trend,
        risk.auditCoverage,
        risk.controlEffectiveness,
        risk.findingsCount,
        risk.criticalFindingsCount,
        risk.lastAuditDate ? format(risk.lastAuditDate, 'yyyy-MM-dd') : 'N/A'
      ]);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 18;
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateWorkflowEfficiencyExcel(
    workbook: any, // ExcelJS.Workbook loaded dynamically
    data: WorkflowEfficiencySummary,
    parameters: ReportParameters
  ): Promise<Buffer> {
    const worksheet = workbook.addWorksheet('Workflow Efficiency');

    // Add title
    worksheet.mergeCells('A1:B1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'Workflow Efficiency Metrics';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Add metrics
    worksheet.addRow(['Metric', 'Value']);
    worksheet.addRow(['Average Completion Time (hours)', data.averageCompletionTime]);
    worksheet.addRow(['Median Completion Time (hours)', data.medianCompletionTime]);
    worksheet.addRow(['On-Time Percentage (%)', data.onTimePercentage]);
    worksheet.addRow(['Revision Rate (%)', data.revisionRate]);
    worksheet.addRow(['Average Approval Time (hours)', data.approvalTime]);

    // Style the data
    worksheet.getRow(2).font = { bold: true };
    worksheet.columns.forEach((column) => {
      column.width = 30;
    });

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateComplianceExcel(
    workbook: any, // ExcelJS.Workbook loaded dynamically
    data: any,
    parameters: ReportParameters
  ): Promise<Buffer> {
    // Summary Sheet
    const summarySheet = workbook.addWorksheet('Compliance Summary');

    // Add title
    summarySheet.mergeCells('A1:E1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'Compliance Report';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Executive Summary Section
    summarySheet.getCell('A3').value = 'EXECUTIVE SUMMARY';
    summarySheet.getCell('A3').font = { bold: true, size: 12 };
    
    summarySheet.addRow(['Metric', 'Value']);
    const headerRow = summarySheet.getRow(4);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add summary data
    summarySheet.addRow(['Total Reports Received', data.totalReports]);
    summarySheet.addRow(['Total Cases Created', data.totalCases]);
    summarySheet.addRow(['Pending Reports', data.pendingReports]);
    summarySheet.addRow(['Active Cases', data.activeCases]);
    summarySheet.addRow(['Resolved Cases', data.resolvedCases]);
    summarySheet.addRow(['Closed Cases', data.closedCases]);
    summarySheet.addRow(['Dismissed Cases', data.dismissedCases]);
    summarySheet.addRow(['Average Resolution Time (days)', data.averageResolutionTime.toFixed(1)]);
    summarySheet.addRow(['Median Resolution Time (days)', data.medianResolutionTime.toFixed(1)]);

    // Compliance Metrics Section
    summarySheet.getCell('A15').value = 'COMPLIANCE METRICS';
    summarySheet.getCell('A15').font = { bold: true, size: 12 };
    
    summarySheet.addRow(['Response Time (avg hours)', data.complianceMetrics.reportResponseTime.toFixed(1)]);
    summarySheet.addRow(['Resolution Rate (%)', data.complianceMetrics.caseResolutionRate.toFixed(1)]);
    summarySheet.addRow(['Escalation Rate (%)', data.complianceMetrics.escalationRate.toFixed(1)]);
    summarySheet.addRow(['Reoccurrence Rate (%)', data.complianceMetrics.reoccurrenceRate.toFixed(1)]);

    // Auto-fit columns
    summarySheet.columns.forEach((column) => {
      column.width = 25;
    });

    // Reports by Category Sheet
    if (Object.keys(data.reportsByCategory).length > 0) {
      const categorySheet = workbook.addWorksheet('Reports by Category');
      
      categorySheet.mergeCells('A1:C1');
      const catTitleCell = categorySheet.getCell('A1');
      catTitleCell.value = 'Reports by Category';
      catTitleCell.font = { size: 14, bold: true };
      catTitleCell.alignment = { horizontal: 'center' };

      categorySheet.addRow(['Category', 'Count', 'Percentage']);
      const catHeaderRow = categorySheet.getRow(2);
      catHeaderRow.font = { bold: true };
      catHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFE6E6' }
      };

      const totalReports = Object.values(data.reportsByCategory).reduce((sum, count) => sum + count, 0);
      Object.entries(data.reportsByCategory).forEach(([category, count]) => {
        const percentage = totalReports > 0 ? ((count / totalReports) * 100).toFixed(1) : '0.0';
        categorySheet.addRow([category, count, `${percentage}%`]);
      });

      categorySheet.columns.forEach((column) => {
        column.width = 20;
      });
    }

    // Reports by Priority Sheet
    if (Object.keys(data.reportsByPriority).length > 0) {
      const prioritySheet = workbook.addWorksheet('Reports by Priority');
      
      prioritySheet.mergeCells('A1:C1');
      const priTitleCell = prioritySheet.getCell('A1');
      priTitleCell.value = 'Reports by Priority';
      priTitleCell.font = { size: 14, bold: true };
      priTitleCell.alignment = { horizontal: 'center' };

      prioritySheet.addRow(['Priority', 'Count', 'Percentage']);
      const priHeaderRow = prioritySheet.getRow(2);
      priHeaderRow.font = { bold: true };
      priHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFE6' }
      };

      const totalPriorityReports = Object.values(data.reportsByPriority).reduce((sum, count) => sum + count, 0);
      Object.entries(data.reportsByPriority).forEach(([priority, count]) => {
        const percentage = totalPriorityReports > 0 ? ((count / totalPriorityReports) * 100).toFixed(1) : '0.0';
        prioritySheet.addRow([priority, count, `${percentage}%`]);
      });

      prioritySheet.columns.forEach((column) => {
        column.width = 20;
      });
    }

    // Investigator Performance Sheet
    if (data.investigatorPerformance.length > 0) {
      const perfSheet = workbook.addWorksheet('Investigator Performance');
      
      perfSheet.mergeCells('A1:H1');
      const perfTitleCell = perfSheet.getCell('A1');
      perfTitleCell.value = 'Investigator Performance';
      perfTitleCell.font = { size: 14, bold: true };
      perfTitleCell.alignment = { horizontal: 'center' };

      const perfHeaders = [
        'Investigator Name', 
        'Assigned Cases', 
        'Resolved Cases', 
        'Avg Resolution Time (days)', 
        'Case Load Score', 
        'Quality Score', 
        'On-Time Resolutions',
        'Resolution Rate (%)'
      ];
      perfSheet.addRow(perfHeaders);
      
      const perfHeaderRow = perfSheet.getRow(2);
      perfHeaderRow.font = { bold: true };
      perfHeaderRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE6FFE6' }
      };

      data.investigatorPerformance.forEach((investigator) => {
        perfSheet.addRow([
          investigator.investigatorName,
          investigator.assignedCases,
          investigator.resolvedCases,
          investigator.averageResolutionTime.toFixed(1),
          investigator.caseLoadScore.toFixed(1),
          investigator.qualityScore.toFixed(1),
          investigator.onTimeResolutions,
          investigator.resolutionRate.toFixed(1)
        ]);
      });

      perfSheet.columns.forEach((column) => {
        column.width = 18;
      });

      // Add conditional formatting for resolution rates
      perfSheet.addConditionalFormatting({
        ref: `H3:H${data.investigatorPerformance.length + 2}`,
        rules: [
          {
            priority: 1,
            type: 'colorScale',
            cfvo: [
              { type: 'num', value: 0 },
              { type: 'num', value: 50 },
              { type: 'num', value: 100 }
            ],
            color: [
              { argb: 'FFFF0000' }, // Red
              { argb: 'FFFFFF00' }, // Yellow
              { argb: 'FF00FF00' }  // Green
            ]
          }
        ]
      });
    }

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async generateGenericExcel(
    workbook: any, // ExcelJS.Workbook loaded dynamically
    data: any,
    parameters: ReportParameters
  ): Promise<Buffer> {
    const worksheet = workbook.addWorksheet('Report Data');
    
    worksheet.addRow(['Report Type', parameters.reportType]);
    worksheet.addRow(['Generated', new Date().toISOString()]);
    worksheet.addRow(['Data', JSON.stringify(data, null, 2)]);

    return await workbook.xlsx.writeBuffer() as Buffer;
  }

  private async addPerformanceChartToExcel(
    worksheet: any, // ExcelJS.Worksheet loaded dynamically
    data: AuditorPerformanceSummary[]
  ): Promise<void> {
    // Add chart data in a separate area
    const chartStartRow = data.length + 5;
    
    worksheet.getCell(`A${chartStartRow}`).value = 'Chart Data';
    worksheet.getCell(`A${chartStartRow + 1}`).value = 'Auditor';
    worksheet.getCell(`B${chartStartRow + 1}`).value = 'Completion Rate';

    data.forEach((auditor, index) => {
      const row = chartStartRow + 2 + index;
      worksheet.getCell(`A${row}`).value = auditor.auditorName;
      worksheet.getCell(`B${row}`).value = auditor.completionRate;
    });
  }

  // ============= UTILITY METHODS =============

  private getDefaultTitle(reportType: ReportType): string {
    const titles: Record<ReportType, string> = {
      'auditor_performance': 'Auditor Performance Report',
      'team_comparison': 'Team Performance Comparison',
      'risk_trending': 'Risk Trending Analysis',
      'workflow_efficiency': 'Workflow Efficiency Report',
      'executive_summary': 'Executive Summary Report',
      'compliance_report': 'Compliance Status Report',
      'custom_report': 'Custom Analytics Report'
    };

    return titles[reportType] || 'Analytics Report';
  }

  // ============= REPORT STATUS TRACKING =============

  async updateReportStatus(
    reportId: string,
    status: ReportGenerationStatus['status'],
    progress?: number,
    downloadUrl?: string,
    errorMessage?: string
  ): Promise<void> {
    // TODO: Update report generation status in database
    console.log(`Report ${reportId} status updated to ${status}`);
  }
}