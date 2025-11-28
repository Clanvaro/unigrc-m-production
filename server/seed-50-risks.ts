import { db } from './db';
import { risks, riskCategories, riskProcessLinks, processes, macroprocesos } from '@shared/schema';
import { randomUUID } from 'crypto';

const RISK_NAMES = [
  'Pérdida de datos críticos', 'Interruption de servicios', 'Fraude financiero',
  'Falla en controles internos', 'Incumplimiento regulatorio', 'Corrupción de datos',
  'Ciberataque ransomware', 'Error humano en procesos', 'Inadecuada documentación',
  'Falta de segregación de funciones', 'Acceso no autorizado', 'Desastre natural',
  'Falla de proveedores críticos', 'Conflicto de intereses', 'Reputational damage',
  'Cambio regulatorio inesperado', 'Sobrecarga del sistema', 'Pérdida de talento clave',
  'Manipulación de reportes', 'Secuestro de fondos', 'Malware en infraestructura',
  'Fallos en backup/recovery', 'Robo de información confidencial', 'Colusion entre empleados',
  'Deficiencia en auditoría', 'Presión de plazos irreal', 'Dependencia de una persona',
  'Obsolescencia tecnológica', 'Conexiones de red débiles', 'Cambios de personal sin transición',
  'Licencias de software vencidas', 'Interfaces de sistema defectuosas', 'Base de datos corrupta',
  'Pobre validación de entrada', 'Pérdida de continuidad operativa', 'Conflicto con stakeholders',
  'Inversión mal asignada', 'Métodos de pago comprometidos', 'Control físico insuficiente',
  'Comunicación deficiente', 'Resistencia al cambio', 'Capacitación insuficiente',
  'Monitoreo inadecuado', 'Falta de versioning en código', 'Deuda técnica alta',
  'Escala del negocio no soportada', 'Costos ocultos no identificados', 'Terceros no confiables'
];

const CATEGORIES = ['Operacional', 'Cumplimiento', 'Fraude', 'Tecnología'];

async function generateSampleRisks() {
  console.log('🌱 Generando 50 riesgos de muestra...');
  
  try {
    // Obtener categorías
    const cats = await db.query.riskCategories.findMany();
    const categoryMap = cats.reduce((acc, cat) => ({ ...acc, [cat.name]: cat.id }), {});
    
    // Obtener procesos y macroprocesos
    const procs = await db.query.processes.findMany();
    const macros = await db.query.macroprocesos.findMany();
    
    if (procs.length === 0 || macros.length === 0) {
      console.log('⚠️ No hay procesos o macroprocesos creados. Ejecuta el seed base primero.');
      return;
    }
    
    const riskData = [];
    
    for (let i = 1; i <= 50; i++) {
      const riskName = RISK_NAMES[i % RISK_NAMES.length];
      const code = `RSK-${String(i).padStart(4, '0')}`;
      const probability = Math.floor(Math.random() * 5) + 1;
      const impact = Math.floor(Math.random() * 5) + 1;
      
      riskData.push({
        id: randomUUID(),
        code,
        name: `${riskName} #${i}`,
        description: `Descripción del riesgo ${riskName} - Evaluación del riesgo con probabilidad ${probability} e impacto ${impact}`,
        category: [CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]],
        frequencyOccurrence: probability,
        exposureVolume: Math.floor(Math.random() * 5) + 1,
        exposureMassivity: Math.floor(Math.random() * 5) + 1,
        exposureCriticalPath: Math.floor(Math.random() * 5) + 1,
        complexity: Math.floor(Math.random() * 5) + 1,
        changeVolatility: Math.floor(Math.random() * 5) + 1,
        vulnerabilities: Math.floor(Math.random() * 5) + 1,
        probability,
        impact,
        impactDimensions: {
          infrastructure: Math.floor(Math.random() * 5) + 1,
          reputation: Math.floor(Math.random() * 5) + 1,
          economic: Math.floor(Math.random() * 5) + 1,
          compliance: Math.floor(Math.random() * 5) + 1
        },
        inherentRisk: probability * impact,
        evaluationMethod: 'factors',
        status: 'active',
        createdBy: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Insertar riesgos
    console.log(`📊 Insertando ${riskData.length} riesgos...`);
    await db.insert(risks).values(riskData);
    
    // Crear enlaces riesgo-proceso para los primeros 30 riesgos
    const linkData = [];
    for (let i = 0; i < Math.min(30, riskData.length); i++) {
      const proc = procs[i % procs.length];
      const macro = macros[i % macros.length];
      
      linkData.push({
        id: randomUUID(),
        riskId: riskData[i].id,
        processId: proc.id,
        macroprocesoId: macro.id,
        validationStatus: 'pending_validation',
        notificationSent: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    if (linkData.length > 0) {
      console.log(`🔗 Enlazando ${linkData.length} riesgos a procesos...`);
      await db.insert(riskProcessLinks).values(linkData);
    }
    
    console.log('✅ Riesgos de muestra generados exitosamente');
    console.log(`   - ${riskData.length} riesgos creados`);
    console.log(`   - ${linkData.length} enlaces riesgo-proceso creados`);
    
  } catch (error) {
    console.error('❌ Error durante la generación:', error);
    process.exit(1);
  }
}

generateSampleRisks().then(() => process.exit(0));
