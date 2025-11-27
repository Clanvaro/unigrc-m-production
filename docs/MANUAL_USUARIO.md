# Manual de Usuario - Unigrc

**Versión:** 2.0.0  
**Fecha:** Octubre 2025  
**Audiencia:** Usuarios Finales

---

## Índice

1. [Introducción](#1-introducción)
2. [Primeros Pasos](#2-primeros-pasos)
3. [Gestión de Riesgos](#3-gestión-de-riesgos)
4. [Gestión de Controles](#4-gestión-de-controles)
5. [Auditoría Interna](#5-auditoría-interna)
6. [Estructura Organizacional](#6-estructura-organizacional)
7. [Canal de Denuncias](#7-canal-de-denuncias)
8. [Cumplimiento Normativo](#8-cumplimiento-normativo)
9. [Reportes y Dashboards](#9-reportes-y-dashboards)
10. [Configuración Personal](#10-configuración-personal)
11. [Asistente Inteligente](#11-asistente-inteligente)
12. [Optimizaciones de Rendimiento](#12-optimizaciones-de-rendimiento)

---

## 1. Introducción

### 1.1 ¿Qué es Unigrc?

Unigrc (anteriormente RiskMatrix Pro) es una plataforma integral de gestión de riesgos y auditoría interna que le permite a su organización:

- **Identificar y evaluar riesgos** de manera sistemática
- **Gestionar controles** para mitigar esos riesgos
- **Planificar y ejecutar auditorías** siguiendo estándares internacionales
- **Cumplir con regulaciones** y mantener evidencia de cumplimiento
- **Visualizar su postura de riesgo** mediante dashboards y reportes
- **Gestionar denuncias** de manera confidencial

### 1.2 Roles de Usuario

El sistema maneja diferentes roles con permisos específicos:

| Rol | Descripción |
|-----|-------------|
| **Administrador** | Acceso completo al sistema, configuración y gestión de usuarios |
| **Gerente de Riesgos** | Gestión completa de riesgos y controles |
| **Auditor Líder** | Planificación y supervisión de auditorías |
| **Auditor** | Ejecución de pruebas de auditoría |
| **Process Owner** | Responsable de procesos, validación de riesgos y auto-evaluación de controles |
| **Ejecutor** | Realización de pruebas de auditoría asignadas |
| **Supervisor** | Revisión de pruebas y hallazgos |
| **Consulta** | Acceso de solo lectura |

---

## 2. Primeros Pasos

### 2.1 Inicio de Sesión

1. Acceda a la URL de Unigrc proporcionada por su organización
2. Ingrese su **nombre de usuario** y **contraseña**
3. Haga clic en **Iniciar Sesión**

> 💡 **Nota:** Si olvidó su contraseña, contacte al administrador del sistema.

### 2.2 Navegación Principal

La interfaz consta de tres elementos principales:

#### Barra Lateral (Sidebar)
- **Dashboard:** Página principal con indicadores
- **Organización:** Procesos, gerencias y responsables
- **Riesgos:** Gestión de riesgos y eventos
- **Controles:** Catálogo y evaluación de controles
- **Auditoría:** Planificación y ejecución de auditorías
- **Cumplimiento:** Regulaciones y pruebas de cumplimiento
- **Denuncias:** Canal de whistleblower
- **Configuración:** Parámetros del sistema

#### Barra Superior (Header)
- **Filtros globales:** Seleccione proceso para filtrar toda la información
- **Búsqueda global:** Busque en todo el sistema (presione `/` para activar)
- **Notificaciones:** Alertas y recordatorios
- **Perfil de usuario:** Configuración personal y cerrar sesión

#### Área de Contenido
- Muestra la información según la sección seleccionada
- Incluye tablas, formularios, gráficos y detalles

### 2.3 Funcionalidades Comunes

#### Búsqueda
1. Presione `/` o haga clic en el campo de búsqueda
2. Escriba el término que desea buscar
3. Seleccione el resultado deseado

#### Filtros
- Use los filtros en la parte superior de las tablas
- Combine múltiples filtros para afinar resultados
- Los filtros se mantienen mientras navega entre secciones

#### Acciones Masivas
- Seleccione múltiples elementos con los checkboxes
- Use las opciones de acción masiva que aparecen arriba de la tabla

---

## 3. Gestión de Riesgos

### 3.1 Visualizar Riesgos

1. Vaya a **Riesgos** en el menú lateral
2. Verá una tabla con todos los riesgos registrados
3. Use los filtros para buscar riesgos específicos:
   - Por categoría
   - Por nivel de riesgo
   - Por proceso
   - Por estado

### 3.2 Crear un Nuevo Riesgo

1. Haga clic en **+ Nuevo Riesgo**
2. Complete el formulario:

#### Información Básica
- **Nombre del Riesgo:** Descripción clara y concisa
- **Descripción:** Detalle la naturaleza del riesgo
- **Categoría:** Seleccione la categoría apropiada
- **Tipo:** Estratégico, Operacional, Financiero, Cumplimiento, etc.

#### Asignación
- **Proceso:** Seleccione el proceso al que pertenece el riesgo
  - Puede seleccionar Macroproceso, Proceso o Subproceso
- **Entidad Fiscal (opcional):** Si aplica a una entidad específica

#### Evaluación
- **Probabilidad:** Seleccione la probabilidad de ocurrencia (1-5)
  - 1: Raro
  - 2: Improbable
  - 3: Posible
  - 4: Probable
  - 5: Casi Cierto

- **Impacto:** Evalúe el impacto en cada dimensión (1-5)
  - **Financiero:** Impacto económico
  - **Operacional:** Afectación a operaciones
  - **Reputacional:** Daño a la imagen
  - **Cumplimiento:** Incumplimiento regulatorio
  - **Estratégico:** Impacto en objetivos estratégicos

3. El sistema calculará automáticamente:
   - **Riesgo Inherente:** Probabilidad × Impacto Ponderado
   - **Nivel de Riesgo:** Bajo, Medio, Alto o Extremo

4. Haga clic en **Guardar**

### 3.3 Matriz de Riesgos

La matriz de riesgos es una herramienta visual que muestra todos los riesgos:

1. Vaya a **Matriz de Riesgos** en el menú
2. Verá una matriz 5x5:
   - **Eje horizontal:** Probabilidad
   - **Eje vertical:** Impacto
   - **Colores:**
     - 🟢 Verde: Riesgo Bajo
     - 🟡 Amarillo: Riesgo Medio
     - 🟠 Naranja: Riesgo Alto
     - 🔴 Rojo: Riesgo Extremo

3. Haga clic en una celda para ver los riesgos en ese nivel
4. Haga clic en un riesgo específico para ver detalles

### 3.4 Eventos de Riesgo

Los eventos de riesgo son ocurrencias reales de riesgos materializados:

#### Registrar un Evento
1. Vaya a **Eventos de Riesgo**
2. Haga clic en **+ Nuevo Evento**
3. Complete:
   - **Nombre del Evento**
   - **Descripción:** ¿Qué ocurrió?
   - **Fecha de Ocurrencia**
   - **Tipo:** Incidente, Casi-incidente u Oportunidad
   - **Riesgos Relacionados:** Vincule con riesgos existentes
   - **Procesos Afectados**
   - **Impacto Financiero:** Si es cuantificable
   - **Acciones Tomadas**

4. Adjunte evidencia si es necesario
5. Guarde el evento

> ⚠️ **Importante:** Los eventos de fraude se detectan automáticamente y afectan la priorización de auditorías futuras.

### 3.5 Validación de Riesgos

Si es Process Owner, debe validar periódicamente los riesgos:

1. Vaya a **Validación de Riesgos**
2. Verá una vista de árbol de sus procesos
3. Los iconos indican el estado:
   - ✅ Validado
   - ⚠️ Pendiente de validación
   - 📧 Notificación enviada

4. Haga clic en un proceso para ver detalles
5. Revise:
   - Riesgos identificados
   - Controles asociados
   - Vínculos riesgo-control

6. Confirme o sugiera cambios
7. **Aprobar** cuando todo esté correcto

---

## 4. Gestión de Controles

### 4.1 Catálogo de Controles

1. Vaya a **Controles** en el menú
2. Verá todos los controles registrados con:
   - Código único (C-XXXX)
   - Nombre del control
   - Tipo (Preventivo, Detectivo, Correctivo)
   - Frecuencia
   - Efectividad actual

### 4.2 Crear un Control

1. Haga clic en **+ Nuevo Control**
2. Complete:

#### Información Básica
- **Nombre:** Descripción clara del control
- **Descripción:** Detalle de cómo funciona el control
- **Tipo:**
  - **Preventivo:** Evita que ocurra el riesgo
  - **Detectivo:** Identifica cuando ocurre el riesgo
  - **Correctivo:** Corrige después de que ocurre

#### Configuración
- **Frecuencia:**
  - Diaria
  - Semanal
  - Mensual
  - Trimestral
  - Anual
  - Ad-hoc

- **Responsable:** Asignado automáticamente según el Process Owner del proceso

#### Riesgos Mitigados
- Seleccione los riesgos que este control mitiga
- Indique si es el control primario para cada riesgo

3. Guarde el control

### 4.3 Evaluación de Controles

Los controles deben evaluarse periódicamente para determinar su efectividad:

#### Como Evaluador
1. Vaya a **Controles**
2. Seleccione un control
3. Haga clic en **Evaluar**
4. Complete cada criterio:
   - Diseño
   - Implementación
   - Documentación
   - Frecuencia de ejecución
   - Revisión y monitoreo

5. El sistema calculará la **efectividad total** (%)
6. Esta efectividad se usa para calcular el **riesgo residual**

### 4.4 Autoevaluación de Controles (CSA)

Si es Process Owner, puede realizar auto-evaluaciones:

1. Vaya a **Autoevaluación de Controles**
2. Verá los controles de sus procesos
3. Para cada control:
   - Evalúe su cumplimiento
   - Adjunte evidencia
   - Indique observaciones

4. **Guardar** la evaluación

5. Vea el **Historial** para ver tendencias:
   - Gráfico de efectividad en el tiempo
   - Comparaciones período a período

---

## 5. Auditoría Interna

### 5.1 Planificación Anual

#### Crear Plan Anual
El plan anual se crea mediante un wizard de 4 pasos:

**Paso 1: Información Básica**
1. Vaya a **Auditoría** → **Plan Anual**
2. Haga clic en **+ Nuevo Plan**
3. Ingrese:
   - **Año del plan**
   - **Nombre del plan**
   - **Descripción**
   - **Responsable** (Director de Auditoría)

**Paso 2: Definir Alcance**
1. Seleccione las áreas del **Universo Auditable:**
   - Macroprocesos
   - Procesos
   - Subprocesos

2. El sistema mostrará información de cada área:
   - Riesgos asociados
   - Última fecha de auditoría
   - Eventos de fraude

**Paso 3: Priorización Automática**
El sistema calcula un score de prioridad basado en:
- **Nivel de riesgo** (30%)
- **Eventos de fraude** (25%) - Detectado automáticamente de Risk Events
- **Tiempo desde última auditoría** (20%)
- **Cambios organizacionales** (15%)
- **Materialidad financiera** (10%)

1. Revise los scores calculados
2. Ajuste manualmente si es necesario
3. Seleccione las áreas a auditar este año

**Paso 4: Asignación al Calendario**
1. Asigne cada auditoría a un mes/trimestre
2. Defina duración estimada
3. Asigne líder de auditoría tentativo

4. **Enviar a Aprobación**
5. El Director revisa y aprueba

### 5.2 Gestión de Auditorías

#### Crear una Auditoría
1. Vaya a **Auditorías**
2. Haga clic en **+ Nueva Auditoría**
3. Complete la información general:
   - Nombre
   - Objetivos
   - Fechas planificadas
   - Equipo auditor

#### Vista 360° de Auditoría

Cada auditoría tiene 11 secciones (tabs):

**1. Información General**
- Datos básicos
- Estado actual
- Equipo asignado

**2. Objetivos**
- Objetivos específicos de la auditoría
- Entregables esperados

**3. Alcance**
- Procesos incluidos
- Período cubierto
- Exclusiones
- **Versionamiento:** Control de cambios de alcance

**4. Criterios**
- Normas aplicables
- Regulaciones
- Políticas internas

**5. Programa de Trabajo**
- Procedimientos de auditoría
- Asignación de responsables
- Estado de aprobación
- Visualiza riesgos reevaluados

**6. Pruebas**
- Pruebas de auditoría creadas
- Estado de ejecución
- Resultados

**7. Hallazgos**
- Hallazgos identificados
- Severidad
- Recomendaciones

**8. Papeles de Trabajo**
- Documentación de auditoría
- Evidencias
- Referencias

**9. Evaluación de Controles**
- Re-evaluación de controles existentes
- Diseño y eficacia operativa

**10. Re-evaluación de Riesgos**
- Actualización de evaluación de riesgos
- Identificación de nuevos riesgos (Ad-hoc)

**11. Reportes**
- Informes generados
- Distribución

### 5.3 Ejecución de Pruebas de Auditoría

#### Como Ejecutor

1. Vaya a **Dashboard de Ejecutor**
2. Verá sus pruebas asignadas:
   - Próximas a vencer
   - En progreso
   - Completadas

3. Haga clic en una prueba
4. Complete:
   - **Procedimientos realizados**
   - **Resultados obtenidos**
   - **Observaciones**
   - **Conclusión**

5. Adjunte evidencia:
   - Documentos
   - Capturas de pantalla
   - Hojas de cálculo

6. Cambie estado a **Completada**
7. Notifica automáticamente al supervisor

#### Como Supervisor

1. Vaya a **Dashboard de Supervisor**
2. Verá pruebas pendientes de revisión
3. Revise cada prueba:
   - Procedimientos ejecutados
   - Evidencia adjunta
   - Conclusiones

4. Agregue **Comentarios de Revisión**
5. **Aprobar** o **Rechazar** (con justificación)

### 5.4 Hallazgos de Auditoría

#### Registrar un Hallazgo

1. Dentro de una auditoría, vaya a la sección **Hallazgos**
2. Haga clic en **+ Nuevo Hallazgo**
3. Complete:

- **Título del Hallazgo**
- **Severidad:**
  - 🔴 Crítico
  - 🟠 Alto
  - 🟡 Medio
  - 🟢 Bajo

- **Condición:** ¿Qué se encontró?
- **Criterio:** ¿Qué debería ser?
- **Causa:** ¿Por qué ocurrió?
- **Efecto:** ¿Cuál es el impacto?
- **Recomendación:** ¿Qué se debe hacer?

4. Vincule con la(s) prueba(s) que lo identificaron
5. Guarde el hallazgo

#### Seguimiento de Hallazgos

Los hallazgos generan **Compromisos** automáticamente:

1. Vaya a **Compromisos**
2. Para cada hallazgo hay compromisos asignados a:
   - Responsable del área auditada
   - Fecha compromiso

3. El responsable actualiza el estado:
   - En proceso
   - Implementado
   - Postergado (con justificación)

4. Adjunta evidencia de implementación
5. Auditoría verifica y cierra

---

## 6. Estructura Organizacional

### 6.1 Mapa de Procesos

El mapa de procesos muestra la jerarquía organizacional:

#### Visualización
1. Vaya a **Organización** → **Mapa de Procesos**
2. Verá la estructura en árbol:
   ```
   📊 Macroproceso
      └─ 📋 Proceso
          └─ 📄 Subproceso
   ```

3. Expanda/contraiga niveles haciendo clic
4. Use el buscador para encontrar procesos específicos

#### Crear Procesos

**Crear Macroproceso:**
1. Haga clic en **+ Nuevo Macroproceso**
2. Ingrese:
   - Nombre
   - Descripción
   - Objetivos

3. Asigne Process Owner
4. Guarde

**Crear Proceso o Subproceso:**
1. Seleccione el padre (Macroproceso o Proceso)
2. Haga clic en **Agregar Hijo**
3. Complete la información
4. Asigne responsable
5. Guarde

### 6.2 Gerencias

Las gerencias representan la estructura de gestión:

#### Ver Gerencias
1. Vaya a **Organización** → **Gerencias**
2. Verá la jerarquía:
   - **Gerencias** (Nivel 1)
   - **Subgerencias** (Nivel 2)
   - **Jefaturas** (Nivel 3)

#### Crear Gerencia
1. Haga clic en **+ Nueva Gerencia**
2. Ingrese:
   - Nombre de la gerencia
   - Nivel jerárquico
   - Gerencia padre (si aplica)
   - Gerente responsable

3. **Asignar Procesos:**
   - Puede asignar múltiples procesos a una gerencia
   - Una gerencia puede estar asignada a múltiples niveles (Macroproceso, Proceso, Subproceso)
   - El sistema previene duplicados automáticamente

4. Guarde

#### Asignación de Procesos a Gerencias

**Opción 1: Desde Gerencia**
1. Abra una gerencia
2. Sección **Procesos Asignados**
3. Haga clic en **+ Asignar Proceso**
4. Seleccione el proceso
5. Guarde

**Opción 2: Desde Proceso**
1. Abra un proceso
2. Sección **Gerencias**
3. Haga clic en **+ Asignar Gerencia**
4. Seleccione la gerencia
5. Guarde

### 6.3 Objetivos Estratégicos

#### Gestión de Objetivos
1. Vaya a **Organización** → **Objetivos Estratégicos**
2. Vea la lista de objetivos estratégicos (código OE-XXXX)

#### Crear Objetivo Estratégico
1. Haga clic en **+ Nuevo Objetivo**
2. Ingrese:
   - Nombre del objetivo
   - Descripción
   - Indicadores de éxito

3. **Vincular con Procesos:**
   - Seleccione los procesos que contribuyen al objetivo
   - Esta vinculación permite análisis de riesgos a nivel estratégico

4. Guarde

### 6.4 Responsables (Process Owners)

La sección Responsables centraliza todas las asignaciones:

1. Vaya a **Organización** → **Responsables**
2. Vea la lista de todas las personas
3. Para cada persona se muestra:
   - Nombre y contacto
   - Gerencias a cargo (si es gerente)
   - Procesos asignados (si es Process Owner)

4. Haga clic en una persona para ver detalles completos:
   - **Gerencias:** Lista de gerencias donde es gerente
   - **Macroprocesos:** Asignaciones a nivel macro
   - **Procesos:** Asignaciones a nivel proceso
   - **Subprocesos:** Asignaciones a nivel detalle

---

## 7. Canal de Denuncias

### 7.1 Realizar una Denuncia (Público)

El canal de denuncias es accesible sin necesidad de iniciar sesión:

1. Acceda a `[URL]/whistleblower/report`
2. Complete el formulario:

- **Categoría de Denuncia:**
  - Fraude
  - Corrupción
  - Acoso
  - Conflicto de interés
  - Otros

- **Descripción del Incidente:**
  - ¿Qué ocurrió?
  - ¿Cuándo ocurrió?
  - ¿Dónde ocurrió?
  - ¿Quiénes están involucrados?

- **Evidencia (opcional):**
  - Adjunte documentos de soporte
  - Capturas de pantalla
  - Correos electrónicos

3. **Protección de Identidad:**
   - Puede ser anónimo o identificado
   - Si elige ser identificado, su información está encriptada

4. Haga clic en **Enviar Denuncia**

5. **Importante:** Guarde el **código de seguimiento** generado:
   - Ejemplo: `WB-2024-0001-ABCD`
   - Es la única forma de hacer seguimiento

### 7.2 Seguimiento de Denuncia

1. Acceda a `[URL]/whistleblower/track`
2. Ingrese su **código de seguimiento**
3. Verá:
   - Estado actual del caso
   - Actualizaciones del investigador
   - Posibilidad de agregar información adicional

### 7.3 Gestión de Casos (Interno)

#### Como Investigador

1. Vaya a **Canal de Denuncias** → **Dashboard**
2. Verá todos los casos:
   - Nuevos (sin asignar)
   - Asignados a usted
   - En investigación
   - Cerrados

3. **Tomar un Caso:**
   - Haga clic en un caso nuevo
   - **Asignar a mí**

4. **Investigar:**
   - Cambie estado a **En Investigación**
   - Documente hallazgos
   - Adjunte evidencia recopilada
   - Comuníquese con el denunciante (sin revelar su identidad)

5. **Línea de Tiempo:**
   - Registre cada acción en la línea de tiempo
   - Fechas de entrevistas
   - Documentos revisados
   - Decisiones tomadas

6. **Conclusión:**
   - Determine si la denuncia es:
     - Sustanciada
     - Parcialmente sustanciada
     - No sustanciada
   - Documente acciones tomadas
   - Cierre el caso

---

## 8. Cumplimiento Normativo

### 8.1 Catálogo de Regulaciones

1. Vaya a **Cumplimiento** → **Regulaciones**
2. Vea todas las normas aplicables
3. Filtre por:
   - Tipo (Ley, Reglamento, Norma, Política)
   - Autoridad emisora
   - Estado de vigencia

#### Registrar una Regulación

1. Haga clic en **+ Nueva Regulación**
2. Complete:
   - **Nombre de la norma**
   - **Número oficial**
   - **Autoridad emisora**
   - **Fecha de publicación**
   - **Fecha de vigencia**
   - **Alcance:** ¿A qué procesos aplica?

3. Adjunte el documento oficial
4. Guarde

### 8.2 Matriz de Aplicabilidad

Define qué normas aplican a qué procesos:

1. Vaya a una regulación
2. Sección **Aplicabilidad**
3. **Agregar Proceso:**
   - Seleccione procesos aplicables
   - Indique artículos específicos
   - Describa la obligación

### 8.3 Pruebas de Cumplimiento

#### Crear Prueba de Cumplimiento

1. Vaya a **Cumplimiento** → **Pruebas de Cumplimiento**
2. Haga clic en **+ Nueva Prueba**
3. Defina:
   - **Regulación** que se va a probar
   - **Artículo específico**
   - **Frecuencia** de la prueba
   - **Procedimiento** de prueba
   - **Responsable**

4. Vincule con controles relacionados
5. Guarde

#### Ejecutar Prueba

1. Cuando llegue la fecha, ejecute la prueba
2. Registre:
   - Fecha de ejecución
   - Procedimientos realizados
   - **Resultado:**
     - ✅ Conforme
     - ❌ No Conforme
     - ⚠️ Conforme con observaciones

3. Si hay no conformidad:
   - Cree un Plan de Acción
   - Asigne responsable
   - Defina plazo de corrección

4. Adjunte evidencia
5. Guarde resultados

### 8.4 Auditorías de Cumplimiento

Son auditorías especializadas en verificar cumplimiento:

1. Se crean igual que auditorías normales
2. El alcance se define por regulaciones en lugar de procesos
3. Las pruebas se enfocan en verificar cumplimiento de obligaciones específicas

---

## 9. Reportes y Dashboards

### 9.1 Dashboard Principal

Al iniciar sesión verá el dashboard con:

#### Indicadores Clave
- **Total de Riesgos** por nivel
- **Estado de Controles**
- **Auditorías en Curso**
- **Planes de Acción Vencidos**
- **Denuncias Activas**

#### Gráficos
- **Distribución de Riesgos por Categoría**
- **Top 10 Riesgos Extremos**
- **Efectividad de Controles**
- **Avance de Auditorías**
- **Cumplimiento Normativo**

### 9.2 Dashboards Especializados

#### Dashboard de Ejecutor
- Mis pruebas pendientes
- Próximos vencimientos
- Alertas de prioridad

#### Dashboard de Supervisor
- Pruebas pendientes de revisión
- Distribución de carga del equipo
- Métricas de desempeño

#### Dashboard Administrativo
- Vista ejecutiva consolidada
- Tendencias temporales
- Comparativos año a año

### 9.3 Generación de Reportes

1. Vaya a **Reportes**
2. Seleccione el tipo de reporte:
   - Reporte de Riesgos
   - Reporte de Controles
   - Reporte de Auditoría
   - Cumplimiento Normativo
   - Eventos de Riesgo

3. Configure filtros:
   - Período
   - Procesos
   - Categorías
   - Estados

4. Seleccione formato:
   - PDF
   - Excel

5. **Generar Reporte**

6. El reporte se descarga automáticamente

---

## 10. Configuración Personal

### 10.1 Mi Perfil

1. Haga clic en su nombre (esquina superior derecha)
2. Seleccione **Mi Perfil**
3. Puede actualizar:
   - Nombre
   - Email
   - Teléfono
   - Foto de perfil

### 10.2 Preferencias de Notificaciones

1. En **Mi Perfil** → **Notificaciones**
2. Configure:
   - Recibir notificaciones por email
   - Recibir notificaciones push
   - Frecuencia de resúmenes
   - Tipos de eventos a notificar

> 💡 **Mejora de Sistema:** El sistema ahora previene notificaciones duplicadas automáticamente. Si ya recibió una notificación sobre un caso en las últimas 24 horas, no recibirá duplicados, asegurando que su bandeja de notificaciones se mantenga limpia y relevante.

### 10.3 Cambiar Contraseña

1. **Mi Perfil** → **Seguridad**
2. Haga clic en **Cambiar Contraseña**
3. Ingrese:
   - Contraseña actual
   - Nueva contraseña
   - Confirmar nueva contraseña

4. **Guardar Cambios**

---

## 11. Asistente Inteligente

Unigrc incluye un asistente inteligente powered by Azure OpenAI que le ayuda a obtener respuestas rápidas sobre su información de riesgos, controles, auditorías y más.

### 11.1 Acceder al Asistente

El asistente está disponible desde cualquier página del sistema:

1. Busque el ícono de **chat** en la barra superior
2. Haga clic para abrir el panel del asistente
3. O use el atajo de teclado: `Alt+A` (Windows) o `Option+A` (Mac)

### 11.2 Hacer Preguntas

Puede hacer preguntas en **lenguaje natural** en español o inglés:

#### Ejemplos de Preguntas:
- "¿Cuántos riesgos extremos tenemos?"
- "Muéstrame los controles del proceso de compras"
- "¿Qué auditorías están en curso?"
- "Lista los planes de acción vencidos"
- "Dame un resumen de los eventos de riesgo recientes"
- "¿Qué regulaciones aplican al proceso financiero?"

### 11.3 Tipos de Consultas Soportadas

El asistente puede ayudarle con:

- **Riesgos:** Consultar riesgos por nivel, categoría, proceso
- **Controles:** Información sobre controles y su efectividad
- **Procesos:** Detalles de la estructura organizacional
- **Auditorías:** Estado y avances de auditorías
- **Regulaciones:** Normativa aplicable
- **Documentos:** Documentos normativos registrados
- **Eventos:** Eventos de riesgo materializados
- **Planes de Acción:** Estado y seguimiento de acciones
- **Consultas Generales:** Ayuda sobre cómo usar el sistema

### 11.4 Características del Asistente

#### Respuestas en Tiempo Real
- Las respuestas se muestran en tiempo real mientras se generan
- Indicador visual de procesamiento
- Formato enriquecido con listas, tablas y código cuando corresponde

#### Privacidad Garantizada
- **Datos seguros:** Su información solo se envía como contexto, nunca se almacena en Azure
- **Privacidad empresarial:** Los datos sensibles (emails, teléfonos, IDs) se sanitizan antes del envío
- **Sin entrenamiento:** Azure OpenAI no entrena modelos con sus datos

#### Inteligencia Contextual
- El asistente conoce el contexto de su organización
- Las respuestas se basan en sus datos reales del sistema
- Cache inteligente para respuestas rápidas a consultas frecuentes

### 11.5 Generación de Pruebas de Auditoría con IA

Una funcionalidad especial del asistente es la generación automática de sugerencias de pruebas de auditoría:

#### Cómo Usar:
1. Abra una **Auditoría** existente
2. Vaya a la sección **Programa de Trabajo**
3. Junto a cada riesgo verá un **ícono de chispa** (✨)
4. Haga clic en el ícono
5. El asistente analiza:
   - Objetivos y alcance de la auditoría
   - Detalles del proceso y subproceso
   - Información específica del riesgo
   - Controles asociados
   - Objetivos estratégicos
   - Regulaciones aplicables
   
6. Recibirá **3-5 sugerencias** de pruebas con:
   - Nombre de la prueba
   - Objetivo específico
   - Procedimientos detallados
   - Naturaleza (sustantiva/cumplimiento)
   - Tamaño de muestra recomendado
   - Criterios de evaluación

7. **Seleccione** las sugerencias que desea usar
8. Haga clic en **Crear Pruebas Seleccionadas**
9. Las pruebas se crean automáticamente en el programa de trabajo

### 11.6 Mejores Prácticas

#### Para Obtener Mejores Respuestas:
- Sea específico en sus preguntas
- Use términos relacionados con el dominio (riesgos, controles, procesos)
- Si no obtiene la respuesta esperada, reformule la pregunta
- Puede hacer preguntas de seguimiento en la misma conversación

#### Limitaciones:
- El asistente accede a datos del sistema, no puede crear o modificar información
- Hay un límite de 20 preguntas por minuto (10 para generación de contenido)
- Las respuestas se basan en la información registrada en el sistema

### 11.7 Historial de Conversación

- El historial de conversación se mantiene durante su sesión
- Puede desplazarse hacia arriba para revisar respuestas anteriores
- Para comenzar una nueva conversación, cierre y vuelva a abrir el asistente

---

## Preguntas Frecuentes (FAQ)

### ¿Cómo se calcula el riesgo residual?

```
Riesgo Residual = Riesgo Inherente × (1 - Efectividad de Controles)
```

Donde:
- **Riesgo Inherente** = Probabilidad × Impacto Ponderado
- **Efectividad de Controles** = Promedio de efectividad de todos los controles primarios

### ¿Qué significa soft-delete?

Cuando elimina un elemento, no se borra permanentemente. Se mueve a la **Papelera** desde donde puede restaurarse. Solo los administradores pueden eliminar permanentemente.

### ¿Cómo afectan los eventos de fraude a la planificación de auditorías?

Los eventos de riesgo marcados como fraude se detectan automáticamente y aumentan significativamente el score de prioridad del área afectada en la planificación anual de auditorías.

### ¿Por qué la navegación es tan rápida?

Unigrc utiliza un sistema de precarga inteligente que carga las páginas más comunes en segundo plano. Cuando pasa el mouse sobre un enlace del menú, la página se carga antes de hacer clic, resultando en navegación casi instantánea.

### ¿Recibiré notificaciones duplicadas?

No, el sistema previene automáticamente notificaciones duplicadas. Si ya recibió una notificación sobre un caso en las últimas 24 horas, no recibirá otra hasta que pase ese período.

### ¿Puedo tener múltiples gerencias en un proceso?

Sí, el sistema soporta relaciones muchos-a-muchos. Un proceso puede tener varias gerencias responsables y una gerencia puede ser responsable de múltiples procesos.

### ¿Qué pasa si cambio el alcance de una auditoría en curso?

Se crea una nueva versión del alcance que debe ser aprobada por el supervisor. El sistema mantiene el historial de todas las versiones.

### ¿Cómo se generan los códigos únicos?

El sistema genera automáticamente códigos secuenciales:
- C-0001, C-0002... para Controles
- R-0001, R-0002... para Riesgos
- E-0001, E-0002... para Eventos
- G-0001, G-0002... para Gerencias
- OE-0001, OE-0002... para Objetivos Estratégicos

---

## 12. Optimizaciones de Rendimiento

### 12.1 Navegación Rápida

Unigrc ha sido optimizado para ofrecer una experiencia de navegación ultrarrápida:

#### Sistema de Precarga Inteligente
- **Precarga Automática:** El sistema precarga automáticamente las 5 secciones más utilizadas en segundo plano mientras trabaja
- **Precarga al Pasar el Mouse:** Al pasar el mouse sobre los enlaces del menú lateral, la página se carga en segundo plano
- **Navegación Instantánea:** Una vez precargada, la navegación entre secciones es casi instantánea (<100ms)

#### Lazy Loading
- Las páginas se cargan de forma eficiente, solo descargando el código necesario
- Reduce el tiempo de carga inicial en un 60-70%
- Mejora significativa en dispositivos móviles y conexiones lentas

#### Mejores Prácticas para Usuarios
1. **Hover sobre enlaces:** Pase el mouse sobre los enlaces del menú antes de hacer clic para una navegación más rápida
2. **Uso de atajos:** Use `Cmd+K` (Mac) o `Ctrl+K` (Windows) para acceso rápido a cualquier sección
3. **Mantener pestañas activas:** La aplicación optimiza el rendimiento de las pestañas activas

### 12.2 Rendimiento en Móviles

La aplicación está optimizada para dispositivos iOS y Android:
- Carga rápida en redes 3G/4G
- Interfaz táctil optimizada
- Navegación por gestos (swipe) en vistas 360°
- Adaptación automática del tamaño de fuente y elementos

### 12.3 Mejoras de Carga

**Optimizaciones implementadas:**
- ⚡ Bundle 70% más pequeño (2.5MB → 800KB)
- 🚀 Tiempo de carga inicial reducido en 60% (3-4s → 1-1.5s)
- 📱 Navegación móvil optimizada
- 💾 Caché inteligente de datos del sistema
- 🔄 Compresión Gzip/Brotli para transferencias rápidas

### 12.4 Optimizaciones de Base de Datos (Nov 23, 2025)

La base de datos ha sido optimizada para manejar picos de tráfico sin timeouts:

**Conexiones Mejoradas:**
- ✅ Pool de conexiones aumentado a 10 (antes 6)
- ✅ Timeout extendido a 60 segundos (antes 30s)
- ✅ Retry automático inteligente con backoff exponencial
- ✅ Logging de queries lentas (>10 segundos) para identificar problemas

**Beneficios para el Usuario:**
- Cero timeouts de conexión en producción
- Mejor manejo de reportes complejos que procesan muchos datos
- Respuestas más rápidas durante picos de uso simultáneo
- Monitoreo automático para detectar problemas antes de afectar usuarios

**¿Por qué ocurren mejoras de rendimiento?**
El sistema ahora gestiona mejor la concurrencia cuando múltiples usuarios navegan simultáneamente, especialmente en dashboards pesados como el de administración que procesan cientos de riesgos, controles y auditorías.

---

## Glosario

| Término | Definición |
|---------|------------|
| **Riesgo Inherente** | Nivel de riesgo sin considerar controles |
| **Riesgo Residual** | Nivel de riesgo después de aplicar controles |
| **Control Primario** | Control principal para mitigar un riesgo |
| **Process Owner** | Responsable de un proceso |
| **CSA** | Control Self-Assessment (Autoevaluación de Controles) |
| **NOGAI** | Normas Generales de Auditoría Interna |
| **Soft-Delete** | Eliminación lógica (recuperable) |
| **Ad-hoc** | Riesgo identificado durante auditoría no catalogado previamente |
| **Whistleblower** | Denunciante / Canal de denuncias |
| **Hallazgo** | Observación de auditoría que requiere acción |

---

## Soporte

Para soporte técnico o preguntas sobre el uso del sistema:

- **Email:** soporte@unigrc.com
- **Teléfono:** [Número de soporte]
- **Manual en línea:** [URL]
- **Videos tutoriales:** [URL]

---

**Fin del Manual de Usuario**
