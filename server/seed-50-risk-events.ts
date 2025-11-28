import { db } from './db';
import { riskEvents, risks } from '@shared/schema';
import { randomUUID } from 'crypto';

const EVENT_TYPES = ['fraud', 'operational_failure', 'compliance_breach', 'security_incident', 'data_loss', 'service_interruption', 'financial_loss'];
const SEVERITY_LEVELS = ['low', 'medium', 'high', 'critical'];
const STATUSES = ['reported', 'under_investigation', 'resolved', 'closed'];

const EVENT_DESCRIPTIONS = [
  'Acceso no autorizado a datos sensibles', 'Transferencia fraudulenta de fondos', 'Falla del sistema de backup',
  'Error humano en procesamiento de nómina', 'Incumplimiento de política de segregación', 'Ataque de phishing exitoso',
  'Pérdida de equipamiento de oficina', 'Documento confidencial mal compartido', 'Falla en reconciliación bancaria',
  'Error en cálculo de impuestos', 'Acceso revocado no ejecutado a tiempo', 'Contraseña compartida entre usuarios',
  'Cambio no autorizado en base de datos', 'Transacción duplicada procesada', 'Provedor con factura fraudulenta',
  'Empleado accedió a datos de otro departamento', 'Sistema abajo por 2 horas', 'Corrupción de archivo importante',
  'Envío a cliente incorrecto', 'Descuento no autorizado aplicado', 'Cliente con acceso a datos de otro cliente',
  'Reversión de pago ya confirmado', 'Reporte generado con datos errados', 'Certificado SSL expirado sin renovar',
  'Empleado bajó datos antes de salida', 'Factura duplicada a cliente', 'Autorización de compra excedida',
  'Control de inventario fuera de sinc', 'Compensación pagada dos veces', 'Tercero accedió sin VPN',
  'Actualización de sistema causó downtime', 'Cliente reclama cargos no realizados', 'Configuración de permisos incorrecta',
  'Auditoria encontró discrepancia', 'Cambio de password no registrado', 'Conexión de red comprometida',
  'Intentos fallidos de login excesivos', 'Archivo de backup con fallos de integridad', 'Empleado accedió después del despido',
  'Transacción rechazada sin motivo claro', 'Reporte de auditoría incompleto', 'Validación de entrada omitida',
  'Conexión desde IP sospechosa', 'Límite de presupuesto excedido', 'Documento modificado sin auditoría'
];

async function generate50RiskEvents() {
  console.log('📋 Generando 50 eventos de riesgo...');
  
  try {
    const risksList = await db.query.risks.findMany({ limit: 50 });
    
    if (risksList.length === 0) {
      console.log('⚠️ No hay riesgos creados. Ejecuta el seed de riesgos primero.');
      return;
    }
    
    const eventData = [];
    
    for (let i = 1; i <= 50; i++) {
      const risk = risksList[i % risksList.length];
      const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      const severity = SEVERITY_LEVELS[Math.floor(Math.random() * SEVERITY_LEVELS.length)];
      const status = STATUSES[Math.floor(Math.random() * STATUSES.length)];
      const description = EVENT_DESCRIPTIONS[i % EVENT_DESCRIPTIONS.length];
      
      const estimatedLoss = Math.floor(Math.random() * 500000) + 10000;
      const actualLoss = status === 'closed' || status === 'resolved' 
        ? Math.floor(estimatedLoss * (Math.random() * 0.9 + 0.1))
        : null;
      
      eventData.push({
        id: randomUUID(),
        code: `EVT-${String(i).padStart(4, '0')}`,
        riskId: risk.id,
        eventType,
        severity,
        status,
        description,
        eventDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000),
        reportedBy: 'user-1',
        investigatedBy: ['reported', 'under_investigation', 'resolved', 'closed'].includes(status) ? 'user-1' : null,
        investigatedAt: ['under_investigation', 'resolved', 'closed'].includes(status) 
          ? new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)
          : null,
        resolutionNotes: ['resolved', 'closed'].includes(status)
          ? `Evento resuelto - Acciones correctivas implementadas: ${description}`
          : null,
        estimatedLoss,
        actualLoss,
        involvedPersons: Math.floor(Math.random() * 5) + 1,
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    console.log(`📝 Insertando ${eventData.length} eventos de riesgo...`);
    await db.insert(riskEvents).values(eventData);
    
    // Resumen por tipo y severidad
    const byType = eventData.reduce((acc, e) => ({ ...acc, [e.eventType]: (acc[e.eventType] || 0) + 1 }), {});
    const bySeverity = eventData.reduce((acc, e) => ({ ...acc, [e.severity]: (acc[e.severity] || 0) + 1 }), {});
    const byStatus = eventData.reduce((acc, e) => ({ ...acc, [e.status]: (acc[e.status] || 0) + 1 }), {});
    
    console.log(`\n✅ 50 eventos de riesgo generados exitosamente`);
    console.log(`\n📊 Resumen por tipo:`);
    Object.entries(byType).forEach(([type, count]) => console.log(`   ${type}: ${count}`));
    console.log(`\n🔴 Resumen por severidad:`);
    Object.entries(bySeverity).forEach(([sev, count]) => console.log(`   ${sev}: ${count}`));
    console.log(`\n📌 Resumen por estado:`);
    Object.entries(byStatus).forEach(([st, count]) => console.log(`   ${st}: ${count}`));
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generate50RiskEvents().then(() => process.exit(0));
