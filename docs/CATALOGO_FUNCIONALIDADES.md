# Catálogo de Funcionalidades - Unigrc

**Versión:** 2.0.0  
**Fecha:** Octubre 2025  
**Plataforma:** Unigrc (anteriormente RiskMatrix Pro) - Sistema Integral de Gestión de Riesgos y Auditoría



## Índice

1. [Gestión de Riesgos](#1-gestión-de-riesgos)
2. [Gestión de Controles](#2-gestión-de-controles)
3. [Gestión de Auditoría](#3-gestión-de-auditoría)
4. [Gestión Organizacional](#4-gestión-organizacional)
5. [Canal de Denuncias (Whistleblower)](#5-canal-de-denuncias-whistleblower)
6. [Cumplimiento Normativo](#6-cumplimiento-normativo)
7. [Planes de Acción](#7-planes-de-acción)
8. [Reportes y Analítica](#8-reportes-y-analítica)
9. [Administración del Sistema](#9-administración-del-sistema)
10. [Funcionalidades Transversales](#10-funcionalidades-transversales)
11. [Asistente Inteligente con IA](#11-asistente-inteligente-con-ia)

---

## 1. Gestión de Riesgos

### 1.1 Registro y Catalogación de Riesgos
- **Código Funcional:** RISK-001
- **Descripción:** Registro completo de riesgos con identificación única mediante códigos globales (R-XXXX)
- **Funcionalidades:**
  - Creación, edición y eliminación de riesgos
  - Clasificación por categorías de riesgo
  - Asignación a procesos mediante estructura jerárquica (Macroprocesos → Procesos → Subprocesos)
  - Relación con entidades fiscales
  - Soft-delete con papelera de reciclaje
  - Versionamiento de riesgos mediante snapshots

### 1.2 Evaluación de Riesgos
- **Código Funcional:** RISK-002
- **Descripción:** Evaluación multidimensional de riesgos usando metodología de probabilidad e impacto
- **Funcionalidades:**
  - Evaluación de probabilidad con criterios configurables
  - Evaluación de impacto en múltiples dimensiones (financiero, operacional, reputacional, cumplimiento, estratégico)
  - Cálculo automático de nivel de riesgo inherente
  - Cálculo de riesgo residual considerando efectividad de controles
  - Ponderación configurable por dimensión de impacto
  - Visualización en Matriz de Riesgos 5x5

### 1.3 Matriz de Riesgos Visual
- **Código Funcional:** RISK-003
- **Descripción:** Visualización interactiva de riesgos en matriz de probabilidad/impacto
- **Funcionalidades:**
  - Matriz 5x5 con códigos de colores (extremo, alto, medio, bajo)
  - Filtros por categoría, proceso y estado
  - Vista detallada de riesgos por celda
  - Exportación de visualización
  - Navegación drill-down a detalles de riesgo

### 1.4 Eventos de Riesgo
- **Código Funcional:** RISK-004
- **Descripción:** Registro y seguimiento de eventos de materialización de riesgos
- **Funcionalidades:**
  - Registro de eventos con código único (E-XXXX)
  - Clasificación por tipo (incidente, casi-incidente, oportunidad)
  - Vinculación con riesgos existentes
  - Registro de impacto financiero y no financiero
  - Análisis de causa raíz
  - Acciones correctivas y preventivas
  - Detección automática de eventos de fraude para auditoría
  - Soft-delete con papelera de reciclaje

### 1.5 Validación de Riesgos
- **Código Funcional:** RISK-005
- **Descripción:** Sistema de validación centralizada por proceso
- **Funcionalidades:**
  - Vista jerárquica de procesos con indicadores de estado
  - Validación de riesgos, controles y vínculos
  - Notificaciones de elementos pendientes
  - Flujo de aprobación multinivel
  - Historial de validaciones
  - Tokens de validación pública para responsables externos

### 1.6 Categorías de Riesgo
- **Código Funcional:** RISK-006
- **Descripción:** Taxonomía configurable de categorías de riesgo
- **Funcionalidades:**
  - CRUD de categorías de riesgo
  - Clasificación por tipo (estratégico, operacional, financiero, cumplimiento, etc.)
  - Asignación de colores distintivos
  - Ordenamiento jerárquico

---

## 2. Gestión de Controles

### 2.1 Catálogo de Controles
- **Código Funcional:** CTRL-001
- **Descripción:** Registro y gestión de controles para mitigación de riesgos
- **Funcionalidades:**
  - Creación con código único (C-XXXX)
  - Clasificación por tipo (preventivo, detectivo, correctivo)
  - Definición de frecuencia de ejecución
  - Asignación de responsables vía Process Owners
  - Vinculación a riesgos específicos
  - Soft-delete con papelera de reciclaje

### 2.2 Evaluación de Efectividad de Controles
- **Código Funcional:** CTRL-002
- **Descripción:** Sistema de evaluación periódica de efectividad de controles
- **Funcionalidades:**
  - Criterios de evaluación configurables
  - Opciones de calificación personalizables
  - Cálculo automático de efectividad (%)
  - Configuración de umbrales de efectividad
  - Impacto automático en cálculo de riesgo residual

### 2.3 Autoevaluación de Controles (CSA)
- **Código Funcional:** CTRL-003
- **Descripción:** Control Self-Assessment - autoevaluación por responsables
- **Funcionalidades:**
  - Interface simplificada para responsables de proceso
  - Evaluación periódica de controles asignados
  - Evidencia documental de cumplimiento
  - Historial completo de evaluaciones
  - Visualización de tendencias temporales
  - Alertas de evaluaciones vencidas

### 2.4 Vínculos Riesgo-Control
- **Código Funcional:** CTRL-004
- **Descripción:** Gestión de relaciones entre riesgos y controles
- **Funcionalidades:**
  - Asignación de múltiples controles por riesgo
  - Indicación de control primario
  - Validación de cobertura de riesgos
  - Visualización de matriz riesgo-control

---

## 3. Gestión de Auditoría

### 3.1 Planificación Anual de Auditoría
- **Código Funcional:** AUD-001
- **Descripción:** Sistema de planificación anual con wizard paso a paso
- **Funcionalidades:**
  - Wizard de 4 pasos (Información Básica → Alcance → Priorización → Calendario)
  - Auto-guardado en cada paso
  - Configuración del universo auditable
  - Selección granular de alcance (Macroprocesos/Procesos/Subprocesos)
  - Sistema de priorización automática con factores:
    - Nivel de riesgo inherente y residual
    - Eventos de fraude históricos (integración con Risk Events)
    - Tiempo desde última auditoría
    - Cambios organizacionales
    - Materialidad financiera
  - Asignación de auditorías al calendario anual
  - Flujo de aprobación por Director de Auditoría

### 3.2 Gestión de Auditorías (360° View NOGAI)
- **Código Funcional:** AUD-002
- **Descripción:** Vista completa de auditoría siguiendo estándares NOGAI 13-14-15
- **Funcionalidades:**
  - **11 Secciones Modulares:**
    1. Información General
    2. Objetivos de Auditoría
    3. Alcance con versionamiento
    4. Criterios de Auditoría
    5. Programa de Trabajo
    6. Pruebas de Auditoría
    7. Hallazgos
    8. Papeles de Trabajo
    9. Evaluación de Controles
    10. Re-evaluación de Riesgos
    11. Reportes e Informes
  - Código único por auditoría
  - Estados del ciclo de vida
  - Asignación de equipo auditor
  - Cronograma y seguimiento de avances

### 3.3 Alcance de Auditoría con Versionamiento
- **Código Funcional:** AUD-003
- **Descripción:** Control de versiones del alcance de auditoría
- **Funcionalidades:**
  - Creación de versiones de alcance
  - Aprobación de cambios por supervisor
  - Comparación entre versiones
  - Justificación de cambios
  - Historial completo de modificaciones
  - Selección jerárquica de entidades auditables

### 3.4 Programa de Trabajo
- **Código Funcional:** AUD-004
- **Descripción:** Definición y aprobación de programas de trabajo
- **Funcionalidades:**
  - Creación de procedimientos de auditoría
  - Vinculación con objetivos y criterios
  - Asignación de responsables y tiempos estimados
  - Flujo de aprobación por Director
  - Estado de cada procedimiento
  - Visualización de niveles de riesgo reevaluados

### 3.5 Pruebas de Auditoría
- **Código Funcional:** AUD-005
- **Descripción:** Gestión completa de pruebas de auditoría
- **Funcionalidades:**
  - Código secuencial único (AUD-{código}-TEST-{secuencia})
  - Creación manual y generación automática
  - Asignación de ejecutor y supervisor
  - Planificación temporal con alertas de vencimiento
  - Estados del ciclo de vida
  - Descripción de procedimientos
  - Resultados y conclusiones
  - Sistema de adjuntos con códigos únicos
  - Comentarios de revisión

### 3.6 Generación Automática de Pruebas
- **Código Funcional:** AUD-006
- **Descripción:** Sistema inteligente de generación de pruebas basado en alcance
- **Funcionalidades:**
  - Análisis del alcance de auditoría
  - Generación basada en riesgos identificados
  - Generación basada en controles a evaluar
  - Asignación automática de responsables
  - Priorización por nivel de riesgo
  - Cronograma sugerido

### 3.7 Hallazgos de Auditoría
- **Código Funcional:** AUD-007
- **Descripción:** Registro y seguimiento de hallazgos
- **Funcionalidades:**
  - Clasificación por severidad (crítico, alto, medio, bajo)
  - Vinculación con pruebas de auditoría
  - Descripción de condición, criterio, causa y efecto
  - Recomendaciones
  - Seguimiento de implementación
  - Estados de seguimiento

### 3.8 Papeles de Trabajo
- **Código Funcional:** AUD-008
- **Descripción:** Gestión de documentación de auditoría
- **Funcionalidades:**
  - Clasificación por categoría
  - Sistema de adjuntos
  - Referencias cruzadas
  - Control de versiones
  - Firma digital de revisión
  - Indexación y búsqueda

### 3.9 Evaluación de Controles en Auditoría
- **Código Funcional:** AUD-009
- **Descripción:** Re-evaluación de controles durante trabajo de campo (NOGAI 13.2)
- **Funcionalidades:**
  - Evaluación de diseño del control
  - Pruebas de eficacia operativa
  - Calificación con criterios predefinidos
  - Comparación con evaluación anterior
  - Identificación de brechas
  - Recomendaciones de mejora

### 3.10 Re-evaluación de Riesgos en Auditoría
- **Código Funcional:** AUD-010
- **Descripción:** Actualización de evaluación de riesgos post-auditoría
- **Funcionalidades:**
  - Re-evaluación de probabilidad e impacto
  - Comparación con evaluación original
  - Justificación de cambios
  - Identificación de nuevos riesgos (Riesgos Ad-hoc)
  - Actualización automática en programa de trabajo
  - Impacto en planificación futura

### 3.11 Riesgos Ad-hoc de Auditoría
- **Código Funcional:** AUD-011
- **Descripción:** Gestión de riesgos identificados durante trabajo de campo
- **Funcionalidades:**
  - Registro de riesgos no identificados previamente
  - Evaluación inicial de probabilidad e impacto
  - Vinculación con auditoría origen
  - Flujo de aprobación para inclusión en catálogo
  - Recomendaciones de controles
  - Seguimiento de implementación

### 3.12 Reportes de Auditoría
- **Código Funcional:** AUD-012
- **Descripción:** Generación de informes de auditoría
- **Funcionalidades:**
  - Plantillas configurables
  - Generación automática desde datos de auditoría
  - Inclusión de hallazgos, recomendaciones y conclusiones
  - Exportación a PDF
  - Distribución a stakeholders
  - Control de versiones de informes

### 3.13 Compromisos de Auditoría
- **Código Funcional:** AUD-013
- **Descripción:** Seguimiento de compromisos derivados de hallazgos
- **Funcionalidades:**
  - Registro de compromisos con responsables
  - Fechas compromiso y seguimiento
  - Estados de implementación
  - Alertas de vencimiento
  - Evidencia de cumplimiento
  - Histórico de seguimientos

---

## 4. Gestión Organizacional

### 4.1 Mapa de Procesos
- **Código Funcional:** ORG-001
- **Descripción:** Estructura jerárquica de procesos organizacionales
- **Funcionalidades:**
  - Tres niveles: Macroprocesos → Procesos → Subprocesos
  - Vista de árbol interactiva
  - Códigos únicos por nivel
  - Descripción y objetivos por proceso
  - Asignación de Process Owners
  - Vinculación con Gerencias y Objetivos Estratégicos
  - Soft-delete con papelera

### 4.2 Gerencias
- **Código Funcional:** ORG-002
- **Descripción:** Estructura de gerencias organizacionales
- **Funcionalidades:**
  - Código único global (G-XXXX)
  - Jerarquía de tres niveles (Gerencia → Subgerencia → Jefatura)
  - Asignación de Gerente responsable
  - Relación muchos-a-muchos con procesos (Macroprocesos/Procesos/Subprocesos)
  - Protección contra asignaciones duplicadas
  - Soft-delete con papelera
  - Vista consolidada de asignaciones

### 4.3 Objetivos Estratégicos
- **Código Funcional:** ORG-003
- **Descripción:** Definición y vinculación de objetivos estratégicos
- **Funcionalidades:**
  - Código único global (OE-XXXX)
  - Descripción de objetivo estratégico
  - Vinculación con procesos (muchos-a-muchos)
  - Análisis de riesgos a nivel estratégico
  - Soft-delete con papelera

### 4.4 Responsables (Process Owners)
- **Código Funcional:** ORG-004
- **Descripción:** Gestión unificada de responsables de procesos y gerentes
- **Funcionalidades:**
  - Registro de personas con datos de contacto
  - Rol dual: Process Owner y/o Gerente
  - Vista consolidada de asignaciones:
    - Gerencias a cargo
    - Procesos asignados
    - Subprocesos bajo responsabilidad
  - Diálogo de detalle de asignaciones
  - Búsqueda y filtrado

### 4.5 Entidades Fiscales
- **Código Funcional:** ORG-005
- **Descripción:** Catálogo de entidades fiscalizables
- **Funcionalidades:**
  - Registro de entidades con datos básicos
  - Vinculación opcional con procesos
  - Uso en alcance de auditoría
  - Clasificación y categorización

---

## 5. Canal de Denuncias (Whistleblower)

### 5.1 Sistema de Denuncias Anónimas
- **Código Funcional:** WHI-001
- **Descripción:** Plataforma segura para reportes de irregularidades
- **Funcionalidades:**
  - Formulario anónimo accesible públicamente
  - Generación de código de seguimiento único
  - Encriptación de identidad del denunciante
  - Categorización de denuncia
  - Adjuntos de evidencia
  - Protección de identidad

### 5.2 Seguimiento de Denuncias
- **Código Funcional:** WHI-002
- **Descripción:** Sistema de tracking para denunciantes
- **Funcionalidades:**
  - Consulta de estado con código de seguimiento
  - Actualizaciones de avance
  - Comunicación bidireccional anónima
  - Notificaciones de cambios de estado

### 5.3 Gestión de Casos
- **Código Funcional:** WHI-003
- **Descripción:** Administración interna de denuncias
- **Funcionalidades:**
  - Dashboard de casos activos
  - Asignación de investigadores
  - Estados del ciclo de vida del caso
  - Clasificación de severidad
  - Plazos de investigación
  - Línea de tiempo de eventos
  - Documentación de investigación
  - Conclusiones y acciones tomadas
  - Flujos de trabajo automatizados
  - Escalamiento automático por tiempo

### 5.4 Análisis de Denuncias
- **Código Funcional:** WHI-004
- **Descripción:** Reportes y estadísticas de canal de denuncias
- **Funcionalidades:**
  - Métricas de volumen y tendencias
  - Análisis por categoría
  - Tiempos promedio de resolución
  - Tasa de sustanciación
  - Identificación de patrones
  - Reportes ejecutivos

---

## 6. Cumplimiento Normativo

### 6.1 Catálogo de Regulaciones
- **Código Funcional:** COMP-001
- **Descripción:** Repositorio de normativa aplicable
- **Funcionalidades:**
  - Registro de leyes, reglamentos y normas
  - Clasificación por tipo y autoridad emisora
  - Vinculación con procesos y riesgos
  - Control de vigencia
  - Adjuntos de documentos legales
  - Alertas de actualizaciones normativas

### 6.2 Matriz de Cumplimiento
- **Código Funcional:** COMP-002
- **Descripción:** Relación entre regulaciones y operaciones
- **Funcionalidades:**
  - Aplicabilidad de normas por proceso
  - Identificación de obligaciones específicas
  - Vinculación con riesgos de cumplimiento
  - Estado de conformidad
  - Brechas identificadas

### 6.3 Pruebas de Cumplimiento
- **Código Funcional:** COMP-003
- **Descripción:** Evaluaciones periódicas de cumplimiento normativo
- **Funcionalidades:**
  - Diseño de pruebas por obligación
  - Programación de frecuencia
  - Ejecución y documentación
  - Resultados (conforme/no conforme)
  - Evidencia documental
  - Acciones correctivas

### 6.4 Auditorías de Cumplimiento
- **Código Funcional:** COMP-004
- **Descripción:** Auditorías especializadas en cumplimiento
- **Funcionalidades:**
  - Planificación enfocada en normativa
  - Alcance normativo específico
  - Evaluación de controles regulatorios
  - Hallazgos de incumplimiento
  - Planes de remediación
  - Reportes para autoridades

### 6.5 Documentos de Cumplimiento
- **Código Funcional:** COMP-005
- **Descripción:** Gestión documental de cumplimiento
- **Funcionalidades:**
  - Repositorio centralizado
  - Clasificación por normativa
  - Control de versiones
  - Fechas de vigencia
  - Acceso controlado
  - Búsqueda avanzada

### 6.6 Prevención de Delitos (Crime Prevention)
- **Código Funcional:** COMP-006
- **Descripción:** Sistema de prevención de delitos corporativos
- **Funcionalidades:**
  - Categorías de delitos configurables
  - Evaluación de riesgos de delito
  - Controles preventivos específicos
  - Programa de capacitación
  - Monitoreo de indicadores de alerta
  - Reportes de cumplimiento del programa

---

## 7. Planes de Acción

### 7.1 Gestión de Planes de Acción
- **Código Funcional:** ACT-001
- **Descripción:** Seguimiento de iniciativas de mejora
- **Funcionalidades:**
  - Creación vinculada a riesgos o hallazgos
  - Definición de acciones específicas
  - Asignación de responsables
  - Fechas planificadas vs. reales
  - Recursos necesarios
  - Estados de avance
  - Priorización

### 7.2 Seguimiento de Acciones
- **Código Funcional:** ACT-002
- **Descripción:** Monitoreo de ejecución de acciones
- **Funcionalidades:**
  - Dashboard de acciones por estado
  - Alertas de vencimiento
  - Registro de avances parciales
  - Evidencia de cumplimiento
  - Reprogramación justificada
  - Cierre con validación

### 7.3 Notificaciones Automatizadas (Infraestructura)
- **Código Funcional:** ACT-003
- **Descripción:** Sistema de notificaciones para planes de acción
- **Funcionalidades:**
  - Cola de notificaciones programadas
  - Múltiples canales (email, SMS, push)
  - Plantillas configurables
  - Reintentos automáticos
  - Historial de envíos
  - **Estado:** Infraestructura lista, pendiente activación

---

## 8. Reportes y Analítica

### 8.1 Dashboard Principal
- **Código Funcional:** REP-001
- **Descripción:** Panel de indicadores clave
- **Funcionalidades:**
  - KPIs de gestión de riesgos
  - Métricas de auditoría
  - Indicadores de cumplimiento
  - Distribución de riesgos por categoría
  - Estado de controles
  - Planes de acción en curso
  - Vistas personalizadas por rol

### 8.2 Dashboard de Ejecutor
- **Código Funcional:** REP-002
- **Descripción:** Vista para ejecutores de pruebas
- **Funcionalidades:**
  - Pruebas asignadas
  - Deadlines próximos
  - Avance personal
  - Alertas de prioridad

### 8.3 Dashboard de Supervisor
- **Código Funcional:** REP-003
- **Descripción:** Vista para supervisores de auditoría
- **Funcionalidades:**
  - Visión de equipo
  - Pruebas pendientes de revisión
  - Alertas de retrasos
  - Distribución de carga de trabajo
  - Métricas de desempeño

### 8.4 Dashboard Administrativo
- **Código Funcional:** REP-004
- **Descripción:** Vista ejecutiva para administradores
- **Funcionalidades:**
  - Métricas consolidadas
  - Tendencias temporales
  - Análisis comparativos
  - Alertas críticas
  - Indicadores de gestión

### 8.5 Reportes Personalizables
- **Código Funcional:** REP-005
- **Descripción:** Generador de reportes ad-hoc
- **Funcionalidades:**
  - Selección de módulos y datos
  - Filtros avanzados
  - Agrupación y ordenamiento
  - Gráficos y tablas
  - Exportación (PDF, Excel)
  - Guardado de plantillas
  - Programación de generación

### 8.6 Mapa de Relaciones de Riesgos
- **Código Funcional:** REP-006
- **Descripción:** Visualización interactiva de relaciones
- **Funcionalidades:**
  - Grafos de riesgos, controles y procesos
  - Navegación drill-down
  - Análisis de impacto cruzado
  - Identificación de puntos críticos
  - Exportación de visualizaciones

### 8.7 Mapa de Cadena de Valor
- **Código Funcional:** REP-007
- **Descripción:** Visualización dinámica de cadena de valor
- **Funcionalidades:**
  - Representación gráfica de macroprocesos
  - Superposición de riesgos por proceso
  - Indicadores de salud por proceso
  - Vista ejecutiva de exposición

---

## 9. Administración del Sistema

### 9.1 Gestión de Usuarios
- **Código Funcional:** ADM-001
- **Descripción:** Administración de cuentas de usuario
- **Funcionalidades:**
  - CRUD de usuarios
  - Asignación de roles
  - Estado de cuenta (activo/inactivo)
  - Datos de perfil
  - Historial de acceso
  - Restablecimiento de contraseñas

### 9.2 Gestión de Roles y Permisos
- **Código Funcional:** ADM-002
- **Descripción:** Control de acceso basado en roles
- **Funcionalidades:**
  - Definición de roles personalizados
  - Asignación granular de permisos
  - Permisos por módulo y funcionalidad
  - Roles predefinidos (Admin, Auditor, Ejecutor, Supervisor, etc.)
  - Herencia de permisos
  - Auditoría de cambios de permisos

### 9.3 Configuración del Sistema
- **Código Funcional:** ADM-003
- **Descripción:** Parámetros generales del sistema
- **Funcionalidades:**
  - Parámetros de evaluación de riesgos:
    - Criterios de probabilidad
    - Criterios de impacto por dimensión
    - Ponderaciones de impacto
    - Rangos de nivel de riesgo
    - Umbrales de efectividad de controles
  - Configuración de motor de aprobaciones
  - Políticas de revalidación
  - Configuración de notificaciones
  - Parámetros de seguridad

### 9.4 Configuración de Evaluación de Riesgos
- **Código Funcional:** ADM-004
- **Descripción:** Personalización de metodología de evaluación
- **Funcionalidades:**
  - **Criterios de Probabilidad:** Definición de escala (Raro, Improbable, Posible, Probable, Casi Cierto)
  - **Criterios de Impacto:** Por cada dimensión (Financiero, Operacional, Reputacional, Cumplimiento, Estratégico)
  - **Pesos de Impacto:** Ponderación relativa de cada dimensión (suma 100%)
  - **Rangos de Riesgo:** Umbrales para clasificación (Bajo, Medio, Alto, Extremo)
  - **Colores de Matriz:** Personalización visual

### 9.5 Gestión de Equipos de Auditoría
- **Código Funcional:** ADM-005
- **Descripción:** Administración de recursos humanos de auditoría
- **Funcionalidades:**
  - Registro de miembros del equipo
  - Perfiles de competencias
  - Roles de equipo (líder, senior, junior)
  - Disponibilidad y calendario
  - Carga de trabajo
  - Certificaciones y capacitaciones

### 9.6 Sistema de Aprobaciones
- **Código Funcional:** ADM-006
- **Descripción:** Motor de flujos de aprobación configurable
- **Funcionalidades:**
  - Definición de políticas de aprobación
  - Configuración de workflows
  - Jerarquía de aprobadores
  - Delegaciones temporales
  - Rutas de escalamiento
  - Dashboard de aprobaciones pendientes
  - Analítica de tiempos de aprobación
  - Auditoría completa de decisiones

### 9.7 Papelera de Reciclaje (Trash)
- **Código Funcional:** ADM-007
- **Descripción:** Sistema unificado de elementos eliminados
- **Funcionalidades:**
  - Vista consolidada de elementos eliminados:
    - Riesgos
    - Eventos de Riesgo
    - Controles
    - Gerencias
    - Objetivos Estratégicos
    - Macroprocesos, Procesos, Subprocesos
  - Restauración individual o masiva
  - Eliminación permanente (solo administradores)
  - Filtros por tipo de elemento
  - Búsqueda en papelera
  - Indicador de fecha de eliminación

---

## 10. Funcionalidades Transversales

### 10.1 Búsqueda Global
- **Código Funcional:** SYS-001
- **Descripción:** Búsqueda unificada en todo el sistema
- **Funcionalidades:**
  - Búsqueda full-text
  - Filtros por módulo
  - Búsqueda por código único
  - Sugerencias de autocompletado
  - Resultados con contexto

### 10.2 Sistema de Adjuntos
- **Código Funcional:** SYS-002
- **Descripción:** Gestión de archivos adjuntos
- **Funcionalidades:**
  - Carga múltiple de archivos
  - Integración con Google Cloud Storage
  - Códigos únicos de adjunto
  - Vista previa de documentos
  - Control de versiones
  - Límites de tamaño
  - Tipos de archivo permitidos

### 10.3 Códigos Únicos Globales
- **Código Funcional:** SYS-003
- **Descripción:** Sistema de identificadores únicos
- **Funcionalidades:**
  - Generación automática por tipo:
    - C-XXXX (Controles)
    - E-XXXX (Eventos de Riesgo)
    - R-XXXX (Riesgos)
    - G-XXXX (Gerencias)
    - OE-XXXX (Objetivos Estratégicos)
    - AUD-{código}-TEST-{secuencia} (Pruebas de Auditoría)
  - Secuencias auto-incrementales
  - Preservación en históricos

### 10.4 Auditoría de Cambios (Audit Trail)
- **Código Funcional:** SYS-004
- **Descripción:** Registro completo de modificaciones
- **Funcionalidades:**
  - Tracking de operaciones CRUD
  - Usuario, fecha y hora de cambio
  - Valores anteriores y nuevos
  - Razón de cambio (cuando aplica)
  - Consulta de histórico por entidad
  - Reportes de auditoría

### 10.5 Notificaciones del Sistema
- **Código Funcional:** SYS-005
- **Descripción:** Sistema integral de alertas y notificaciones con recordatorios configurables
- **Funcionalidades:**
  - **Notificaciones en Tiempo Real:**
    - Centro de notificaciones integrado
    - Notificaciones push web en navegador
    - Contador de notificaciones no leídas
    - Marcar como leído/no leído
  - **Notificaciones por Email:**
    - Servicio de email via Mailgun API
    - Plantillas HTML personalizables
    - Soporte para dominio sandbox y producción
    - Reintentos automáticos en caso de fallo
  - **Notificaciones por SMS:**
    - Integración con Twilio (configuración lista)
    - Envío de alertas críticas por SMS
  - **Sistema de Recordatorios para Planes de Acción:**
    - Configuración granular de intervalos de recordatorio
    - Toggle maestro para habilitar/deshabilitar recordatorios
    - 6 intervalos configurables individualmente:
      - 30 días antes del vencimiento
      - 15 días antes del vencimiento
      - 7 días antes del vencimiento
      - 3 días antes del vencimiento
      - 1 día antes del vencimiento
      - En la fecha de vencimiento
    - Persistencia en tabla `system_config`
    - Interfaz de administración en módulo de configuración
  - **Cola de Procesamiento:**
    - Procesamiento asíncrono de notificaciones
    - Prevención de notificaciones duplicadas (ventana de 24 horas)
    - Historial completo de notificaciones enviadas
    - Estado de entrega y seguimiento

### 10.6 Importación Masiva
- **Código Funcional:** SYS-006
- **Descripción:** Carga de datos vía Excel
- **Funcionalidades:**
  - Importación de riesgos
  - Importación de controles
  - Importación de procesos
  - Validación de datos
  - Reporte de errores
  - Rollback en caso de error

### 10.7 Manual del Sistema
- **Código Funcional:** SYS-007
- **Descripción:** Ayuda contextual integrada
- **Funcionalidades:**
  - Guías paso a paso
  - Videos tutoriales
  - FAQs por módulo
  - Búsqueda en ayuda
  - Actualización dinámica

### 10.8 Protección CSRF
- **Código Funcional:** SYS-008
- **Descripción:** Seguridad contra ataques CSRF
- **Funcionalidades:**
  - Double Submit Cookie pattern
  - Tokens de sesión
  - Validación automática en todas las peticiones
  - Configuración por entorno (dev/prod)

### 10.9 Filtros Globales
- **Código Funcional:** SYS-009
- **Descripción:** Sistema de filtrado unificado
- **Funcionalidades:**
  - Filtros por proceso en header
  - Aplicación consistente en todos los módulos
  - Persistencia de selección
  - Filtros combinados (AND/OR)
  - Guardado de vistas favoritas

---

## 11. Asistente Inteligente con IA

### 11.1 AI Assistant con Azure OpenAI
- **Código Funcional:** AI-001
- **Descripción:** Asistente inteligente integrado powered by Azure OpenAI (GPT-4o-mini)
- **Funcionalidades:**
  - **Inteligencia Empresarial:**
    - Motor de IA: Azure OpenAI GPT-4o-mini
    - Privacidad garantizada a nivel empresarial
    - Datos enviados solo como contexto, no almacenados por Azure
    - Multilingüe (español, inglés y otros idiomas)
  - **Estrategia de Respuesta de Tres Niveles:**
    - Respuestas directas para consultas ultra-simples (<100ms, sin API)
    - Cache en memoria con TTL de 5 minutos para consultas frecuentes
    - Procesamiento completo con Azure OpenAI para consultas complejas
  - **Detección Inteligente de Tipo de Pregunta:**
    - Análisis automático del tipo de consulta
    - Carga selectiva de contexto solo relevante
    - Tipos soportados: riesgos, controles, procesos, auditorías, regulaciones, documentos, eventos, planes de acción, consultas generales
  - **Gestión de Contexto Optimizada:**
    - Poda agresiva de contexto para reducir costos
    - Top 5 elementos para documentos y riesgos
    - Top 3 elementos para auditorías, eventos y planes de acción
    - Sanitización automática de datos sensibles (emails, teléfonos, IDs)
  - **Respuestas en Tiempo Real:**
    - Streaming via Server-Sent Events (SSE)
    - Respuestas progresivas para mejor UX
    - Indicadores visuales de procesamiento
  - **Control de Costos:**
    - Rate limiting: 20 solicitudes/minuto (general)
    - Rate limiting: 10 solicitudes/minuto (generación de contenido)
    - Cache automático con invalidación por tipo de dato
  - **Interfaz de Usuario:**
    - Chat integrado en el sistema
    - Historial de conversación
    - Markdown y formato enriquecido
    - Soporte para código y listas

### 11.2 Generación de Pruebas de Auditoría con IA
- **Código Funcional:** AI-002
- **Descripción:** Generación automática de sugerencias de pruebas de auditoría contextualizadas
- **Funcionalidades:**
  - **Análisis de Contexto Integral:**
    - Objetivos y criterios de auditoría
    - Alcance completo de la auditoría
    - Detalles de proceso/subproceso
    - Información específica del riesgo
    - Controles asociados al riesgo
    - Objetivos estratégicos relacionados
    - Regulaciones aplicables
    - Documentos normativos relevantes
  - **Generación de Sugerencias:**
    - 3-5 pruebas de auditoría sugeridas por riesgo
    - Estructura completa para cada prueba:
      - Nombre de la prueba
      - Objetivo específico
      - Procedimientos detallados paso a paso
      - Naturaleza (sustantiva/cumplimiento)
      - Recomendación de tamaño de muestra
      - Criterios de evaluación
  - **Creación Rápida:**
    - Selección múltiple de sugerencias
    - Creación de todas las pruebas seleccionadas con un clic
    - Asignación automática al programa de trabajo
  - **Acceso:**
    - Icono de chispa (sparkle) junto a cada riesgo en Programa de Trabajo
    - Endpoint: `/api/audits/:id/ai-test-suggestions`
    - Rate limiting: 10 solicitudes/minuto
  - **Privacidad y Seguridad:**
    - Sanitización de datos antes de envío a Azure
    - Sin almacenamiento de datos por Azure OpenAI
    - Procesamiento bajo demanda

---

## Resumen Cuantitativo

### Módulos Principales: 11
1. Gestión de Riesgos
2. Gestión de Controles
3. Gestión de Auditoría
4. Gestión Organizacional
5. Canal de Denuncias
6. Cumplimiento Normativo
7. Planes de Acción
8. Reportes y Analítica
9. Administración del Sistema
10. Funcionalidades Transversales
11. Asistente Inteligente con IA

### Funcionalidades Totales: 95+

### Entidades de Base de Datos: 100+

### Páginas/Vistas: 60+

### Estándares Cumplidos:
- NOGAI 13: Gestión de Riesgos
- NOGAI 14: Auditoría Interna
- NOGAI 15: Gestión de Cumplimiento
- COSO ERM: Enterprise Risk Management
- ISO 31000: Gestión de Riesgos

---

**Fin del Catálogo de Funcionalidades**
