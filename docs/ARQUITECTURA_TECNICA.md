# Arquitectura Técnica - Unigrc

**Versión:** 2.0.0  
**Fecha:** Octubre 2025  
**Plataforma:** Unigrc (anteriormente RiskMatrix Pro)  
**Arquitectura:** Monolito Modular Full-Stack con TypeScript

---

## Índice

1. [Vista General](#1-vista-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura de Capas](#3-arquitectura-de-capas)
4. [Arquitectura del Frontend](#4-arquitectura-del-frontend)
5. [Arquitectura del Backend](#5-arquitectura-del-backend)
6. [Arquitectura de Datos](#6-arquitectura-de-datos)
7. [Seguridad](#7-seguridad)
8. [Patrones de Diseño](#8-patrones-de-diseño)
9. [Infraestructura y Despliegue](#9-infraestructura-y-despliegue)
10. [Integraciones](#10-integraciones)

---

## 1. Vista General

### 1.1 Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO FINAL                         │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    APLICACIÓN WEB (SPA)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  React 18  │  │ TanStack   │  │   Wouter   │            │
│  │ TypeScript │  │   Query    │  │  Routing   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Shadcn/UI │  │  Tailwind  │  │  Recharts  │            │
│  │   Radix    │  │    CSS     │  │ React Flow │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API (JSON)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND API (Node.js)                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Express.js │  │ TypeScript │  │    Zod     │            │
│  │   Server   │  │            │  │ Validation │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Passport  │  │  Sessions  │  │   CSRF     │            │
│  │    Auth    │  │  (Connect) │  │ Protection │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL Queries (Drizzle ORM)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              BASE DE DATOS (PostgreSQL 16)                   │
│                     Neon Serverless                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  100+ Tablas con Relaciones Complejas               │   │
│  │  - Gestión de Riesgos                                │   │
│  │  - Sistema de Auditoría                              │   │
│  │  - Cumplimiento y Compliance                         │   │
│  │  - Canal de Denuncias                                │   │
│  │  - Sistema de Aprobaciones                           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 SERVICIOS EXTERNOS                           │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │   Google   │  │  Mailgun   │  │   Twilio   │            │
│  │   Cloud    │  │   Email    │  │    SMS     │            │
│  │  Storage   │  │    API     │  │            │            │
│  └────────────┘  └────────────┘  └────────────┘            │
│  ┌────────────────────────────────────────────┐             │
│  │         Azure OpenAI (GPT-4o-mini)         │             │
│  │     AI Assistant & Test Generation         │             │
│  └────────────────────────────────────────────┘             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Características de la Arquitectura

#### Monolito Modular
- **Una aplicación**, múltiples módulos cohesivos
- Frontend y Backend en el mismo repositorio
- Servidor único que sirve frontend y API
- Facilita el desarrollo y despliegue

#### TypeScript End-to-End
- Type safety desde frontend hasta base de datos
- Schemas compartidos entre cliente y servidor
- Menos bugs en producción
- Mejor experiencia de desarrollo (DX)

#### Single Page Application (SPA)
- Frontend renderiza en el cliente
- Navegación instantánea sin recargas
- Estado persistente durante la sesión
- Mejor UX para aplicaciones complejas

---

## 2. Stack Tecnológico

### 2.1 Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | 18.3.1 | Librería UI principal |
| **TypeScript** | 5.6.3 | Lenguaje con tipado estático |
| **Vite** | 5.4.19 | Build tool y dev server |
| **Wouter** | 3.3.5 | Routing lightweight |
| **TanStack Query** | 5.60.5 | State management y cache |
| **Tailwind CSS** | 3.4.17 | Framework CSS utility-first |
| **Shadcn/UI** | Latest | Componentes UI accesibles |
| **Radix UI** | Latest | Primitivas UI sin estilos |
| **React Hook Form** | 7.55.0 | Gestión de formularios |
| **Zod** | 3.24.2 | Validación de esquemas |
| **Recharts** | 2.15.2 | Gráficos y visualizaciones |
| **React Flow** | 12.8.6 | Grafos interactivos |
| **Lucide React** | 0.453.0 | Sistema de iconos |
| **date-fns** | 3.6.0 | Manipulación de fechas |

### 2.2 Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Node.js** | 20.19.3 | Runtime JavaScript |
| **Express.js** | 4.21.2 | Framework web |
| **TypeScript** | 5.6.3 | Lenguaje con tipado estático |
| **tsx** | 4.19.1 | Ejecutor TypeScript para desarrollo |
| **esbuild** | 0.25.0 | Bundler para producción |
| **Drizzle ORM** | 0.39.3 | ORM type-safe |
| **Drizzle Kit** | 0.30.4 | CLI para migraciones |
| **PostgreSQL** | 16+ | Base de datos relacional |
| **pg** | 8.16.3 | Driver PostgreSQL para Node.js |
| **Zod** | 3.24.2 | Validación de datos |
| **drizzle-zod** | 0.7.0 | Bridge entre Drizzle y Zod |

### 2.3 Autenticación y Seguridad

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Passport.js** | 0.7.0 | Middleware de autenticación |
| **express-session** | 1.18.2 | Gestión de sesiones |
| **connect-pg-simple** | 10.0.0 | Store de sesiones en PostgreSQL |
| **csrf-csrf** | 4.0.3 | Protección CSRF |
| **cookie-parser** | 1.4.7 | Parsing de cookies |
| **bcrypt** | (via Passport) | Hashing de contraseñas |

### 2.4 Servicios y Utilidades

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **@google-cloud/storage** | 7.17.1 | Almacenamiento de archivos |
| **Mailgun.js** | Latest | Servicio de email (API oficial) |
| **Twilio** | 5.9.0 | Servicio de SMS |
| **OpenAI (Azure)** | Latest | AI Assistant con GPT-4o-mini |
| **web-push** | 3.6.7 | Notificaciones push |
| **BullMQ** | 5.58.7 | Colas de trabajo |
| **Redis/IORedis** | 5.7.0 | Cache y colas |
| **ExcelJS** | 4.4.0 | Generación y lectura de Excel |
| **jsPDF** | 3.0.2 | Generación de PDFs |
| **Puppeteer** | 24.20.0 | Generación de PDFs complejos |

### 2.5 Entorno de Desarrollo

| Herramienta | Propósito |
|-------------|-----------|
| **Replit** | IDE y hosting en la nube |
| **Nix** | Gestión de dependencias del sistema |
| **Git** | Control de versiones |
| **ESLint** | Linting de código |
| **Prettier** | (implícito) Formateo de código |

---

## 3. Arquitectura de Capas

### 3.1 Estructura de Directorios

```
workspace/
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/       # Componentes reutilizables
│   │   │   ├── ui/          # Componentes shadcn/ui
│   │   │   ├── layout/      # Sidebar, Header, etc.
│   │   │   ├── forms/       # Formularios específicos
│   │   │   └── ...
│   │   ├── pages/           # Páginas/vistas de la app
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilidades y helpers
│   │   ├── contexts/        # React contexts
│   │   ├── App.tsx          # Componente raíz y routing
│   │   ├── main.tsx         # Entry point
│   │   └── index.css        # Estilos globales
│   └── public/              # Assets estáticos
│
├── server/                   # Backend Node.js/Express
│   ├── index.ts            # Entry point del servidor
│   ├── routes.ts           # Definición de rutas API
│   ├── storage.ts          # Capa de acceso a datos
│   ├── db.ts               # Configuración de Drizzle
│   ├── vite.ts             # Integración Vite middleware
│   └── services/           # Servicios de negocio
│       ├── email.ts
│       ├── sms.ts
│       ├── notifications.ts
│       ├── approval.ts
│       └── ...
│
├── shared/                  # Código compartido
│   └── schema.ts           # Schemas Drizzle + tipos Zod
│
├── docs/                    # Documentación
│   ├── CATALOGO_FUNCIONALIDADES.md
│   ├── MANUAL_USUARIO.md
│   ├── ARQUITECTURA_TECNICA.md
│   ├── ESQUEMA_BASE_DATOS.md
│   ├── MANUAL_INSTALACION.md
│   └── GUIA_CONFIGURACION.md
│
├── package.json            # Dependencias y scripts
├── tsconfig.json           # Config TypeScript
├── vite.config.ts          # Config Vite
├── tailwind.config.ts      # Config Tailwind
├── drizzle.config.ts       # Config Drizzle
└── replit.md               # Documentación de estado del proyecto
```

### 3.2 Flujo de Datos

```
Usuario → Frontend (React)
    ↓
    TanStack Query (cache y estado)
    ↓
    Fetch API (REST)
    ↓
    Express Routes
    ↓
    Zod Validation
    ↓
    Storage Layer (abstracción)
    ↓
    Drizzle ORM
    ↓
    PostgreSQL
```

### 3.3 Separación de Responsabilidades

#### Frontend
- **Responsabilidad Única:** Presentación e Interacción
- **No contiene:** Lógica de negocio compleja
- **Comunicación:** Exclusivamente vía API REST

#### Backend
- **Responsabilidad Única:** Lógica de negocio y persistencia
- **No contiene:** Lógica de presentación
- **Servicios:** Modularizados por dominio

#### Shared
- **Responsabilidad Única:** Contratos de datos compartidos
- **Contiene:** Schemas, tipos, validaciones
- **Beneficio:** Single source of truth

---

## 4. Arquitectura del Frontend

### 4.1 Patrón de Componentes

#### Jerarquía de Componentes

```
App (Router + Providers)
├── QueryClientProvider
│   └── TooltipProvider
│       └── RiskFormattingProvider
│           └── SearchProvider
│               ├── Sidebar (Desktop)
│               ├── Header (Filtros + Búsqueda)
│               └── Main Content
│                   ├── PageErrorBoundary
│                   └── Router (Wouter)
│                       └── Page Components
│                           ├── Layout Components
│                           ├── Feature Components
│                           └── UI Components (shadcn)
```

#### Tipos de Componentes

**1. Page Components** (`pages/`)
- Componentes de nivel superior
- Mapean a rutas URL
- Componen funcionalidades completas
- Ejemplo: `risks.tsx`, `audits.tsx`

**2. Layout Components** (`components/layout/`)
- Estructura general de la UI
- Sidebar, Header, Footer
- Consistencia visual

**3. Feature Components** (`components/`)
- Lógica de negocio específica
- Reutilizables dentro de un dominio
- Ejemplo: RiskMatrix, AuditCard

**4. Form Components** (`components/forms/`)
- Formularios específicos por entidad
- Usan React Hook Form + Zod
- Ejemplo: `risk-form.tsx`, `control-form.tsx`

**5. UI Components** (`components/ui/`)
- Componentes base de shadcn/ui
- Sin lógica de negocio
- Altamente reutilizables
- Ejemplo: Button, Dialog, Table

### 4.2 Estado y Manejo de Datos

#### TanStack Query
Gestiona todo el estado del servidor:

```typescript
// Queries - Lectura de datos
const { data, isLoading, error } = useQuery({
  queryKey: ['/api/risks'],
  // queryFn automático configurado en queryClient
});

// Mutations - Escritura de datos
const mutation = useMutation({
  mutationFn: (data) => apiRequest('/api/risks', 'POST', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/risks'] });
  }
});
```

**Ventajas:**
- Cache inteligente
- Sincronización automática
- Optimistic updates
- Background refetching
- Deduplicación de requests

#### React Context
Para estado UI global:

- **SearchContext:** Estado de búsqueda global
- **RiskFormattingContext:** Configuración de formato de riesgos
- **ThemeContext:** Dark mode / light mode (futuro)

#### Local State (useState, useReducer)
Para estado específico de componente:

- Form state (manejado por React Hook Form)
- Modal open/close
- Tabs activas
- Filtros locales

### 4.3 Routing

#### Wouter
Router lightweight (<2KB):

```typescript
<Switch>
  <Route path="/" component={DashboardRouter} />
  <Route path="/risks" component={Risks} />
  <Route path="/audits" component={Audits} />
  <Route path="/audit-test/:id" component={AuditTestDetails} />
  <Route component={NotFound} />
</Switch>
```

**Características:**
- Client-side routing
- Parámetros dinámicos
- Navegación programática con `useLocation`
- Compatibilidad con Link y navegación normal

### 4.4 Formularios

#### React Hook Form + Zod

```typescript
const form = useForm<z.infer<typeof insertRiskSchema>>({
  resolver: zodResolver(insertRiskSchema),
  defaultValues: {
    name: '',
    probability: 3,
    // ...
  }
});

const onSubmit = async (data: z.infer<typeof insertRiskSchema>) => {
  await createRisk.mutateAsync(data);
};
```

**Ventajas:**
- Validación type-safe
- Validación compartida con backend
- Performance optimizado (menos re-renders)
- Manejo de errores integrado

### 4.5 Estilizado

#### Tailwind CSS
Utility-first CSS framework:

```jsx
<div className="flex items-center gap-4 p-6 bg-white dark:bg-gray-900">
  <Button className="px-4 py-2 text-sm font-medium">
    Click me
  </Button>
</div>
```

#### Shadcn/UI + Radix
- Componentes pre-construidos
- Accesibles (WAI-ARIA)
- Customizables vía Tailwind
- No runtime cost (copy-paste approach)

#### CSS Variables
Para temas y consistencia:

```css
:root {
  --primary: hsl(222.2, 47.4%, 11.2%);
  --secondary: hsl(210, 40%, 96.1%);
  /* ... */
}

.dark {
  --primary: hsl(210, 40%, 98%);
  --secondary: hsl(217.2, 32.6%, 17.5%);
  /* ... */
}
```

---

## 5. Arquitectura del Backend

### 5.1 Estructura de Rutas

#### Organización Modular

El archivo `server/routes.ts` organiza las rutas por dominio:

```typescript
// Estructura de rutas
app.use('/api', (req, res, next) => {
  // Middleware de autenticación y validación
});

// Riesgos
app.get('/api/risks', isAuthenticated, async (req, res) => {});
app.post('/api/risks', isAuthenticated, async (req, res) => {});
app.put('/api/risks/:id', isAuthenticated, async (req, res) => {});
app.delete('/api/risks/:id', isAuthenticated, async (req, res) => {});

// Controles
app.get('/api/controls', isAuthenticated, async (req, res) => {});
// ...

// Auditorías
app.get('/api/audits', isAuthenticated, async (req, res) => {});
// ...
```

#### Patrón de Rutas

Cada endpoint sigue el patrón:

1. **Autenticación:** Middleware `isAuthenticated`
2. **Validación:** Zod schema validation
3. **Storage:** Llamada a capa de storage
4. **Response:** JSON con manejo de errores

```typescript
app.post('/api/risks', isAuthenticated, async (req, res) => {
  try {
    // 1. Validar
    const data = insertRiskSchema.parse(req.body);
    
    // 2. Lógica de negocio
    const risk = await storage.createRisk(data);
    
    // 3. Responder
    res.status(201).json(risk);
  } catch (error) {
    // 4. Manejo de errores
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: 'Validation error', 
        errors: error.errors 
      });
    }
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

### 5.2 Capa de Storage

#### Patrón Repository

La interfaz `IStorage` define todos los métodos de acceso a datos:

```typescript
export interface IStorage {
  // Risks
  getRisks(): Promise<Risk[]>;
  getRisk(id: string): Promise<Risk | undefined>;
  createRisk(risk: InsertRisk): Promise<Risk>;
  updateRisk(id: string, risk: Partial<InsertRisk>): Promise<Risk>;
  deleteRisk(id: string): Promise<boolean>;
  
  // Controls
  getControls(): Promise<Control[]>;
  // ...
  
  // Audits
  getAudits(): Promise<Audit[]>;
  // ...
}
```

#### Implementación con Drizzle

```typescript
class DbStorage implements IStorage {
  async getRisks(): Promise<Risk[]> {
    return db.select()
      .from(risks)
      .where(isNull(risks.deletedAt));
  }
  
  async createRisk(data: InsertRisk): Promise<Risk> {
    const [risk] = await db.insert(risks)
      .values(data)
      .returning();
    return risk;
  }
  
  // ...
}
```

**Ventajas:**
- Abstracción de la implementación
- Fácil testing con mock storage
- Posibilidad de cambiar ORM sin afectar rutas
- Single Responsibility Principle

### 5.3 Validación de Datos

#### Zod Schemas Compartidos

Definidos en `shared/schema.ts`:

```typescript
// Drizzle schema
export const risks = pgTable("risks", {
  id: varchar("id").primaryKey(),
  name: varchar("name").notNull(),
  probability: integer("probability"),
  // ...
});

// Zod insert schema
export const insertRiskSchema = createInsertSchema(risks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TypeScript types
export type Risk = typeof risks.$inferSelect;
export type InsertRisk = z.infer<typeof insertRiskSchema>;
```

**Beneficios:**
- Type safety end-to-end
- Validación consistente cliente-servidor
- Generación automática desde schema DB
- Menos código duplicado

### 5.4 Servicios

#### Servicios Modulares por Dominio

**Email Service** (`services/email.ts`):
```typescript
export class EmailService {
  private mailgun: MailService;
  
  async sendNotification(to: string, subject: string, body: string) {
    // Lógica de envío
  }
  
  async sendBulk(recipients: string[], template: string, data: any) {
    // Envío masivo
  }
}
```

**SMS Service** (`services/sms.ts`):
```typescript
export class SMSService {
  private twilio: Twilio;
  
  async sendAlert(phone: string, message: string) {
    // Envío de SMS
  }
}
```

**Notification Service** (`services/notifications.ts`):
```typescript
export class NotificationService {
  async queueNotification(notification: Notification) {
    // Encolar notificación
  }
  
  async processQueue() {
    // Procesar cola de notificaciones
  }
}
```

**Approval Service** (`services/approval.ts`):
```typescript
export class ApprovalService {
  async createApprovalRequest(entity: string, entityId: string) {
    // Crear solicitud de aprobación
  }
  
  async processApproval(recordId: string, decision: 'approved' | 'rejected') {
    // Procesar decisión
  }
}
```

### 5.5 Scheduled Tasks

#### BullMQ para Tareas Programadas

```typescript
// Scheduler de notificaciones
export class NotificationScheduler {
  private queue: Queue;
  private worker: Worker;
  
  constructor() {
    this.queue = new Queue('notifications', {
      connection: redisConnection
    });
    
    this.worker = new Worker('notifications', async (job) => {
      await this.processNotification(job.data);
    }, {
      connection: redisConnection
    });
  }
  
  async scheduleNotification(notification: Notification, delay: number) {
    await this.queue.add('send', notification, { delay });
  }
}
```

**Tareas Programadas:**
- Procesamiento de cola de notificaciones (cada 2 min)
- Verificación de deadlines de pruebas (cada hora)
- Flujos de trabajo de whistleblower (cada 10 min)
- Escalamiento automático de casos (cada 30 min)

---

## 6. Arquitectura de Datos

### 6.1 Diseño de Base de Datos

#### Principios de Diseño

1. **Normalización:** Tercera forma normal (3NF)
2. **Relaciones Explícitas:** Foreign keys con cascade rules
3. **Soft Delete:** `deleted_at` en lugar de DELETE físico
4. **Audit Trail:** `created_at`, `updated_at` en todas las tablas
5. **UUID vs Serial:** Códigos únicos globales con formato específico

#### Patrones de Tablas

**Tabla Estándar:**
```sql
CREATE TABLE entity (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR UNIQUE,  -- Código global (ej: R-0001)
  name VARCHAR NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP  -- Soft delete
);
```

**Tabla de Relación Many-to-Many:**
```sql
CREATE TABLE entity1_entity2 (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  entity1_id VARCHAR NOT NULL REFERENCES entity1(id),
  entity2_id VARCHAR NOT NULL REFERENCES entity2(id),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(entity1_id, entity2_id)  -- Prevenir duplicados
);
```

**Tabla de Auditoría:**
```sql
CREATE TABLE entity_history (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR NOT NULL REFERENCES entity(id),
  field_changed VARCHAR NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by VARCHAR REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW()
);
```

### 6.2 Módulos de Datos

#### Organización por Dominio

**1. Módulo de Organización**
- `gerencias` - Estructura de gerencias (G-XXXX)
- `objetivos_estrategicos` - Objetivos estratégicos (OE-XXXX)
- `macroprocesos` - Nivel 1 de procesos
- `processes` - Nivel 2 de procesos
- `subprocesos` - Nivel 3 de procesos
- `process_owners` - Responsables de procesos
- `fiscal_entities` - Entidades fiscalizables

**Tablas de Relación:**
- `macroproceso_gerencias` - M2M Macroprocesos-Gerencias
- `process_gerencias` - M2M Procesos-Gerencias
- `subproceso_gerencias` - M2M Subprocesos-Gerencias
- `process_objetivos_estrategicos` - M2M Procesos-Objetivos

**2. Módulo de Riesgos**
- `risks` - Catálogo de riesgos (R-XXXX)
- `risk_categories` - Categorías de riesgo
- `risk_process_links` - Vinculación riesgos-procesos
- `risk_events` - Eventos de materialización (E-XXXX)
- `risk_snapshots` - Versionamiento de riesgos
- `risk_trending_data` - Datos de tendencias

**Tablas de Relación:**
- `risk_event_macroprocesos` - M2M Eventos-Macroprocesos
- `risk_event_processes` - M2M Eventos-Procesos
- `risk_event_subprocesos` - M2M Eventos-Subprocesos
- `risk_event_risks` - M2M Eventos-Riesgos

**3. Módulo de Controles**
- `controls` - Catálogo de controles (C-XXXX)
- `risk_controls` - Vinculación riesgos-controles
- `control_evaluations` - Evaluaciones de efectividad
- `control_assessment_history` - Historial de autoevaluaciones
- `control_evaluation_criteria` - Criterios de evaluación
- `control_evaluation_options` - Opciones de calificación

**4. Módulo de Auditoría** (NOGAI 13-14-15)
- `audit_plans` - Planes anuales de auditoría
- `audits` - Auditorías individuales
- `audit_scope` - Alcance de auditoría
- `audit_scope_versions` - Versionamiento de alcance
- `audit_criteria` - Criterios de auditoría
- `audit_programs` - Programas de trabajo
- `audit_tests` - Pruebas de auditoría
- `audit_test_attachments` - Adjuntos de pruebas
- `audit_findings` - Hallazgos
- `finding_follow_ups` - Seguimientos de hallazgos
- `working_papers` - Papeles de trabajo
- `audit_control_evaluations` - Evaluación de controles en auditoría
- `audit_risk_evaluations` - Re-evaluación de riesgos
- `audit_risks` - Riesgos ad-hoc identificados
- `audit_reports` - Informes de auditoría
- `audit_review_comments` - Comentarios de revisión
- `audit_milestones` - Hitos de auditoría
- `audit_attachments` - Adjuntos generales

**5. Módulo de Cumplimiento**
- `regulations` - Catálogo de normas
- `regulation_applicability` - Aplicabilidad por proceso
- `risk_regulations` - Vinculación riesgos-regulaciones
- `compliance_tests` - Pruebas de cumplimiento
- `compliance_test_controls` - Vinculación pruebas-controles
- `compliance_audits` - Auditorías de cumplimiento
- `compliance_documents` - Documentos de cumplimiento
- `crime_categories` - Categorías de prevención de delitos

**6. Módulo de Whistleblower**
- `whistleblower_reports` - Denuncias iniciales
- `whistleblower_cases` - Casos de investigación
- `whistleblower_communications` - Comunicaciones anónimas
- `whistleblower_assignments` - Asignaciones de investigadores
- `whistleblower_timeline` - Línea de tiempo de eventos
- `whistleblower_evidence` - Evidencias recopiladas

**7. Módulo de Planes de Acción**
- `action_plans` - Planes de acción
- `actions` - Acciones específicas

**8. Módulo de Notificaciones**
- `notifications` - Notificaciones generadas
- `notification_queue` - Cola de envío
- `notification_preferences` - Preferencias de usuario

**9. Módulo de Aprobaciones**
- `approval_policies` - Políticas de aprobación
- `approval_workflows` - Flujos de trabajo
- `approval_hierarchy` - Jerarquía de aprobadores
- `approval_records` - Registros de aprobaciones
- `approval_delegations` - Delegaciones temporales
- `approval_rules` - Reglas de escalamiento
- `escalation_paths` - Rutas de escalamiento
- `approval_analytics` - Analítica de aprobaciones
- `approval_audit_trail` - Auditoría de decisiones

**10. Módulo de Sistema**
- `users` - Usuarios del sistema
- `roles` - Roles de usuario
- `user_roles` - Asignación de roles (M2M)
- `sessions` - Sesiones activas
- `system_config` - Configuración del sistema
- `validation_tokens` - Tokens de validación pública
- `probability_criteria` - Criterios de probabilidad
- `impact_criteria` - Criterios de impacto
- `generation_algorithm_config` - Config de generación de pruebas

**11. Módulo de Validación**
- `process_validations` - Validaciones de procesos
- `process_risk_validations` - Validaciones de riesgos
- `process_control_validations` - Validaciones de controles
- `revalidations` - Solicitudes de revalidación
- `revalidation_policies` - Políticas de revalidación

### 6.3 Drizzle ORM

#### Definición de Schemas

```typescript
// shared/schema.ts
export const risks = pgTable("risks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code").unique().notNull(),
  name: varchar("name").notNull(),
  description: text("description"),
  probability: integer("probability"),
  categoryId: varchar("category_id").references(() => riskCategories.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => ({
  codeIdx: index("risk_code_idx").on(table.code),
  deletedIdx: index("risk_deleted_idx").on(table.deletedAt),
}));
```

#### Queries Type-Safe

```typescript
// Lectura
const allRisks = await db.select()
  .from(risks)
  .where(isNull(risks.deletedAt));

// Con JOIN
const risksWithCategory = await db.select()
  .from(risks)
  .leftJoin(riskCategories, eq(risks.categoryId, riskCategories.id))
  .where(isNull(risks.deletedAt));

// Inserción
const [newRisk] = await db.insert(risks)
  .values({
    code: 'R-0001',
    name: 'Riesgo de ejemplo',
    probability: 3,
  })
  .returning();

// Actualización
await db.update(risks)
  .set({ name: 'Nuevo nombre', updatedAt: new Date() })
  .where(eq(risks.id, riskId));

// Soft delete
await db.update(risks)
  .set({ deletedAt: new Date() })
  .where(eq(risks.id, riskId));
```

### 6.4 Migraciones

#### Drizzle Kit
No se usan migraciones SQL manuales:

```bash
# Push schema changes directamente
npm run db:push

# En caso de conflictos, forzar
npm run db:push --force
```

**Ventajas:**
- Schema as code
- Type safety en tiempo de desarrollo
- No hay drift entre código y DB
- Migraciones automáticas

---

## 7. Seguridad

### 7.1 Autenticación

#### Passport.js con Estrategia Local

```typescript
passport.use(new LocalStrategy(
  async (username, password, done) => {
    const user = await storage.getUserByUsername(username);
    if (!user) {
      return done(null, false, { message: 'Usuario no encontrado' });
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return done(null, false, { message: 'Contraseña incorrecta' });
    }
    
    return done(null, user);
  }
));
```

#### Sesiones Persistentes

```typescript
app.use(session({
  store: new PgStore({
    pool: dbPool,
    tableName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 días
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
}));
```

**Características:**
- Sesiones almacenadas en PostgreSQL
- Auto-expiración de sesiones
- Cookie httpOnly para prevenir XSS
- Secure flag en producción (HTTPS)

### 7.2 Autorización

#### Role-Based Access Control (RBAC)

```typescript
// Middleware de autorización
const requireRole = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    const userRoles = await storage.getUserRoles(req.user.id);
    const hasRole = userRoles.some(r => roles.includes(r.name));
    
    if (!hasRole) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Uso en rutas
app.delete('/api/risks/:id', 
  isAuthenticated, 
  requireRole('admin', 'risk_manager'), 
  async (req, res) => {
    // Solo admins y risk managers pueden eliminar
  }
);
```

#### Permisos Granulares

```typescript
// Tabla de permisos
const permissions = {
  'risks:read': ['admin', 'risk_manager', 'auditor', 'reader'],
  'risks:create': ['admin', 'risk_manager'],
  'risks:update': ['admin', 'risk_manager'],
  'risks:delete': ['admin'],
  'audits:execute': ['admin', 'auditor', 'executor'],
  'audits:approve': ['admin', 'audit_director'],
  // ...
};
```

### 7.3 Protección CSRF

#### Double Submit Cookie Pattern

```typescript
import { doubleCsrf } from 'csrf-csrf';

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// Endpoint para obtener token
app.get('/api/csrf-token', (req, res) => {
  const token = generateToken(req, res);
  res.json({ token });
});

// Proteger rutas mutadoras
app.use(['/api'], (req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    return doubleCsrfProtection(req, res, next);
  }
  next();
});
```

**Frontend:**
```typescript
// CSRFInitializer.tsx
useEffect(() => {
  fetch('/api/csrf-token')
    .then(r => r.json())
    .then(({ token }) => {
      // Guardar token para requests futuros
      window.csrfToken = token;
    });
}, []);

// Uso en requests
fetch('/api/risks', {
  method: 'POST',
  headers: {
    'x-csrf-token': window.csrfToken,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(data)
});
```

### 7.4 Validación de Datos

#### Validación en Múltiples Capas

**1. Frontend (React Hook Form + Zod):**
```typescript
const form = useForm({
  resolver: zodResolver(insertRiskSchema),
});
// Validación al submit
```

**2. Backend (Zod):**
```typescript
app.post('/api/risks', async (req, res) => {
  try {
    const data = insertRiskSchema.parse(req.body);
    // Continuar con datos validados
  } catch (error) {
    return res.status(400).json({ errors: error.errors });
  }
});
```

**3. Base de Datos (Constraints):**
```sql
ALTER TABLE risks
ADD CONSTRAINT probability_range CHECK (probability BETWEEN 1 AND 5);

ALTER TABLE risks
ADD CONSTRAINT unique_code UNIQUE (code);
```

### 7.5 Protección de Datos Sensibles

#### Encriptación de Datos

```typescript
// Encriptación de identidad de whistleblower
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: authTag.toString('hex')
  });
}

function decrypt(encryptedData: string): string {
  const { iv, data, tag } = JSON.parse(encryptedData);
  
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(data, 'hex')),
    decipher.final()
  ]);
  
  return decrypted.toString('utf8');
}
```

#### Hashing de Contraseñas

```typescript
import bcrypt from 'bcrypt';

// Crear usuario
const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

await storage.createUser({
  username,
  passwordHash,
  // ...
});

// Verificar login
const isValid = await bcrypt.compare(inputPassword, user.passwordHash);
```

### 7.6 Sanitización de Input

#### Prevención de SQL Injection

Drizzle ORM usa prepared statements automáticamente:

```typescript
// SEGURO - Drizzle usa prepared statements
await db.select()
  .from(risks)
  .where(eq(risks.id, userInput));

// Nunca hacer SQL raw con input del usuario sin sanitizar
```

#### Prevención de XSS

React escapa automáticamente el contenido:

```jsx
// SEGURO - React escapa automáticamente
<div>{userInput}</div>

// PELIGROSO - Evitar dangerouslySetInnerHTML con input de usuario
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

Para HTML sanitizado, usar librerías como DOMPurify:

```typescript
import DOMPurify from 'dompurify';

const clean = DOMPurify.sanitize(dirtyHTML);
```

---

## 8. Patrones de Diseño

### 8.1 Repository Pattern

Abstracción de acceso a datos mediante interfaz `IStorage`:

```typescript
interface IStorage {
  getRisks(): Promise<Risk[]>;
  createRisk(data: InsertRisk): Promise<Risk>;
  // ...
}

class DbStorage implements IStorage {
  // Implementación con Drizzle
}

class MockStorage implements IStorage {
  // Implementación para testing
}
```

**Beneficios:**
- Testabilidad
- Flexibilidad para cambiar implementación
- Separación de concerns

### 8.2 Service Layer Pattern

Lógica de negocio compleja en servicios dedicados:

```typescript
class ApprovalService {
  async createApprovalRequest(
    entityType: string,
    entityId: string,
    requesterId: string
  ) {
    // 1. Obtener política de aprobación
    const policy = await this.getPolicyForEntity(entityType);
    
    // 2. Determinar jerarquía de aprobadores
    const hierarchy = await this.getApprovalHierarchy(policy);
    
    // 3. Crear registro de aprobación
    const record = await storage.createApprovalRecord({
      entityType,
      entityId,
      requesterId,
      policyId: policy.id,
      status: 'pending'
    });
    
    // 4. Notificar al primer aprobador
    await notificationService.notifyApprover(hierarchy[0], record);
    
    return record;
  }
}
```

### 8.3 Factory Pattern

Para creación de objetos complejos:

```typescript
class NotificationFactory {
  static createEmailNotification(
    to: string,
    subject: string,
    body: string
  ): Notification {
    return {
      id: generateId(),
      channel: 'email',
      recipient: to,
      content: { subject, body },
      status: 'pending',
      scheduledFor: new Date(),
      priority: 'normal'
    };
  }
  
  static createSMSNotification(
    phone: string,
    message: string
  ): Notification {
    return {
      id: generateId(),
      channel: 'sms',
      recipient: phone,
      content: { message },
      status: 'pending',
      scheduledFor: new Date(),
      priority: 'high'
    };
  }
}
```

### 8.4 Observer Pattern

Para notificaciones y eventos:

```typescript
class EventEmitter {
  private listeners: Map<string, Function[]> = new Map();
  
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }
  
  emit(event: string, data: any) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }
}

// Uso
eventEmitter.on('risk.created', async (risk) => {
  await notificationService.notifyProcessOwner(risk);
});

eventEmitter.emit('risk.created', newRisk);
```

### 8.5 Strategy Pattern

Para algoritmos intercambiables:

```typescript
interface PrioritizationStrategy {
  calculate(audit: AuditCandidate): number;
}

class RiskBasedStrategy implements PrioritizationStrategy {
  calculate(audit: AuditCandidate): number {
    return audit.inherentRisk * 0.3 + audit.residualRisk * 0.7;
  }
}

class FraudBasedStrategy implements PrioritizationStrategy {
  calculate(audit: AuditCandidate): number {
    return audit.fraudEventsCount * 25;
  }
}

class CompositePrioritizationStrategy implements PrioritizationStrategy {
  constructor(private strategies: PrioritizationStrategy[]) {}
  
  calculate(audit: AuditCandidate): number {
    return this.strategies.reduce(
      (total, strategy) => total + strategy.calculate(audit),
      0
    );
  }
}
```

### 8.6 Singleton Pattern

Para servicios globales:

```typescript
class LoggerService {
  private static instance: LoggerService;
  
  private constructor() {
    // Inicialización
  }
  
  static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }
  
  log(level: string, message: string, metadata?: any) {
    // Logging
  }
}

// Uso
const logger = LoggerService.getInstance();
logger.log('info', 'Application started');
```

---

## 9. Infraestructura y Despliegue

### 9.1 Arquitectura de Hosting

```
┌──────────────────────────────────────────────┐
│           REPLIT PLATFORM                     │
│                                               │
│  ┌────────────────────────────────────────┐  │
│  │     Application Container (Nix)        │  │
│  │                                         │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │   Node.js 20 Process             │  │  │
│  │  │   - Express Server (Port 5000)   │  │  │
│  │  │   - Vite Middleware (Dev)        │  │  │
│  │  │   - Static Files (Prod)          │  │  │
│  │  └──────────────────────────────────┘  │  │
│  │                                         │  │
│  │  Environment: NODE_ENV=production       │  │
│  │  Memory: Configurable                   │  │
│  │  CPU: Shared                            │  │
│  └────────────────────────────────────────┘  │
│                                               │
│  HTTPS: *.replit.dev (Auto SSL)              │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│         NEON POSTGRESQL                       │
│         Serverless Database                   │
│                                               │
│  Connection Pooling: Yes                      │
│  Auto-scaling: Yes                            │
│  Backups: Automatic                           │
│  Region: Configurable                         │
└───────────────────┬───────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────────────┐
│       GOOGLE CLOUD STORAGE                    │
│       Bucket: repl-default-bucket            │
│                                               │
│  - Public assets in /public                   │
│  - Private files in /.private                 │
└───────────────────────────────────────────────┘
```

### 9.2 Scripts de Deployment

#### package.json
```json
{
  "scripts": {
    "dev": "NODE_ENV=development tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "db:push": "drizzle-kit push"
  }
}
```

#### Flujo de Deployment

**Desarrollo:**
```bash
npm run dev
# - tsx ejecuta TypeScript directamente
# - Vite sirve frontend con HMR
# - Watch mode automático
```

**Producción:**
```bash
npm run build
# - Vite compila frontend (client/dist)
# - esbuild compila backend (dist/index.js)

npm start
# - Node ejecuta JavaScript compilado
# - Express sirve frontend estático desde client/dist
```

### 9.3 Variables de Entorno

#### .env Structure
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Session
SESSION_SECRET=random_secret_string

# CSRF
CSRF_SECRET=random_csrf_secret

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT=project-id
GOOGLE_CLOUD_KEYFILE=/path/to/keyfile.json
PUBLIC_OBJECT_SEARCH_PATHS=/public
PRIVATE_OBJECT_DIR=/.private

# Email (mailgun)
mailgun_API_KEY=SG.xxx

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890

# Push Notifications
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# Environment
NODE_ENV=production
```

### 9.4 Health Checks

```typescript
// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database
    await db.execute(sql`SELECT 1`);
    
    // Check Redis (if configured)
    if (redisClient) {
      await redisClient.ping();
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: packageJson.version
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

### 9.5 Logging

```typescript
// Logger setup
const logger = {
  info: (message: string, metadata?: any) => {
    console.log(JSON.stringify({
      level: 'info',
      timestamp: new Date().toISOString(),
      message,
      ...metadata
    }));
  },
  
  error: (message: string, error?: Error, metadata?: any) => {
    console.error(JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      message,
      error: error?.message,
      stack: error?.stack,
      ...metadata
    }));
  },
  
  warn: (message: string, metadata?: any) => {
    console.warn(JSON.stringify({
      level: 'warn',
      timestamp: new Date().toISOString(),
      message,
      ...metadata
    }));
  }
};

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`[HTTP] ${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      userAgent: req.get('user-agent'),
      ip: req.ip,
      duration: `${duration}ms`
    });
  });
  
  next();
});
```

---

## 10. Integraciones

### 10.1 Google Cloud Storage

```typescript
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  keyFilename: process.env.GOOGLE_CLOUD_KEYFILE
});

