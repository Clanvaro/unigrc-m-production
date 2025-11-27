import { db } from './db';
import { 
  tenants,
  users, 
  processOwners, 
  macroprocesos, 
  processes, 
  subprocesos,
  riskCategories,
  risks,
  controls,
  riskControls,
  controlEvaluations,
  controlEvaluationCriteria,
  controlEvaluationOptions
} from '@shared/schema';
import { sql } from 'drizzle-orm';

/**
 * Seed data para RiskMatrix Pro
 * Incluye datos mínimos para probar todas las funcionalidades del sistema
 */

export async function seedDatabase() {
  console.log('🌱 Starting database seed...');

  try {
    // 0. Crear tenant
    console.log('🏢 Creating default tenant...');
    const defaultTenant = {
      id: 'tenant-1',
      name: 'Demo Organization',
      slug: 'demo-org',
      description: 'Organización de demostración',
      plan: 'professional'
    };
    await db.insert(tenants).values(defaultTenant).onConflictDoNothing();

    // 1. Crear usuarios base
    console.log('📝 Creating base users...');
    const baseUsers = [
      {
        id: 'user-1',
        username: 'admin',
        email: 'admin@riskmatrix.com',
        fullName: 'Administrador del Sistema',
        cargo: 'Gerente de Riesgos',
        isActive: true
      },
      {
        id: 'user-2',
        username: 'auditor1',
        email: 'auditor@riskmatrix.com',
        fullName: 'María Auditoría',
        cargo: 'Auditor Senior',
        isActive: true
      },
      {
        id: 'user-3',
        username: 'owner1',
        email: 'owner@riskmatrix.com',
        fullName: 'Carlos Proceso',
        cargo: 'Jefe de Operaciones',
        isActive: true
      }
    ];

    for (const user of baseUsers) {
      await db.insert(users).values(user).onConflictDoNothing();
    }

    // 2. Crear process owners
    console.log('👥 Creating process owners...');
    const owners = [
      {
        id: 'owner-1',
        tenantId: 'tenant-1',
        name: 'Administrador del Sistema',
        email: 'admin@riskmatrix.com',
        isActive: true
      },
      {
        id: 'owner-2',
        tenantId: 'tenant-1',
        name: 'Carlos Proceso',
        email: 'owner@riskmatrix.com',
        isActive: true
      }
    ];

    for (const owner of owners) {
      await db.insert(processOwners).values(owner).onConflictDoNothing();
    }

    // 3. Crear macroprocesos
    console.log('📊 Creating macroprocesos...');
    const macros = [
      {
        id: 'macro-1',
        tenantId: 'tenant-1',
        code: 'MP-001',
        name: 'Gestión Comercial',
        description: 'Procesos relacionados con ventas y atención al cliente',
        type: 'clave',
        order: 1,
        ownerId: 'owner-1',
        createdBy: 'user-1'
      },
      {
        id: 'macro-2',
        tenantId: 'tenant-1',
        code: 'MP-002',
        name: 'Gestión Financiera',
        description: 'Procesos de administración financiera y contable',
        type: 'clave',
        order: 2,
        ownerId: 'owner-2',
        createdBy: 'user-1'
      }
    ];

    for (const macro of macros) {
      await db.insert(macroprocesos).values(macro).onConflictDoNothing();
    }

    // 4. Crear procesos
    console.log('🔄 Creating processes...');
    const procs = [
      {
        id: 'process-1',
        tenantId: TENANT_ID,
        code: 'P-001',
        name: 'Ventas',
        description: 'Proceso de ventas y facturación',
        macroprocesoId: 'macro-1',
        ownerId: 'owner-1',
        createdBy: 'user-1'
      },
      {
        id: 'process-2',
        tenantId: TENANT_ID,
        code: 'P-002',
        name: 'Cobranza',
        description: 'Proceso de cobro y gestión de cartera',
        macroprocesoId: 'macro-1',
        ownerId: 'owner-2',
        createdBy: 'user-1'
      },
      {
        id: 'process-3',
        tenantId: TENANT_ID,
        code: 'P-003',
        name: 'Tesorería',
        description: 'Gestión de flujo de caja y pagos',
        macroprocesoId: 'macro-2',
        ownerId: 'owner-2',
        createdBy: 'user-1'
      }
    ];

    for (const proc of procs) {
      await db.insert(processes).values(proc).onConflictDoNothing();
    }

    // 5. Crear subprocesos
    console.log('📋 Creating subprocesos...');
    const subs = [
      {
        id: 'sub-1',
        tenantId: TENANT_ID,
        code: 'SP-001',
        name: 'Facturación',
        description: 'Emisión y registro de facturas',
        procesoId: 'process-1',
        ownerId: 'owner-1',
        createdBy: 'user-1'
      },
      {
        id: 'sub-2',
        tenantId: TENANT_ID,
        code: 'SP-002',
        name: 'Seguimiento de Cobranza',
        description: 'Monitoreo de cuentas por cobrar',
        procesoId: 'process-2',
        ownerId: 'owner-2',
        createdBy: 'user-1'
      }
    ];

    for (const sub of subs) {
      await db.insert(subprocesos).values(sub).onConflictDoNothing();
    }

    // 6. Crear categorías de riesgo
    console.log('🏷️  Creating risk categories...');
    const categories = [
      {
        id: 'cat-1',
        name: 'Operacional',
        description: 'Riesgos relacionados con operaciones del día a día',
        color: '#3b82f6',
        isActive: true
      },
      {
        id: 'cat-2',
        name: 'Cumplimiento',
        description: 'Riesgos de incumplimiento normativo',
        color: '#8b5cf6',
        isActive: true
      },
      {
        id: 'cat-3',
        name: 'Fraude',
        description: 'Riesgos de fraude y malversación',
        color: '#ef4444',
        isActive: true
      },
      {
        id: 'cat-4',
        name: 'Tecnología',
        description: 'Riesgos relacionados con sistemas y tecnología',
        color: '#10b981',
        isActive: true
      }
    ];

    for (const cat of categories) {
      await db.insert(riskCategories).values(cat).onConflictDoNothing();
    }

    // 7. Crear riesgos (distribuidos en diferentes niveles)
    console.log('⚠️  Creating risks...');
    const riskData = [
      {
        id: 'risk-1',
        code: 'R-001',
        name: 'Error en Facturación',
        description: 'Posibilidad de emitir facturas con datos incorrectos',
        category: ['Operacional'],
        subprocesoId: 'sub-1',
        processId: 'process-1',
        macroprocesoId: 'macro-1',
        frequencyOccurrence: 3,
        exposureVolume: 2,
        exposureMassivity: 2,
        exposureCriticalPath: 3,
        complexity: 2,
        changeVolatility: 2,
        vulnerabilities: 2,
        probability: 2,  // Bajo
        impact: 3,       // Medio
        inherentRisk: 6, // Bajo (2×3=6)
        status: 'active',
        createdBy: 'user-1'
      },
      {
        id: 'risk-2',
        code: 'R-002',
        name: 'Retraso en Cobranza',
        description: 'Demora en cobro de facturas vencidas',
        category: ['Operacional'],
        subprocesoId: 'sub-2',
        processId: 'process-2',
        macroprocesoId: 'macro-1',
        frequencyOccurrence: 4,
        exposureVolume: 3,
        exposureMassivity: 3,
        exposureCriticalPath: 4,
        complexity: 3,
        changeVolatility: 3,
        vulnerabilities: 3,
        probability: 3,  // Medio
        impact: 4,       // Alto
        inherentRisk: 12, // Medio (3×4=12)
        status: 'active',
        createdBy: 'user-1'
      },
      {
        id: 'risk-3',
        code: 'R-003',
        name: 'Fraude en Pagos',
        description: 'Riesgo de pagos fraudulentos o no autorizados',
        category: ['Fraude', 'Operacional'],
        processId: 'process-3',
        macroprocesoId: 'macro-2',
        frequencyOccurrence: 2,
        exposureVolume: 3,
        exposureMassivity: 3,
        exposureCriticalPath: 5,
        complexity: 4,
        changeVolatility: 3,
        vulnerabilities: 4,
        probability: 3,  // Medio
        impact: 5,       // Muy Alto
        inherentRisk: 15, // Alto (3×5=15)
        status: 'active',
        createdBy: 'user-1'
      },
      {
        id: 'risk-4',
        code: 'R-004',
        name: 'Incumplimiento Normativo',
        description: 'Violación de regulaciones financieras',
        category: ['Cumplimiento'],
        macroprocesoId: 'macro-2',
        frequencyOccurrence: 2,
        exposureVolume: 4,
        exposureMassivity: 4,
        exposureCriticalPath: 5,
        complexity: 5,
        changeVolatility: 4,
        vulnerabilities: 4,
        probability: 4,  // Alto
        impact: 5,       // Muy Alto
        inherentRisk: 20, // Extremo (4×5=20)
        status: 'active',
        createdBy: 'user-1'
      },
      {
        id: 'risk-5',
        code: 'R-005',
        name: 'Fallo de Sistema',
        description: 'Caída del sistema de facturación',
        category: ['Tecnología', 'Operacional'],
        processId: 'process-1',
        macroprocesoId: 'macro-1',
        frequencyOccurrence: 2,
        exposureVolume: 2,
        exposureMassivity: 2,
        exposureCriticalPath: 4,
        complexity: 3,
        changeVolatility: 2,
        vulnerabilities: 3,
        probability: 2,  // Bajo
        impact: 4,       // Alto
        inherentRisk: 8, // Medio-Bajo (2×4=8)
        status: 'active',
        createdBy: 'user-1'
      }
    ];

    for (const risk of riskData) {
      await db.insert(risks).values(risk).onConflictDoNothing();
    }

    // 8. Crear controles
    console.log('🛡️  Creating controls...');
    const controlData = [
      {
        id: 'ctrl-1',
        code: 'C-001',
        name: 'Revisión de Facturas',
        description: 'Revisión manual de facturas antes de envío',
        type: 'preventive',
        frequency: 'daily',
        evidence: 'Checklist de revisión firmado',
        effectiveness: 70,
        effectTarget: 'both',
        isActive: true,
        createdBy: 'user-1'
      },
      {
        id: 'ctrl-2',
        code: 'C-002',
        name: 'Alertas de Vencimiento',
        description: 'Sistema automático de alertas para facturas próximas a vencer',
        type: 'detective',
        frequency: 'daily',
        evidence: 'Log de alertas enviadas',
        effectiveness: 60,
        effectTarget: 'probability',
        isActive: true,
        createdBy: 'user-1'
      },
      {
        id: 'ctrl-3',
        code: 'C-003',
        name: 'Doble Autorización de Pagos',
        description: 'Requiere dos autorizaciones para pagos superiores a límite',
        type: 'preventive',
        frequency: 'continuous',
        evidence: 'Registro de autorizaciones en sistema',
        effectiveness: 85,
        effectTarget: 'both',
        isActive: true,
        createdBy: 'user-1'
      },
      {
        id: 'ctrl-4',
        code: 'C-004',
        name: 'Auditoría de Cumplimiento',
        description: 'Revisión trimestral de cumplimiento normativo',
        type: 'detective',
        frequency: 'quarterly',
        evidence: 'Informe de auditoría',
        effectiveness: 75,
        effectTarget: 'impact',
        isActive: true,
        createdBy: 'user-1'
      },
      {
        id: 'ctrl-5',
        code: 'C-005',
        name: 'Respaldo Automático',
        description: 'Backup automático diario del sistema',
        type: 'corrective',
        frequency: 'daily',
        evidence: 'Log de backups exitosos',
        effectiveness: 80,
        effectTarget: 'impact',
        isActive: true,
        createdBy: 'user-1'
      }
    ];

    for (const ctrl of controlData) {
      await db.insert(controls).values(ctrl).onConflictDoNothing();
    }

    // 9. Crear relaciones riesgo-control
    console.log('🔗 Creating risk-control relationships...');
    const riskControlData = [
      { id: 'rc-1', riskId: 'risk-1', controlId: 'ctrl-1' },
      { id: 'rc-2', riskId: 'risk-2', controlId: 'ctrl-2' },
      { id: 'rc-3', riskId: 'risk-3', controlId: 'ctrl-3' },
      { id: 'rc-4', riskId: 'risk-4', controlId: 'ctrl-4' },
      { id: 'rc-5', riskId: 'risk-5', controlId: 'ctrl-5' },
      // Algunos riesgos tienen múltiples controles
      { id: 'rc-6', riskId: 'risk-3', controlId: 'ctrl-4' },
      { id: 'rc-7', riskId: 'risk-1', controlId: 'ctrl-5' }
    ];

    for (const rc of riskControlData) {
      await db.insert(riskControls).values(rc).onConflictDoNothing();
    }

    // 10. Crear criterios de evaluación de controles
    console.log('📊 Creating control evaluation criteria...');
    const criteriaData = [
      {
        id: 'criteria-1',
        name: 'Diseño del Control',
        description: 'Evalúa si el control está bien diseñado',
        weight: 0.4,
        isActive: true,
        createdBy: 'user-1'
      },
      {
        id: 'criteria-2',
        name: 'Operación del Control',
        description: 'Evalúa si el control opera efectivamente',
        weight: 0.6,
        isActive: true,
        createdBy: 'user-1'
      }
    ];

    for (const criteria of criteriaData) {
      await db.insert(controlEvaluationCriteria).values(criteria).onConflictDoNothing();
    }

    // 11. Crear opciones de evaluación
    console.log('✅ Creating evaluation options...');
    const optionsData = [
      // Opciones para Diseño del Control
      { id: 'opt-1', criteriaId: 'criteria-1', label: 'Excelente', value: 100, order: 1 },
      { id: 'opt-2', criteriaId: 'criteria-1', label: 'Bueno', value: 75, order: 2 },
      { id: 'opt-3', criteriaId: 'criteria-1', label: 'Regular', value: 50, order: 3 },
      { id: 'opt-4', criteriaId: 'criteria-1', label: 'Deficiente', value: 25, order: 4 },
      // Opciones para Operación del Control
      { id: 'opt-5', criteriaId: 'criteria-2', label: 'Excelente', value: 100, order: 1 },
      { id: 'opt-6', criteriaId: 'criteria-2', label: 'Bueno', value: 75, order: 2 },
      { id: 'opt-7', criteriaId: 'criteria-2', label: 'Regular', value: 50, order: 3 },
      { id: 'opt-8', criteriaId: 'criteria-2', label: 'Deficiente', value: 25, order: 4 }
    ];

    for (const opt of optionsData) {
      await db.insert(controlEvaluationOptions).values(opt).onConflictDoNothing();
    }

    // 12. Crear evaluaciones de controles
    console.log('📝 Creating control evaluations...');
    const evaluationsData = [
      {
        id: 'eval-1',
        controlId: 'ctrl-1',
        criteriaId: 'criteria-1',
        selectedOptionId: 'opt-2',
        score: 75,
        comments: 'Control bien diseñado pero puede mejorar',
        evaluatedBy: 'user-2',
        evaluatedAt: new Date()
      },
      {
        id: 'eval-2',
        controlId: 'ctrl-1',
        criteriaId: 'criteria-2',
        selectedOptionId: 'opt-2',
        score: 75,
        comments: 'Opera correctamente en general',
        evaluatedBy: 'user-2',
        evaluatedAt: new Date()
      },
      {
        id: 'eval-3',
        controlId: 'ctrl-3',
        criteriaId: 'criteria-1',
        selectedOptionId: 'opt-1',
        score: 100,
        comments: 'Excelente diseño de control',
        evaluatedBy: 'user-2',
        evaluatedAt: new Date()
      },
      {
        id: 'eval-4',
        controlId: 'ctrl-3',
        criteriaId: 'criteria-2',
        selectedOptionId: 'opt-2',
        score: 75,
        comments: 'Buena operación, cumple su objetivo',
        evaluatedBy: 'user-2',
        evaluatedAt: new Date()
      }
    ];

    for (const evaluation of evaluationsData) {
      await db.insert(controlEvaluations).values(evaluation).onConflictDoNothing();
    }

    console.log('✅ Database seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 3 Users created');
    console.log('  - 2 Process Owners created');
    console.log('  - 2 Macroprocesos created');
    console.log('  - 3 Processes created');
    console.log('  - 2 Subprocesos created');
    console.log('  - 4 Risk Categories created');
    console.log('  - 5 Risks created (distributed: Low, Medium, High, Extreme)');
    console.log('  - 5 Controls created (preventive, detective, corrective)');
    console.log('  - 7 Risk-Control relationships created');
    console.log('  - 2 Evaluation Criteria created');
    console.log('  - 8 Evaluation Options created');
    console.log('  - 4 Control Evaluations created');
    console.log('\n🎯 Ready to test!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Allow running directly with tsx
seedDatabase()
  .then(() => {
    console.log('Seed completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  });
