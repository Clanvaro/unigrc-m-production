import { db } from './db';
import { macroprocesos, processes, subprocesos } from '@shared/schema';
import { randomUUID } from 'crypto';

/**
 * Cadena de Valor de Porter - Estructura de Macroproceso
 * Actividades Primarias + Actividades de Apoyo
 */

async function generatePorterValueChain() {
  console.log('🏭 Generando Cadena de Valor de Porter...');
  
  try {
    const macroId = randomUUID();
    
    // Crear Macroproceso principal
    const macro = {
      id: macroId,
      code: 'MP-PORTER',
      name: 'Cadena de Valor de Porter',
      description: 'Estructura de procesos según modelo de cadena de valor de Porter con actividades primarias y de apoyo',
      type: 'clave',
      order: 99,
      ownerId: 'owner-1',
      createdBy: 'user-1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(macroprocesos).values(macro).onConflictDoNothing();
    console.log(`✅ Macroproceso creado: ${macro.name}`);
    
    // Procesos y Subprocesos según Cadena de Valor de Porter
    const processData = [
      // ACTIVIDADES PRIMARIAS
      {
        code: 'P-LOGIST-ENT',
        name: 'Logística de Entrada',
        description: 'Recepción, almacenamiento y distribución de insumos',
        subprocesos: [
          { code: 'SP-RECEPC', name: 'Recepción de Materiales', desc: 'Registro y control de entrada de insumos' },
          { code: 'SP-ALMAC', name: 'Almacenamiento', desc: 'Organización y custodia de inventario' },
          { code: 'SP-DISTRIB-INT', name: 'Distribución Interna', desc: 'Traslado de materiales a producción' }
        ]
      },
      {
        code: 'P-OPERAC',
        name: 'Operaciones/Producción',
        description: 'Transformación de insumos en productos o servicios',
        subprocesos: [
          { code: 'SP-PRODUC', name: 'Producción', desc: 'Elaboración de productos' },
          { code: 'SP-CONTROL-CALID', name: 'Control de Calidad', desc: 'Verificación de estándares de calidad' },
          { code: 'SP-EMPAQUES', name: 'Empaquetado', desc: 'Preparación de productos para distribución' }
        ]
      },
      {
        code: 'P-LOGIST-SAL',
        name: 'Logística de Salida',
        description: 'Distribución de productos terminados',
        subprocesos: [
          { code: 'SP-ALMAC-PROD', name: 'Almacenamiento de Productos', desc: 'Custodia de productos terminados' },
          { code: 'SP-SHIP', name: 'Envíos', desc: 'Despacho a clientes' },
          { code: 'SP-DISTRIB', name: 'Distribución', desc: 'Gestión de transporte y entregas' }
        ]
      },
      {
        code: 'P-MARKET',
        name: 'Marketing y Ventas',
        description: 'Estrategias comerciales y captación de clientes',
        subprocesos: [
          { code: 'SP-MARKET', name: 'Marketing', desc: 'Campañas y promociones' },
          { code: 'SP-VENTAS', name: 'Ventas', desc: 'Gestión comercial y cierre de operaciones' },
          { code: 'SP-PRICING', name: 'Fijación de Precios', desc: 'Estrategia de precios y promociones' }
        ]
      },
      {
        code: 'P-SERVICIO',
        name: 'Servicio/Postventa',
        description: 'Atención al cliente después de la venta',
        subprocesos: [
          { code: 'SP-SOPORTE', name: 'Soporte al Cliente', desc: 'Atención de consultas y reclamos' },
          { code: 'SP-MANT', name: 'Mantenimiento', desc: 'Servicio técnico y mantenimiento' },
          { code: 'SP-DEVOLUC', name: 'Devoluciones', desc: 'Gestión de devoluciones y cambios' }
        ]
      },
      // ACTIVIDADES DE APOYO
      {
        code: 'P-PROCUREMENT',
        name: 'Adquisición (Procurement)',
        description: 'Compra de materiales, equipos y servicios',
        subprocesos: [
          { code: 'SP-SELEC-PROV', name: 'Selección de Proveedores', desc: 'Búsqueda y evaluación de proveedores' },
          { code: 'SP-NEGOC', name: 'Negociación', desc: 'Acuerdos de precios y términos' },
          { code: 'SP-COMPRAS', name: 'Gestión de Compras', desc: 'Órdenes de compra y pagos' }
        ]
      },
      {
        code: 'P-TECNOLOGIA',
        name: 'Desarrollo Tecnológico',
        description: 'Innovación y mejora de procesos y productos',
        subprocesos: [
          { code: 'SP-I+D', name: 'Investigación y Desarrollo', desc: 'Innovación de productos' },
          { code: 'SP-AUTOM', name: 'Automatización', desc: 'Mejora de procesos mediante tecnología' },
          { code: 'SP-SISTEMAS', name: 'Gestión de Sistemas', desc: 'Desarrollo y mantenimiento de TI' }
        ]
      },
      {
        code: 'P-RRHH',
        name: 'Gestión de Recursos Humanos',
        description: 'Reclutamiento, capacitación y gestión del talento',
        subprocesos: [
          { code: 'SP-RECLUT', name: 'Reclutamiento', desc: 'Búsqueda y selección de personal' },
          { code: 'SP-CAPAC', name: 'Capacitación', desc: 'Programas de desarrollo y entrenamiento' },
          { code: 'SP-NÓMINA', name: 'Nómina y Beneficios', desc: 'Gestión salarial y prestaciones' }
        ]
      },
      {
        code: 'P-INFRAEST',
        name: 'Infraestructura de la Empresa',
        description: 'Servicios generales y administración corporativa',
        subprocesos: [
          { code: 'SP-FINANZAS', name: 'Finanzas y Contabilidad', desc: 'Gestión financiera y reportes' },
          { code: 'SP-LEGAL', name: 'Legal y Cumplimiento', desc: 'Asuntos legales y regulación' },
          { code: 'SP-ADMIN', name: 'Administración General', desc: 'Servicios generales y facilities' }
        ]
      }
    ];
    
    // Insertar procesos y subprocesos
    let processCount = 0;
    let subprocessCount = 0;
    
    for (const procData of processData) {
      const procId = randomUUID();
      
      const process = {
        id: procId,
        code: procData.code,
        name: procData.name,
        description: procData.description,
        macroprocesoId: macroId,
        ownerId: 'owner-1',
        createdBy: 'user-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await db.insert(processes).values(process).onConflictDoNothing();
      processCount++;
      console.log(`  ✅ Proceso: ${process.name}`);
      
      // Insertar subprocesos
      for (const subData of procData.subprocesos) {
        const sub = {
          id: randomUUID(),
          code: subData.code,
          name: subData.name,
          description: subData.desc,
          procesoId: procId,
          ownerId: 'owner-1',
          createdBy: 'user-1',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        await db.insert(subprocesos).values(sub).onConflictDoNothing();
        subprocessCount++;
        console.log(`     • ${sub.name}`);
      }
    }
    
    console.log(`\n✅ Cadena de Valor de Porter generada exitosamente`);
    console.log(`   📊 1 Macroproceso creado`);
    console.log(`   🔄 ${processCount} Procesos creados`);
    console.log(`   📋 ${subprocessCount} Subprocesos creados`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generatePorterValueChain().then(() => process.exit(0));