const bucket = storage.bucket('repl-default-bucket');

// Upload file
async function uploadFile(file: Express.Multer.File): Promise<string> {
  const blob = bucket.file(`public/${file.originalname}`);
  const stream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype
    }
  });
  
  return new Promise((resolve, reject) => {
    stream.on('error', reject);
    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
      resolve(publicUrl);
    });
    stream.end(file.buffer);
  });
}
```

### 10.2 Mailgun (Email)

**Servicio actual:** Mailgun API oficial (reemplazo de mailgun)

```typescript
import formData from 'form-data';
import Mailgun from 'mailgun.js';

const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: process.env.MAILGUN_API_KEY!
});

async function sendEmail(
  to: string,
  subject: string,
  htmlContent: string
) {
  const messageData = {
    from: `Unigrc <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to: [to],
    subject,
    html: htmlContent
  };
  
  await mg.messages.create(process.env.MAILGUN_DOMAIN!, messageData);
}

// Template-based email with variables
async function sendTemplateEmail(
  to: string,
  template: string,
  variables: Record<string, any>
) {
  const messageData = {
    from: `Unigrc <noreply@${process.env.MAILGUN_DOMAIN}>`,
    to: [to],
    subject: variables.subject || 'Notification',
    template,
    'h:X-Mailgun-Variables': JSON.stringify(variables)
  };
  
  await mg.messages.create(process.env.MAILGUN_DOMAIN!, messageData);
}
```

**Configuración:**
- `MAILGUN_API_KEY`: API Key de Mailgun
- `MAILGUN_DOMAIN`: Dominio configurado (sandbox o producción)
- **Sandbox:** Solo envía a destinatarios autorizados
- **Producción:** Requiere dominio verificado

### 10.3 Twilio (SMS)

```typescript
import twilio from 'twilio';

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function sendSMS(to: string, message: string) {
  await client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to
  });
}
```

### 10.4 Web Push Notifications

```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@unigrc.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushNotification(
  subscription: PushSubscription,
  payload: any
) {
  await webpush.sendNotification(
    subscription,
    JSON.stringify(payload)
  );
}
```

### 10.5 BullMQ / Redis

```typescript
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL);

// Create queue
const notificationQueue = new Queue('notifications', { connection });

// Add job
await notificationQueue.add('send-email', {
  to: 'user@example.com',
  subject: 'Alert',
  body: 'Test'
});

// Process jobs
const worker = new Worker('notifications', async (job) => {
  if (job.name === 'send-email') {
    await sendEmail(job.data.to, job.data.subject, job.data.body);
  }
}, { connection });
```

### 10.6 Azure OpenAI (AI Assistant)

**Servicio:** Azure OpenAI Service con GPT-4o-mini (modelo más económico de Microsoft)

```typescript
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.AZURE_OPENAI_API_KEY,
  baseURL: `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
  defaultQuery: { 'api-version': process.env.AZURE_OPENAI_API_VERSION },
  defaultHeaders: { 'api-key': process.env.AZURE_OPENAI_API_KEY }
});

