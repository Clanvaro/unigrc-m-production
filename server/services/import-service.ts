// OPTIMIZED: Lazy load ExcelJS - only load when processing Excel files
// import ExcelJS from 'exceljs';
import { z } from 'zod';
import { db } from '../db';
import { storage } from '../storage';
import { 
  insertFiscalEntitySchema,
  insertProcessOwnerSchema,
  insertMacroprocesoSchema,
  insertProcessSchema,
  insertSubprocesoSchema,
  insertRiskSchema,
  baseInsertRiskSchema,
  insertControlSchema,
  insertImportSessionSchema,
  updateImportSessionSchema,
  importSessions,
  fiscalEntities,
  processOwners,
  macroprocesos,
  processes,
  subprocesos,
  risks,
  controls,
  actions,
  type ImportSession
} from '@shared/schema';
import { eq, sql, and, isNull } from 'drizzle-orm';

// Tipos para el resultado de la importaciรณn
export interface ImportResult {
  sheet: string;
  created: number;
  updated: number;
  skipped: number;
  errors: ImportError[];
}

export interface ImportError {
  sheet: string;
  row: number;
  field: string;
  message: string;
  code?: string;
}

export interface ImportSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

// Esquemas para validar los datos de cada hoja
const fiscalEntityImportSchema = insertFiscalEntitySchema.extend({
  code: z.string().min(1, "Cรณdigo es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  type: z.enum(["matriz", "filial", "otra"]),
});

const processOwnerImportSchema = insertProcessOwnerSchema.extend({
  name: z.string().min(1, "Nombre es requerido"),
  email: z.string().email("Email invรกlido"),
  position: z.string().optional(),
  company: z.string().optional(),
  isActive: z.boolean().optional(),
});

const macroprocesoImportSchema = insertMacroprocesoSchema.extend({
  code: z.string().min(1, "Cรณdigo es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  type: z.enum(["clave", "apoyo"]),
  order: z.number().int().positive("Orden debe ser positivo"),
});

const riskImportSchema = baseInsertRiskSchema.extend({
  code: z.string().min(1, "Cรณdigo es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  category: z.string().optional().transform(val => val ? val.split(',').map(c => c.trim()) : []),
  frequencyOccurrence: z.number().int().min(1).max(5).default(3),
  exposureVolume: z.number().int().min(1).max(5).default(3),
  exposureMassivity: z.number().int().min(1).max(5).default(3),
  exposureCriticalPath: z.number().int().min(1).max(5).default(3),
  complexity: z.number().int().min(1).max(5).default(3),
  changeVolatility: z.number().int().min(1).max(5).default(3),
  vulnerabilities: z.number().int().min(1).max(5).default(3),
  impact: z.number().int().min(1).max(5),
  status: z.enum(["active", "mitigated", "closed"]).default("active"),
  processOwner: z.string().optional(),
});

const controlImportSchema = insertControlSchema.extend({
  code: z.string().min(1, "Cรณdigo es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  type: z.enum(["preventive", "detective", "corrective"]),
  frequency: z.enum(["continuous", "daily", "weekly", "monthly"]),
  evidence: z.string().optional(),
  effectiveness: z.number().int().min(0).max(100).default(50),
  effectTarget: z.enum(["probability", "impact", "both"]).default("both"),
  isActive: z.boolean().optional(),
});

const processImportSchema = insertProcessSchema.extend({
  code: z.string().min(1, "Cรณdigo es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  ownerCode: z.string().optional().transform(val => val || undefined), // Email del propietario del proceso
  macroprocesoCode: z.string().optional().transform(val => val || undefined), // Cรณdigo del macroproceso
  fiscalEntityCode: z.string().optional().transform(val => val || undefined), // Cรณdigo de entidad fiscal
  entityScope: z.enum(["specific", "transversal", "selective"]).default("transversal"),
});

const subprocesoImportSchema = insertSubprocesoSchema.extend({
  code: z.string().min(1, "Cรณdigo es requerido"),
  name: z.string().min(1, "Nombre es requerido"),
  description: z.string().optional(),
  ownerCode: z.string().optional().transform(val => val || undefined), // Email del propietario
  processCode: z.string().min(1, "Cรณdigo del proceso padre es requerido"), // Cรณdigo del proceso padre
});

// Import schema for action plans (based on unified actions table)
// Uses 'name' field which will be mapped to 'title' when inserting into actions table
const actionPlanImportSchema = z.object({
  code: z.string().min(1, "Cรณdigo es requerido"),
  name: z.string().min(1, "Nombre/Tรญtulo es requerido"), // Will map to 'title' in actions table
  description: z.string().optional().nullable(),
  origin: z.enum(["risk", "audit", "compliance"]).default("risk"),
  riskCode: z.string().optional().transform(val => val || undefined),
  responsible: z.string().optional().nullable(),
  dueDate: z.string().optional().transform(val => val ? new Date(val) : undefined).nullable(),
  priority: z.enum(["low", "medium", "high", "critical"]).default("medium"),
  status: z.enum(["pending", "in_progress", "evidence_submitted", "under_review", "completed", "audited", "overdue", "closed", "deleted"]).default("pending"),
  progress: z.number().int().min(0).max(100).default(0),
});

export class ImportService {
  
  // Crear nueva sesiรณn de importaciรณn
  async createImportSession(data: {
    fileName: string;
    originalFileName: string;
    userId: string;
    isDryRun: boolean;
  }): Promise<string> {
    const session = await db.insert(importSessions).values({
      fileName: data.fileName,
      originalFileName: data.originalFileName,
      userId: data.userId,
      isDryRun: data.isDryRun,
      status: "uploading",
      progress: 0,
    }).returning({ id: importSessions.id });

    return session[0].id;
  }

  // Actualizar sesiรณn de importaciรณn
  async updateImportSession(id: string, data: Partial<ImportSession>): Promise<void> {
    await db.update(importSessions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(importSessions.id, id));
  }

  // Obtener sesiรณn de importaciรณn
  async getImportSession(id: string): Promise<ImportSession | null> {
    const sessions = await db.select()
      .from(importSessions)
      .where(eq(importSessions.id, id))
      .limit(1);

    return sessions[0] || null;
  }

  // Procesar archivo Excel
  async processExcelBuffer(sessionId: string, fileBuffer: Buffer, isDryRun: boolean = true): Promise<void> {
    // OPTIMIZED: Lazy load ExcelJS
    const ExcelJS = (await import('exceljs')).default;
    let workbook: ExcelJS.Workbook;
    
    try {
      // Establecer modo dry-run
      this.isDryRunMode = isDryRun;

      // Actualizar estado a validating
      await this.updateImportSession(sessionId, {
        status: "validating",
        progress: 10,
      });

      // Leer archivo Excel desde buffer
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer);

      // Validar estructura del archivo
      const validationResult = await this.validateWorkbookStructure(workbook);
      if (!validationResult.isValid) {
        await this.updateImportSession(sessionId, {
          status: "failed",
          progress: 100,
          errors: validationResult.errors,
        });
        return;
      }

      // Actualizar estado a processing
      await this.updateImportSession(sessionId, {
        status: "processing",
        progress: 30,
      });

      // Procesar cada hoja en orden de dependencias
      const results = await this.processWorkbookSheets(workbook);

      // Calcular resumen
      const summary = this.calculateSummary(results);

      // Actualizar sesiรณn con resultados
      await this.updateImportSession(sessionId, {
        status: "completed",
        progress: 100,
        summary: summary,
        errors: results.flatMap(r => r.errors),
      });

    } catch (error) {
      console.error('Error processing Excel buffer:', error);
      await this.updateImportSession(sessionId, {
        status: "failed",
        progress: 100,
        errors: [{
          sheet: "general",
          row: 0,
          field: "file",
          message: `Error procesando archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        }],
      });
    }
  }

  async processExcelFile(sessionId: string, filePath: string, isDryRun: boolean = true): Promise<void> {
    // OPTIMIZED: Lazy load ExcelJS
    const ExcelJS = (await import('exceljs')).default;
    let workbook: ExcelJS.Workbook;
    
    try {
      // Establecer modo dry-run
      this.isDryRunMode = isDryRun;

      // Actualizar estado a validating
      await this.updateImportSession(sessionId, {
        status: "validating",
        progress: 10,
      });

      // Leer archivo Excel
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);

      // Validar estructura del archivo
      const validationResult = await this.validateWorkbookStructure(workbook);
      if (!validationResult.isValid) {
        await this.updateImportSession(sessionId, {
          status: "failed",
          progress: 100,
          errors: validationResult.errors,
        });
        return;
      }

      // Actualizar estado a processing
      await this.updateImportSession(sessionId, {
        status: "processing",
        progress: 30,
      });

      // Procesar cada hoja en orden de dependencias
      const results = await this.processWorkbookSheets(workbook);

      // Calcular resumen
      const summary = this.calculateSummary(results);

      // Actualizar sesiรณn con resultados
      await this.updateImportSession(sessionId, {
        status: "completed",
        progress: 100,
        summary: summary,
        errors: results.flatMap(r => r.errors),
      });

    } catch (error) {
      console.error('Error processing Excel file:', error);
      await this.updateImportSession(sessionId, {
        status: "failed",
        progress: 100,
        errors: [{
          sheet: "General",
          row: 0,
          field: "file",
          message: `Error procesando archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        }],
      });
    }
  }

  // Validar estructura del libro de Excel (permite importaciones parciales)
  private async validateWorkbookStructure(workbook: ExcelJS.Workbook): Promise<{
    isValid: boolean;
    errors: ImportError[];
  }> {
    const errors: ImportError[] = [];
    const supportedSheets = [
      "FiscalEntities", 
      "ProcessOwners", 
      "Macroprocesos", 
      "Processes", 
      "Subprocesos", 
      "Risks", 
      "Controls", 
      "ActionPlans"
    ];

    // Verificar que al menos una hoja vรกlida existe
    const foundSheets = workbook.worksheets
      .map(ws => ws.name)
      .filter(name => supportedSheets.includes(name));

    if (foundSheets.length === 0) {
      errors.push({
        sheet: "workbook",
        row: 0,
        field: "structure",
        message: `No se encontraron hojas compatibles. Se esperaba al menos una de: ${supportedSheets.join(', ')}`,
      });
    }

    // Validar estructura bรกsica de hojas encontradas
    for (const sheetName of foundSheets) {
      const worksheet = workbook.getWorksheet(sheetName);
      if (worksheet && worksheet.rowCount < 1) {
        errors.push({
          sheet: sheetName,
          row: 0,
          field: "structure",
          message: `La hoja '${sheetName}' estรก vacรญa o no tiene fila de encabezados`,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Procesar las hojas del libro en orden de dependencias
  private async processWorkbookSheets(workbook: ExcelJS.Workbook): Promise<ImportResult[]> {
    const results: ImportResult[] = [];

    // Procesar en orden de dependencias
    const sheetsToProcess = [
      { name: "FiscalEntities", processor: this.processFiscalEntitiesSheet.bind(this) },
      { name: "ProcessOwners", processor: this.processProcessOwnersSheet.bind(this) },
      { name: "Macroprocesos", processor: this.processMacroprocesoSheet.bind(this) },
      { name: "Processes", processor: this.processProcessesSheet.bind(this) },
      { name: "Subprocesos", processor: this.processSubprocesosSheet.bind(this) },
      { name: "Risks", processor: this.processRisksSheet.bind(this) },
      { name: "Controls", processor: this.processControlsSheet.bind(this) },
      { name: "ActionPlans", processor: this.processActionPlansSheet.bind(this) },
    ];

    for (const { name, processor } of sheetsToProcess) {
      const worksheet = workbook.getWorksheet(name);
      if (worksheet) {
        try {
          const result = await processor(worksheet);
          results.push(result);
        } catch (error) {
          results.push({
            sheet: name,
            created: 0,
            updated: 0,
            skipped: 0,
            errors: [{
              sheet: name,
              row: 0,
              field: "processing",
              message: `Error procesando hoja: ${error instanceof Error ? error.message : 'Error desconocido'}`,
            }],
          });
        }
      }
    }

    return results;
  }

  // Procesar hoja de Entidades Fiscales con patrรณn de dos fases
  private async processFiscalEntitiesSheet(worksheet: ExcelJS.Worksheet): Promise<ImportResult> {
    const result: ImportResult = {
      sheet: "FiscalEntities",
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Obtener encabezados de la primera fila
    const headerRow = worksheet.getRow(1);
    const headers = this.extractHeaders(headerRow);

    // Validar encabezados requeridos
    const requiredHeaders = ["code", "name", "type"];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      result.errors.push({
        sheet: "FiscalEntities",
        row: 1,
        field: "headers",
        message: `Columnas faltantes: ${missingHeaders.join(", ")}`,
      });
      return result;
    }

    // FASE A: Validaciรณn completa y preparaciรณn de datos
    const validRows: Array<{ rowNumber: number; data: any }> = [];
    const seenCodes = new Set<string>();
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezados

      try {
        const rowData = this.extractRowData(row, headers);
        
        // Validar datos con esquema Zod
        const validation = fiscalEntityImportSchema.safeParse(rowData);
        if (!validation.success) {
          validation.error.errors.forEach(err => {
            result.errors.push({
              sheet: "FiscalEntities",
              row: rowNumber,
              field: err.path.join("."),
              message: err.message,
              code: rowData.code,
            });
          });
          return;
        }

        // Detectar duplicados dentro del archivo
        if (seenCodes.has(validation.data.code)) {
          result.errors.push({
            sheet: "FiscalEntities",
            row: rowNumber,
            field: "code",
            message: `Cรณdigo duplicado en el archivo: ${validation.data.code}`,
            code: validation.data.code,
          });
          return;
        }
        seenCodes.add(validation.data.code);

        // Normalizar datos
        const normalizedData = {
          ...validation.data,
          name: validation.data.name.trim(),
          code: validation.data.code.trim().toUpperCase(),
          type: validation.data.type.trim().toLowerCase(),
          taxId: validation.data.taxId?.trim(),
          description: validation.data.description?.trim(),
        };

        // Agregar a filas vรกlidas para procesamiento
        validRows.push({ rowNumber, data: normalizedData });

      } catch (error) {
        result.errors.push({
          sheet: "FiscalEntities",
          row: rowNumber,
          field: "processing",
          message: `Error procesando fila: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    });

    // Si hay errores de validaciรณn, no procesar
    if (result.errors.length > 0) {
      return result;
    }

    // FASE B: Persistencia transaccional
    try {
      await db.transaction(async (tx) => {
        // Cargar entidades existentes para detectar updates vs creates
        const existingEntities = await tx.select({
          id: fiscalEntities.id,
          code: fiscalEntities.code,
        }).from(fiscalEntities);
        
        const existingMap = new Map(existingEntities.map(e => [e.code, e.id]));

        // Procesar cada fila vรกlida
        for (const { rowNumber, data } of validRows) {
          try {
            const existingId = existingMap.get(data.code);
            
            if (existingId) {
              // Actualizar entidad existente
              await tx.update(fiscalEntities)
                .set({
                  name: data.name,
                  type: data.type,
                  taxId: data.taxId,
                  description: data.description,
                  isActive: data.isActive ?? true,
                  updatedAt: new Date(),
                })
                .where(eq(fiscalEntities.id, existingId));
              
              result.updated++;
            } else {
              // Crear nueva entidad
              await tx.insert(fiscalEntities).values({
                code: data.code,
                name: data.name,
                type: data.type,
                taxId: data.taxId,
                description: data.description,
                isActive: data.isActive ?? true,
              });
              
              result.created++;
            }
          } catch (dbError) {
            result.errors.push({
              sheet: "FiscalEntities",
              row: rowNumber,
              field: "database",
              message: `Error en base de datos: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`,
              code: data.code,
            });
          }
        }

        // Si es dry-run, forzar rollback
        if (this.isDryRunMode) {
          throw new Error("DRY_RUN_ROLLBACK"); // Esto causarรก rollback
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "DRY_RUN_ROLLBACK") {
        // Rollback exitoso para dry-run, los contadores son correctos
        console.log(`Dry-run completed for FiscalEntities: ${result.created} created, ${result.updated} updated`);
      } else {
        // Error real de base de datos
        result.errors.push({
          sheet: "FiscalEntities",
          row: 0,
          field: "transaction",
          message: `Error de transacciรณn: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
        result.created = 0;
        result.updated = 0;
      }
    }

    return result;
  }

  // Procesar hoja de Process Owners (Dueรฑos de Procesos)
  private async processProcessOwnersSheet(worksheet: ExcelJS.Worksheet): Promise<ImportResult> {
    const result: ImportResult = {
      sheet: "ProcessOwners",
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Validar encabezados requeridos
    const requiredHeaders = ["name", "email", "position", "company"];
    const headerRow = worksheet.getRow(1);
    const headers = this.extractHeaders(headerRow);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      result.errors.push({
        sheet: "ProcessOwners",
        row: 1,
        field: "headers",
        message: `Columnas faltantes: ${missingHeaders.join(", ")}`,
      });
      return result;
    }

    // FASE A: Validaciรณn completa y preparaciรณn de datos
    const validRows: Array<{ rowNumber: number; data: any }> = [];
    const seenEmails = new Set<string>();
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezados

      try {
        const rowData = this.extractRowData(row, headers);
        
        // Validar datos con esquema Zod
        const validation = processOwnerImportSchema.safeParse(rowData);
        if (!validation.success) {
          validation.error.errors.forEach(err => {
            result.errors.push({
              sheet: "ProcessOwners",
              row: rowNumber,
              field: err.path.join("."),
              message: err.message,
              code: rowData.email,
            });
          });
          return;
        }

        // Detectar duplicados dentro del archivo
        if (seenEmails.has(validation.data.email)) {
          result.errors.push({
            sheet: "ProcessOwners",
            row: rowNumber,
            field: "email",
            message: `Email duplicado en el archivo: ${validation.data.email}`,
            code: validation.data.email,
          });
          return;
        }
        seenEmails.add(validation.data.email);

        // Normalizar datos
        const normalizedData = {
          ...validation.data,
          name: validation.data.name.trim(),
          email: validation.data.email.trim().toLowerCase(),
          position: validation.data.position?.trim(),
          company: validation.data.company?.trim(),
        };

        // Agregar a filas vรกlidas para procesamiento
        validRows.push({ rowNumber, data: normalizedData });

      } catch (error) {
        result.errors.push({
          sheet: "ProcessOwners",
          row: rowNumber,
          field: "processing",
          message: `Error procesando fila: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    });

    // Si hay errores de validaciรณn, no procesar
    if (result.errors.length > 0) {
      return result;
    }

    // FASE B: Persistencia transaccional
    try {
      await db.transaction(async (tx) => {
        // Cargar dueรฑos existentes para detectar updates vs creates
        const existingOwners = await tx.select({
          id: processOwners.id,
          email: processOwners.email,
        }).from(processOwners);
        
        const existingMap = new Map(existingOwners.map(o => [o.email, o.id]));

        // Procesar cada fila vรกlida
        for (const { rowNumber, data } of validRows) {
          try {
            const existingId = existingMap.get(data.email);
            
            if (existingId) {
              // Actualizar dueรฑo existente
              await tx.update(processOwners)
                .set({
                  name: data.name,
                  position: data.position,
                  company: data.company,
                  isActive: data.isActive ?? true,
                  updatedAt: new Date(),
                })
                .where(eq(processOwners.id, existingId));
              
              result.updated++;
            } else {
              // Crear nuevo dueรฑo
              await tx.insert(processOwners).values({
                name: data.name,
                email: data.email,
                position: data.position,
                company: data.company,
                isActive: data.isActive ?? true,
              });
              
              result.created++;
            }
          } catch (dbError) {
            result.errors.push({
              sheet: "ProcessOwners",
              row: rowNumber,
              field: "database",
              message: `Error en base de datos: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`,
              code: data.email,
            });
          }
        }

        // Si es dry-run, forzar rollback
        if (this.isDryRunMode) {
          throw new Error("DRY_RUN_ROLLBACK"); // Esto causarรก rollback
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "DRY_RUN_ROLLBACK") {
        // Rollback exitoso para dry-run, los contadores son correctos
        console.log(`Dry-run completed for ProcessOwners: ${result.created} created, ${result.updated} updated`);
      } else {
        // Error real de base de datos
        result.errors.push({
          sheet: "ProcessOwners",
          row: 0,
          field: "transaction",
          message: `Error de transacciรณn: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
        result.created = 0;
        result.updated = 0;
      }
    }

    return result;
  }

  // Procesar hoja de Macroprocesos
  private async processMacroprocesoSheet(worksheet: ExcelJS.Worksheet): Promise<ImportResult> {
    const result: ImportResult = {
      sheet: "Macroprocesos",
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Validar encabezados requeridos
    const requiredHeaders = ["code", "name", "type", "order"];
    const headerRow = worksheet.getRow(1);
    const headers = this.extractHeaders(headerRow);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      result.errors.push({
        sheet: "Macroprocesos",
        row: 1,
        field: "headers",
        message: `Columnas faltantes: ${missingHeaders.join(", ")}`,
      });
      return result;
    }

    // FASE A: Validaciรณn completa y preparaciรณn de datos
    const validRows: Array<{ rowNumber: number; data: any }> = [];
    const seenCodes = new Set<string>();
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezados

      try {
        const rowData = this.extractRowData(row, headers);
        
        // Validar datos con esquema Zod
        const validation = macroprocesoImportSchema.safeParse(rowData);
        if (!validation.success) {
          validation.error.errors.forEach(err => {
            result.errors.push({
              sheet: "Macroprocesos",
              row: rowNumber,
              field: err.path.join("."),
              message: err.message,
              code: rowData.code,
            });
          });
          return;
        }

        // Detectar duplicados dentro del archivo
        if (seenCodes.has(validation.data.code)) {
          result.errors.push({
            sheet: "Macroprocesos",
            row: rowNumber,
            field: "code",
            message: `Cรณdigo duplicado en el archivo: ${validation.data.code}`,
            code: validation.data.code,
          });
          return;
        }
        seenCodes.add(validation.data.code);

        // Normalizar datos
        const normalizedData = {
          ...validation.data,
          code: validation.data.code.trim().toUpperCase(),
          name: validation.data.name.trim(),
          type: validation.data.type.trim().toLowerCase(),
          description: validation.data.description?.trim(),
        };

        // Agregar a filas vรกlidas para procesamiento
        validRows.push({ rowNumber, data: normalizedData });

      } catch (error) {
        result.errors.push({
          sheet: "Macroprocesos",
          row: rowNumber,
          field: "processing",
          message: `Error procesando fila: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    });

    // Si hay errores de validaciรณn, no procesar
    if (result.errors.length > 0) {
      return result;
    }

    // FASE B: Persistencia transaccional
    try {
      await db.transaction(async (tx) => {
        // Cargar macroprocesos existentes para detectar updates vs creates
        const existingMacroprocesos = await tx.select({
          id: macroprocesos.id,
          code: macroprocesos.code,
        }).from(macroprocesos);
        
        const existingMap = new Map(existingMacroprocesos.map(m => [m.code, m.id]));

        // Procesar cada fila vรกlida
        for (const { rowNumber, data } of validRows) {
          try {
            const existingId = existingMap.get(data.code);
            
            if (existingId) {
              // Actualizar macroproceso existente
              await tx.update(macroprocesos)
                .set({
                  name: data.name,
                  description: data.description,
                  type: data.type,
                  order: data.order,
                  updatedAt: new Date(),
                })
                .where(eq(macroprocesos.id, existingId));
              
              result.updated++;
            } else {
              // Crear nuevo macroproceso
              await tx.insert(macroprocesos).values({
                code: data.code,
                name: data.name,
                description: data.description,
                type: data.type,
                order: data.order,
                entityScope: "transversal", // Default value
              });
              
              result.created++;
            }
          } catch (dbError) {
            result.errors.push({
              sheet: "Macroprocesos",
              row: rowNumber,
              field: "database",
              message: `Error en base de datos: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`,
              code: data.code,
            });
          }
        }

        // Si es dry-run, forzar rollback
        if (this.isDryRunMode) {
          throw new Error("DRY_RUN_ROLLBACK"); // Esto causarรก rollback
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "DRY_RUN_ROLLBACK") {
        // Rollback exitoso para dry-run, los contadores son correctos
        console.log(`Dry-run completed for Macroprocesos: ${result.created} created, ${result.updated} updated`);
      } else {
        // Error real de base de datos
        result.errors.push({
          sheet: "Macroprocesos",
          row: 0,
          field: "transaction",
          message: `Error de transacciรณn: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
        result.created = 0;
        result.updated = 0;
      }
    }

    return result;
  }

  // Procesar hoja de Risks (Riesgos)
  private async processRisksSheet(worksheet: ExcelJS.Worksheet): Promise<ImportResult> {
    const result: ImportResult = {
      sheet: "Risks",
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Validar encabezados requeridos
    const requiredHeaders = ["code", "name", "description", "impact"];
    const headerRow = worksheet.getRow(1);
    const headers = this.extractHeaders(headerRow);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      result.errors.push({
        sheet: "Risks",
        row: 1,
        field: "headers",
        message: `Columnas faltantes: ${missingHeaders.join(", ")}`,
      });
      return result;
    }

    // FASE A: Validaciรณn completa y preparaciรณn de datos
    const validRows: Array<{ rowNumber: number; data: any }> = [];
    const seenCodes = new Set<string>();
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezados

      try {
        const rowData = this.extractRowData(row, headers);
        
        // Validar datos con esquema Zod
        const validation = riskImportSchema.safeParse(rowData);
        if (!validation.success) {
          validation.error.errors.forEach(err => {
            result.errors.push({
              sheet: "Risks",
              row: rowNumber,
              field: err.path.join("."),
              message: err.message,
              code: rowData.code,
            });
          });
          return;
        }

        // Detectar duplicados dentro del archivo
        if (seenCodes.has(validation.data.code)) {
          result.errors.push({
            sheet: "Risks",
            row: rowNumber,
            field: "code",
            message: `Cรณdigo duplicado en el archivo: ${validation.data.code}`,
            code: validation.data.code,
          });
          return;
        }
        seenCodes.add(validation.data.code);

        // Normalizar datos
        const normalizedData = {
          ...validation.data,
          code: validation.data.code.trim().toUpperCase(),
          name: validation.data.name.trim(),
          description: validation.data.description?.trim(),
          status: validation.data.status?.trim().toLowerCase() || "active",
          processOwner: validation.data.processOwner?.trim(),
        };

        // Calcular probabilidad a partir de factores (promedio ponderado)
        const factors = [
          normalizedData.frequencyOccurrence,
          normalizedData.exposureVolume,
          normalizedData.exposureMassivity,
          normalizedData.exposureCriticalPath,
          normalizedData.complexity,
          normalizedData.changeVolatility,
          normalizedData.vulnerabilities,
        ];
        const probability = Math.round(factors.reduce((sum, factor) => sum + factor, 0) / factors.length);
        const inherentRisk = probability * normalizedData.impact;

        // Agregar campos calculados
        const finalData = {
          ...normalizedData,
          probability: Math.max(1, Math.min(5, probability)), // Asegurar que estรฉ entre 1-5
          inherentRisk,
        };

        // Agregar a filas vรกlidas para procesamiento
        validRows.push({ rowNumber, data: finalData });

      } catch (error) {
        result.errors.push({
          sheet: "Risks",
          row: rowNumber,
          field: "processing",
          message: `Error procesando fila: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
      }
    });

    // Si hay errores de validaciรณn, no procesar
    if (result.errors.length > 0) {
      return result;
    }

    // FASE B: Persistencia transaccional
    try {
      await db.transaction(async (tx) => {
        // Cargar riesgos existentes para detectar updates vs creates
        const existingRisks = await tx.select({
          id: risks.id,
          code: risks.code,
        }).from(risks);
        
        const existingMap = new Map(existingRisks.map(r => [r.code, r.id]));

        // Procesar cada fila vรกlida
        for (const { rowNumber, data } of validRows) {
          try {
            const existingId = existingMap.get(data.code);
            
            if (existingId) {
              // Actualizar riesgo existente
              await tx.update(risks)
                .set({
                  name: data.name,
                  description: data.description,
                  category: data.category,
                  frequencyOccurrence: data.frequencyOccurrence,
                  exposureVolume: data.exposureVolume,
                  exposureMassivity: data.exposureMassivity,
                  exposureCriticalPath: data.exposureCriticalPath,
                  complexity: data.complexity,
                  changeVolatility: data.changeVolatility,
                  vulnerabilities: data.vulnerabilities,
                  probability: data.probability,
                  impact: data.impact,
                  inherentRisk: data.inherentRisk,
                  status: data.status,
                  processOwner: data.processOwner,
                })
                .where(eq(risks.id, existingId));
              
              result.updated++;
            } else {
              // Crear nuevo riesgo
              await tx.insert(risks).values({
                code: data.code,
                name: data.name,
                description: data.description,
                category: data.category,
                frequencyOccurrence: data.frequencyOccurrence,
                exposureVolume: data.exposureVolume,
                exposureMassivity: data.exposureMassivity,
                exposureCriticalPath: data.exposureCriticalPath,
                complexity: data.complexity,
                changeVolatility: data.changeVolatility,
                vulnerabilities: data.vulnerabilities,
                probability: data.probability,
                impact: data.impact,
                inherentRisk: data.inherentRisk,
                status: data.status,
                processOwner: data.processOwner,
              });
              
              result.created++;
            }
          } catch (dbError) {
            result.errors.push({
              sheet: "Risks",
              row: rowNumber,
              field: "database",
              message: `Error en base de datos: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`,
              code: data.code,
            });
          }
        }

        // Si es dry-run, forzar rollback
        if (this.isDryRunMode) {
          throw new Error("DRY_RUN_ROLLBACK"); // Esto causarรก rollback
        }
      });
    } catch (error) {
      if (error instanceof Error && error.message === "DRY_RUN_ROLLBACK") {
        // Rollback exitoso para dry-run, los contadores son correctos
        console.log(`Dry-run completed for Risks: ${result.created} created, ${result.updated} updated`);
      } else {
        // Error real de base de datos
        result.errors.push({
          sheet: "Risks",
          row: 0,
          field: "transaction",
          message: `Error de transacciรณn: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        });
        result.created = 0;
        result.updated = 0;
      }
    }

    return result;
  }

  // ======================== PROCESOS ========================
  async processProcessesImport(
    file: Express.Multer.File,
    userId: string,
    dryRun = false
  ): Promise<{ session: ImportSession; importResults: ImportResult<any>[] }> {
    const sessionId = await this.createImportSession({
      fileName: file.originalname || 'unknown.xlsx',
      originalFileName: file.originalname || 'unknown.xlsx',
      userId,
      isDryRun: dryRun
    });
    
    // Get the session object for return
    const session = await this.getImportSession(sessionId);

    try {
      // OPTIMIZED: Lazy load ExcelJS
      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontrรณ una hoja de trabajo vรกlida en el archivo');
      }

      // Definir campos esperados para procesos
      const expectedFields = [
        'codigo',
        'nombre', 
        'descripcion',
        'propietario_email',
        'codigo_macroproceso',
        'codigo_entidad_fiscal',
        'alcance_entidad'
      ];

      // Validar estructura del archivo
      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values as string[];
      const normalizedHeaders = headers.slice(1).map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1; // ExcelJS uses 1-based indexing
        return acc;
      }, {} as Record<string, number>);

      // Primera fase: Validaciรณn y preparaciรณn de datos
      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          // Extraer datos de la fila
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            ownerCode: row.getCell(headerMap['propietario_email'])?.text?.trim() || undefined,
            macroprocesoCode: row.getCell(headerMap['codigo_macroproceso'])?.text?.trim() || undefined,
            fiscalEntityCode: row.getCell(headerMap['codigo_entidad_fiscal'])?.text?.trim() || undefined,
            entityScope: row.getCell(headerMap['alcance_entidad'])?.text?.trim() || 'transversal'
          };

          // Normalizar entityScope
          const normalizedData = {
            ...rawData,
            entityScope: this.normalizeEntityScope(rawData.entityScope)
          };

          // Validar con schema de Zod
          const validatedData = processImportSchema.parse(normalizedData);

          validItems.push({ data: validatedData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: validatedData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: this.formatZodErrors(error),
            isDuplicate: false
          });
        }
      }

      // Detectar duplicados por cรณdigo
      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      // Marcar duplicados
      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      // Verificar duplicados con datos existentes
      const existingCodes = new Set(
        (await db.select({ code: processes.code }).from(processes))
          .map(r => r.code)
      );

      validItems.forEach(({ data, rowNumber }) => {
        if (existingCodes.has(data.code)) {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          if (result) {
            result.isDuplicate = true;
            result.errors.push(`Ya existe un proceso con cรณdigo: ${data.code}`);
            result.isValid = false;
          }
        }
      });

      // Segunda fase: Persistencia en base de datos (solo si no es dry run)
      if (!dryRun) {
        const validItemsForInsert = validItems.filter(({ rowNumber }) => {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          return result && result.isValid && !result.isDuplicate;
        });

        if (validItemsForInsert.length > 0) {
          await db.transaction(async (tx) => {
            for (const { data, rowNumber } of validItemsForInsert) {
              try {
                // Resolver referencias a otras entidades
                const processData = await this.resolveProcessReferences(data, tx);

                const [insertedProcess] = await tx.insert(processes).values({
                  ...processData,
                  createdAt: new Date(),
                }).returning();

                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.data = insertedProcess;
                }
              } catch (dbError: any) {
                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.isValid = false;
                  result.errors.push(`Error de base de datos: ${dbError.message}`);
                }
              }
            }
          });
        }
      }

      // Actualizar sesiรณn con resultados finales
      const successCount = validationResults.filter(r => r.isValid && !r.isDuplicate).length;
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

      await this.updateImportSession(sessionId, {
        status: 'completed',
        totalRows: validationResults.length,
        successfulRows: successCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        completedAt: new Date(),
        processingDetails: {
          validationErrors: errorCount,
          duplicatesFound: duplicateCount,
          recordsProcessed: successCount
        }
      });

      return { session, importResults: validationResults };

    } catch (error) {
      await this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        completedAt: new Date()
      });
      throw error;
    }
  }

  private async processProcessesSheet(worksheet: ExcelJS.Worksheet): Promise<ImportResult> {
    const result: ImportResult = {
      sheet: "Processes",
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Validar encabezados requeridos
    const requiredHeaders = ["code", "name", "macroprocesocode", "owneremail"];
    const headerRow = worksheet.getRow(1);
    const headers = this.extractHeaders(headerRow);
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      result.errors.push({
        sheet: "Processes",
        row: 1,
        field: "headers",
        message: `Columnas faltantes: ${missingHeaders.join(", ")}`,
      });
      return result;
    }

    // FASE A: Validaciรณn completa y preparaciรณn de datos
    const validRows: Array<{ rowNumber: number; data: any }> = [];
    const seenCodes = new Set<string>();
    
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezados

      try {
        const rowData = this.extractRowData(row, headers);
        
        // Validar datos con esquema Zod
        const validation = processImportSchema.safeParse(rowData);
        if (!validation.success) {
          validation.error.errors.forEach(err => {
            result.errors.push({
              sheet: "Processes",
              row: rowNumber,
              field: err.path.join("."),
              message: err.message,
              code: rowData.code,
            });
          });
          return;
        }

        // Detectar duplicados dentro del archivo
        if (seenCodes.has(validation.data.code)) {
          result.errors.push({
            sheet: "Processes",
            row: rowNumber,
            field: "code",
            message: `Cรณdigo duplicado en el archivo: ${validation.data.code}`,
            code: validation.data.code,
          });
          return;
        }
        seenCodes.add(validation.data.code);

        // Normalizar datos
        const normalizedData = {
          ...validation.data,
          code: validation.data.code.trim().toUpperCase(),
          name: validation.data.name.trim(),
          description: validation.data.description?.trim(),
          macroprocesoCode: validation.data.macroprocesoCode.trim().toUpperCase(),
          ownerEmail: validation.data.ownerEmail.trim().toLowerCase(),
        };

        // Agregar a filas vรกlidas para procesamiento
        validRows.push({ rowNumber, data: normalizedData });

      } catch (error) {
        result.errors.push({
          sheet: "Processes",
          row: rowNumber,
          field: "general",
          message: `Error procesando fila: ${error instanceof Error ? error.message : 'Error desconocido'}`,
          code: rowData?.code,
        });
      }
    });

    // Si hay errores de validaciรณn, no proceder con la persistencia
    if (result.errors.length > 0) {
      return result;
    }

    // FASE B: Persistencia transaccional con manejo de dry-run
    if (!this.isDryRunMode) {
      await db.transaction(async (tx) => {
        try {
          // Precargar lookups de dependencias
          const macroprocesoLookup = new Map<string, string>();
          const ownerLookup = new Map<string, string>();
          
          // Cargar macroprocesos
          const macroprocesoData = await tx.select().from(macroprocesos);
          macroprocesoData.forEach(mp => macroprocesoLookup.set(mp.code, mp.id));
          
          // Cargar process owners
          const ownerData = await tx.select().from(processOwners);
          ownerData.forEach(owner => ownerLookup.set(owner.email, owner.id));

          for (const { rowNumber, data } of validRows) {
            try {
              // Resolver referencias forรกneas
              const macroprocesoId = macroprocesoLookup.get(data.macroprocesoCode);
              const ownerId = ownerLookup.get(data.ownerEmail);

              if (!macroprocesoId) {
                result.errors.push({
                  sheet: "Processes",
                  row: rowNumber,
                  field: "macroprocesoCode",
                  message: `Macroproceso no encontrado: ${data.macroprocesoCode}`,
                  code: data.code,
                });
                continue;
              }

              if (!ownerId) {
                result.errors.push({
                  sheet: "Processes",
                  row: rowNumber,
                  field: "ownerEmail",
                  message: `Process owner no encontrado: ${data.ownerEmail}`,
                  code: data.code,
                });
                continue;
              }

              // Verificar si existe para decidir crear o actualizar
              const existing = await tx.select()
                .from(processes)
                .where(eq(processes.code, data.code))
                .limit(1);

              if (existing.length > 0) {
                // Actualizar existente
                await tx.update(processes)
                  .set({
                    name: data.name,
                    description: data.description,
                    macroprocesoId,
                    ownerId,
                    entityScope: data.entityScope,
                    fiscalEntityId: data.fiscalEntityId,
                  })
                  .where(eq(processes.code, data.code));
                
                result.updated++;
              } else {
                // Crear nuevo
                await tx.insert(processes).values({
                  code: data.code,
                  name: data.name,
                  description: data.description,
                  macroprocesoId,
                  ownerId,
                  entityScope: data.entityScope,
                  fiscalEntityId: data.fiscalEntityId,
                });
                
                result.created++;
              }

            } catch (error) {
              result.errors.push({
                sheet: "Processes",
                row: rowNumber,
                field: "database",
                message: `Error en base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                code: data.code,
              });
            }
          }

          // Si hay errores durante la persistencia, hacer rollback
          if (result.errors.length > 0) {
            throw new Error("DRY_RUN_ROLLBACK");
          }

        } catch (error) {
          if (error instanceof Error && error.message === "DRY_RUN_ROLLBACK") {
            // Rollback intencional para errores de persistencia
            throw error;
          }
          throw error;
        }
      });
    } else {
      // En modo dry-run, solo simular las operaciones
      result.created = validRows.length;
      result.updated = 0; // En dry-run no sabemos cuรกles se actualizarรญan
    }

    return result;
  }

  // ======================== SUBPROCESOS ========================
  async processSubprocesosImport(
    file: Express.Multer.File,
    userId: string,
    dryRun = false
  ): Promise<{ session: ImportSession; importResults: ImportResult<any>[] }> {
    const sessionId = await this.createImportSession({
      fileName: file.originalname || 'unknown.xlsx',
      originalFileName: file.originalname || 'unknown.xlsx',
      userId,
      isDryRun: dryRun
    });
    
    const session = await this.getImportSession(sessionId);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontrรณ una hoja de trabajo vรกlida en el archivo');
      }

      // Definir campos esperados para subprocesos
      const expectedFields = [
        'codigo',
        'nombre', 
        'descripcion',
        'propietario_email',
        'codigo_proceso'
      ];

      // Validar estructura del archivo
      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values as string[];
      const normalizedHeaders = headers.slice(1).map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1;
        return acc;
      }, {} as Record<string, number>);

      // Primera fase: Validaciรณn
      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            ownerCode: row.getCell(headerMap['propietario_email'])?.text?.trim() || undefined,
            processCode: row.getCell(headerMap['codigo_proceso'])?.text?.trim()
          };

          const validatedData = subprocesoImportSchema.parse(rawData);

          validItems.push({ data: validatedData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: validatedData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: this.formatZodErrors(error),
            isDuplicate: false
          });
        }
      }

      // Detectar duplicados
      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      // Verificar duplicados con datos existentes
      const existingCodes = new Set(
        (await db.select({ code: subprocesos.code }).from(subprocesos))
          .map(r => r.code)
      );

      validItems.forEach(({ data, rowNumber }) => {
        if (existingCodes.has(data.code)) {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          if (result) {
            result.isDuplicate = true;
            result.errors.push(`Ya existe un subproceso con cรณdigo: ${data.code}`);
            result.isValid = false;
          }
        }
      });

      // Persistencia
      if (!dryRun) {
        const validItemsForInsert = validItems.filter(({ rowNumber }) => {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          return result && result.isValid && !result.isDuplicate;
        });

        if (validItemsForInsert.length > 0) {
          await db.transaction(async (tx) => {
            for (const { data, rowNumber } of validItemsForInsert) {
              try {
                const subprocesoData = await this.resolveSubprocesoReferences(data, tx);

                const [insertedSubproceso] = await tx.insert(subprocesos).values({
                  ...subprocesoData,
                  createdAt: new Date(),
                }).returning();

                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.data = insertedSubproceso;
                }
              } catch (dbError: any) {
                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.isValid = false;
                  result.errors.push(`Error de base de datos: ${dbError.message}`);
                }
              }
            }
          });
        }
      }

      // Actualizar sesiรณn
      const successCount = validationResults.filter(r => r.isValid && !r.isDuplicate).length;
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

      await this.updateImportSession(sessionId, {
        status: 'completed',
        totalRows: validationResults.length,
        successfulRows: successCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        completedAt: new Date(),
        processingDetails: {
          validationErrors: errorCount,
          duplicatesFound: duplicateCount,
          recordsProcessed: successCount
        }
      });

      return { session, importResults: validationResults };

    } catch (error) {
      await this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        completedAt: new Date()
      });
      throw error;
    }
  }

  private async processSubprocesosSheet(worksheet: ExcelJS.Worksheet): Promise<ImportResult> {
    if (!worksheet) {
      return {
        sheet: "Subprocesos",
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, field: "worksheet", message: "Worksheet 'Subprocesos' not found" }],
      };
    }

    try {
      // Campos esperados en el Excel
      const expectedFields = [
        'codigo',
        'nombre', 
        'descripcion',
        'propietario_email',
        'codigo_proceso'
      ];

      // Validar estructura del archivo
      const headerRow = worksheet.getRow(1);
      const headers = this.extractHeaders(headerRow);
      const normalizedHeaders = headers.map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1; // ExcelJS uses 1-based indexing
        return acc;
      }, {} as Record<string, number>);

      // Primera fase: Validaciรณn y preparaciรณn de datos
      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          // Extraer datos de la fila
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            ownerEmail: row.getCell(headerMap['propietario_email'])?.text?.trim() || undefined,
            processCode: row.getCell(headerMap['codigo_proceso'])?.text?.trim()
          };

          // Validaciones bรกsicas
          if (!rawData.code) {
            throw new Error('Cรณdigo es requerido');
          }
          if (!rawData.name) {
            throw new Error('Nombre es requerido');
          }
          if (!rawData.processCode) {
            throw new Error('Cรณdigo de proceso es requerido');
          }

          validItems.push({ data: rawData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: rawData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: [error instanceof Error ? error.message : 'Error de validaciรณn'],
            isDuplicate: false
          });
        }
      }

      // Detectar duplicados por cรณdigo
      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      // Marcar duplicados
      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      // Obtener procesos y process owners existentes para resoluciรณn de foreign keys
      const existingProcesses = await this.storage.getProcesses();
      const existingProcessOwners = await this.storage.getProcessOwners();
      
      const processCodeMap = new Map(existingProcesses.map(p => [p.code, p.id]));
      const ownerEmailMap = new Map(existingProcessOwners.map(o => [o.email, o.id]));

      // Segunda fase: Resoluciรณn de foreign keys y persistencia
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: Array<{ row: number; field: string; message: string }> = [];

      // Solo procesar items vรกlidos
      const validOnlyItems = validItems.filter(({ rowNumber }) => {
        const result = validationResults.find(r => r.rowNumber === rowNumber);
        return result?.isValid && !result?.isDuplicate;
      });

      for (const { data, rowNumber } of validOnlyItems) {
        try {
          // Resolver proceso padre
          const processId = processCodeMap.get(data.processCode);
          if (!processId) {
            errors.push({
              row: rowNumber,
              field: 'codigo_proceso',
              message: `Proceso con cรณdigo '${data.processCode}' no encontrado`
            });
            skipped++;
            continue;
          }

          // Resolver propietario (opcional)
          let ownerId: string | undefined;
          if (data.ownerEmail) {
            ownerId = ownerEmailMap.get(data.ownerEmail);
            if (!ownerId) {
              errors.push({
                row: rowNumber,
                field: 'propietario_email',
                message: `Process owner con email '${data.ownerEmail}' no encontrado`
              });
              skipped++;
              continue;
            }
          }

          // Solo persistir si no es dry run
          if (!this.isDryRunMode) {
            // Verificar si el subproceso ya existe
            const existing = await this.storage.getSubprocesoByCode(data.code);
            
            const subprocesoData = {
              name: data.name,
              description: data.description,
              ownerId,
              procesoId: processId
            };

            if (existing) {
              // Actualizar subproceso existente
              await this.storage.updateSubproceso(existing.id, subprocesoData);
              updated++;
            } else {
              // Crear nuevo subproceso
              await this.storage.createSubproceso(subprocesoData);
              created++;
            }
          } else {
            // En modo dry run, solo contar como creado para reporte
            created++;
          }

        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'general',
            message: error instanceof Error ? error.message : 'Error al procesar subproceso'
          });
          skipped++;
        }
      }

      // Agregar errores de validaciรณn a los errores finales
      validationResults.forEach(result => {
        if (!result.isValid) {
          result.errors.forEach(errorMsg => {
            errors.push({
              row: result.rowNumber,
              field: 'validation',
              message: errorMsg
            });
          });
        }
      });

      return {
        sheet: "Subprocesos",
        created,
        updated,
        skipped,
        errors,
      };

    } catch (error) {
      return {
        sheet: "Subprocesos",
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ 
          row: 0, 
          field: "general", 
          message: error instanceof Error ? error.message : "Error procesando subprocesos" 
        }],
      };
    }
  }

  private async processControlsSheet(worksheet: ExcelJS.Worksheet): Promise<ImportResult> {
    if (!worksheet) {
      return {
        sheet: "Controls",
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, field: "worksheet", message: "Worksheet 'Controls' not found" }],
      };
    }

    try {
      // Campos esperados en el Excel
      const expectedFields = [
        'codigo',
        'nombre', 
        'descripcion',
        'tipo',
        'frecuencia',
        'evidencia',
        'efectividad',
        'objetivo_efecto',
        'activo'
      ];

      // Validar estructura del archivo
      const headerRow = worksheet.getRow(1);
      const headers = this.extractHeaders(headerRow);
      const normalizedHeaders = headers.map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1; // ExcelJS uses 1-based indexing
        return acc;
      }, {} as Record<string, number>);

      // Primera fase: Validaciรณn y preparaciรณn de datos
      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          // Extraer datos de la fila
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            type: row.getCell(headerMap['tipo'])?.text?.trim()?.toLowerCase(),
            frequency: row.getCell(headerMap['frecuencia'])?.text?.trim()?.toLowerCase(),
            evidence: row.getCell(headerMap['evidencia'])?.text?.trim() || undefined,
            effectiveness: parseInt(row.getCell(headerMap['efectividad'])?.text?.trim() || '0'),
            effectTarget: row.getCell(headerMap['objetivo_efecto'])?.text?.trim()?.toLowerCase() || 'both',
            isActive: this.parseBooleanValue(row.getCell(headerMap['activo'])?.text)
          };

          // Validaciones bรกsicas
          if (!rawData.code) {
            throw new Error('Cรณdigo es requerido');
          }
          if (!rawData.name) {
            throw new Error('Nombre es requerido');
          }
          if (!rawData.type) {
            throw new Error('Tipo es requerido');
          }
          if (!rawData.frequency) {
            throw new Error('Frecuencia es requerida');
          }

          // Validar valores de tipo
          const validTypes = ['preventive', 'detective', 'corrective'];
          if (!validTypes.includes(rawData.type)) {
            throw new Error(`Tipo debe ser uno de: ${validTypes.join(', ')}`);
          }

          // Validar valores de frecuencia
          const validFrequencies = ['continuous', 'daily', 'weekly', 'monthly'];
          if (!validFrequencies.includes(rawData.frequency)) {
            throw new Error(`Frecuencia debe ser uno de: ${validFrequencies.join(', ')}`);
          }

          // Validar efectividad
          if (isNaN(rawData.effectiveness) || rawData.effectiveness < 0 || rawData.effectiveness > 100) {
            throw new Error('Efectividad debe ser un nรบmero entre 0 y 100');
          }

          // Validar objetivo de efecto
          const validEffectTargets = ['probability', 'impact', 'both'];
          if (!validEffectTargets.includes(rawData.effectTarget)) {
            throw new Error(`Objetivo de efecto debe ser uno de: ${validEffectTargets.join(', ')}`);
          }

          validItems.push({ data: rawData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: rawData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: [error instanceof Error ? error.message : 'Error de validaciรณn'],
            isDuplicate: false
          });
        }
      }

      // Detectar duplicados por cรณdigo
      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      // Marcar duplicados
      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      // Segunda fase: Persistencia
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: Array<{ row: number; field: string; message: string }> = [];

      // Solo procesar items vรกlidos
      const validOnlyItems = validItems.filter(({ rowNumber }) => {
        const result = validationResults.find(r => r.rowNumber === rowNumber);
        return result?.isValid && !result?.isDuplicate;
      });

      for (const { data, rowNumber } of validOnlyItems) {
        try {
          // Solo persistir si no es dry run
          if (!this.isDryRunMode) {
            // Verificar si el control ya existe
            const existing = await this.storage.getControlByCode(data.code);
            
            const controlData = {
              name: data.name,
              description: data.description,
              type: data.type,
              frequency: data.frequency,
              evidence: data.evidence,
              effectiveness: data.effectiveness,
              effectTarget: data.effectTarget,
              isActive: true,
              validationStatus: 'pending_validation' as const
            };

            if (existing) {
              // Actualizar control existente
              await this.storage.updateControl(existing.id, controlData);
              updated++;
            } else {
              // Crear nuevo control
              await this.storage.createControl(controlData);
              created++;
            }
          } else {
            // En modo dry run, solo contar como creado para reporte
            created++;
          }

        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'general',
            message: error instanceof Error ? error.message : 'Error al procesar control'
          });
          skipped++;
        }
      }

      // Agregar errores de validaciรณn a los errores finales
      validationResults.forEach(result => {
        if (!result.isValid) {
          result.errors.forEach(errorMsg => {
            errors.push({
              row: result.rowNumber,
              field: 'validation',
              message: errorMsg
            });
          });
        }
      });

      return {
        sheet: "Controls",
        created,
        updated,
        skipped,
        errors,
      };

    } catch (error) {
      return {
        sheet: "Controls",
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ 
          row: 0, 
          field: "general", 
          message: error instanceof Error ? error.message : "Error procesando controles" 
        }],
      };
    }
  }

  // ======================== PLANES DE ACCIร�N ========================
  async processActionPlansImport(
    file: Express.Multer.File,
    userId: string,
    dryRun = false
  ): Promise<{ session: ImportSession; importResults: ImportResult<any>[] }> {
    const sessionId = await this.createImportSession({
      fileName: file.originalname || 'unknown.xlsx',
      originalFileName: file.originalname || 'unknown.xlsx',
      userId,
      isDryRun: dryRun
    });
    
    const session = await this.getImportSession(sessionId);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontrรณ una hoja de trabajo vรกlida en el archivo');
      }

      // Definir campos esperados para planes de acciรณn
      const expectedFields = [
        'codigo',
        'titulo', 
        'descripcion',
        'origen',
        'codigo_riesgo',
        'responsable_email',
        'fecha_vencimiento',
        'prioridad',
        'estado',
        'progreso'
      ];

      // Validar estructura del archivo
      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values as string[];
      const normalizedHeaders = headers.slice(1).map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1;
        return acc;
      }, {} as Record<string, number>);

      // Primera fase: Validaciรณn
      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['titulo'])?.text?.trim(),
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            origin: row.getCell(headerMap['origen'])?.text?.trim()?.toLowerCase() || 'risk',
            riskCode: row.getCell(headerMap['codigo_riesgo'])?.text?.trim(),
            responsible: row.getCell(headerMap['responsable_email'])?.text?.trim() || undefined,
            dueDate: row.getCell(headerMap['fecha_vencimiento'])?.text?.trim() || undefined,
            priority: row.getCell(headerMap['prioridad'])?.text?.trim() || 'medium',
            status: row.getCell(headerMap['estado'])?.text?.trim() || 'pending',
            progress: this.parseNumericValue(row.getCell(headerMap['progreso'])?.text) || 0
          };

          // Normalizar campos enum
          const normalizedData = {
            ...rawData,
            priority: this.normalizeActionPlanPriority(rawData.priority),
            status: this.normalizeActionPlanStatus(rawData.status),
          };

          const validatedData = actionPlanImportSchema.parse(normalizedData);

          validItems.push({ data: validatedData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: validatedData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: this.formatZodErrors(error),
            isDuplicate: false
          });
        }
      }

      // Detectar duplicados
      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      // Verificar duplicados con datos existentes en actions table (origin='risk')
      const existingCodes = new Set(
        (await db.select({ code: actions.code }).from(actions).where(
          and(
            eq(actions.origin, 'risk'),
            isNull(actions.deletedAt)
          )
        ))
          .map(r => r.code)
      );

      validItems.forEach(({ data, rowNumber }) => {
        if (existingCodes.has(data.code)) {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          if (result) {
            result.isDuplicate = true;
            result.errors.push(`Ya existe un plan de acciรณn con cรณdigo: ${data.code}`);
            result.isValid = false;
          }
        }
      });

      // Persistencia
      if (!dryRun) {
        const validItemsForInsert = validItems.filter(({ rowNumber }) => {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          return result && result.isValid && !result.isDuplicate;
        });

        if (validItemsForInsert.length > 0) {
          await db.transaction(async (tx) => {
            for (const { data, rowNumber } of validItemsForInsert) {
              try {
                const actionPlanData = await this.resolveActionPlanReferences(data, tx);

                // Insert into unified actions table with origin='risk'
                const [insertedAction] = await tx.insert(actions).values({
                  ...actionPlanData,
                  origin: 'risk',
                  title: actionPlanData.name,
                  createdAt: new Date(),
                  deletedAt: null,
                }).returning();

                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  // Convert to ActionPlan format for backward compatibility
                  result.data = {
                    ...insertedAction,
                    name: insertedAction.title,
                  };
                }
              } catch (dbError: any) {
                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.isValid = false;
                  result.errors.push(`Error de base de datos: ${dbError.message}`);
                }
              }
            }
          });
        }
      }

      // Actualizar sesiรณn
      const successCount = validationResults.filter(r => r.isValid && !r.isDuplicate).length;
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

      await this.updateImportSession(sessionId, {
        status: 'completed',
        totalRows: validationResults.length,
        successfulRows: successCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        completedAt: new Date(),
        processingDetails: {
          validationErrors: errorCount,
          duplicatesFound: duplicateCount,
          recordsProcessed: successCount
        }
      });

      return { session, importResults: validationResults };

    } catch (error) {
      await this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        completedAt: new Date()
      });
      throw error;
    }
  }

  private async processActionPlansSheet(worksheet: ExcelJS.Worksheet): Promise<ImportResult> {
    if (!worksheet) {
      return {
        sheet: "ActionPlans",
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, field: "worksheet", message: "Worksheet 'ActionPlans' not found" }],
      };
    }

    try {
      // Campos esperados en el Excel
      const expectedFields = [
        'codigo',
        'titulo',
        'descripcion',
        'origen',
        'codigo_riesgo',
        'responsable_email',
        'fecha_vencimiento',
        'prioridad',
        'estado',
        'progreso'
      ];

      // Validar estructura del archivo
      const headerRow = worksheet.getRow(1);
      const headers = this.extractHeaders(headerRow);
      const normalizedHeaders = headers.map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1; // ExcelJS uses 1-based indexing
        return acc;
      }, {} as Record<string, number>);

      // Primera fase: Validaciรณn y preparaciรณn de datos
      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          // Extraer datos de la fila
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['titulo'])?.text?.trim(),
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            origin: row.getCell(headerMap['origen'])?.text?.trim()?.toLowerCase() || 'risk',
            riskCode: row.getCell(headerMap['codigo_riesgo'])?.text?.trim() || undefined,
            responsible: row.getCell(headerMap['responsable_email'])?.text?.trim() || undefined,
            dueDate: row.getCell(headerMap['fecha_vencimiento'])?.text?.trim() || undefined,
            priority: row.getCell(headerMap['prioridad'])?.text?.trim()?.toLowerCase(),
            status: row.getCell(headerMap['estado'])?.text?.trim()?.toLowerCase() || 'pending',
            progress: parseInt(row.getCell(headerMap['progreso'])?.text?.trim() || '0')
          };

          // Validaciones bรกsicas
          if (!rawData.code) {
            throw new Error('Cรณdigo es requerido');
          }
          if (!rawData.name) {
            throw new Error('Tรญtulo es requerido');
          }

          // Validar origen
          const validOrigins = ['risk', 'audit', 'compliance'];
          if (!validOrigins.includes(rawData.origin)) {
            throw new Error(`Origen debe ser uno de: ${validOrigins.join(', ')}`);
          }

          // Validar prioridad
          const validPriorities = ['low', 'medium', 'high', 'critical'];
          if (!rawData.priority || !validPriorities.includes(rawData.priority)) {
            throw new Error(`Prioridad debe ser uno de: ${validPriorities.join(', ')}`);
          }

          // Validar estado
          const validStatuses = ['pending', 'in_progress', 'completed', 'overdue', 'closed'];
          if (!validStatuses.includes(rawData.status)) {
            throw new Error(`Estado debe ser uno de: ${validStatuses.join(', ')}`);
          }

          // Validar progreso (manejar NaN explรญcitamente)
          const progressValue = parseInt(row.getCell(headerMap['progreso'])?.text?.trim() || '0');
          if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
            throw new Error('Progreso debe ser un nรบmero vรกlido entre 0 y 100');
          }
          rawData.progress = progressValue;

          // Para acciones de riesgo, el cรณdigo de riesgo es requerido
          if (rawData.origin === 'risk' && !rawData.riskCode) {
            throw new Error('Cรณdigo de riesgo es requerido para acciones de origen "risk"');
          }

          // Validar fecha de vencimiento si se proporciona (manejar formato Excel)
          if (rawData.dueDate) {
            let parsedDate: Date;
            const cellValue = row.getCell(headerMap['fecha_vencimiento']);
            
            if (cellValue.type === ExcelJS.ValueType.Date && cellValue.value instanceof Date) {
              // Excel date value
              parsedDate = cellValue.value;
            } else if (cellValue.type === ExcelJS.ValueType.Number && typeof cellValue.value === 'number') {
              // Excel date serial number
              parsedDate = new Date((cellValue.value - 25569) * 86400 * 1000);
            } else {
              // String date
              parsedDate = new Date(rawData.dueDate);
            }
            
            if (isNaN(parsedDate.getTime())) {
              throw new Error('Fecha de vencimiento debe tener un formato vรกlido (YYYY-MM-DD o fecha Excel)');
            }
            rawData.dueDate = parsedDate.toISOString();
          }

          validItems.push({ data: rawData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: rawData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: [error instanceof Error ? error.message : 'Error de validaciรณn'],
            isDuplicate: false
          });
        }
      }

      // Detectar duplicados por cรณdigo
      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      // Marcar duplicados
      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      // Obtener referencias para resoluciรณn de foreign keys
      const existingRisks = await this.storage.getRisks();
      const existingProcessOwners = await this.storage.getProcessOwners();
      
      const riskCodeMap = new Map(existingRisks.map(r => [r.code, r.id]));
      const ownerEmailMap = new Map(existingProcessOwners.map(o => [o.email, o.id]));

      // Segunda fase: Resoluciรณn de foreign keys y persistencia
      let created = 0;
      let updated = 0;
      let skipped = 0;
      const errors: Array<{ row: number; field: string; message: string }> = [];

      // Solo procesar items vรกlidos
      const validOnlyItems = validItems.filter(({ rowNumber }) => {
        const result = validationResults.find(r => r.rowNumber === rowNumber);
        return result?.isValid && !result?.isDuplicate;
      });

      for (const { data, rowNumber } of validOnlyItems) {
        try {
          // Resolver riesgo (para origen 'risk')
          let riskId: string | undefined;
          if (data.origin === 'risk' && data.riskCode) {
            riskId = riskCodeMap.get(data.riskCode);
            if (!riskId) {
              errors.push({
                row: rowNumber,
                field: 'codigo_riesgo',
                message: `Riesgo con cรณdigo '${data.riskCode}' no encontrado`
              });
              skipped++;
              continue;
            }
          }

          // Resolver responsable (opcional)
          let responsible: string | undefined;
          if (data.responsibleEmail) {
            responsible = ownerEmailMap.get(data.responsibleEmail);
            if (!responsible) {
              errors.push({
                row: rowNumber,
                field: 'responsable_email',
                message: `Process owner con email '${data.responsibleEmail}' no encontrado`
              });
              skipped++;
              continue;
            }
          }

          // Solo persistir si no es dry run
          if (!this.isDryRunMode) {
            // Verificar si el plan de acciรณn ya existe
            const existing = await this.storage.getActionByCode(data.code);
            
            const actionData = {
              origin: data.origin,
              riskId: riskId,
              auditFindingId: undefined, // No soportado en este import por ahora
              title: data.title, // El schema actions usa 'title' no 'name'
              description: data.description,
              responsible: responsible,
              dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
              priority: data.priority,
              status: data.status,
              progress: data.progress
            };

            if (existing) {
              // Actualizar plan de acciรณn existente
              await this.storage.updateAction(existing.id, actionData);
              updated++;
            } else {
              // Crear nuevo plan de acciรณn
              await this.storage.createAction(actionData);
              created++;
            }
          } else {
            // En modo dry run, solo contar como creado para reporte
            created++;
          }

        } catch (error) {
          errors.push({
            row: rowNumber,
            field: 'general',
            message: error instanceof Error ? error.message : 'Error al procesar plan de acciรณn'
          });
          skipped++;
        }
      }

      // Agregar errores de validaciรณn a los errores finales
      validationResults.forEach(result => {
        if (!result.isValid) {
          result.errors.forEach(errorMsg => {
            errors.push({
              row: result.rowNumber,
              field: 'validation',
              message: errorMsg
            });
          });
        }
      });

      return {
        sheet: "ActionPlans",
        created,
        updated,
        skipped,
        errors,
      };

    } catch (error) {
      return {
        sheet: "ActionPlans",
        created: 0,
        updated: 0,
        skipped: 0,
        errors: [{ 
          row: 0, 
          field: "general", 
          message: error instanceof Error ? error.message : "Error procesando planes de acciรณn" 
        }],
      };
    }
  }

  // Utilidades para procesamiento de Excel
  private extractHeaders(row: ExcelJS.Row): string[] {
    const headers: string[] = [];
    row.eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.text.trim().toLowerCase();
    });
    return headers;
  }

  private extractRowData(row: ExcelJS.Row, headers: string[]): Record<string, any> {
    const data: Record<string, any> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        data[header] = cell.value;
      }
    });
    return data;
  }

  private calculateSummary(results: ImportResult[]): ImportSummary {
    return {
      created: results.reduce((sum, r) => sum + r.created, 0),
      updated: results.reduce((sum, r) => sum + r.updated, 0),
      skipped: results.reduce((sum, r) => sum + r.skipped, 0),
      errors: results.reduce((sum, r) => sum + r.errors.length, 0),
    };
  }

  // ======================== CONTROLES ========================
  async processControlsImport(
    file: Express.Multer.File,
    userId: string,
    dryRun = false
  ): Promise<{ session: ImportSession; importResults: ImportResult<any>[] }> {
    const sessionId = await this.createImportSession({
      fileName: file.originalname || 'unknown.xlsx',
      originalFileName: file.originalname || 'unknown.xlsx',
      userId,
      isDryRun: dryRun
    });
    
    const session = await this.getImportSession(sessionId);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontrรณ una hoja de trabajo vรกlida en el archivo');
      }

      // Definir campos esperados para controles
      const expectedFields = [
        'codigo',
        'nombre', 
        'descripcion',
        'tipo',
        'frecuencia',
        'evidencia',
        'efectividad',
        'objetivo_efecto',
        'activo'
      ];

      // Validar estructura del archivo
      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values as string[];
      const normalizedHeaders = headers.slice(1).map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1; // ExcelJS uses 1-based indexing
        return acc;
      }, {} as Record<string, number>);

      // Primera fase: Validaciรณn y preparaciรณn de datos
      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          // Extraer datos de la fila
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            type: row.getCell(headerMap['tipo'])?.text?.trim(),
            frequency: row.getCell(headerMap['frecuencia'])?.text?.trim(),
            evidence: row.getCell(headerMap['evidencia'])?.text?.trim() || undefined,
            effectiveness: this.parseNumericValue(row.getCell(headerMap['efectividad'])?.text),
            effectTarget: row.getCell(headerMap['objetivo_efecto'])?.text?.trim() || 'both',
            isActive: this.parseBooleanValue(row.getCell(headerMap['activo'])?.text)
          };

          // Normalizar campos enum
          const normalizedData = {
            ...rawData,
            type: this.normalizeControlType(rawData.type),
            frequency: this.normalizeControlFrequency(rawData.frequency),
            effectTarget: this.normalizeEffectTarget(rawData.effectTarget),
          };

          // Validar con schema de Zod
          const validatedData = controlImportSchema.parse(normalizedData);

          validItems.push({ data: validatedData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: validatedData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: this.formatZodErrors(error),
            isDuplicate: false
          });
        }
      }

      // Detectar duplicados por cรณdigo
      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      // Marcar duplicados
      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      // Verificar duplicados con datos existentes
      const existingCodes = new Set(
        (await db.select({ code: controls.code }).from(controls))
          .map(r => r.code)
      );

      validItems.forEach(({ data, rowNumber }) => {
        if (existingCodes.has(data.code)) {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          if (result) {
            result.isDuplicate = true;
            result.errors.push(`Ya existe un control con cรณdigo: ${data.code}`);
            result.isValid = false;
          }
        }
      });

      // Segunda fase: Persistencia en base de datos (solo si no es dry run)
      if (!dryRun) {
        const validItemsForInsert = validItems.filter(({ rowNumber }) => {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          return result && result.isValid && !result.isDuplicate;
        });

        if (validItemsForInsert.length > 0) {
          await db.transaction(async (tx) => {
            for (const { data, rowNumber } of validItemsForInsert) {
              try {
                // Generar cรณdigo automรกtico si no se proporcionรณ
                if (!data.code) {
                  data.code = await this.generateControlCode(tx);
                }

                const [insertedControl] = await tx.insert(controls).values({
                  ...data,
                  createdAt: new Date(),
                }).returning();

                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.data = insertedControl;
                }
              } catch (dbError: any) {
                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.isValid = false;
                  result.errors.push(`Error de base de datos: ${dbError.message}`);
                }
              }
            }
          });
        }
      }

      // Actualizar sesiรณn con resultados finales
      const successCount = validationResults.filter(r => r.isValid && !r.isDuplicate).length;
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

      await this.updateImportSession(sessionId, {
        status: 'completed',
        totalRows: validationResults.length,
        successfulRows: successCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        completedAt: new Date(),
        processingDetails: {
          validationErrors: errorCount,
          duplicatesFound: duplicateCount,
          recordsProcessed: successCount
        }
      });

      return { session, importResults: validationResults };

    } catch (error) {
      await this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        completedAt: new Date()
      });
      throw error;
    }
  }

  // ======================== FUNCIONES DE UTILIDAD ========================
  
  private parseNumericValue(value?: string): number | undefined {
    if (!value || value.trim() === '') return undefined;
    const num = parseFloat(value.trim());
    return isNaN(num) ? undefined : num;
  }

  private parseBooleanValue(value?: string): boolean {
    if (!value || value.trim() === '') return true;
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'sรญ' || normalized === 'si' || normalized === 'yes';
  }

  private formatZodErrors(error: any): string[] {
    if (error && error.errors && Array.isArray(error.errors)) {
      return error.errors.map((err: any) => {
        const path = err.path && err.path.length > 0 ? `${err.path.join('.')}: ` : '';
        return `${path}${err.message}`;
      });
    }
    return [error?.message || 'Error de validaciรณn desconocido'];
  }

  private normalizeControlType(type?: string): 'preventive' | 'detective' | 'corrective' {
    if (!type) return 'preventive';
    const normalized = type.toLowerCase().trim();
    
    if (normalized.includes('preventiv') || normalized.includes('prev')) return 'preventive';
    if (normalized.includes('detectiv') || normalized.includes('detect')) return 'detective';
    if (normalized.includes('correctiv') || normalized.includes('correct')) return 'corrective';
    
    return 'preventive'; // Default
  }

  private normalizeControlFrequency(frequency?: string): 'continuous' | 'daily' | 'weekly' | 'monthly' {
    if (!frequency) return 'monthly';
    const normalized = frequency.toLowerCase().trim();
    
    if (normalized.includes('continu') || normalized.includes('permanente')) return 'continuous';
    if (normalized.includes('diari') || normalized.includes('daily')) return 'daily';
    if (normalized.includes('seman') || normalized.includes('week')) return 'weekly';
    if (normalized.includes('mensual') || normalized.includes('month')) return 'monthly';
    
    return 'monthly'; // Default
  }

  private normalizeEffectTarget(target?: string): 'probability' | 'impact' | 'both' {
    if (!target) return 'both';
    const normalized = target.toLowerCase().trim();
    
    if (normalized.includes('probabilidad') || normalized.includes('probability')) return 'probability';
    if (normalized.includes('impacto') || normalized.includes('impact')) return 'impact';
    if (normalized.includes('ambos') || normalized.includes('both')) return 'both';
    
    return 'both'; // Default
  }

  private async generateControlCode(tx: any): Promise<string> {
    // Obtener todos los cรณdigos de controles existentes
    const allControls = await tx.select({ code: controls.code })
      .from(controls)
      .where(sql`${controls.code} LIKE 'C-%'`);

    const existingCodes = allControls.map((c: any) => c.code);
    
    let nextNumber = 1;
    let code: string;
    do {
      code = `C-${nextNumber.toString().padStart(4, '0')}`;
      nextNumber++;
    } while (existingCodes.includes(code));

    return code;
  }

  private normalizeEntityScope(scope?: string): 'specific' | 'transversal' | 'selective' {
    if (!scope) return 'transversal';
    const normalized = scope.toLowerCase().trim();
    
    if (normalized.includes('especific') || normalized.includes('specific')) return 'specific';
    if (normalized.includes('selectiv') || normalized.includes('selective')) return 'selective';
    if (normalized.includes('transversal')) return 'transversal';
    
    return 'transversal'; // Default
  }

  private async resolveProcessReferences(data: any, tx: any): Promise<any> {
    const processData = { ...data };

    // Resolver propietario del proceso por email
    if (data.ownerCode) {
      const owner = await tx.select({ id: processOwners.id })
        .from(processOwners)
        .where(eq(processOwners.email, data.ownerCode))
        .limit(1);

      if (owner.length > 0) {
        processData.ownerId = owner[0].id;
      } else {
        throw new Error(`No se encontrรณ propietario con email: ${data.ownerCode}`);
      }
    }

    // Resolver macroproceso por cรณdigo
    if (data.macroprocesoCode) {
      const macroproceso = await tx.select({ id: macroprocesos.id })
        .from(macroprocesos)
        .where(eq(macroprocesos.code, data.macroprocesoCode))
        .limit(1);

      if (macroproceso.length > 0) {
        processData.macroprocesoId = macroproceso[0].id;
      } else {
        throw new Error(`No se encontrรณ macroproceso con cรณdigo: ${data.macroprocesoCode}`);
      }
    }

    // Resolver entidad fiscal por cรณdigo
    if (data.fiscalEntityCode) {
      const fiscalEntity = await tx.select({ id: fiscalEntities.id })
        .from(fiscalEntities)
        .where(eq(fiscalEntities.code, data.fiscalEntityCode))
        .limit(1);

      if (fiscalEntity.length > 0) {
        processData.fiscalEntityId = fiscalEntity[0].id;
      } else {
        throw new Error(`No se encontrรณ entidad fiscal con cรณdigo: ${data.fiscalEntityCode}`);
      }
    }

    // Eliminar campos temporales de cรณdigos
    delete processData.ownerCode;
    delete processData.macroprocesoCode;
    delete processData.fiscalEntityCode;

    return processData;
  }

  private async resolveSubprocesoReferences(data: any, tx: any): Promise<any> {
    const subprocesoData = { ...data };

    // Resolver propietario del subproceso por email
    if (data.ownerCode) {
      const owner = await tx.select({ id: processOwners.id })
        .from(processOwners)
        .where(eq(processOwners.email, data.ownerCode))
        .limit(1);

      if (owner.length > 0) {
        subprocesoData.ownerId = owner[0].id;
      } else {
        throw new Error(`No se encontrรณ propietario con email: ${data.ownerCode}`);
      }
    }

    // Resolver proceso por cรณdigo
    if (data.processCode) {
      const process = await tx.select({ id: processes.id })
        .from(processes)
        .where(eq(processes.code, data.processCode))
        .limit(1);

      if (process.length > 0) {
        subprocesoData.procesoId = process[0].id;
      } else {
        throw new Error(`No se encontrรณ proceso con cรณdigo: ${data.processCode}`);
      }
    }

    // Eliminar campos temporales de cรณdigos
    delete subprocesoData.ownerCode;
    delete subprocesoData.processCode;

    return subprocesoData;
  }

  private async resolveActionPlanReferences(data: any, tx: any): Promise<any> {
    const actionPlanData = { ...data };

    // Resolver riesgo por cรณdigo
    if (data.riskCode) {
      const risk = await tx.select({ id: risks.id })
        .from(risks)
        .where(eq(risks.code, data.riskCode))
        .limit(1);

      if (risk.length > 0) {
        actionPlanData.riskId = risk[0].id;
      } else {
        throw new Error(`No se encontrรณ riesgo con cรณdigo: ${data.riskCode}`);
      }
    }

    // Eliminar campos temporales
    delete actionPlanData.riskCode;

    return actionPlanData;
  }

  private normalizeActionPlanPriority(priority?: string): 'low' | 'medium' | 'high' | 'critical' {
    if (!priority) return 'medium';
    const normalized = priority.toLowerCase().trim();
    
    if (normalized.includes('bajo') || normalized.includes('low')) return 'low';
    if (normalized.includes('medio') || normalized.includes('medium')) return 'medium';
    if (normalized.includes('alto') || normalized.includes('high')) return 'high';
    if (normalized.includes('critico') || normalized.includes('critical')) return 'critical';
    
    return 'medium'; // Default
  }

  private normalizeActionPlanStatus(status?: string): 'pending' | 'in_progress' | 'completed' | 'overdue' {
    if (!status) return 'pending';
    const normalized = status.toLowerCase().trim();
    
    if (normalized.includes('pendiente') || normalized.includes('pending')) return 'pending';
    if (normalized.includes('progreso') || normalized.includes('progress')) return 'in_progress';
    if (normalized.includes('completado') || normalized.includes('completed') || normalized.includes('terminado')) return 'completed';
    if (normalized.includes('vencido') || normalized.includes('overdue')) return 'overdue';
    
    return 'pending'; // Default
  }

  // ======================== ENTIDADES FISCALES ========================
  async processFiscalEntitiesImport(
    file: Express.Multer.File,
    userId: string,
    dryRun = false
  ): Promise<{ session: ImportSession; importResults: ImportResult<any>[] }> {
    const sessionId = await this.createImportSession({
      fileName: file.originalname || 'unknown.xlsx',
      originalFileName: file.originalname || 'unknown.xlsx',
      userId,
      isDryRun: dryRun
    });
    
    const session = await this.getImportSession(sessionId);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontrรณ una hoja de trabajo vรกlida en el archivo');
      }

      const expectedFields = [
        'codigo',
        'nombre',
        'tipo',
        'ruc',
        'descripcion',
        'activo'
      ];

      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values as string[];
      const normalizedHeaders = headers.slice(1).map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1;
        return acc;
      }, {} as Record<string, number>);

      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            type: row.getCell(headerMap['tipo'])?.text?.trim()?.toLowerCase(),
            taxId: row.getCell(headerMap['ruc'])?.text?.trim() || undefined,
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            isActive: this.parseBooleanValue(row.getCell(headerMap['activo'])?.text)
          };

          const validatedData = fiscalEntityImportSchema.parse(rawData);

          validItems.push({ data: validatedData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: validatedData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: this.formatZodErrors(error),
            isDuplicate: false
          });
        }
      }

      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      const existingCodes = new Set(
        (await db.select({ code: fiscalEntities.code }).from(fiscalEntities))
          .map(r => r.code)
      );

      validItems.forEach(({ data, rowNumber }) => {
        if (existingCodes.has(data.code)) {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          if (result) {
            result.isDuplicate = true;
            result.errors.push(`Ya existe una entidad fiscal con cรณdigo: ${data.code}`);
            result.isValid = false;
          }
        }
      });

      if (!dryRun) {
        const validItemsForInsert = validItems.filter(({ rowNumber }) => {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          return result && result.isValid && !result.isDuplicate;
        });

        if (validItemsForInsert.length > 0) {
          await db.transaction(async (tx) => {
            for (const { data, rowNumber } of validItemsForInsert) {
              try {
                const [inserted] = await tx.insert(fiscalEntities).values({
                  ...data,
                  createdAt: new Date(),
                }).returning();

                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.data = inserted;
                }
              } catch (dbError: any) {
                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.isValid = false;
                  result.errors.push(`Error de base de datos: ${dbError.message}`);
                }
              }
            }
          });
        }
      }

      const successCount = validationResults.filter(r => r.isValid && !r.isDuplicate).length;
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

      await this.updateImportSession(sessionId, {
        status: 'completed',
        totalRows: validationResults.length,
        successfulRows: successCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        completedAt: new Date(),
        processingDetails: {
          validationErrors: errorCount,
          duplicatesFound: duplicateCount,
          recordsProcessed: successCount
        }
      });

      return { session, importResults: validationResults };

    } catch (error) {
      await this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        completedAt: new Date()
      });
      throw error;
    }
  }

  // ======================== PROPIETARIOS DE PROCESOS ========================
  async processProcessOwnersImport(
    file: Express.Multer.File,
    userId: string,
    dryRun = false
  ): Promise<{ session: ImportSession; importResults: ImportResult<any>[] }> {
    const sessionId = await this.createImportSession({
      fileName: file.originalname || 'unknown.xlsx',
      originalFileName: file.originalname || 'unknown.xlsx',
      userId,
      isDryRun: dryRun
    });
    
    const session = await this.getImportSession(sessionId);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontrรณ una hoja de trabajo vรกlida en el archivo');
      }

      const expectedFields = [
        'nombre',
        'email',
        'cargo',
        'empresa',
        'activo'
      ];

      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values as string[];
      const normalizedHeaders = headers.slice(1).map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1;
        return acc;
      }, {} as Record<string, number>);

      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          const rawData = {
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            email: row.getCell(headerMap['email'])?.text?.trim(),
            position: row.getCell(headerMap['cargo'])?.text?.trim() || undefined,
            company: row.getCell(headerMap['empresa'])?.text?.trim() || undefined,
            isActive: this.parseBooleanValue(row.getCell(headerMap['activo'])?.text)
          };

          const validatedData = processOwnerImportSchema.parse(rawData);

          validItems.push({ data: validatedData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: validatedData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: this.formatZodErrors(error),
            isDuplicate: false
          });
        }
      }

      const emailMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = emailMap.get(data.email) || [];
        existing.push(rowNumber);
        emailMap.set(data.email, existing);
      });

      emailMap.forEach((rowNumbers, email) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Email duplicado: ${email} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      const existingEmails = new Set(
        (await db.select({ email: processOwners.email }).from(processOwners))
          .map(r => r.email)
      );

      validItems.forEach(({ data, rowNumber }) => {
        if (existingEmails.has(data.email)) {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          if (result) {
            result.isDuplicate = true;
            result.errors.push(`Ya existe un propietario con email: ${data.email}`);
            result.isValid = false;
          }
        }
      });

      if (!dryRun) {
        const validItemsForInsert = validItems.filter(({ rowNumber }) => {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          return result && result.isValid && !result.isDuplicate;
        });

        if (validItemsForInsert.length > 0) {
          await db.transaction(async (tx) => {
            for (const { data, rowNumber } of validItemsForInsert) {
              try {
                const [inserted] = await tx.insert(processOwners).values({
                  ...data,
                  createdAt: new Date(),
                }).returning();

                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.data = inserted;
                }
              } catch (dbError: any) {
                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.isValid = false;
                  result.errors.push(`Error de base de datos: ${dbError.message}`);
                }
              }
            }
          });
        }
      }

      const successCount = validationResults.filter(r => r.isValid && !r.isDuplicate).length;
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

      await this.updateImportSession(sessionId, {
        status: 'completed',
        totalRows: validationResults.length,
        successfulRows: successCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        completedAt: new Date(),
        processingDetails: {
          validationErrors: errorCount,
          duplicatesFound: duplicateCount,
          recordsProcessed: successCount
        }
      });

      return { session, importResults: validationResults };

    } catch (error) {
      await this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        completedAt: new Date()
      });
      throw error;
    }
  }

  // ======================== MACROPROCESOS ========================
  async processMacroprocesoImport(
    file: Express.Multer.File,
    userId: string,
    dryRun = false
  ): Promise<{ session: ImportSession; importResults: ImportResult<any>[] }> {
    const sessionId = await this.createImportSession({
      fileName: file.originalname || 'unknown.xlsx',
      originalFileName: file.originalname || 'unknown.xlsx',
      userId,
      isDryRun: dryRun
    });
    
    const session = await this.getImportSession(sessionId);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontrรณ una hoja de trabajo vรกlida en el archivo');
      }

      const expectedFields = [
        'codigo',
        'nombre',
        'tipo',
        'orden'
      ];

      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values as string[];
      const normalizedHeaders = headers.slice(1).map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1;
        return acc;
      }, {} as Record<string, number>);

      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            type: row.getCell(headerMap['tipo'])?.text?.trim()?.toLowerCase(),
            order: this.parseNumericValue(row.getCell(headerMap['orden'])?.text)
          };

          const validatedData = macroprocesoImportSchema.parse(rawData);

          validItems.push({ data: validatedData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: validatedData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: this.formatZodErrors(error),
            isDuplicate: false
          });
        }
      }

      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      const existingCodes = new Set(
        (await db.select({ code: macroprocesos.code }).from(macroprocesos))
          .map(r => r.code)
      );

      validItems.forEach(({ data, rowNumber }) => {
        if (existingCodes.has(data.code)) {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          if (result) {
            result.isDuplicate = true;
            result.errors.push(`Ya existe un macroproceso con cรณdigo: ${data.code}`);
            result.isValid = false;
          }
        }
      });

      if (!dryRun) {
        const validItemsForInsert = validItems.filter(({ rowNumber }) => {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          return result && result.isValid && !result.isDuplicate;
        });

        if (validItemsForInsert.length > 0) {
          await db.transaction(async (tx) => {
            for (const { data, rowNumber } of validItemsForInsert) {
              try {
                const [inserted] = await tx.insert(macroprocesos).values({
                  ...data,
                  createdAt: new Date(),
                }).returning();

                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.data = inserted;
                }
              } catch (dbError: any) {
                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.isValid = false;
                  result.errors.push(`Error de base de datos: ${dbError.message}`);
                }
              }
            }
          });
        }
      }

      const successCount = validationResults.filter(r => r.isValid && !r.isDuplicate).length;
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

      await this.updateImportSession(sessionId, {
        status: 'completed',
        totalRows: validationResults.length,
        successfulRows: successCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        completedAt: new Date(),
        processingDetails: {
          validationErrors: errorCount,
          duplicatesFound: duplicateCount,
          recordsProcessed: successCount
        }
      });

      return { session, importResults: validationResults };

    } catch (error) {
      await this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        completedAt: new Date()
      });
      throw error;
    }
  }

  // ======================== RIESGOS ========================
  async processRisksImport(
    file: Express.Multer.File,
    userId: string,
    dryRun = false
  ): Promise<{ session: ImportSession; importResults: ImportResult<any>[] }> {
    const sessionId = await this.createImportSession({
      fileName: file.originalname || 'unknown.xlsx',
      originalFileName: file.originalname || 'unknown.xlsx',
      userId,
      isDryRun: dryRun
    });
    
    const session = await this.getImportSession(sessionId);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(file.buffer);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('No se encontrรณ una hoja de trabajo vรกlida en el archivo');
      }

      const expectedFields = [
        'codigo',
        'nombre',
        'descripcion',
        'categoria',
        'impacto',
        'estado'
      ];

      const headerRow = worksheet.getRow(1);
      const headers = headerRow.values as string[];
      const normalizedHeaders = headers.slice(1).map(h => 
        h?.toString().toLowerCase().trim().replace(/\s+/g, '_') || ''
      );

      const missingFields = expectedFields.filter(field => 
        !normalizedHeaders.includes(field)
      );

      if (missingFields.length > 0) {
        throw new Error(`Faltan las siguientes columnas requeridas: ${missingFields.join(', ')}`);
      }

      const headerMap = normalizedHeaders.reduce((acc, header, index) => {
        acc[header] = index + 1;
        return acc;
      }, {} as Record<string, number>);

      const validationResults: ImportResult<any>[] = [];
      const validItems: Array<{ data: any; rowNumber: number }> = [];

      for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
        const row = worksheet.getRow(rowIndex);
        
        if (!row.hasValues) continue;

        try {
          const rawData = {
            code: row.getCell(headerMap['codigo'])?.text?.trim(),
            name: row.getCell(headerMap['nombre'])?.text?.trim(),
            description: row.getCell(headerMap['descripcion'])?.text?.trim() || undefined,
            category: row.getCell(headerMap['categoria'])?.text?.trim() || undefined,
            impact: this.parseNumericValue(row.getCell(headerMap['impacto'])?.text) || 3,
            status: row.getCell(headerMap['estado'])?.text?.trim()?.toLowerCase() || 'active'
          };

          const validatedData = riskImportSchema.parse(rawData);

          validItems.push({ data: validatedData, rowNumber: rowIndex });
          validationResults.push({
            rowNumber: rowIndex,
            data: validatedData,
            isValid: true,
            errors: [],
            isDuplicate: false
          });

        } catch (error) {
          validationResults.push({
            rowNumber: rowIndex,
            data: null,
            isValid: false,
            errors: this.formatZodErrors(error),
            isDuplicate: false
          });
        }
      }

      const codeMap = new Map<string, number[]>();
      validItems.forEach(({ data, rowNumber }) => {
        const existing = codeMap.get(data.code) || [];
        existing.push(rowNumber);
        codeMap.set(data.code, existing);
      });

      codeMap.forEach((rowNumbers, code) => {
        if (rowNumbers.length > 1) {
          rowNumbers.forEach(rowNumber => {
            const result = validationResults.find(r => r.rowNumber === rowNumber);
            if (result) {
              result.isDuplicate = true;
              result.errors.push(`Cรณdigo duplicado: ${code} encontrado en filas ${rowNumbers.join(', ')}`);
              result.isValid = false;
            }
          });
        }
      });

      const existingCodes = new Set(
        (await db.select({ code: risks.code }).from(risks))
          .map(r => r.code)
      );

      validItems.forEach(({ data, rowNumber }) => {
        if (existingCodes.has(data.code)) {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          if (result) {
            result.isDuplicate = true;
            result.errors.push(`Ya existe un riesgo con cรณdigo: ${data.code}`);
            result.isValid = false;
          }
        }
      });

      if (!dryRun) {
        const validItemsForInsert = validItems.filter(({ rowNumber }) => {
          const result = validationResults.find(r => r.rowNumber === rowNumber);
          return result && result.isValid && !result.isDuplicate;
        });

        if (validItemsForInsert.length > 0) {
          await db.transaction(async (tx) => {
            for (const { data, rowNumber } of validItemsForInsert) {
              try {
                const [inserted] = await tx.insert(risks).values({
                  ...data,
                  createdAt: new Date(),
                }).returning();

                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.data = inserted;
                }
              } catch (dbError: any) {
                const result = validationResults.find(r => r.rowNumber === rowNumber);
                if (result) {
                  result.isValid = false;
                  result.errors.push(`Error de base de datos: ${dbError.message}`);
                }
              }
            }
          });
        }
      }

      const successCount = validationResults.filter(r => r.isValid && !r.isDuplicate).length;
      const errorCount = validationResults.filter(r => !r.isValid).length;
      const duplicateCount = validationResults.filter(r => r.isDuplicate).length;

      await this.updateImportSession(sessionId, {
        status: 'completed',
        totalRows: validationResults.length,
        successfulRows: successCount,
        errorRows: errorCount,
        duplicateRows: duplicateCount,
        completedAt: new Date(),
        processingDetails: {
          validationErrors: errorCount,
          duplicatesFound: duplicateCount,
          recordsProcessed: successCount
        }
      });

      return { session, importResults: validationResults };

    } catch (error) {
      await this.updateImportSession(sessionId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Error desconocido',
        completedAt: new Date()
      });
      throw error;
    }
  }

  // Generar plantilla de Excel
  async generateTemplate(): Promise<Buffer> {
    // OPTIMIZED: Lazy load ExcelJS
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();

    // Hoja de Entidades Fiscales
    const fiscalEntitiesSheet = workbook.addWorksheet("FiscalEntities");
    fiscalEntitiesSheet.addRow(["codigo", "nombre", "tipo", "ruc", "descripcion", "activo"]);
    fiscalEntitiesSheet.addRow(["ABC-01", "Empresa ABC S.A.", "matriz", "12345678-9", "Empresa matriz del grupo", "true"]);
    fiscalEntitiesSheet.getRow(1).font = { bold: true };

    // Hoja de Propietarios de Procesos
    const processOwnersSheet = workbook.addWorksheet("ProcessOwners");
    processOwnersSheet.addRow(["nombre", "email", "cargo", "empresa", "activo"]);
    processOwnersSheet.addRow(["Juan Pรฉrez", "juan.perez@empresa.com", "Gerente de Finanzas", "Empresa ABC S.A.", "true"]);
    processOwnersSheet.getRow(1).font = { bold: true };

    // Hoja de Macroprocesos
    const macroprocesoSheet = workbook.addWorksheet("Macroprocesos");
    macroprocesoSheet.addRow(["codigo", "nombre", "tipo", "orden"]);
    macroprocesoSheet.addRow(["MACRO-01", "Gestiรณn Financiera", "clave", "1"]);
    macroprocesoSheet.getRow(1).font = { bold: true };

    // Hoja de Procesos
    const processesSheet = workbook.addWorksheet("Processes");
    processesSheet.addRow(["codigo", "nombre", "descripcion", "propietario_email", "codigo_macroproceso", "codigo_entidad_fiscal", "alcance_entidad"]);
    processesSheet.addRow(["PROC-01", "Contabilidad General", "Proceso de contabilidad general", "juan.perez@empresa.com", "MACRO-01", "ABC-01", "transversal"]);
    processesSheet.getRow(1).font = { bold: true };

    // Hoja de Subprocesos
    const subprocesosSheet = workbook.addWorksheet("Subprocesos");
    subprocesosSheet.addRow(["codigo", "nombre", "descripcion", "propietario_email", "codigo_proceso"]);
    subprocesosSheet.addRow(["SUB-01", "Conciliaciรณn Bancaria", "Subproceso de conciliaciรณn bancaria", "juan.perez@empresa.com", "PROC-01"]);
    subprocesosSheet.getRow(1).font = { bold: true };

    // Hoja de Riesgos
    const risksSheet = workbook.addWorksheet("Risks");
    risksSheet.addRow(["codigo", "nombre", "descripcion", "categoria", "impacto", "estado"]);
    risksSheet.addRow(["RISK-01", "Riesgo de fraude contable", "Riesgo relacionado con fraude en procesos contables", "financiero,operativo", "4", "active"]);
    risksSheet.getRow(1).font = { bold: true };

    // Hoja de Controles
    const controlsSheet = workbook.addWorksheet("Controls");
    controlsSheet.addRow(["codigo", "nombre", "descripcion", "tipo", "frecuencia", "evidencia", "efectividad", "objetivo_efecto", "activo"]);
    controlsSheet.addRow(["CTRL-01", "Revisiรณn de conciliaciones", "Control de revisiรณn mensual de conciliaciones bancarias", "detective", "monthly", "Reporte de conciliaciรณn firmado", "80", "both", "true"]);
    controlsSheet.getRow(1).font = { bold: true };

    // Hoja de Planes de Acciรณn
    const actionPlansSheet = workbook.addWorksheet("ActionPlans");
    actionPlansSheet.addRow(["codigo", "titulo", "descripcion", "origen", "codigo_riesgo", "responsable_email", "fecha_vencimiento", "prioridad", "estado", "progreso"]);
    actionPlansSheet.addRow(["AP-01", "Implementar control de segregaciรณn", "Implementar control de segregaciรณn de funciones en el proceso contable", "risk", "RISK-01", "juan.perez@empresa.com", "2025-12-31", "high", "pending", "0"]);
    actionPlansSheet.getRow(1).font = { bold: true };

    return await workbook.xlsx.writeBuffer() as Buffer;
  }
}

export const importService = new ImportService();