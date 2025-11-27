import { Separator } from "@/components/ui/separator";
import { BookOpen, Shield, AlertTriangle, BarChart3, Sliders, CheckSquare, FileText, Search, Users, Settings, Table, Grid3x3, ClipboardCheck, Calendar, Scale, MessageSquare, UserCheck, Eye, Target, Upload, Clock, Award, FolderOpen, UserCog, FileX } from "lucide-react";

export default function Manual() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="container mx-auto max-w-5xl">
        {/* Neomorphic header */}
        <div className="mb-8 p-6 rounded-3xl bg-background shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.05)] bg-background">
              <BookOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Manual de Usuario - Unigrc</h1>
              <p className="text-foreground/70 mt-1">Guía completa para la gestión integral de riesgos empresariales</p>
            </div>
          </div>
        </div>

      <div className="grid gap-8">
        {/* Índice */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground">Tabla de Contenido</h2>
          <div>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">Módulos Principales</h4>
                <ul className="space-y-1 text-foreground/70">
                  <li>1. Introducción y Navegación</li>
                  <li>2. Dashboard Principal</li>
                  <li>3. Gestión de Procesos</li>
                  <li>4. Gestión de Riesgos</li>
                  <li>5. Gestión de Controles</li>
                  <li>6. Matriz de Riesgo</li>
                  <li>7. Validación y Aprobaciones</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Funcionalidades Avanzadas</h4>
                <ul className="space-y-1 text-foreground/70">
                  <li>8. Planes de Acción</li>
                  <li>9. Módulo de Auditoría</li>
                  <li>10. Cumplimiento Regulatorio</li>
                  <li>11. Módulos Especializados</li>
                  <li>12. Reportes y Analíticos</li>
                  <li>13. Configuración y Administración</li>
                  <li>14. Mejores Prácticas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Introducción */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            1. Introducción y Navegación
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">¿Qué es Unigrc?</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Unigrc es una plataforma integral de gestión de riesgos empresariales que permite a las organizaciones identificar, 
                evaluar, controlar y monitorear riesgos de manera sistemática y eficiente.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-3">Navegación del Sistema</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Sidebar:</strong> Navegación principal organizada por módulos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Header:</strong> Información contextual de cada página</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Filtros:</strong> Herramientas de búsqueda y filtrado por sección</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                  <span><strong>Permisos:</strong> Las funcionalidades se adaptan según su rol de usuario</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Roles del Sistema</h3>
              <div className="grid gap-3">
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">Administrador</h4>
                  <p className="text-sm text-foreground/70">Acceso completo a configuración, usuarios y todos los módulos.</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">Supervisor</h4>
                  <p className="text-sm text-foreground/70">Supervisión de procesos, aprobación de riesgos y controles.</p>
                </div>
                <div className="p-3 border rounded-lg">
                  <h4 className="font-medium">Ejecutor</h4>
                  <p className="text-sm text-foreground/70">Registro y gestión de riesgos, controles y planes de acción.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Dashboard */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            2. Dashboard Principal
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Panel de Control</h3>
              <p className="text-sm text-foreground/70 mb-4">
                El dashboard proporciona una vista consolidada del estado de riesgos de su organización.
              </p>
              
              <div className="grid gap-4">
                <div className="border-l-4 border-primary pl-4">
                  <h4 className="font-medium">Métricas Clave</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Total de Riesgos registrados</li>
                    <li>• Riesgos Críticos que requieren atención inmediata</li>
                    <li>• Controles Activos en la organización</li>
                    <li>• Acciones Pendientes por ejecutar</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">Matriz de Riesgo Interactiva</h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Visualización gráfica de probabilidad vs impacto. Haga clic en cualquier celda para ver los riesgos específicos en esa categoría.
                  </p>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium">Top 5 Riesgos</h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Lista de los riesgos más críticos basada en el cálculo de riesgo inherente y residual.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Interpretación de Indicadores</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-sm font-medium">Crítico (20-25)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded"></div>
                    <span className="text-sm font-medium">Alto (13-19)</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span className="text-sm font-medium">Medio (7-12)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-sm font-medium">Bajo (1-6)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Gestión de Procesos */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <Table className="w-5 h-5 text-primary" />
            </div>
            3. Gestión de Procesos
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Estructura Organizacional</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Los procesos se organizan jerárquicamente para reflejar la estructura de su organización.
              </p>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Macroprocesos
                  </h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Procesos de alto nivel que agrupan actividades relacionadas (Ej: Gestión Financiera, Operaciones, RRHH).
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Procesos
                  </h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Actividades específicas dentro de cada macroproceso (Ej: Facturación, Cobranzas, Presupuesto).
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Subprocesos
                  </h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Actividades detalladas dentro de cada proceso (Ej: Emisión de factura, Validación de datos).
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Cómo Gestionar Procesos</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">1</div>
                  <div>
                    <h4 className="font-medium">Crear Macroprocesos</h4>
                    <p className="text-sm text-foreground/70">Defina las áreas principales de su organización desde el botón "Nuevo" en la página de Procesos.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">2</div>
                  <div>
                    <h4 className="font-medium">Asociar Procesos</h4>
                    <p className="text-sm text-foreground/70">Vincule procesos específicos a cada macroproceso para crear la jerarquía organizacional.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">3</div>
                  <div>
                    <h4 className="font-medium">Definir Responsables</h4>
                    <p className="text-sm text-foreground/70">Asigne propietarios de proceso para cada nivel de la jerarquía.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Gestión de Riesgos */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <AlertTriangle className="w-5 h-5 text-primary" />
            </div>
            4. Gestión de Riesgos
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Identificación y Evaluación de Riesgos</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Sistema completo para identificar, evaluar y gestionar los riesgos de su organización.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Proceso de Registro de Riesgos</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">1. Identificación</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Código único del riesgo</li>
                    <li>• Descripción detallada</li>
                    <li>• Asociación al proceso correspondiente</li>
                    <li>• Categoría de riesgo</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium">2. Evaluación</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• <strong>Probabilidad:</strong> Escala 1-5 (Muy baja a Muy alta)</li>
                    <li>• <strong>Impacto:</strong> Escala 1-5 (Muy bajo a Muy alto)</li>
                    <li>• <strong>Riesgo Inherente:</strong> Probabilidad × Impacto</li>
                    <li>• Justificación de la evaluación</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">3. Clasificación</h4>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span>Crítico (20-25)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span>Alto (13-19)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span>Medio (7-12)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span>Bajo (1-6)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Eventos de Riesgo</h3>
              <p className="text-sm text-foreground/70 mb-3">
                Registro de incidentes reales que materializaron riesgos identificados.
              </p>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Información a Registrar:</h4>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• Fecha y descripción del evento</li>
                  <li>• Riesgo asociado que se materializó</li>
                  <li>• Impacto real vs estimado</li>
                  <li>• Acciones correctivas tomadas</li>
                  <li>• Lecciones aprendidas</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Herramientas de Filtrado</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Filtros Disponibles:</h4>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• Por macroproceso</li>
                    <li>• Por proceso específico</li>
                    <li>• Por nivel de riesgo</li>
                    <li>• Por estado de validación</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Ordenamiento:</h4>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• Por código</li>
                    <li>• Por riesgo inherente</li>
                    <li>• Por riesgo residual</li>
                    <li>• Ascendente/Descendente</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Gestión de Controles */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <Sliders className="w-5 h-5 text-primary" />
            </div>
            5. Gestión de Controles
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Tipos de Controles</h3>
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-green-600">Controles Preventivos</h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Diseñados para evitar que ocurran los riesgos. Ejemplo: Segregación de funciones, autorizaciones.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-blue-600">Controles Detectivos</h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Identifican cuando un riesgo se ha materializado. Ejemplo: Reconciliaciones, supervisión.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-orange-600">Controles Correctivos</h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Minimizan el impacto después de que el riesgo ocurrió. Ejemplo: Planes de contingencia, seguros.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Registro de Controles</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">1</div>
                  <div>
                    <h4 className="font-medium">Información Básica</h4>
                    <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                      <li>• Código y nombre del control</li>
                      <li>• Descripción detallada</li>
                      <li>• Tipo de control (Preventivo/Detectivo/Correctivo)</li>
                      <li>• Frecuencia de ejecución</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">2</div>
                  <div>
                    <h4 className="font-medium">Evaluación de Efectividad</h4>
                    <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                      <li>• Escala 1-5 (Muy baja a Muy alta efectividad)</li>
                      <li>• Evidencia de funcionamiento</li>
                      <li>• Fecha de última evaluación</li>
                      <li>• Responsable de la evaluación</li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">3</div>
                  <div>
                    <h4 className="font-medium">Asociación con Riesgos</h4>
                    <p className="text-sm text-foreground/70 mt-2">
                      Vincule cada control con los riesgos que mitiga, estableciendo el porcentaje de mitigación correspondiente.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Cálculo de Riesgo Residual</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Fórmula de Cálculo:</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Probabilidad Residual =</strong> Probabilidad Inherente × (1 - Efectividad Control / 100)</p>
                  <p><strong>Impacto Residual =</strong> Impacto Inherente × (1 - Efectividad Control / 100)</p>
                  <p><strong>Riesgo Residual =</strong> Probabilidad Residual × Impacto Residual</p>
                </div>
                <p className="text-xs text-foreground/70 mt-3">
                  *En caso de múltiples controles, se considera el de mayor efectividad para el cálculo.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 6. Matriz de Riesgo */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <Grid3x3 className="w-5 h-5 text-primary" />
            </div>
            6. Matriz de Riesgo
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Visualización de Riesgos</h3>
              <p className="text-sm text-foreground/70 mb-4">
                La matriz de riesgo proporciona una representación visual de todos los riesgos según su probabilidad e impacto.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Tipos de Matriz</h3>
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-blue-600">Matriz Inherente</h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Muestra los riesgos sin considerar controles. Representa el riesgo natural de la actividad.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-green-600">Matriz Residual</h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Muestra los riesgos después de aplicar controles. Representa el riesgo real actual.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium text-orange-600">Matriz de Criticidad</h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Compara impacto inherente vs riesgo residual para identificar gaps de control.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Interpretación de la Matriz</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Ejes de la Matriz:</h4>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• <strong>Eje X:</strong> Impacto (1-5)</li>
                    <li>• <strong>Eje Y:</strong> Probabilidad (1-5)</li>
                    <li>• <strong>Número en celda:</strong> Cantidad de riesgos</li>
                    <li>• <strong>Color de celda:</strong> Nivel de riesgo</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Interactividad:</h4>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• Clic en celda: Ver riesgos específicos</li>
                    <li>• Filtrado por procesos</li>
                    <li>• Cambio entre tipos de matriz</li>
                    <li>• Exportación de vista</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Análisis Recomendado</h3>
              <div className="space-y-3">
                <div className="p-3 border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium">Zona Crítica (Esquina superior derecha)</h4>
                  <p className="text-sm text-foreground/70">Requiere atención inmediata y controles robustos.</p>
                </div>
                <div className="p-3 border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-medium">Zona Media (Diagonal central)</h4>
                  <p className="text-sm text-foreground/70">Monitoreo regular y controles moderados.</p>
                </div>
                <div className="p-3 border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">Zona Baja (Esquina inferior izquierda)</h4>
                  <p className="text-sm text-foreground/70">Controles básicos y revisión periódica.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Validación */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <ClipboardCheck className="w-5 h-5 text-primary" />
            </div>
            7. Validación y Aprobaciones
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Proceso de Validación</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Sistema de workflow para la aprobación formal de riesgos y controles por parte de los responsables.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Estados de Validación</h3>
              <div className="grid gap-3">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div>
                    <h4 className="font-medium">Pendiente</h4>
                    <p className="text-sm text-foreground/70">Esperando revisión del responsable del proceso.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <h4 className="font-medium">Validado</h4>
                    <p className="text-sm text-foreground/70">Aprobado por el responsable del proceso.</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div>
                    <h4 className="font-medium">Rechazado</h4>
                    <p className="text-sm text-foreground/70">Requiere modificaciones antes de la aprobación.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Cómo Validar Riesgos y Controles</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">1</div>
                  <div>
                    <h4 className="font-medium">Acceder a Validación</h4>
                    <p className="text-sm text-foreground/70">Navegue a "Validación de riesgos y controles" en el menú principal.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">2</div>
                  <div>
                    <h4 className="font-medium">Filtrar por Proceso</h4>
                    <p className="text-sm text-foreground/70">Use los filtros para ver solo los elementos de su responsabilidad.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium mt-0.5">3</div>
                  <div>
                    <h4 className="font-medium">Revisar y Aprobar</h4>
                    <p className="text-sm text-foreground/70">Evalúe cada riesgo/control y seleccione "Validar" o "Rechazar" con comentarios.</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Notificaciones y Seguimiento</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <ul className="text-sm text-foreground/70 space-y-2">
                  <li>• Los responsables reciben notificaciones por email de elementos pendientes de validación</li>
                  <li>• El sistema envía recordatorios automáticos para validaciones vencidas</li>
                  <li>• Se mantiene un historial de todas las validaciones y comentarios</li>
                  <li>• Los administradores pueden ver el estado global de validaciones</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 8. Planes de Acción */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
            8. Planes de Acción
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Gestión de Acciones Correctivas</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Sistema para crear, asignar y dar seguimiento a acciones de mejora para mitigar riesgos identificados.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Creación de Planes de Acción</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">Información Requerida</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Descripción de la acción a tomar</li>
                    <li>• Riesgo o hallazgo que origina la acción</li>
                    <li>• Responsable de la ejecución</li>
                    <li>• Fecha de vencimiento</li>
                    <li>• Prioridad (Baja, Media, Alta, Crítica)</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">Seguimiento del Progreso</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Actualización de porcentaje de avance</li>
                    <li>• Registro de evidencias de progreso</li>
                    <li>• Comentarios y observaciones</li>
                    <li>• Ajustes de fecha si es necesario</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Estados de las Acciones</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Planificada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">En Progreso</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Completada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-sm font-medium">Vencida</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Notificaciones Automáticas</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">El sistema envía notificaciones por:</h4>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• Asignación de nueva acción</li>
                  <li>• Recordatorios de vencimiento (7, 3 y 1 día antes)</li>
                  <li>• Acciones vencidas</li>
                  <li>• Solicitudes de extensión de plazo</li>
                  <li>• Completamiento de acciones</li>
                </ul>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Métricas y Reportes</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Indicadores Disponibles:</h4>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• Porcentaje de completamiento</li>
                    <li>• Acciones vencidas por área</li>
                    <li>• Tiempo promedio de ejecución</li>
                    <li>• Distribución por prioridad</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Filtros Disponibles:</h4>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• Por responsable</li>
                    <li>• Por estado</li>
                    <li>• Por fecha de vencimiento</li>
                    <li>• Por prioridad</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 9. Módulo de Auditoría */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <Search className="w-5 h-5 text-primary" />
            </div>
            9. Módulo de Auditoría Completo
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Planificación de Auditorías</h3>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Plan Anual de Auditoría
                  </h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Defina el universo auditable y programe las auditorías del año basándose en riesgos y prioridades organizacionales.
                  </p>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Creación de planes anuales por área</li>
                    <li>• Priorización basada en riesgo</li>
                    <li>• Asignación de recursos y fechas</li>
                    <li>• Seguimiento de cumplimiento del plan</li>
                  </ul>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Universo Auditable
                  </h4>
                  <p className="text-sm text-foreground/70 mt-2">
                    Defina todos los procesos, áreas y sistemas susceptibles de auditoría.
                  </p>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Catalogación de entidades auditables</li>
                    <li>• Evaluación de riesgo por entidad</li>
                    <li>• Frecuencia de auditoría recomendada</li>
                    <li>• Historial de auditorías previas</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Ejecución de Auditorías</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">1. Configuración de Auditoría</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Definición de alcance y objetivos</li>
                    <li>• Asignación de equipo auditor</li>
                    <li>• Cronograma de trabajo</li>
                    <li>• Riesgos y procesos a evaluar</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium">2. Desarrollo de Pruebas</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Creación de programas de auditoría</li>
                    <li>• Asignación de pruebas a auditores</li>
                    <li>• Registro de evidencias y hallazgos</li>
                    <li>• Seguimiento de progreso</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">3. Documentación</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Papeles de trabajo digitales</li>
                    <li>• Archivos adjuntos y evidencias</li>
                    <li>• Comentarios y observaciones</li>
                    <li>• Supervisión y revisión</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Gestión de Hallazgos</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-3">Estructura de Hallazgos:</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <ul className="space-y-1 text-foreground/70">
                      <li>• <strong>Criterio:</strong> Norma o expectativa</li>
                      <li>• <strong>Condición:</strong> Situación encontrada</li>
                      <li>• <strong>Causa:</strong> Razón del problema</li>
                    </ul>
                  </div>
                  <div>
                    <ul className="space-y-1 text-foreground/70">
                      <li>• <strong>Efecto:</strong> Impacto del hallazgo</li>
                      <li>• <strong>Recomendación:</strong> Acción propuesta</li>
                      <li>• <strong>Respuesta:</strong> Comentario de gestión</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Seguimiento de Compromisos</h3>
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Sistema especializado para dar seguimiento a los compromisos derivados de hallazgos de auditoría.
                </p>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">Asignación de Responsables</h4>
                      <p className="text-sm text-foreground/70">Defina quién ejecutará cada compromiso.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Clock className="w-5 h-5 text-orange-500" />
                    <div>
                      <h4 className="font-medium">Control de Plazos</h4>
                      <p className="text-sm text-foreground/70">Seguimiento de fechas límite y alertas automáticas.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <BarChart3 className="w-5 h-5 text-green-500" />
                    <div>
                      <h4 className="font-medium">Reportes de Avance</h4>
                      <p className="text-sm text-foreground/70">Métricas de cumplimiento por área y auditoría.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Informes de Auditoría</h3>
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium mb-2">Generación Automática de Informes:</h4>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• Informe ejecutivo con resumen de hallazgos</li>
                  <li>• Detalle técnico de cada hallazgo</li>
                  <li>• Plan de acciones correctivas</li>
                  <li>• Matriz de riesgos evaluados</li>
                  <li>• Cronograma de seguimiento</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 10. Cumplimiento Regulatorio */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <Scale className="w-5 h-5 text-primary" />
            </div>
            10. Cumplimiento Regulatorio
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Gestión de Normativas</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Sistema para gestionar el cumplimiento de regulaciones y normativas aplicables a su organización.
              </p>
              
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Registro de Normativas</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Identificación de regulaciones aplicables</li>
                    <li>• Análisis de requerimientos específicos</li>
                    <li>• Asignación de responsables de cumplimiento</li>
                    <li>• Fechas de vigencia y actualizaciones</li>
                  </ul>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Evaluación de Cumplimiento</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Auditorías específicas de compliance</li>
                    <li>• Pruebas de cumplimiento automatizadas</li>
                    <li>• Evaluación de gaps regulatorios</li>
                    <li>• Planes de remediación</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Auditorías de Cumplimiento</h3>
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Auditorías especializadas enfocadas en verificar el cumplimiento de normativas específicas.
                </p>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">Características Especiales:</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Programas de auditoría predefinidos por normativa</li>
                    <li>• Procedimientos específicos de testing</li>
                    <li>• Documentación de evidencias de cumplimiento</li>
                    <li>• Reportes regulatorios automatizados</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Documentación de Evidencias</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Gestión de Documentos de Compliance:</h4>
                <ul className="text-sm text-foreground/70 space-y-1">
                  <li>• Repositorio centralizado de evidencias</li>
                  <li>• Control de versiones y vigencia</li>
                  <li>• Trazabilidad de cambios</li>
                  <li>• Acceso controlado por roles</li>
                  <li>• Alertas de vencimiento de documentos</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 11. Módulos Especializados */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            11. Módulos Especializados
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Autoevaluación de Controles</h3>
              <div className="space-y-4">
                <p className="text-sm text-foreground/70">
                  Permite a los responsables de procesos evaluar la efectividad de sus controles de manera autónoma.
                </p>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">Proceso de Autoevaluación:</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Selección de controles a evaluar</li>
                    <li>• Calificación de efectividad (1-5)</li>
                    <li>• Documentación de evidencias</li>
                    <li>• Identificación de mejoras necesarias</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">Beneficios:</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Mayor involucramiento de los responsables</li>
                    <li>• Evaluación continua vs auditorías puntuales</li>
                    <li>• Identificación temprana de deficiencias</li>
                    <li>• Cultura de autocontrol</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Gestión de Equipo</h3>
              <div className="space-y-4">
                <p className="text-sm text-foreground/70">
                  Administración del equipo de auditoría y gestión de riesgos.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Gestión de Miembros</h4>
                    <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                      <li>• Perfiles profesionales</li>
                      <li>• Competencias y certificaciones</li>
                      <li>• Asignación de responsabilidades</li>
                      <li>• Evaluación de performance</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Roles y Permisos</h4>
                    <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                      <li>• Definición de roles específicos</li>
                      <li>• Matriz de permisos granular</li>
                      <li>• Segregación de funciones</li>
                      <li>• Rotación de asignaciones</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 12. Reportes */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            12. Reportes y Analíticos
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Dashboard Ejecutivo</h3>
              <p className="text-sm text-foreground/70 mb-4">
                Visualizaciones interactivas y métricas clave para la toma de decisiones.
              </p>
              
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Gráficos Disponibles</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Distribución de riesgos por nivel</li>
                    <li>• Riesgos por proceso organizacional</li>
                    <li>• Efectividad de controles</li>
                    <li>• Estado de planes de acción</li>
                    <li>• Top 5 riesgos más críticos</li>
                  </ul>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Filtros y Personalización</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Filtrado por fechas y períodos</li>
                    <li>• Selección de procesos específicos</li>
                    <li>• Agrupación por categorías</li>
                    <li>• Comparativos históricos</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Reportes Estándar</h3>
              <div className="grid gap-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">Reportes de Riesgos</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Inventario completo de riesgos</li>
                    <li>• Matriz de riesgos por proceso</li>
                    <li>• Evolución de riesgo residual</li>
                    <li>• Riesgos sin controles asociados</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">Reportes de Controles</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Inventario de controles por proceso</li>
                    <li>• Efectividad promedio por área</li>
                    <li>• Controles con baja efectividad</li>
                    <li>• Gaps de control identificados</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium">Reportes de Auditoría</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Estado de cumplimiento del plan anual</li>
                    <li>• Hallazgos por categoría y severidad</li>
                    <li>• Seguimiento de compromisos</li>
                    <li>• Performance del equipo auditor</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Exportación de Datos</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Formatos Disponibles:</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <ul className="space-y-1 text-foreground/70">
                      <li>• <strong>PDF:</strong> Reportes ejecutivos formateados</li>
                      <li>• <strong>Excel:</strong> Datos para análisis adicional</li>
                    </ul>
                  </div>
                  <div>
                    <ul className="space-y-1 text-foreground/70">
                      <li>• <strong>CSV:</strong> Importación a otros sistemas</li>
                      <li>• <strong>JSON:</strong> Integración con APIs</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Reportes Automáticos</h3>
              <div className="space-y-3">
                <p className="text-sm text-foreground/70">
                  Configure reportes periódicos que se generen y envíen automáticamente.
                </p>
                <div className="grid gap-3">
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <Calendar className="w-5 h-5 text-blue-500" />
                    <div>
                      <h4 className="font-medium">Reportes Mensuales</h4>
                      <p className="text-sm text-foreground/70">Resumen ejecutivo y métricas clave.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    <div>
                      <h4 className="font-medium">Alertas Automáticas</h4>
                      <p className="text-sm text-foreground/70">Notificación de riesgos críticos o vencimientos.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 border rounded-lg">
                    <BarChart3 className="w-5 h-5 text-green-500" />
                    <div>
                      <h4 className="font-medium">Dashboards en Tiempo Real</h4>
                      <p className="text-sm text-foreground/70">Actualizaciones automáticas de métricas.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 13. Configuración */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            13. Configuración y Administración
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold mb-3">Configuración del Sistema</h3>
              <div className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Parámetros de Evaluación</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• <strong>Escalas de Probabilidad:</strong> Definir los niveles 1-5 y sus descripciones</li>
                    <li>• <strong>Escalas de Impacto:</strong> Configurar criterios cuantitativos y cualitativos</li>
                    <li>• <strong>Rangos de Riesgo:</strong> Establecer umbrales para Bajo, Medio, Alto y Crítico</li>
                    <li>• <strong>Efectividad de Controles:</strong> Límites máximos de efectividad por tipo</li>
                  </ul>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium">Configuración de Workflows</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Flujos de aprobación por tipo de elemento</li>
                    <li>• Escalation rules para validaciones vencidas</li>
                    <li>• Plantillas de notificaciones por email</li>
                    <li>• Frecuencias de recordatorios automáticos</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Gestión de Usuarios y Roles</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">Creación de Usuarios</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Información personal y de contacto</li>
                    <li>• Asignación de rol principal</li>
                    <li>• Permisos específicos por módulo</li>
                    <li>• Estado activo/inactivo</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">Definición de Roles</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Permisos granulares por funcionalidad</li>
                    <li>• Acceso a módulos específicos</li>
                    <li>• Capacidades de creación, edición y eliminación</li>
                    <li>• Restricciones por proceso o área</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium">Matriz de Permisos</h4>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-green-100 text-green-800 rounded">Administrador: Todos</div>
                    <div className="p-2 bg-blue-100 text-blue-800 rounded">Supervisor: Lectura + Aprobación</div>
                    <div className="p-2 bg-yellow-100 text-yellow-800 rounded">Ejecutor: Lectura + Edición</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Importación de Datos</h3>
              <div className="space-y-4">
                <p className="text-sm text-foreground/70">
                  Herramientas para migrar datos existentes desde hojas de cálculo u otros sistemas.
                </p>
                
                <div className="grid gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Tipos de Importación
                    </h4>
                    <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                      <li>• Procesos organizacionales (Excel/CSV)</li>
                      <li>• Inventario de riesgos existente</li>
                      <li>• Controles y sus evaluaciones</li>
                      <li>• Usuarios y estructura organizacional</li>
                    </ul>
                  </div>
                  
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium">Proceso de Importación</h4>
                    <ol className="text-sm text-foreground/70 mt-2 space-y-1 list-decimal list-inside">
                      <li>Descarga de plantilla predefinida</li>
                      <li>Completar información en el formato requerido</li>
                      <li>Carga del archivo en el sistema</li>
                      <li>Validación automática de datos</li>
                      <li>Corrección de errores identificados</li>
                      <li>Confirmación e importación final</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Configuración de Notificaciones</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Tipos de Notificaciones Configurables:</h4>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <ul className="space-y-1 text-foreground/70">
                      <li>• Validaciones pendientes</li>
                      <li>• Acciones próximas a vencer</li>
                      <li>• Nuevos hallazgos de auditoría</li>
                      <li>• Evaluaciones de control vencidas</li>
                    </ul>
                  </div>
                  <div>
                    <ul className="space-y-1 text-foreground/70">
                      <li>• Riesgos críticos identificados</li>
                      <li>• Compromisos sin avance</li>
                      <li>• Denuncias recibidas</li>
                      <li>• Reportes automáticos</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 14. Mejores Prácticas */}
        <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
          <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
            <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
              <Award className="w-5 h-5 text-primary" />
            </div>
            14. Mejores Prácticas y Recomendaciones
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-3">Implementación Exitosa</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-medium">1. Planificación Inicial</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Defina claramente la estructura organizacional antes de registrar riesgos</li>
                    <li>• Establezca criterios de evaluación consensuados con la dirección</li>
                    <li>• Asigne responsables de proceso con autoridad y conocimiento</li>
                    <li>• Configure los parámetros del sistema según su contexto organizacional</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium">2. Adopción Gradual</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Implemente por fases: primero procesos críticos, luego el resto</li>
                    <li>• Capacite a los usuarios en grupos pequeños</li>
                    <li>• Realice pruebas piloto antes del rollout completo</li>
                    <li>• Establezca métricas de adopción y seguimiento</li>
                  </ul>
                </div>
                
                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-medium">3. Mantenimiento Continuo</h4>
                  <ul className="text-sm text-foreground/70 mt-2 space-y-1">
                    <li>• Programe revisiones periódicas de riesgos y controles</li>
                    <li>• Actualice evaluaciones basándose en eventos reales</li>
                    <li>• Mantenga evidencias de evaluaciones actualizadas</li>
                    <li>• Revise y ajuste parámetros del sistema regularmente</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Errores Comunes a Evitar</h3>
              <div className="space-y-3">
                <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800">❌ Evaluaciones Inconsistentes</h4>
                  <p className="text-sm text-red-700 mt-1">
                    No use criterios diferentes para evaluar riesgos similares. Mantenga consistencia en las escalas.
                  </p>
                </div>
                
                <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800">❌ Controles Mal Asociados</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Evite asociar controles que no mitigan realmente el riesgo específico.
                  </p>
                </div>
                
                <div className="p-3 border border-red-200 rounded-lg bg-red-50">
                  <h4 className="font-medium text-red-800">❌ Falta de Seguimiento</h4>
                  <p className="text-sm text-red-700 mt-1">
                    No registre planes de acción sin un sistema de seguimiento activo y regular.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Indicadores de Éxito</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Métricas Cuantitativas:</h4>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• % de riesgos validados por responsables</li>
                    <li>• Tiempo promedio de respuesta a hallazgos</li>
                    <li>• % de planes de acción completados a tiempo</li>
                    <li>• Reducción de riesgo residual promedio</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Indicadores Cualitativos:</h4>
                  <ul className="text-sm text-foreground/70 space-y-1">
                    <li>• Mejora en cultura de gestión de riesgos</li>
                    <li>• Mayor participación de responsables</li>
                    <li>• Detección temprana de problemas</li>
                    <li>• Mejor toma de decisiones informadas</li>
                  </ul>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Contacto y Soporte</h3>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Soporte Técnico:</h4>
                    <ul className="text-sm text-foreground/70 space-y-1">
                      <li>• Para problemas del sistema</li>
                      <li>• Errores o bugs encontrados</li>
                      <li>• Consultas sobre funcionalidades</li>
                      <li>• Solicitudes de nuevas características</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Soporte Metodológico:</h4>
                    <ul className="text-sm text-foreground/70 space-y-1">
                      <li>• Consultas sobre gestión de riesgos</li>
                      <li>• Mejores prácticas de implementación</li>
                      <li>• Diseño de controles efectivos</li>
                      <li>• Metodologías de auditoría</li>
                    </ul>
                  </div>
                </div>
                <p className="text-sm text-foreground/70 mt-4 text-center">
                  Para cualquier consulta, contacte a su administrador de sistema o al equipo de soporte técnico de su organización.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}