// AI Chat with streaming
async function* streamChatCompletion(
  messages: Array<{role: string, content: string}>
) {
  const stream = await openai.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT!,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 2000
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}

// Generate audit test suggestions
async function generateAuditTestSuggestions(context: AuditContext) {
  const sanitizedContext = sanitizeContext(context);
  
  const messages = [
    {
      role: 'system',
      content: 'Eres un asistente experto en auditoría interna...'
    },
    {
      role: 'user',
      content: `Genera 3-5 pruebas de auditoría para: ${JSON.stringify(sanitizedContext)}`
    }
  ];

  const response = await openai.chat.completions.create({
    model: process.env.AZURE_OPENAI_DEPLOYMENT!,
    messages,
    temperature: 0.7,
    response_format: { type: 'json_object' }
  });

  return JSON.parse(response.choices[0].message.content);
}
```

**Características:**
- **Modelo:** GPT-4o-mini (económico, multilingüe)
- **Streaming:** Server-Sent Events (SSE) para respuestas en tiempo real
- **Privacidad:** Datos solo como contexto, no almacenados por Azure
- **Cache:** In-memory con TTL 5 minutos para consultas frecuentes
- **Rate Limiting:** 20 req/min general, 10 req/min generación
- **Sanitización:** Datos sensibles removidos antes de envío

**Variables de entorno:**
```bash
AZURE_OPENAI_API_KEY=your_api_key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

