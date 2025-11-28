import { db } from './db';
import { controls, riskControls, risks, processes } from '@shared/schema';
import { randomUUID } from 'crypto';

const CONTROL_NAMES = [
  'Segregación de funciones en aprobaciones', 'Reconciliación diaria de caja', 'Análisis de transacciones anómalas',
  'Autorización previa de compras', 'Auditoría de acceso a sistemas', 'Encriptación de datos sensibles',
  'Backup automático de datos críticos', 'Validación de duplicados en facturación', 'Revisión de facturas por 3 ojos',
  'Limites de autorización por usuario', 'Monitoreo de login fallidos', 'Cambio de contraseñas periódicas',
  'Auditoría de cambios en producción', 'Validación de cambios de beneficiarios', 'Restricción de acceso por rol',
  'Pruebas de recuperación ante desastres', 'Capacitación en seguridad', 'Actualización de software',
  'Firewall y protección de red', 'Antimalware en endpoints', 'VPN para acceso remoto',
  'Multi-factor authentication', 'Borrado seguro de datos', 'Auditoría de modificación de registros',
  'Confirmación de cambios críticos', 'Bitácora de cambios de sistemas', 'Validación de integridad de datos',
  'Bloqueo de cuenta tras intentos fallidos', 'Verificación de identidad en transacciones', 'Segregación de ambientes',
  'Pruebas de vulnerabilidad', 'Gestión de certificados digitales', 'Política de contraseñas fuerte',
  'Revisión de permisos de archivo', 'Auditoría de exportación de datos', 'Validación de proveedores',
  'Inspección física de activos', 'Trazabilidad de transacciones', 'Reporte de excepciones',
  'Investigación de varianzas', 'Revisión de documentación soporte', 'Cierre de cuentas inactivas',
  'Sincronización de horarios del sistema', 'Pruebas de disponibilidad', 'Monitoreo de performance',
  'Alerta de umbral de inventario', 'Validación de remesadora', 'Revisión de pagos a proveedores',
  'Confirmación de recepción de bienes', 'Validación de notas de crédito', 'Control de devoluciones',
  'Auditoría de descuentos aplicados', 'Revisión de cartera vencida', 'Gestión de morosidad',
  'Verificación de saldos bancarios', 'Conciliación de cuentas', 'Auditoría de préstamos',
  'Validación de garantías', 'Seguimiento de cobranza', 'Análisis de flujo de caja',
  'Proyección financiera', 'Presupuestación anual', 'Control de gastos', 'Auditoría interna trimestral',
  'Revisión de políticas', 'Actualización de procedimientos', 'Capacitación del personal',
  'Evaluación de riesgos', 'Plan de continuidad', 'Simulacros de emergencia', 'Comunicación de incidentes',
  'Registro de problemas', 'Seguimiento de soluciones', 'Satisfacción del cliente', 'Revisión de reclamos'
];

const CONTROL_TYPES = ['preventive', 'detective', 'corrective'];
const AUTOMATION_LEVELS = ['automatic', 'manual', 'semi_automatic'];
const FREQUENCIES = ['continuous', 'daily', 'weekly', 'monthly'];
const EFFECT_TARGETS = ['probability', 'impact', 'both'];

async function generate100Controls() {
  console.log('🛡️ Generando 100 controles de muestra...');
  
  try {
    const processes = await db.query.processes.findMany({ limit: 50 });
    const risks_list = await db.query.risks.findMany({ limit: 50 });
    
    if (processes.length === 0 || risks_list.length === 0) {
      console.log('⚠️ Se requieren procesos y riesgos. Ejecuta los seeds anteriores.');
      return;
    }
    
    const controlData = [];
    
    for (let i = 1; i <= 100; i++) {
      const controlName = CONTROL_NAMES[i % CONTROL_NAMES.length];
      const code = `CTRL-${String(i).padStart(4, '0')}`;
      const effectiveness = Math.floor(Math.random() * 40) + 60; // 60-100%
      
      controlData.push({
        id: randomUUID(),
        code,
        name: `${controlName} #${i}`,
        description: `Control preventivo/detectivo para gestión de ${controlName.toLowerCase()}`,
        type: CONTROL_TYPES[Math.floor(Math.random() * CONTROL_TYPES.length)],
        automationLevel: AUTOMATION_LEVELS[Math.floor(Math.random() * AUTOMATION_LEVELS.length)],
        frequency: FREQUENCIES[Math.floor(Math.random() * FREQUENCIES.length)],
        evidence: `Documentación y registros de auditoría disponibles en el sistema`,
        effectiveness,
        effectTarget: EFFECT_TARGETS[Math.floor(Math.random() * EFFECT_TARGETS.length)],
        isActive: true,
        lastReview: new Date(),
        evaluationCompletedAt: Math.random() > 0.3 ? new Date() : null,
        evaluatedBy: Math.random() > 0.3 ? 'user-1' : null,
        revalidationFrequencyMonths: 24,
        nextRevalidationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        revalidationStatus: 'vigente',
        validationStatus: 'pending_validation',
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`📝 Insertando ${controlData.length} controles...`);
    await db.insert(controls).values(controlData);
    
    // Crear enlaces control-riesgo para primeros 80 controles
    const linkData = [];
    for (let i = 0; i < Math.min(80, controlData.length); i++) {
      const risk = risks_list[i % risks_list.length];
      
      linkData.push({
        id: randomUUID(),
        controlId: controlData[i].id,
        riskId: risk.id,
        mitigatedDimension: EFFECT_TARGETS[Math.floor(Math.random() * EFFECT_TARGETS.length)],
        effectiveness: Math.floor(Math.random() * 40) + 60,
        residualRisk: Math.floor(Math.random() * 3) + 1,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    if (linkData.length > 0) {
      console.log(`🔗 Enlazando ${linkData.length} controles a riesgos...`);
      await db.insert(riskControls).values(linkData);
    }
    
    console.log(`\n✅ 100 controles generados exitosamente`);
    console.log(`   - ${controlData.length} controles creados`);
    console.log(`   - ${linkData.length} enlaces control-riesgo creados`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generate100Controls().then(() => process.exit(0));
