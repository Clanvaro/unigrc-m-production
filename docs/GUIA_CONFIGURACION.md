# Guía de Configuración - Unigrc

**Versión:** 2.0.0  
**Fecha:** Octubre 2025  
**Plataforma:** Unigrc (anteriormente RiskMatrix Pro)  
**Audiencia:** Administradores del Sistema

---

## Índice

1. [Configuración del Sistema](#1-configuración-del-sistema)
2. [Metodología de Evaluación de Riesgos](#2-metodología-de-evaluación-de-riesgos)
3. [Configuración de Controles](#3-configuración-de-controles)
4. [Configuración de Auditoría](#4-configuración-de-auditoría)
5. [Motor de Aprobaciones](#5-motor-de-aprobaciones)
6. [Notificaciones](#6-notificaciones)
7. [Personalización Visual](#7-personalización-visual)
8. [Integraciones](#8-integraciones)

---

## 1. Configuración del Sistema

### 1.1 Acceso a Configuración

Como administrador:

1. Inicie sesión con credenciales de administrador
2. Vaya a **Configuración** en el menú lateral
3. Tendrá acceso a todos los módulos de configuración

### 1.2 Configuración General

#### Información de la Organización

**Ruta:** Configuración → General

Campos configurables:
- **Nombre de la Organización**
- **Logo** (sube imagen, se muestra en header y reportes)
- **Timezone:** UTC, America/New_York, etc.
- **Idioma:** Español (ES), Inglés (EN)
- **Formato de Fecha:** DD/MM/YYYY, MM/DD/YYYY
- **Moneda por Defecto:** USD, EUR, MXN, etc.

#### Parámetros de Sesión

```json
{
  "session_timeout": 1800,  // Segundos (30 min)
  "max_concurrent_sessions": 3,
  "require_password_change_days": 90,
  "password_min_length": 8,
  "password_require_special_chars": true
}
```

**Acceso:** Configuración → Seguridad → Sesiones

### 1.3 Roles y Permisos

#### Roles Predefinidos

| Rol | Descripción | Permisos Clave |
|-----|-------------|----------------|
| **admin** | Administrador total | Todos (*) |
| **risk_manager** | Gestor de riesgos | CRUD riesgos, controles |
| **audit_director** | Director de auditoría | Aprobar planes, programas |
| **auditor** | Auditor | CRUD auditorías, pruebas, hallazgos |
| **executor** | Ejecutor de pruebas | Crear/editar pruebas asignadas |
| **supervisor** | Supervisor | Revisar pruebas |
| **process_owner** | Dueño de proceso | Validar riesgos, CSA |
| **reader** | Solo lectura | Ver todo, sin editar |

#### Crear Rol Personalizado

**Ruta:** Configuración → Roles → + Nuevo Rol

1. **Nombre:** Ej: "Analista de Compliance"
2. **Descripción:** Descripción del rol
3. **Permisos:** Seleccione granularmente:

```json
{
  "risks": ["read", "create", "update"],
  "controls": ["read"],
  "audits": ["read"],
  "compliance": ["read", "create", "update", "delete"],
  "reports": ["read", "export"]
}
```

Permisos disponibles por módulo:
- `read` - Ver
- `create` - Crear
- `update` - Editar
- `delete` - Eliminar
- `approve` - Aprobar
- `export` - Exportar

#### Asignar Roles a Usuarios

**Ruta:** Configuración → Usuarios → [Usuario] → Roles

1. Seleccione el usuario
2. Haga clic en **Asignar Rol**
3. Seleccione uno o múltiples roles
4. Guarde

> 💡 **Nota:** Un usuario puede tener múltiples roles. Los permisos se combinan (unión).

---

## 2. Metodología de Evaluación de Riesgos

### 2.1 Criterios de Probabilidad

**Ruta:** Configuración → Evaluación de Riesgos → Probabilidad

Define la escala de 1 a 5 para la probabilidad de ocurrencia de riesgos.

#### Configuración por Defecto

| Nivel | Etiqueta | Descripción | Frecuencia Esperada |
|-------|----------|-------------|---------------------|
| 1 | Raro | Puede ocurrir en circunstancias excepcionales | < 1% anual |
| 2 | Improbable | Podría ocurrir en algún momento | 1-10% anual |
| 3 | Posible | Puede ocurrir ocasionalmente | 10-30% anual |
| 4 | Probable | Probablemente ocurrirá | 30-70% anual |
| 5 | Casi Cierto | Se espera que ocurra frecuentemente | > 70% anual |

#### Personalizar Criterios

Ejemplo de configuración JSON:

```json
{
  "criteria": [
    {
      "level": 1,
      "label": "Muy Bajo",
      "description": "Evento extremadamente raro",
      "frequency_description": "Una vez cada 5+ años",
      "color": "#10b981"
    },
    {
      "level": 2,
      "label": "Bajo",
      "description": "Evento poco probable",
      "frequency_description": "Una vez cada 2-5 años",
      "color": "#84cc16"
    },
    {
      "level": 3,
      "label": "Medio",
      "description": "Evento ocasional",
      "frequency_description": "Una vez al año",
      "color": "#facc15"
    },
    {
      "level": 4,
      "label": "Alto",
      "description": "Evento frecuente",
      "frequency_description": "Varias veces al año",
      "color": "#f97316"
    },
    {
      "level": 5,
      "label": "Muy Alto",
      "description": "Evento casi seguro",
      "frequency_description": "Mensual o más frecuente",
      "color": "#ef4444"
    }
  ]
}
```

### 2.2 Criterios de Impacto

**Ruta:** Configuración → Evaluación de Riesgos → Impacto

Define criterios para cada dimensión de impacto (1-5):

#### Dimensiones de Impacto

1. **Financiero**
2. **Operacional**
3. **Reputacional**
4. **Cumplimiento**
5. **Estratégico**

#### Ejemplo: Impacto Financiero

| Nivel | Etiqueta | Descripción | Rango Monetario |
|-------|----------|-------------|-----------------|
| 1 | Insignificante | Pérdida mínima | < $10,000 |
| 2 | Menor | Pérdida pequeña | $10,000 - $50,000 |
| 3 | Moderado | Pérdida significativa | $50,000 - $250,000 |
| 4 | Mayor | Pérdida sustancial | $250,000 - $1M |
| 5 | Catastrófico | Pérdida crítica | > $1M |

#### Ejemplo: Impacto Reputacional

| Nivel | Etiqueta | Descripción |
|-------|----------|-------------|
| 1 | Insignificante | Sin impacto en la reputación |
| 2 | Menor | Comentarios negativos locales |
| 3 | Moderado | Cobertura negativa en medios locales |
| 4 | Mayor | Cobertura negativa nacional |
| 5 | Catastrófico | Crisis reputacional severa, pérdida de confianza |

#### Personalizar Impacto

Configuración JSON por dimensión:

```json
{
  "dimension": "financial",
  "display_name": "Financiero",
  "criteria": [
    {
      "level": 1,
      "label": "Mínimo",
      "description": "Pérdida insignificante",
      "monetary_range": "< $10,000",
      "color": "#10b981"
    },
    {
      "level": 2,
      "label": "Bajo",
      "description": "Pérdida menor",
      "monetary_range": "$10,000 - $50,000",
      "color": "#84cc16"
    }
    // ... hasta nivel 5
  ]
}
```

### 2.3 Ponderación de Dimensiones de Impacto

**Ruta:** Configuración → Evaluación de Riesgos → Ponderaciones

Define el peso relativo de cada dimensión. La suma debe ser 100%.

#### Configuración por Defecto

```json
{
  "weights": {
    "financial": 30,
    "operational": 25,
    "reputational": 20,
    "compliance": 15,
    "strategic": 10
  }
}
```

#### Ejemplo Alternativo: Organización de Cumplimiento

```json
{
  "weights": {
    "financial": 15,
    "operational": 20,
    "reputational": 10,
    "compliance": 40,  // Mayor peso en compliance
    "strategic": 15
  }
}
```

**Impacto en Cálculo:**

```
Impacto Ponderado = 
  (Financiero × 0.30) +
  (Operacional × 0.25) +
  (Reputacional × 0.20) +
  (Cumplimiento × 0.15) +
  (Estratégico × 0.10)
```

### 2.4 Rangos de Nivel de Riesgo

**Ruta:** Configuración → Evaluación de Riesgos → Rangos de Riesgo

Define los umbrales que determinan si un riesgo es Bajo, Medio, Alto o Extremo.

#### Configuración por Defecto

```json
{
  "ranges": [
    {
      "level": "low",
      "label": "Bajo",
      "min": 0,
      "max": 6,
      "color": "#10b981",
      "action": "Aceptar y monitorear"
    },
    {
      "level": "medium",
      "label": "Medio",
      "min": 6.01,
      "max": 12,
      "color": "#facc15",
      "action": "Reducir o transferir"
    },
    {
      "level": "high",
      "label": "Alto",
      "min": 12.01,
      "max": 20,
      "color": "#f97316",
      "action": "Reducir inmediatamente"
    },
    {
      "level": "extreme",
      "label": "Extremo",
      "min": 20.01,
      "max": 25,
      "color": "#ef4444",
      "action": "Acción urgente requerida"
    }
  ]
}
```

**Cálculo del Riesgo Inherente:**

```
Riesgo Inherente = Probabilidad × Impacto Ponderado
```

Con escala 1-5 para ambos:
- Mínimo: 1 × 1 = 1
- Máximo: 5 × 5 = 25

---

## 3. Configuración de Controles

### 3.1 Criterios de Evaluación de Controles

**Ruta:** Configuración → Controles → Criterios de Evaluación

Define los criterios para evaluar la efectividad de controles.

#### Criterios por Defecto

| Criterio | Descripción | Peso |
|----------|-------------|------|
| **Diseño** | ¿El control está bien diseñado? | 25% |
| **Implementación** | ¿El control está implementado correctamente? | 25% |
| **Documentación** | ¿El control está documentado? | 15% |
| **Frecuencia** | ¿Se ejecuta con la frecuencia requerida? | 20% |
| **Monitoreo** | ¿Se monitorea y revisa el control? | 15% |

**Total:** 100%

#### Personalizar Criterios

```json
{
  "criteria": [
    {
      "id": "design",
      "name": "Diseño del Control",
      "description": "Evalúa si el control está adecuadamente diseñado",
      "weight": 25,
      "order": 1,
      "is_active": true
    },
    {
      "id": "implementation",
      "name": "Implementación",
      "description": "Evalúa la correcta implementación",
      "weight": 25,
      "order": 2,
      "is_active": true
    }
    // ... más criterios
  ]
}
```

### 3.2 Opciones de Calificación

**Ruta:** Configuración → Controles → Opciones de Calificación

Define las opciones de respuesta para cada criterio.

#### Configuración por Defecto

```json
{
  "options": [
    {
      "value": 5,
      "label": "Excelente",
      "description": "Totalmente conforme sin deficiencias",
      "percentage": 100
    },
    {
      "value": 4,
      "label": "Bueno",
      "description": "Conforme con deficiencias menores",
      "percentage": 80
    },
    {
      "value": 3,
      "label": "Aceptable",
      "description": "Conforme con algunas deficiencias",
      "percentage": 60
    },
    {
      "value": 2,
      "label": "Deficiente",
      "description": "Parcialmente conforme",
      "percentage": 40
    },
    {
      "value": 1,
      "label": "Inadecuado",
      "description": "No conforme",
      "percentage": 0
    }
  ]
}
```

### 3.3 Umbrales de Efectividad

**Ruta:** Configuración → Controles → Umbrales

Define los umbrales que determinan si un control es efectivo.

```json
{
  "thresholds": {
    "effective": 80,        // ≥ 80% = Efectivo
    "partially_effective": 60,  // 60-79% = Parcialmente efectivo
    "ineffective": 60       // < 60% = Inefectivo
  }
}
```

**Impacto en Riesgo Residual:**

```
Efectividad Total = Promedio ponderado de criterios
Riesgo Residual = Riesgo Inherente × (1 - Efectividad/100)
```

Ejemplo:
- Riesgo Inherente: 20
- Efectividad de Controles: 75%
- Riesgo Residual: 20 × (1 - 0.75) = 5

---

## 4. Configuración de Auditoría

### 4.1 Algoritmo de Priorización de Auditorías

**Ruta:** Configuración → Auditoría → Priorización

Define los factores y pesos para calcular el score de prioridad.

#### Configuración por Defecto

```json
{
  "prioritization_factors": {
    "inherent_risk_weight": 0.25,
    "residual_risk_weight": 0.20,
    "fraud_events_weight": 0.25,
    "time_since_last_audit_weight": 0.15,
    "organizational_changes_weight": 0.10,
    "materiality_weight": 0.05
  }
}
```

**Total:** 1.00 (100%)

#### Explicación de Factores

**1. Riesgo Inherente (25%)**
- Score basado en el nivel de riesgo promedio del área
- Extremo: 100 pts, Alto: 75 pts, Medio: 50 pts, Bajo: 25 pts

**2. Riesgo Residual (20%)**
- Similar al inherente, pero considera efectividad de controles
- Incentiva auditar áreas con controles débiles

**3. Eventos de Fraude (25%)**
- Detectado automáticamente de Risk Events marcados como fraude
- Cada evento de fraude = +25 puntos
- Máximo: 100 puntos (4+ eventos)

**4. Tiempo desde Última Auditoría (15%)**
- Scoring:
  - > 3 años: 100 pts
  - 2-3 años: 75 pts
  - 1-2 años: 50 pts
  - < 1 año: 25 pts

**5. Cambios Organizacionales (10%)**
- Nuevos procesos, fusiones, cambios de sistemas
- Manual o automático (si integrado con HRIS)

**6. Materialidad Financiera (5%)**
- Basado en presupuesto/ingresos del área

#### Personalizar Factores

Ejemplo para organización enfocada en compliance:

```json
{
  "prioritization_factors": {
    "inherent_risk_weight": 0.20,
    "residual_risk_weight": 0.15,
    "fraud_events_weight": 0.30,  // Mayor peso
    "time_since_last_audit_weight": 0.20,  // Mayor peso
    "organizational_changes_weight": 0.10,
    "materiality_weight": 0.05
  }
}
```

### 4.2 Tipos de Auditoría

**Ruta:** Configuración → Auditoría → Tipos de Auditoría

Define los tipos de auditoría disponibles.

```json
{
  "audit_types": [
    {
      "code": "operational",
      "name": "Auditoría Operacional",
      "description": "Evaluación de eficiencia y efectividad operacional",
      "standard_duration_days": 30
    },
    {
      "code": "compliance",
      "name": "Auditoría de Cumplimiento",
      "description": "Verificación de cumplimiento normativo",
      "standard_duration_days": 20
    },
    {
      "code": "financial",
      "name": "Auditoría Financiera",
      "description": "Revisión de estados financieros",
      "standard_duration_days": 45
    },
    {
      "code": "it",
      "name": "Auditoría de TI",
      "description": "Evaluación de controles de tecnología",
      "standard_duration_days": 25
    }
  ]
}
```

### 4.3 Workflow de Estados de Auditoría

**Ruta:** Configuración → Auditoría → Estados

```json
{
  "workflow": {
    "states": [
      "planning",
      "fieldwork",
      "reporting",
      "completed",
      "cancelled"
    ],
    "transitions": {
      "planning": ["fieldwork", "cancelled"],
      "fieldwork": ["reporting", "planning"],
      "reporting": ["completed", "fieldwork"],
      "completed": [],
      "cancelled": []
    }
  }
}
```

### 4.4 Generación Automática de Pruebas

**Ruta:** Configuración → Auditoría → Generación de Pruebas

```json
{
  "auto_generation": {
    "enabled": true,
    "default_tests_per_risk": 2,
    "default_tests_per_control": 1,
    "auto_assign": true,
    "assignment_algorithm": "balanced_workload"
  }
}
```

Algoritmos de asignación:
- `balanced_workload`: Distribuye equitativamente
- `expertise_based`: Asigna según competencias
- `random`: Asignación aleatoria

---

## 5. Motor de Aprobaciones

### 5.1 Configuración General

**Ruta:** Configuración → Aprobaciones → General

```json
{
  "approval_engine": {
    "enabled": true,
    "default_approval_required": false,
    "escalation_enabled": true,
    "escalation_after_hours": 48,
    "reminder_frequency_hours": 24,
    "delegation_allowed": true
  }
}
```

### 5.2 Políticas de Aprobación

Define qué entidades requieren aprobación y quiénes aprueban.

#### Ejemplo: Aprobación de Auditorías

```json
{
  "entity": "audit_plan",
  "approval_required": true,
  "approval_hierarchy": [
    {
      "level": 1,
      "role": "audit_director",
      "min_approvers": 1,
      "all_required": true
    }
  ],
  "auto_approve_if_no_response_after_days": null
}
```

#### Ejemplo: Aprobación de Programas de Trabajo

```json
{
  "entity": "audit_program",
  "approval_required": true,
  "approval_hierarchy": [
    {
      "level": 1,
      "role": "audit_director",
      "min_approvers": 1
    }
  ]
}
```

#### Ejemplo: Aprobación de Hallazgos Críticos

```json
{
  "entity": "audit_finding",
  "condition": "severity = 'critical'",
  "approval_required": true,
  "approval_hierarchy": [
    {
      "level": 1,
      "role": "audit_director",
      "min_approvers": 1
    },
    {
      "level": 2,
      "role": "ceo",
      "min_approvers": 1
    }
  ],
  "escalation": {
    "enabled": true,
    "skip_levels_after_hours": 72
  }
}
```

### 5.3 Delegaciones

Permite a aprobadores delegar temporalmente sus responsabilidades.

**Ruta:** Configuración → Aprobaciones → Delegaciones

```json
{
  "delegation": {
    "allowed": true,
    "max_delegation_days": 30,
    "require_reason": true,
    "notify_delegator_on_action": true
  }
}
```

---

## 6. Notificaciones

### 6.1 Canales de Notificación

**Ruta:** Configuración → Notificaciones → Canales

```json
{
  "channels": {
    "in_app": {
      "enabled": true,
      "retention_days": 30
    },
    "email": {
      "enabled": true,
      "provider": "mailgun",
      "from_email": "noreply@riskmatrixpro.com",
      "from_name": "RiskMatrix Pro"
    },
    "sms": {
      "enabled": false,
      "provider": "twilio"
    },
    "push": {
      "enabled": false
    }
  }
}
```

### 6.2 Eventos de Notificación

Define qué eventos disparan notificaciones.

**Ruta:** Configuración → Notificaciones → Eventos

```json
{
  "events": {
    "audit_test_assigned": {
      "enabled": true,
      "channels": ["in_app", "email"],
      "recipients": ["executor"],
      "priority": "normal"
    },
    "audit_test_due_soon": {
      "enabled": true,
      "channels": ["in_app", "email"],
      "recipients": ["executor", "supervisor"],
      "trigger_days_before": 3,
      "priority": "high"
    },
    "audit_test_overdue": {
      "enabled": true,
      "channels": ["in_app", "email", "sms"],
      "recipients": ["executor", "supervisor", "audit_director"],
      "priority": "urgent"
    },
    "finding_created": {
      "enabled": true,
      "channels": ["in_app", "email"],
      "recipients": ["process_owner", "audit_director"],
      "priority": "high"
    },
    "approval_request": {
      "enabled": true,
      "channels": ["in_app", "email"],
      "recipients": ["approver"],
      "priority": "high"
    }
  }
}
```

### 6.3 Plantillas de Email

**Ruta:** Configuración → Notificaciones → Plantillas

#### Plantilla: Prueba Asignada

```html
<h2>Nueva Prueba de Auditoría Asignada</h2>

<p>Hola {{executor_name}},</p>

<p>Se te ha asignado una nueva prueba de auditoría:</p>

<ul>
  <li><strong>Código:</strong> {{test_code}}</li>
  <li><strong>Auditoría:</strong> {{audit_name}}</li>
  <li><strong>Fecha Límite:</strong> {{due_date}}</li>
</ul>

<p>
  <a href="{{app_url}}/audit-test/{{test_id}}">Ver Prueba</a>
</p>

<p>Saludos,<br>RiskMatrix Pro</p>
```

Variables disponibles:
- `{{executor_name}}`, `{{supervisor_name}}`, etc.
- `{{test_code}}`, `{{test_name}}`
- `{{audit_name}}`, `{{audit_code}}`
- `{{due_date}}`
- `{{app_url}}`

### 6.4 Frecuencia de Notificaciones

**Ruta:** Configuración → Notificaciones → Frecuencia

```json
{
  "frequency": {
    "immediate_events": ["approval_request", "urgent_alert"],
    "digest_frequency": "daily",  // daily, weekly, never
    "digest_time": "08:00",  // Hora del día (24h format)
    "max_notifications_per_day": 10,
    "quiet_hours": {
      "enabled": true,
      "start": "20:00",
      "end": "08:00"
    }
  }
}
```

---

## 7. Personalización Visual

### 7.1 Temas y Colores

**Ruta:** Configuración → Apariencia → Tema

```json
{
  "theme": {
    "primary_color": "#1e40af",
    "secondary_color": "#64748b",
    "accent_color": "#f59e0b",
    "success_color": "#10b981",
    "warning_color": "#f59e0b",
    "error_color": "#ef4444",
    "info_color": "#3b82f6"
  }
}
```

### 7.2 Logo y Branding

**Ruta:** Configuración → Apariencia → Branding

- **Logo Principal:** Mostrado en header (recomendado: 200x50px)
- **Logo Pequeño:** Para favicon (32x32px)
- **Logo para Reportes:** Versión de alta resolución (300 DPI)

### 7.3 Personalización de Reportes

**Ruta:** Configuración → Reportes → Plantillas

```json
{
  "report_branding": {
    "header_color": "#1e40af",
    "show_logo": true,
    "show_date": true,
    "show_page_numbers": true,
    "footer_text": "Confidencial - {{organization_name}}",
    "watermark": "BORRADOR"  // o null
  }
}
```

---

## 8. Integraciones

### 8.1 Google Cloud Storage

**Variables de Entorno:**

```bash
GOOGLE_CLOUD_PROJECT=your-project-id
GOOGLE_CLOUD_KEYFILE=/path/to/keyfile.json
PUBLIC_OBJECT_SEARCH_PATHS=/public
PRIVATE_OBJECT_DIR=/.private
```

**Configuración en UI:**

**Ruta:** Configuración → Integraciones → Google Cloud Storage

- **Status:** Conectado / Desconectado
- **Bucket Name:** riskmatrix-storage
- **Public URL Base:** https://storage.googleapis.com/riskmatrix-storage/public
- **Max File Size:** 50 MB
- **Allowed File Types:** PDF, DOCX, XLSX, PNG, JPG

### 8.2 Servicios de Email (Mailgun / SMTP)

El sistema soporta dos proveedores de email: Mailgun y SMTP.

#### 8.2.1 Mailgun

**Variables de Entorno:**

```bash
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM=noreply@yourdomain.com
```

**Configuración en UI:**

**Ruta:** Configuración → Integraciones → Email

- **Provider:** Mailgun
- **Status:** Conectado / Desconectado
- **API Key:** xxx... (parcialmente ocultado)
- **Domain:** mg.yourdomain.com
- **From Email:** noreply@yourdomain.com

#### 8.2.2 SMTP

**Variables de Entorno:**

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
SMTP_FROM=noreply@yourdomain.com
```

**Configuración en UI:**

**Ruta:** Configuración → Integraciones → Email

- **Provider:** SMTP
- **Status:** Conectado / Desconectado
- **Host:** smtp.gmail.com
- **Port:** 587
- **From Email:** noreply@yourdomain.com

**Test:**
Botón "Enviar Email de Prueba" para verificar configuración.

### 8.3 Twilio (SMS)

**Variables de Entorno:**

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Configuración en UI:**

**Ruta:** Configuración → Integraciones → Twilio

- **Status:** Conectado / Desconectado
- **Account SID:** ACxxx... (parcialmente ocultado)
- **Phone Number:** +1 (234) 567-8901
- **SMS Enabled:** Sí / No

**Uso:**
SMS se usa solo para notificaciones urgentes configuradas en Eventos.

---

## 9. Configuración Avanzada

### 9.1 Variables de Entorno Críticas

```bash
# Base de Datos
DATABASE_URL=postgresql://...

# Seguridad
SESSION_SECRET=min-32-caracteres-aleatorios
CSRF_SECRET=min-32-caracteres-aleatorios

# Entorno
NODE_ENV=production  # production, development, staging

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT=project-id
GOOGLE_CLOUD_KEYFILE=./credentials/keyfile.json
PUBLIC_OBJECT_SEARCH_PATHS=/public
PRIVATE_OBJECT_DIR=/.private

# Email (Mailgun)
MAILGUN_API_KEY=your-mailgun-key
MAILGUN_DOMAIN=mg.yourdomain.com
MAILGUN_FROM=noreply@yourdomain.com

# Email (SMTP)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

# SMS
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# Push Notifications
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx

# Redis (opcional)
REDIS_URL=redis://localhost:6379
```

### 9.2 Límites y Cuotas

**Configuración en DB (system_config):**

```json
{
  "limits": {
    "max_file_upload_size_mb": 50,
    "max_attachments_per_test": 10,
    "max_users": 100,
    "max_concurrent_audits": 20,
    "api_rate_limit_per_minute": 100
  }
}
```

### 9.3 Mantenimiento y Limpieza

**Configuración Automática:**

```json
{
  "maintenance": {
    "auto_delete_old_sessions": true,
    "session_retention_days": 30,
    "auto_archive_completed_audits": true,
    "audit_archive_after_days": 365,
    "trash_permanent_delete_after_days": 90
  }
}
```

---

## 10. Checklist de Configuración Inicial

Después de la instalación, configure lo siguiente:

### Configuración Esencial (Obligatoria)
- [ ] Información de la organización
- [ ] Logo corporativo
- [ ] Crear usuario administrador
- [ ] Crear roles básicos
- [ ] Crear al menos un Process Owner
- [ ] Configurar criterios de probabilidad
- [ ] Configurar criterios de impacto
- [ ] Configurar pesos de impacto
- [ ] Configurar rangos de riesgo
- [ ] Configurar criterios de evaluación de controles

### Configuración Recomendada
- [ ] Tipos de auditoría
- [ ] Algoritmo de priorización de auditorías
- [ ] Políticas de aprobación básicas
- [ ] Eventos de notificación
- [ ] Plantillas de email
- [ ] Categorías de riesgo
- [ ] Estructura de procesos (Macroprocesos/Procesos/Subprocesos)
- [ ] Gerencias organizacionales

### Integraciones (Opcionales)
- [ ] Google Cloud Storage
- [ ] Email Service (Mailgun o SMTP)
- [ ] Twilio (SMS)

### Personalización (Opcional)
- [ ] Tema y colores
- [ ] Plantillas de reportes
- [ ] Logo para reportes

---

## Soporte

Para asistencia con configuración:

- **Documentación:** https://docs.riskmatrixpro.com
- **Email:** support@riskmatrixpro.com
- **Consultoría:** consulting@riskmatrixpro.com

---

**Fin de la Guía de Configuración**