### 10.7 Sistema de Configuración (system_config)

**Tabla:** `system_config` para parámetros persistentes del sistema

```typescript
// Configuración de recordatorios de notificaciones
interface NotificationConfig {
  enabled: boolean;
  intervals: {
    days_30: boolean;
    days_15: boolean;
    days_7: boolean;
    days_3: boolean;
    days_1: boolean;
    day_of: boolean;
  };
}

// Guardar configuración
async function saveConfig(key: string, value: any) {
  await db.insert(systemConfig).values({
    configKey: key,
    configValue: JSON.stringify(value)
  }).onConflictDoUpdate({
    target: systemConfig.configKey,
    set: { configValue: JSON.stringify(value) }
  });
}

// Leer configuración con cache
const configCache = new Map<string, {value: any, timestamp: number}>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

async function getConfig<T>(key: string, defaultValue: T): Promise<T> {
  const cached = configCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }

  const config = await db.query.systemConfig.findFirst({
    where: eq(systemConfig.configKey, key)
  });

  const value = config ? JSON.parse(config.configValue) : defaultValue;
  configCache.set(key, { value, timestamp: Date.now() });
  
  return value;
}
```

**Uso principal:** Configuración de intervalos de notificaciones para planes de acción

---

## Conclusión

Unigrc implementa una arquitectura moderna, escalable y mantenible que combina:

- **Type Safety** end-to-end con TypeScript
- **Performance** con React 18, Vite y PostgreSQL optimizado
- **Seguridad** robusta con múltiples capas de protección
- **Inteligencia Artificial** integrada con Azure OpenAI para asistencia contextual
- **Mantenibilidad** con patrones de diseño establecidos
- **Escalabilidad** con servicios modulares y colas de trabajo
- **Privacidad Empresarial** con sanitización de datos y garantías de Azure

La arquitectura monolítica modular permite desarrollo rápido sin sacrificar organización y separación de concerns, mientras que el stack tecnológico moderno garantiza una excelente experiencia de desarrollo y usuario. La integración de IA empresarial (Azure OpenAI) proporciona capacidades avanzadas manteniendo el control total de los datos.

---

**Fin de la Documentación de Arquitectura Técnica**
