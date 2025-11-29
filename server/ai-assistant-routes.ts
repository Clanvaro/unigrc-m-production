import type { Express, Request, Response } from "express";
import { openAIService } from "./openai-service";
import { z } from "zod";
import { storage } from "./storage";
import { aiCache } from "./ai-cache";
import rateLimit from "express-rate-limit";
import { resolveActiveTenant } from "./routes";
import { isAuthenticated } from "./replitAuth";

// ============ RATE LIMITING PARA OPENAI (CONTROL DE COSTOS) ============
const openAIRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // 20 requests por minuto por IP (más generoso que 10)
  message: { 
    success: false, 
    error: "Demasiadas solicitudes al asistente AI. Por favor, espera un momento antes de intentar nuevamente." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter más estricto para generación de texto (operaciones costosas)
const openAIGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 generaciones por minuto por IP
  message: { 
    success: false, 
    error: "Límite de generación de texto alcanzado. Por favor, espera antes de generar más contenido." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============ SANITIZACIÓN DE DATOS (PRIVACIDAD EMPRESARIAL) ============

/**
 * Sanitiza datos sensibles antes de enviarlos a OpenAI
 * Elimina: emails, números de identificación, datos personales sensibles
 */
function sanitizeText(text: string): string {
  if (!text) return text;
  
  let sanitized = text;
  
  // Eliminar emails
  sanitized = sanitized.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[EMAIL]');
  
  // Eliminar números de teléfono (varios formatos)
  sanitized = sanitized.replace(/(\+?[\d\s()-]{10,})/g, (match) => {
    const digits = match.replace(/\D/g, '');
    return digits.length >= 10 ? '[TELÉFONO]' : match;
  });
  
  // Eliminar RUT/DNI/ID numbers (formato: 12.345.678-9 o 12345678-9)
  sanitized = sanitized.replace(/\b\d{1,2}\.?\d{3}\.?\d{3}[-]?[\dkK]\b/gi, '[ID]');
  
  // Eliminar números de tarjeta de crédito (16 dígitos)
  sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[TARJETA]');
  
  return sanitized;
}

/**
 * Sanitiza objetos complejos recursivamente
 */
function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeText(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => 
        typeof item === 'string' ? sanitizeText(item) : 
        typeof item === 'object' ? sanitizeObject(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

// ============ SCHEMAS DE VALIDACIÓN ============

const riskSuggestionSchema = z.object({
  riskDescription: z.string().min(1, "Risk description is required"),
  context: z.string().optional(),
  riskCategory: z.string().optional(),
  industry: z.string().optional()
});

const testPromptSchema = z.object({
  prompt: z.string().min(1, "Prompt is required")
});

const assistantQuerySchema = z.object({
  question: z.string().min(1, "Question is required")
});

// ============ RESPUESTAS DIRECTAS (OPTIMIZACIÓN) ============

/**
 * Detecta queries simples y genera respuestas directas sin llamar a OpenAI
 * Optimización: respuestas instantáneas para conteos básicos (ahorro de costos)
 */
async function tryDirectResponse(question: string): Promise<string | null> {
  const questionLower = question.toLowerCase().trim();
  
  // Patrones para queries de conteo simple
  const countPatterns = [
    { pattern: /cu[aá]ntos?\s+riesgos?/i, type: 'risks', name: 'riesgos' },
    { pattern: /cu[aá]ntos?\s+controles?/i, type: 'controls', name: 'controles' },
    { pattern: /cu[aá]ntas?\s+auditor[ií]as?/i, type: 'audits', name: 'auditorías' },
    { pattern: /cu[aá]ntos?\s+documentos?/i, type: 'documents', name: 'documentos' },
    { pattern: /cu[aá]ntos?\s+eventos?/i, type: 'events', name: 'eventos de riesgo' },
    { pattern: /cu[aá]ntos?\s+planes?\s+de\s+acci[oó]n/i, type: 'actions', name: 'planes de acción' },
    { pattern: /cu[aá]ntos?\s+procesos?/i, type: 'processes', name: 'procesos' },
    { pattern: /total\s+de\s+riesgos?/i, type: 'risks', name: 'riesgos' },
    { pattern: /total\s+de\s+controles?/i, type: 'controls', name: 'controles' }
  ];

  for (const { pattern, type, name } of countPatterns) {
    if (pattern.test(questionLower)) {
      try {
        let count = 0;
        let additionalInfo = '';

        switch (type) {
          case 'risks': {
            const risks = await storage.getRisks();
            const activeRisks = risks.length;
            
            // Get total including soft-deleted risks from database
            let totalRisks = activeRisks;
            let deletedCount = 0;
            
            try {
              // Try to get total count including deleted from database
              const { db } = await import('./db');
              const { risks: risksTable } = await import('../shared/schema');
              const { sql } = await import('drizzle-orm');
              
              const totalResult = await db.execute(sql`SELECT COUNT(*) as total FROM risks`);
              const totalFromDb = totalResult.rows[0]?.total;
              
              if (totalFromDb && typeof totalFromDb === 'number') {
                totalRisks = totalFromDb;
                deletedCount = totalRisks - activeRisks;
              } else if (totalFromDb && typeof totalFromDb === 'string') {
                totalRisks = parseInt(totalFromDb, 10);
                deletedCount = totalRisks - activeRisks;
              }
            } catch (error) {
              console.log('Could not fetch deleted risks count, using active count only');
            }
            
            count = totalRisks;
            const critical = risks.filter((r: any) => r.inherentRisk && r.inherentRisk >= 20).length;
            const high = risks.filter((r: any) => r.inherentRisk && r.inherentRisk >= 15 && r.inherentRisk < 20).length;
            
            const deletedInfo = deletedCount > 0 ? ` (${deletedCount} eliminado${deletedCount > 1 ? 's' : ''})` : '';
            additionalInfo = `\n\nDistribución por nivel:\n- Críticos: ${critical}\n- Altos: ${high}\n- Medios y Bajos: ${activeRisks - critical - high}${deletedInfo}`;
            break;
          }
          case 'controls': {
            const controls = await storage.getControls();
            count = controls.length;
            const preventivos = controls.filter((c: any) => c.type === 'preventivo').length;
            const detectivos = controls.filter((c: any) => c.type === 'detectivo').length;
            additionalInfo = `\n\nDistribución por tipo:\n- Preventivos: ${preventivos}\n- Detectivos: ${detectivos}\n- Correctivos: ${count - preventivos - detectivos}`;
            break;
          }
          case 'audits': {
            const audits = await storage.getAudits();
            count = audits.length;
            const active = audits.filter((a: any) => a.status === 'in_progress' || a.status === 'planning').length;
            additionalInfo = `\n\n- Activas: ${active}\n- Completadas o en otros estados: ${count - active}`;
            break;
          }
          case 'documents': {
            const docs = await storage.getComplianceDocuments();
            count = docs.length;
            break;
          }
          case 'events': {
            const events = await storage.getRiskEvents();
            count = events.length;
            break;
          }
          case 'actions': {
            const plans = await storage.getActionPlans();
            count = plans.length;
            const pending = plans.filter((p: any) => p.status === 'in_progress' || p.status === 'pending_review').length;
            additionalInfo = `\n\n- Pendientes: ${pending}\n- Completados: ${count - pending}`;
            break;
          }
          case 'processes': {
            const procs = await storage.getProcesses();
            const macros = await storage.getMacroprocesos();
            count = procs.length;
            additionalInfo = `\n\nAdemás hay ${macros.length} macroprocesos.`;
            break;
          }
        }

        const response = `Actualmente hay **${count}** ${name} en el sistema.${additionalInfo}`;
        console.log(`⚡ Direct response (${type}): ${count} items - no OpenAI API call (cost saved)`);
        return response;
      } catch (error) {
        console.error('Error generating direct response:', error);
        return null;
      }
    }
  }

  return null;
}

// ============ REGISTRO DE RUTAS ============

export function registerAIAssistantRoutes(app: Express) {
  
  // ============ STATUS & HEALTH CHECK ============
  
  app.get("/api/ai/status", (req: Request, res: Response) => {
    const status = openAIService.getStatus();
    res.json({
      ready: status.ready,
      deployment: status.deployment,
      provider: "OpenAI",
      model: "gpt-4o-mini"
    });
  });

  // ============ TEST ENDPOINTS ============
  
  app.post("/api/ai/test", openAIGenerationLimiter, async (req: Request, res: Response) => {
    try {
      const { prompt } = testPromptSchema.parse(req.body);
      
      console.log(`Testing OpenAI with prompt: "${prompt.substring(0, 100)}..."`);
      
      const sanitizedPrompt = sanitizeText(prompt);
      const response = await openAIService.generateText(
        sanitizedPrompt, 
        "You are a helpful assistant."
      );
      
      res.json({
        success: true,
        prompt,
        response,
        model: "gpt-4o-mini",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("OpenAI test failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/ai/test-stream", openAIGenerationLimiter, async (req: Request, res: Response) => {
    try {
      const { prompt } = testPromptSchema.parse(req.body);
      
      console.log(`Testing OpenAI STREAMING with prompt: "${prompt.substring(0, 100)}..."`);
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      try {
        const sanitizedPrompt = sanitizeText(prompt);
        for await (const chunk of openAIService.streamText(sanitizedPrompt, "You are a helpful assistant.")) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ error: streamError instanceof Error ? streamError.message : "Unknown error" })}\n\n`);
        res.end();
      }
      
    } catch (error) {
      console.error("OpenAI streaming test failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============ ASISTENTE AI GENERAL CON STREAMING ============
  
  app.post("/api/ai/assistant-stream", openAIRateLimiter, async (req: Request, res: Response) => {
    try {
      const { question } = assistantQuerySchema.parse(req.body);
      
      console.log(`AI Assistant streaming query: "${question.substring(0, 100)}..."`);
      
      // ============ OPTIMIZACIÓN 1: INTENTAR RESPUESTA DIRECTA ============
      const directResponse = await tryDirectResponse(question);
      if (directResponse) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        
        res.write(`data: ${JSON.stringify({ chunk: directResponse })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, metadata: { directResponse: true, cached: false } })}\n\n`);
        res.end();
        
        aiCache.set(question, directResponse);
        return;
      }
      
      // ============ OPTIMIZACIÓN 2: VERIFICAR CACHÉ ============
      const cachedResponse = aiCache.get(question);
      if (cachedResponse) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();
        
        res.write(`data: ${JSON.stringify({ chunk: cachedResponse })}\n\n`);
        res.write(`data: ${JSON.stringify({ done: true, metadata: { directResponse: false, cached: true } })}\n\n`);
        res.end();
        return;
      }
      
      // ============ DETECCIÓN INTELIGENTE DEL TIPO DE PREGUNTA (EXPANDIDA) ============
      const questionLower = question.toLowerCase();
      const questionType = {
        riesgos: /\b(riesgos?|risks?|amenazas?|vulnerabilidades?|vulnerabilidad|probabilidad|impacto|inherente|residual|cuantos?\s+riesgo)/i.test(questionLower),
        controles: /\b(controles?|mitigación|mitigacion|prevención|prevencion|detectiv|correctiv|cuantos?\s+control)/i.test(questionLower),
        procesos: /\b(procesos?|macroprocesos?|subprocesos?|procedimientos?|procedimiento|flujo|cadena\s+de\s+valor|cuantos?\s+proceso|cuantos?\s+macroproceso|cuantos?\s+subproceso)/i.test(questionLower),
        auditorias: /\b(auditorías?|auditoría|audits?|revisión|revision|fiscalización|fiscalizacion|pruebas?|tests?|cuantas?\s+auditor|cuantas?\s+prueba)/i.test(questionLower),
        regulaciones: /\b(regulaciones?|regulación|regulacion|normativas?|leyes?|decretos?|circulares?|cumplimiento|compliance)/i.test(questionLower),
        documentos: /\b(documentos?|políticas?|política|politica|manuales?|cuantos?\s+documento)/i.test(questionLower),
        eventos: /\b(eventos?|incidentes?|ocurrencias?|materialización|materializacion|cuantos?\s+evento|cuantos?\s+incidente)/i.test(questionLower),
        accion: /\b(acciones?|acción|accion|planes?\s+de\s+acci[oó]n|tareas?|actividades?|implementar|cuantos?\s+plan)/i.test(questionLower),
        organizacion: /\b(organización|organizacion|gerencias?|gerencia|objetivo\s+estrat[ée]gico|objetivos?\s+estrat[ée]gico|estructura|entidad\s+fiscal|entidades?\s+fiscal|cuantas?\s+gerencia)/i.test(questionLower),
        usuarios: /\b(usuarios?|user|permisos?|roles?|equipo|personas?|cuantos?\s+usuario)/i.test(questionLower),
        hallazgos: /\b(hallazgos?|findings?|observaciones?|no\s+conformidad|cuantos?\s+hallazgo)/i.test(questionLower),
        general: /\b(cómo|como|qué|que|cuál|cual|cuales|crear|agregar|modificar|eliminar|hola|ayuda|cuantos?|cuantas?|total|sistema)/i.test(questionLower)
      };
      
      // Determinar contexto necesario (carga selectiva optimizada)
      const needsContext = {
        documents: questionType.documentos || questionType.regulaciones,
        risks: questionType.riesgos,
        controls: questionType.controles || questionType.riesgos,
        processes: questionType.procesos,
        subprocesses: questionType.procesos,
        audits: questionType.auditorias,
        auditTests: questionType.auditorias,
        events: questionType.eventos || questionType.riesgos,
        actions: questionType.accion,
        organization: questionType.organizacion || questionType.procesos,
        users: questionType.usuarios,
        findings: questionType.hallazgos || questionType.auditorias
      };
      
      console.log(`📊 Question type:`, Object.keys(questionType).filter(k => questionType[k as keyof typeof questionType]));
      console.log(`📦 Loading contexts:`, Object.keys(needsContext).filter(k => needsContext[k as keyof typeof needsContext]));
      
      // ============ CARGAR DATOS SELECTIVOS (EXPANDIDO) ============
      
      let documents: any[] = [];
      let risks: any[] = [];
      let risksByLevel = { critico: 0, alto: 0, medio: 0, bajo: 0 };
      let controls: any[] = [];
      let macroprocesos: any[] = [];
      let processes: any[] = [];
      let subprocesses: any[] = [];
      let audits: any[] = [];
      let activeAudits: any[] = [];
      let auditTests: any[] = [];
      let riskEvents: any[] = [];
      let actionPlans: any[] = [];
      let pendingPlans: any[] = [];
      let gerencias: any[] = [];
      let fiscalEntities: any[] = [];
      let users: any[] = [];
      let roles: any[] = [];
      let activeUsers: any[] = [];
      let findings: any[] = [];
      let criticalFindings: any[] = [];
      
      if (needsContext.documents) {
        documents = await storage.getComplianceDocuments();
      }
      
      if (needsContext.risks) {
        risks = await storage.getRisks();
        risksByLevel = {
          critico: risks.filter((r: any) => r.inherentRisk && r.inherentRisk >= 20).length,
          alto: risks.filter((r: any) => r.inherentRisk && r.inherentRisk >= 15 && r.inherentRisk < 20).length,
          medio: risks.filter((r: any) => r.inherentRisk && r.inherentRisk >= 10 && r.inherentRisk < 15).length,
          bajo: risks.filter((r: any) => r.inherentRisk && r.inherentRisk < 10).length
        };
      }
      
      if (needsContext.controls) {
        controls = await storage.getControls();
      }
      
      if (needsContext.processes) {
        macroprocesos = await storage.getMacroprocesos();
        processes = await storage.getProcesses();
      }
      
      if (needsContext.subprocesses) {
        subprocesses = await storage.getSubprocesos();
      }
      
      if (needsContext.audits) {
        audits = await storage.getAudits();
        activeAudits = audits.filter(a => a.status === 'in_progress' || a.status === 'planning');
      }
      
      if (needsContext.auditTests && audits.length > 0) {
        // Cargar tests solo de las auditorías activas
        const testPromises = activeAudits.map(a => storage.getAuditTests(a.id));
        const testsArrays = await Promise.all(testPromises);
        auditTests = testsArrays.flat();
      }
      
      if (needsContext.events) {
        riskEvents = await storage.getRiskEvents();
      }
      
      if (needsContext.actions) {
        actionPlans = await storage.getActionPlans();
        pendingPlans = actionPlans.filter(p => p.status === 'in_progress' || p.status === 'pending_review');
      }
      
      if (needsContext.organization) {
        gerencias = await storage.getGerencias();
        fiscalEntities = await storage.getFiscalEntities();
      }
      
      if (needsContext.users) {
        users = await storage.getUsers();
        roles = await storage.getRoles();
        activeUsers = users.filter((u: any) => u.isActive);
      }
      
      if (needsContext.findings) {
        findings = await storage.getAuditFindings();
        criticalFindings = findings.filter((f: any) => f.severity === 'critical');
      }
      
      // ============ CONSTRUIR CONTEXTO OPTIMIZADO (SANITIZADO) ============
      
      let systemContext = `Eres un asistente experto en gestión de riesgos, auditorías y cumplimiento normativo de Unigrc.`;
      
      // Construir resumen ejecutivo expandido
      const summaryParts: string[] = [];
      if (documents.length > 0) summaryParts.push(`**Documentos Normativos**: ${documents.length}`);
      if (risks.length > 0) summaryParts.push(`**Riesgos**: ${risks.length} (Crítico: ${risksByLevel.critico}, Alto: ${risksByLevel.alto}, Medio: ${risksByLevel.medio}, Bajo: ${risksByLevel.bajo})`);
      if (controls.length > 0) summaryParts.push(`**Controles**: ${controls.length}`);
      if (macroprocesos.length > 0) summaryParts.push(`**Macroprocesos**: ${macroprocesos.length}, **Procesos**: ${processes.length}${subprocesses.length > 0 ? `, **Subprocesos**: ${subprocesses.length}` : ''}`);
      if (audits.length > 0) summaryParts.push(`**Auditorías**: ${activeAudits.length} activas de ${audits.length}${auditTests.length > 0 ? ` (${auditTests.length} pruebas)` : ''}`);
      if (riskEvents.length > 0) summaryParts.push(`**Eventos de Riesgo**: ${riskEvents.length}`);
      if (actionPlans.length > 0) summaryParts.push(`**Planes de Acción**: ${pendingPlans.length} pendientes de ${actionPlans.length}`);
      if (gerencias.length > 0) summaryParts.push(`**Gerencias**: ${gerencias.length}${fiscalEntities.length > 0 ? `, **Entidades Fiscales**: ${fiscalEntities.length}` : ''}`);
      if (users.length > 0) summaryParts.push(`**Usuarios**: ${activeUsers.length} activos de ${users.length}, **Roles**: ${roles.length}`);
      if (findings.length > 0) summaryParts.push(`**Hallazgos**: ${findings.length} (${criticalFindings.length} críticos)`);
      
      if (summaryParts.length > 0) {
        systemContext += `\n\n# RESUMEN EJECUTIVO\n${summaryParts.join('\n')}`;
      }
      
      // DOCUMENTOS (solo top 5, sanitizados)
      if (documents.length > 0) {
        systemContext += `\n\n# DOCUMENTOS NORMATIVOS (top 5)\n`;
        documents.slice(0, 5).forEach((doc, index) => {
          const sanitizedDoc = sanitizeObject(doc);
          systemContext += `${index + 1}. **${sanitizedDoc.name}** - ${sanitizedDoc.classification}\n`;
          systemContext += `   Código: ${sanitizedDoc.internalCode}\n`;
        });
      }
      
      // RIESGOS (solo top 5, sanitizados)
      if (risks.length > 0) {
        systemContext += `\n\n# RIESGOS PRINCIPALES (top 5)\n`;
        risks.slice(0, 5).forEach((risk, index) => {
          const sanitizedRisk = sanitizeObject(risk);
          systemContext += `${index + 1}. ${sanitizedRisk.code} - ${sanitizedRisk.name}\n`;
          systemContext += `   Nivel: ${sanitizedRisk.inherentRisk}/25\n`;
        });
      }
      
      // CONTROLES (solo estadísticas)
      if (controls.length > 0) {
        const preventivos = controls.filter((c: any) => c.type === 'preventivo').length;
        const detectivos = controls.filter((c: any) => c.type === 'detectivo').length;
        const correctivos = controls.length - preventivos - detectivos;
        systemContext += `\n\n# CONTROLES\nTotal: ${controls.length} (Preventivos: ${preventivos}, Detectivos: ${detectivos}, Correctivos: ${correctivos})\n`;
      }
      
      // AUDITORÍAS (solo top 3)
      if (audits.length > 0) {
        systemContext += `\n\n# AUDITORÍAS ACTIVAS (top 3)\n`;
        activeAudits.slice(0, 3).forEach((audit, index) => {
          const sanitizedAudit = sanitizeObject(audit);
          systemContext += `${index + 1}. ${sanitizedAudit.name} - ${sanitizedAudit.type}\n`;
        });
      }
      
      // EVENTOS (solo top 3)
      if (riskEvents.length > 0) {
        systemContext += `\n\n# EVENTOS DE RIESGO RECIENTES (top 3)\n`;
        riskEvents.slice(0, 3).forEach((event, index) => {
          const sanitizedEvent = sanitizeObject(event);
          systemContext += `${index + 1}. ${sanitizedEvent.name}\n`;
        });
      }
      
      // PLANES DE ACCIÓN (solo top 3)
      if (actionPlans.length > 0) {
        systemContext += `\n\n# PLANES DE ACCIÓN PENDIENTES (top 3)\n`;
        pendingPlans.slice(0, 3).forEach((plan, index) => {
          const sanitizedPlan = sanitizeObject(plan);
          systemContext += `${index + 1}. ${sanitizedPlan.code} - Estado: ${sanitizedPlan.status}\n`;
        });
      }
      
      // ORGANIZACIÓN (solo si se cargó)
      if (gerencias.length > 0) {
        systemContext += `\n\n# ESTRUCTURA ORGANIZACIONAL\n`;
        systemContext += `**Gerencias**: ${gerencias.length}\n`;
        gerencias.slice(0, 5).forEach((g: any, index) => {
          const sanitized = sanitizeObject(g);
          systemContext += `${index + 1}. ${sanitized.name} - ${sanitized.type || 'N/A'}\n`;
        });
        if (fiscalEntities.length > 0) {
          systemContext += `**Entidades Fiscales**: ${fiscalEntities.length}\n`;
        }
      }
      
      // USUARIOS (solo estadísticas)
      if (users.length > 0) {
        systemContext += `\n\n# USUARIOS Y ROLES\n`;
        systemContext += `Total usuarios: ${users.length} (${activeUsers.length} activos)\n`;
        systemContext += `Roles disponibles: ${roles.length}\n`;
        roles.slice(0, 5).forEach((r: any) => {
          const sanitized = sanitizeObject(r);
          systemContext += `- ${sanitized.name}: ${sanitized.description || 'N/A'}\n`;
        });
      }
      
      // HALLAZGOS (solo top 3 críticos)
      if (findings.length > 0) {
        systemContext += `\n\n# HALLAZGOS DE AUDITORÍA\n`;
        systemContext += `Total: ${findings.length} (${criticalFindings.length} críticos)\n`;
        if (criticalFindings.length > 0) {
          systemContext += `Críticos recientes (top 3):\n`;
          criticalFindings.slice(0, 3).forEach((f: any, index) => {
            const sanitized = sanitizeObject(f);
            systemContext += `${index + 1}. ${sanitized.title || sanitized.description?.substring(0, 50) || 'N/A'}\n`;
          });
        }
      }
      
      // Instrucciones finales
      systemContext += `\n\n# INSTRUCCIONES\n`;
      systemContext += `- Responde en español de manera profesional y concisa\n`;
      systemContext += `- Para preguntas sobre datos del sistema: usa SOLO la información proporcionada arriba\n`;
      systemContext += `- Para preguntas sobre cómo usar el sistema (crear, editar, gestionar): proporciona guía práctica\n`;
      systemContext += `- Si te preguntan cómo crear/agregar algo: explica los pasos y campos requeridos\n`;
      systemContext += `- NO inventes códigos, nombres o datos específicos que no estén en el contexto\n`;
      systemContext += `- Si es un saludo, preséntate como el asistente de Unigrc\n`;
      
      // ============ MANUAL DE USUARIO COMPLETO DEL SISTEMA ============
      systemContext += `\n\n# MANUAL DE USUARIO - UNIGRC\n`;
      
      systemContext += `\n## 1. GESTIÓN DE RIESGOS\n`;
      systemContext += `**Crear Riesgo:**\n`;
      systemContext += `1. Ve a "Gestión de Riesgos" → "Nuevo Riesgo"\n`;
      systemContext += `2. Datos básicos: Código único, Nombre, Descripción detallada, Categoría\n`;
      systemContext += `3. Alcance: Selecciona Macroproceso, Proceso, Subproceso\n`;
      systemContext += `4. Factores de Exposición (escala 1-5): Frecuencia, Volumen, Masividad, Criticidad, Complejidad, Volatilidad, Vulnerabilidades\n`;
      systemContext += `5. Probabilidad e Impacto (1-5): El sistema calcula automáticamente Riesgo Inherente = Probabilidad × Impacto\n`;
      systemContext += `6. Dimensiones de Impacto: Financiero, Operacional, Reputacional, Legal, Estratégico\n`;
      systemContext += `**Editar/Validar:** Usa menú contextual en cada riesgo. Estado: Borrador → Validado → Observado/Rechazado\n`;
      systemContext += `**Eliminar:** Soft delete con motivo documentado. Se puede restaurar desde papelera\n`;
      
      systemContext += `\n## 2. GESTIÓN DE CONTROLES\n`;
      systemContext += `**Crear Control:**\n`;
      systemContext += `1. Ve a "Controles" → "Nuevo Control"\n`;
      systemContext += `2. Datos: Código, Nombre, Descripción, Objetivo del control\n`;
      systemContext += `3. Tipo: Preventivo (antes del riesgo), Detectivo (durante), Correctivo (después)\n`;
      systemContext += `4. Frecuencia: Continuo, Diario, Semanal, Mensual, Trimestral, Anual, Ad-hoc\n`;
      systemContext += `5. Automatización: Manual, Semiautomático, Automático\n`;
      systemContext += `6. Asociar a riesgos: Selecciona uno o más riesgos que mitiga\n`;
      systemContext += `**Evaluar Efectividad:** Califica de 1-5 la efectividad del control. Se calcula Riesgo Residual\n`;
      systemContext += `**IA Integrada:** Usa el botón de IA para generar descripciones automáticas del control\n`;
      
      systemContext += `\n## 3. PROCESOS Y ESTRUCTURA ORGANIZACIONAL\n`;
      systemContext += `**Crear Macroproceso:**\n`;
      systemContext += `1. "Estructura Organizacional" → "Nuevo Macroproceso"\n`;
      systemContext += `2. Código, Nombre, Descripción, Tipo (Estratégico, Operativo, Soporte)\n`;
      systemContext += `3. Asigna: Responsable, Gerencia, Entidad Fiscal\n`;
      systemContext += `**Crear Proceso:** Igual que macroproceso pero asociado a un macroproceso padre\n`;
      systemContext += `**Crear Subproceso:** Se crea dentro de un proceso existente\n`;
      systemContext += `**Cadena de Valor:** Usa el mapa visual para ver relaciones entre procesos\n`;
      systemContext += `**Gerencias y Objetivos:** Gestiona estructura organizacional y objetivos estratégicos\n`;
      
      systemContext += `\n## 4. AUDITORÍAS\n`;
      systemContext += `**Wizard de Planificación (4 pasos):**\n`;
      systemContext += `Paso 1: Información básica (Nombre, Tipo, Alcance, Fechas)\n`;
      systemContext += `Paso 2: Selección de procesos y riesgos a auditar\n`;
      systemContext += `Paso 3: Plan de pruebas - Define pruebas para cada riesgo seleccionado\n`;
      systemContext += `Paso 4: Detección automática de fraude con IA (analiza patrones de riesgo)\n`;
      systemContext += `**Ejecución:** Realiza pruebas, documenta hallazgos con severidad (Crítica, Alta, Media, Baja)\n`;
      systemContext += `**Modo Vista:** Agrega ?mode=view al URL para ver auditorías aprobadas sin editar\n`;
      
      systemContext += `\n## 5. EVENTOS DE RIESGO\n`;
      systemContext += `**Registrar Evento:**\n`;
      systemContext += `1. "Eventos de Riesgo" → "Nuevo Evento"\n`;
      systemContext += `2. Nombre, Descripción, Riesgo asociado que se materializó\n`;
      systemContext += `3. Fecha de ocurrencia, Impacto real, Pérdida estimada (monto)\n`;
      systemContext += `4. Causas (array de causas raíz), Controles que fallaron\n`;
      systemContext += `5. Consecuencias del evento\n`;
      systemContext += `**Análisis Bow-Tie:**\n`;
      systemContext += `- Visualización: Causas → Controles Preventivos → Evento → Controles Detectivos → Consecuencias\n`;
      systemContext += `- Exportar diagrama como imagen PNG\n`;
      
      systemContext += `\n## 6. PLANES DE ACCIÓN\n`;
      systemContext += `**Crear Plan:**\n`;
      systemContext += `1. "Planes de Acción" → "Nuevo Plan"\n`;
      systemContext += `2. Código, Descripción, Responsable, Fecha límite\n`;
      systemContext += `3. Prioridad: Crítica, Alta, Media, Baja\n`;
      systemContext += `4. Asocia a riesgos o hallazgos de auditoría\n`;
      systemContext += `**Workflow de Estados:**\n`;
      systemContext += `Borrador → En Progreso → Pendiente Revisión → Aprobado/Rechazado\n`;
      systemContext += `**Evidencias:** Sube archivos como evidencia del avance (PDF, imágenes, Excel)\n`;
      systemContext += `**Reapertura:** Si rechazado, puedes reabrir y corregir\n`;
      systemContext += `**Tracking de Rechazo:** Sistema registra motivos y fechas de rechazo\n`;
      
      systemContext += `\n## 7. USUARIOS Y PERMISOS\n`;
      systemContext += `**Crear Usuario:**\n`;
      systemContext += `1. "Configuración" → "Usuarios" → "Nuevo"\n`;
      systemContext += `2. Nombre completo, Email (único), Contraseña segura\n`;
      systemContext += `3. Asigna uno o más roles con permisos específicos\n`;
      systemContext += `**Roles disponibles:** Administrador, Auditor, Gestor de Riesgos, Ejecutor, Supervisor, Visor\n`;
      systemContext += `**Permisos:** CRUD por módulo (riesgos, controles, auditorías, etc.)\n`;
      systemContext += `**Seguridad:** Política de contraseñas, bloqueo de cuenta, reset seguro\n`;
      
      systemContext += `\n## 8. DOCUMENTOS NORMATIVOS Y CUMPLIMIENTO\n`;
      systemContext += `**Subir Documento:**\n`;
      systemContext += `1. "Documentos" → "Nuevo Documento"\n`;
      systemContext += `2. Código interno, Nombre, Clasificación (Ley, Decreto, Circular, Política interna)\n`;
      systemContext += `3. Organismo emisor, Fecha publicación\n`;
      systemContext += `4. Alcance: Selecciona macroprocesos afectados o marca "Aplica a todos"\n`;
      systemContext += `5. Sube archivo PDF, Excel o Word\n`;
      systemContext += `**Tags:** Etiqueta documentos para búsqueda rápida\n`;
      
      systemContext += `\n## 9. CENTRO DE VALIDACIÓN\n`;
      systemContext += `**Workflow de Validación (3 estados):**\n`;
      systemContext += `- Validado: Elemento aprobado para uso\n`;
      systemContext += `- Observado: Requiere ajustes menores\n`;
      systemContext += `- Rechazado: No cumple criterios, debe rehacerse\n`;
      systemContext += `**Acciones Masivas:** Selecciona múltiples elementos y valida/observa/rechaza en bloque\n`;
      systemContext += `**Aplica a:** Riesgos, Controles, Procesos, Documentos, Hallazgos\n`;
      systemContext += `**Comentarios:** Siempre documenta el motivo de observación/rechazo\n`;
      
      systemContext += `\n## 10. SISTEMA DE DENUNCIAS (WHISTLEBLOWER)\n`;
      systemContext += `**Reportar Denuncia:**\n`;
      systemContext += `1. Portal público anónimo o desde sistema\n`;
      systemContext += `2. Tipo: Fraude, Corrupción, Acoso, Incumplimiento, Otro\n`;
      systemContext += `3. Descripción detallada, Evidencias opcionales\n`;
      systemContext += `**Gestión de Casos:**\n`;
      systemContext += `- Estados: Abierto → En Investigación → Cerrado\n`;
      systemContext += `- Asigna investigador, documenta actividades\n`;
      systemContext += `- Notificaciones automáticas a involucrados\n`;
      systemContext += `**Privacidad:** Sistema garantiza anonimato del denunciante\n`;
      
      systemContext += `\n## 11. DASHBOARD Y REPORTES\n`;
      systemContext += `**Dashboard Principal:**\n`;
      systemContext += `- Métricas clave: Total riesgos, críticos, auditorías activas\n`;
      systemContext += `- Top 5 riesgos más altos\n`;
      systemContext += `- Distribución de riesgos por nivel y proceso\n`;
      systemContext += `- Calendario de vencimientos\n`;
      systemContext += `- Timeline de actividades recientes\n`;
      systemContext += `**Matriz de Riesgos Visual:**\n`;
      systemContext += `- Mapa de calor interactivo 5x5 (Probabilidad vs Impacto)\n`;
      systemContext += `- Click en celda para ver riesgos específicos\n`;
      systemContext += `- Exportar como PNG para reportes\n`;
      systemContext += `**Mapa de Relaciones:** Visualiza conexiones entre riesgos, controles y procesos\n`;
      
      systemContext += `\n## 12. FUNCIONALIDADES AVANZADAS\n`;
      systemContext += `**Asistente IA (este chat):**\n`;
      systemContext += `- Consulta datos del sistema en tiempo real\n`;
      systemContext += `- Genera descripciones automáticas para riesgos y controles\n`;
      systemContext += `- Responde preguntas sobre uso del sistema\n`;
      systemContext += `- Analiza datos y proporciona insights\n`;
      systemContext += `**Vistas Guardadas:** Configura filtros personalizados y guárdalos para acceso rápido\n`;
      systemContext += `**Historial de Auditoría:** Todos los cambios quedan registrados con timestamp y usuario\n`;
      systemContext += `**Notificaciones:** In-app, email y push para eventos importantes\n`;
      systemContext += `**Búsqueda Global (Cmd+K):** Command Palette para navegación rápida\n`;
      systemContext += `**Exportaciones:** Exporta reportes a Excel, PDF, o imágenes PNG\n`;
      systemContext += `**Modo Oscuro:** Toggle en configuración de usuario\n`;
      systemContext += `**Responsive:** Funciona en desktop, tablet y móvil\n`;
      
      systemContext += `\n## 13. TIPS Y MEJORES PRÁCTICAS\n`;
      systemContext += `- Usa códigos consistentes para facilitar búsquedas (ej: RIS-001, CTR-001)\n`;
      systemContext += `- Documenta siempre el "por qué" en descripciones y comentarios\n`;
      systemContext += `- Revisa el Centro de Validación diariamente\n`;
      systemContext += `- Asocia controles a múltiples riesgos cuando aplique\n`;
      systemContext += `- Usa el IA para acelerar documentación\n`;
      systemContext += `- Configura notificaciones para no perder deadlines\n`;
      systemContext += `- Exporta reportes regularmente para presentaciones\n`;
      
      // ============ STREAMING RESPONSE CON AZURE OPENAI ============
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      try {
        const sanitizedQuestion = sanitizeText(question);
        let fullResponse = '';
        
        for await (const chunk of openAIService.streamText(sanitizedQuestion, systemContext)) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        
        // Cachear la respuesta completa
        if (fullResponse) {
          aiCache.set(question, fullResponse, {
            documentsCount: documents.length,
            risksCount: risks.length,
            controlsCount: controls.length
          });
        }
        
        res.write(`data: ${JSON.stringify({ 
          done: true, 
          metadata: { 
            documentsCount: documents.length,
            risksCount: risks.length,
            controlsCount: controls.length,
            provider: "OpenAI",
            model: "gpt-4o-mini",
            directResponse: false,
            cached: false
          } 
        })}\n\n`);
        res.end();
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ error: streamError instanceof Error ? streamError.message : "Unknown error" })}\n\n`);
        res.end();
      }
      
    } catch (error) {
      console.error("AI Assistant streaming query setup failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============ GENERACIÓN DE SUGERENCIAS PARA RIESGOS ============
  
  app.post("/api/ai/risk-suggestions-stream", openAIGenerationLimiter, async (req: Request, res: Response) => {
    try {
      const { riskDescription, context, riskCategory, industry } = riskSuggestionSchema.parse(req.body);
      
      let prompt = `Analiza el siguiente riesgo y proporciona sugerencias específicas y accionables:

Descripción del Riesgo: ${riskDescription}`;

      if (context) {
        prompt += `\nContexto: ${context}`;
      }
      
      if (riskCategory) {
        prompt += `\nCategoría: ${riskCategory}`;
      }
      
      if (industry) {
        prompt += `\nIndustria: ${industry}`;
      }

      prompt += `

Por favor proporciona:
1. Evaluación del Riesgo: Analiza severidad y probabilidad
2. Estrategias de Mitigación: 3-5 acciones específicas para reducir el riesgo
3. Controles de Monitoreo: Cómo rastrear y detectar este riesgo
4. Controles Preventivos: Medidas para prevenir la ocurrencia del riesgo
5. Planes de Contingencia: Qué hacer si el riesgo se materializa

Mantén las respuestas prácticas y accionables para profesionales de gestión de riesgos.`;

      console.log(`Generating risk suggestions for: "${riskDescription}"`);
      
      const systemPrompt = "Eres un experto en gestión de riesgos empresariales. Proporciona análisis profesionales y accionables.";
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      try {
        const sanitizedPrompt = sanitizeText(prompt);
        
        for await (const chunk of openAIService.streamText(sanitizedPrompt, systemPrompt)) {
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
        
        res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
        res.end();
      } catch (streamError) {
        console.error("Streaming error:", streamError);
        res.write(`data: ${JSON.stringify({ error: streamError instanceof Error ? streamError.message : "Unknown error" })}\n\n`);
        res.end();
      }
      
    } catch (error) {
      console.error("Risk suggestion streaming setup failed:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // ============ SUGERENCIAS DE PRUEBAS DE AUDITORÍA CON IA ============
  
  app.post("/api/audits/:id/ai-test-suggestions", isAuthenticated, openAIGenerationLimiter, async (req: Request, res: Response) => {
    try {
      const auditId = req.params.id;
      const { riskId, controlId } = req.body;
      
      console.log(`🤖 Generating AI test suggestions for audit ${auditId}, risk: ${riskId}, control: ${controlId}`);
      
      // Resolve active tenant for multi-tenant data isolation
      const { tenantId } = await resolveActiveTenant(req, { required: true });
      if (!tenantId) {
        return res.status(400).json({ success: false, error: "No active tenant found" });
      }
      
      // ============ CARGAR CONTEXTO COMPLETO DE LA AUDITORÍA ============
      
      // 1. Cargar la auditoría con sus datos principales
      const audit = await storage.getAudit(auditId, tenantId);
      if (!audit) {
        return res.status(404).json({ success: false, error: "Auditoría no encontrada" });
      }
      
      // 2. Cargar proceso/subproceso asociado
      let processInfo: any = null;
      let subprocessInfo: any = null;
      if (audit.subprocesoId) {
        subprocessInfo = await storage.getSubproceso(audit.subprocesoId, tenantId);
        if (subprocessInfo?.procesoId) {
          processInfo = await storage.getProcess(subprocessInfo.procesoId, tenantId);
        }
      } else if (audit.processId) {
        processInfo = await storage.getProcess(audit.processId, tenantId);
      }
      
      // 3. Cargar riesgo específico (si se proporciona)
      let riskInfo: any = null;
      if (riskId) {
        riskInfo = await storage.getRisk(riskId, tenantId);
      }
      
      // 4. Cargar control específico (si se proporciona)
      let controlInfo: any = null;
      if (controlId) {
        controlInfo = await storage.getControl(controlId, tenantId);
      }
      
      // 5. Skip strategic objectives (method not available in IStorage interface)
      const strategicObjectives: any[] = [];
      
      // 6. Cargar regulaciones aplicables al proceso (interface doesn't accept tenantId, but impl filters internally)
      let applicableRegulations: any[] = [];
      if (processInfo || subprocessInfo) {
        try {
          const allRegulations = await (storage as any).getRegulations(tenantId);
          // Filtrar regulaciones que apliquen al proceso
          applicableRegulations = allRegulations.filter((reg: any) => reg.isActive).slice(0, 5);
        } catch (error) {
          console.log("No regulations found");
        }
      }
      
      // 7. Cargar documentos asociados al proceso (interface doesn't accept tenantId, but impl filters internally)
      let relatedDocuments: any[] = [];
      try {
        const allDocs = await (storage as any).getComplianceDocuments(tenantId);
        relatedDocuments = allDocs.slice(0, 5); // Top 5 documentos
      } catch (error) {
        console.log("No documents found");
      }
      
      // ============ CONSTRUIR PROMPT PARA OPENAI ============
      
      let contextPrompt = `# CONTEXTO DE LA AUDITORÍA\n\n`;
      
      // Información de la auditoría
      contextPrompt += `## Auditoría\n`;
      contextPrompt += `**Nombre:** ${audit.name}\n`;
      contextPrompt += `**Tipo:** ${audit.type}\n`;
      if (audit.objectives) {
        contextPrompt += `**Objetivos de la Auditoría:**\n${audit.objectives}\n`;
      }
      if (audit.evaluationCriteria) {
        contextPrompt += `**Criterios de Evaluación:**\n${audit.evaluationCriteria}\n`;
      }
      contextPrompt += `**Alcance:** ${audit.scope}\n`;
      if (audit.scopeEntities && audit.scopeEntities.length > 0) {
        contextPrompt += `**Entidades en alcance:** ${audit.scopeEntities.length} entidades\n`;
      }
      contextPrompt += `\n`;
      
      // Información del proceso
      if (processInfo || subprocessInfo) {
        contextPrompt += `## Proceso Auditado\n`;
        if (subprocessInfo) {
          contextPrompt += `**Subproceso:** ${subprocessInfo.name}\n`;
          contextPrompt += `**Código:** ${subprocessInfo.code}\n`;
          if (subprocessInfo.description) {
            contextPrompt += `**Descripción:** ${subprocessInfo.description}\n`;
          }
        }
        if (processInfo) {
          contextPrompt += `**Proceso:** ${processInfo.name}\n`;
          contextPrompt += `**Código:** ${processInfo.code}\n`;
          if (processInfo.description) {
            contextPrompt += `**Descripción:** ${processInfo.description}\n`;
          }
        }
        contextPrompt += `\n`;
      }
      
      // Riesgo específico
      if (riskInfo) {
        contextPrompt += `## Riesgo a Auditar\n`;
        contextPrompt += `**Código:** ${riskInfo.code}\n`;
        contextPrompt += `**Nombre:** ${riskInfo.name}\n`;
        contextPrompt += `**Descripción:** ${riskInfo.description || 'No especificada'}\n`;
        contextPrompt += `**Categoría:** ${riskInfo.category || 'No especificada'}\n`;
        contextPrompt += `**Probabilidad:** ${riskInfo.probability}/5\n`;
        contextPrompt += `**Impacto:** ${riskInfo.impact}/5\n`;
        contextPrompt += `**Riesgo Inherente:** ${riskInfo.inherentRisk}/25\n`;
        contextPrompt += `\n`;
      }
      
      // Control específico
      if (controlInfo) {
        contextPrompt += `## Control a Evaluar\n`;
        contextPrompt += `**Código:** ${controlInfo.code}\n`;
        contextPrompt += `**Nombre:** ${controlInfo.name}\n`;
        contextPrompt += `**Descripción:** ${controlInfo.description || 'No especificada'}\n`;
        contextPrompt += `**Tipo:** ${controlInfo.type}\n`;
        contextPrompt += `**Frecuencia:** ${controlInfo.frequency}\n`;
        contextPrompt += `**Nivel de Automatización:** ${controlInfo.automationLevel}\n`;
        contextPrompt += `**Efectividad:** ${controlInfo.effectiveness}/5\n`;
        contextPrompt += `\n`;
      }
      
      // Objetivos estratégicos
      if (strategicObjectives.length > 0) {
        contextPrompt += `## Objetivos Estratégicos Relacionados\n`;
        strategicObjectives.slice(0, 3).forEach((obj: any, index: number) => {
          contextPrompt += `${index + 1}. ${obj.name}: ${obj.description || 'Sin descripción'}\n`;
        });
        contextPrompt += `\n`;
      }
      
      // Regulaciones aplicables
      if (applicableRegulations.length > 0) {
        contextPrompt += `## Regulaciones Aplicables\n`;
        applicableRegulations.forEach((reg: any, index: number) => {
          contextPrompt += `${index + 1}. ${reg.name} (${reg.sourceType})\n`;
          if (reg.description) {
            contextPrompt += `   ${reg.description}\n`;
          }
        });
        contextPrompt += `\n`;
      }
      
      // Documentos relacionados
      if (relatedDocuments.length > 0) {
        contextPrompt += `## Documentos Normativos y Procedimientos\n`;
        relatedDocuments.forEach((doc: any, index: number) => {
          contextPrompt += `${index + 1}. ${doc.name} - ${doc.classification}\n`;
        });
        contextPrompt += `\n`;
      }
      
      // Instrucciones para generar sugerencias
      contextPrompt += `# TAREA\n\n`;
      contextPrompt += `Basándote en el contexto anterior, genera EXACTAMENTE 3 sugerencias de pruebas de auditoría específicas y accionables.\n\n`;
      contextPrompt += `Para cada prueba sugerida, proporciona:\n`;
      contextPrompt += `1. **Nombre de la prueba** (título corto y descriptivo, máximo 60 caracteres)\n`;
      contextPrompt += `2. **Objetivo** (qué busca verificar esta prueba, máximo 150 caracteres)\n`;
      contextPrompt += `3. **Procedimientos de prueba** (pasos específicos a seguir, máximo 300 caracteres)\n`;
      contextPrompt += `4. **Naturaleza del testeo** (sustantivo o cumplimiento)\n`;
      contextPrompt += `5. **Tamaño de muestra recomendado** (cantidad de items a revisar, máximo 50 caracteres)\n`;
      contextPrompt += `6. **Criterios de evaluación** (qué determina si pasa o falla la prueba, máximo 150 caracteres)\n\n`;
      contextPrompt += `IMPORTANTE:\n`;
      contextPrompt += `- Genera EXACTAMENTE 3 pruebas, ni más ni menos\n`;
      contextPrompt += `- Mantén las respuestas CONCISAS y dentro de los límites de caracteres indicados\n`;
      contextPrompt += `- Las pruebas deben ser específicas al proceso, riesgo y control mencionados\n`;
      contextPrompt += `- Sé muy específico y práctico en los procedimientos\n\n`;
      contextPrompt += `Responde ÚNICAMENTE con un objeto JSON válido con este formato:\n`;
      contextPrompt += `{
  "suggestions": [
    {
      "name": "Nombre corto de la prueba",
      "objective": "Objetivo específico y conciso",
      "testProcedures": "Procedimientos detallados pero breves",
      "testingNature": "sustantivo" o "cumplimiento",
      "sampleSize": "Descripción breve del tamaño de muestra",
      "evaluationCriteria": "Criterios claros de evaluación"
    }
  ]
}`;
      
      // Sanitizar el prompt
      const sanitizedPrompt = sanitizeText(contextPrompt);
      
      const systemPrompt = `Eres un auditor experto especializado en auditoría interna y externa. Generas pruebas de auditoría específicas, prácticas y alineadas con estándares internacionales de auditoría. Respondes siempre en español y en formato JSON válido.`;
      
      console.log(`📝 Generating test suggestions with ${contextPrompt.length} chars of context`);
      
      // Generar respuesta con OpenAI (con max_tokens más alto para evitar truncado)
      const messages = [
        {
          role: 'system' as const,
          content: systemPrompt
        },
        {
          role: 'user' as const,
          content: sanitizedPrompt
        }
      ];
      
      const response = await openAIService.generateCompletion(messages, {
        temperature: 0.7,
        maxTokens: 1500
      }) as string;
      
      // Intentar parsear la respuesta como JSON con manejo robusto
      let suggestions;
      try {
        // Limpiar la respuesta (remover markdown code blocks si existen)
        let cleanedResponse = response.trim();
        if (cleanedResponse.startsWith('```json')) {
          cleanedResponse = cleanedResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        } else if (cleanedResponse.startsWith('```')) {
          cleanedResponse = cleanedResponse.replace(/```\n?/g, '');
        }
        
        // Verificar que el JSON esté completo (debe terminar con })
        if (!cleanedResponse.endsWith('}')) {
          console.warn("JSON response appears truncated, attempting to repair...");
          // Intentar reparar cerrando la estructura JSON
          cleanedResponse = cleanedResponse.trim();
          // Contar cuántos { y } hay
          const openBraces = (cleanedResponse.match(/{/g) || []).length;
          const closeBraces = (cleanedResponse.match(/}/g) || []).length;
          const openBrackets = (cleanedResponse.match(/\[/g) || []).length;
          const closeBrackets = (cleanedResponse.match(/]/g) || []).length;
          
          // Cerrar arrays y objetos faltantes
          for (let i = closeBrackets; i < openBrackets; i++) {
            cleanedResponse += ']';
          }
          for (let i = closeBraces; i < openBraces; i++) {
            cleanedResponse += '}';
          }
          
          console.log("Repaired JSON by adding missing closing brackets");
        }
        
        suggestions = JSON.parse(cleanedResponse);
        
        // Validar que tenga la estructura esperada
        if (!suggestions.suggestions || !Array.isArray(suggestions.suggestions)) {
          throw new Error("Invalid response structure: missing suggestions array");
        }
        
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", parseError);
        console.log("Raw response (first 500 chars):", response.substring(0, 500));
        return res.status(500).json({
          success: false,
          error: "Error al procesar la respuesta de la IA. Por favor, intenta nuevamente."
        });
      }
      
      console.log(`✅ Generated ${suggestions.suggestions?.length || 0} test suggestions`);
      
      res.json({
        success: true,
        data: suggestions,
        metadata: {
          auditId,
          riskId,
          controlId,
          processName: processInfo?.name || subprocessInfo?.name,
          generatedAt: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error("Error generating AI test suggestions:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido al generar sugerencias"
      });
    }
  });

  console.log("✅ AI Assistant routes registered successfully (OpenAI)");
}
