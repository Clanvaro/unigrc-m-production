import { Keyboard, Command, Navigation, MousePointer, Table as TableIcon } from "lucide-react";

export default function Shortcuts() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="container mx-auto max-w-5xl">
          {/* Neomorphic header */}
          <div className="mb-8 p-6 rounded-3xl bg-background shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl shadow-[6px_6px_12px_rgba(0,0,0,0.1),-6px_-6px_12px_rgba(255,255,255,0.9)] dark:shadow-[6px_6px_12px_rgba(0,0,0,0.4),-6px_-6px_12px_rgba(255,255,255,0.05)] bg-background">
                <Keyboard className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground" data-testid="title-shortcuts-page">Atajos de Teclado</h1>
                <p className="text-foreground/70 mt-1">Guía completa de atajos para navegar y usar Unigrc eficientemente</p>
              </div>
            </div>
          </div>

          <div className="grid gap-8">
            {/* Globales */}
            <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
                  <Command className="w-5 h-5 text-primary" />
                </div>
                Atajos Globales
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-global-shortcuts">
                  <thead>
                    <tr className="border-b dark:border-slate-700">
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground">Atajo</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground">Descripción</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground hidden md:table-cell">Contexto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-command-k">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Cmd</kbd>
                          <span className="text-foreground/50">/</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Ctrl</kbd>
                          <span className="text-foreground/50">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">K</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Abrir Command Palette</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Disponible en toda la aplicación</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-command-slash">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Cmd</kbd>
                          <span className="text-foreground/50">/</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Ctrl</kbd>
                          <span className="text-foreground/50">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">/</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Mostrar ayuda de atajos</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Opcional, disponible globalmente</td>
                    </tr>
                    <tr data-testid="row-shortcut-esc">
                      <td className="py-4 px-4">
                        <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">ESC</kbd>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Cerrar modales/diálogos</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Cuando hay un modal activo</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Navegación */}
            <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                Atajos de Navegación
              </h2>
              
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-foreground/70">
                  Presiona <kbd className="px-2 py-1 text-xs font-semibold bg-background rounded border border-border shadow-sm">G</kbd> seguido de la tecla de destino para navegar rápidamente.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-navigation-shortcuts">
                  <thead>
                    <tr className="border-b dark:border-slate-700">
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground">Atajo</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground">Descripción</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground hidden md:table-cell">Destino</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-g-d">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">G</kbd>
                          <span className="text-foreground/50">→</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">D</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Ir a Dashboard</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Página principal</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-g-r">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">G</kbd>
                          <span className="text-foreground/50">→</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">R</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Ir a Riesgos</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Gestión de riesgos</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-g-c">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">G</kbd>
                          <span className="text-foreground/50">→</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">C</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Ir a Controles</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Gestión de controles</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-g-e">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">G</kbd>
                          <span className="text-foreground/50">→</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">E</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Ir a Eventos</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Eventos de riesgo</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-g-a">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">G</kbd>
                          <span className="text-foreground/50">→</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">A</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Ir a Auditorías</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Módulo de auditorías</td>
                    </tr>
                    <tr data-testid="row-shortcut-g-p">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">G</kbd>
                          <span className="text-foreground/50">→</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">P</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Ir a Procesos</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Gestión de procesos</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acciones */}
            <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
                  <MousePointer className="w-5 h-5 text-primary" />
                </div>
                Atajos de Acciones
              </h2>
              
              <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Nota:</strong> Estos atajos estarán disponibles cuando se implementen las funcionalidades correspondientes.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-action-shortcuts">
                  <thead>
                    <tr className="border-b dark:border-slate-700">
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground">Atajo</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground">Descripción</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground hidden md:table-cell">Contexto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-n">
                      <td className="py-4 px-4">
                        <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">N</kbd>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Nuevo elemento</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Depende del contexto actual</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-e">
                      <td className="py-4 px-4">
                        <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">E</kbd>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Editar elemento seleccionado</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Cuando hay un elemento seleccionado</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-delete">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Delete</kbd>
                          <span className="text-foreground/50">/</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Supr</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Eliminar elemento seleccionado</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Requiere confirmación</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-command-s">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Cmd</kbd>
                          <span className="text-foreground/50">/</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Ctrl</kbd>
                          <span className="text-foreground/50">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">S</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Guardar cambios</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">En formularios de edición</td>
                    </tr>
                    <tr data-testid="row-shortcut-command-enter">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Cmd</kbd>
                          <span className="text-foreground/50">/</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Ctrl</kbd>
                          <span className="text-foreground/50">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Enter</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Enviar formulario</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">En formularios activos</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tablas */}
            <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
              <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-3">
                <div className="p-3 rounded-xl shadow-[4px_4px_8px_rgba(0,0,0,0.1),-4px_-4px_8px_rgba(255,255,255,0.9)] dark:shadow-[4px_4px_8px_rgba(0,0,0,0.4),-4px_-4px_8px_rgba(255,255,255,0.05)] bg-background">
                  <TableIcon className="w-5 h-5 text-primary" />
                </div>
                Atajos en Tablas
              </h2>
              
              <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-foreground/70">
                  Estos atajos te permiten navegar y gestionar elementos en las vistas de tabla de manera eficiente.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full" data-testid="table-table-shortcuts">
                  <thead>
                    <tr className="border-b dark:border-slate-700">
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground">Atajo</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground">Descripción</th>
                      <th scope="col" className="text-left py-3 px-4 font-semibold text-foreground hidden md:table-cell">Contexto</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-arrows">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">↑</kbd>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">↓</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Navegar entre filas</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">En vistas de tabla</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-space">
                      <td className="py-4 px-4">
                        <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Space</kbd>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Seleccionar/deseleccionar fila</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">En tablas con selección múltiple</td>
                    </tr>
                    <tr className="border-b dark:border-slate-700/50" data-testid="row-shortcut-command-a">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Cmd</kbd>
                          <span className="text-foreground/50">/</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Ctrl</kbd>
                          <span className="text-foreground/50">+</span>
                          <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">A</kbd>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Seleccionar todos los elementos</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">En tablas con selección múltiple</td>
                    </tr>
                    <tr data-testid="row-shortcut-slash">
                      <td className="py-4 px-4">
                        <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">/</kbd>
                      </td>
                      <td className="py-4 px-4 text-foreground/80">Buscar en tabla</td>
                      <td className="py-4 px-4 text-foreground/60 text-sm hidden md:table-cell">Activa el campo de búsqueda</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tips */}
            <div className="rounded-3xl bg-background p-8 shadow-[12px_12px_24px_rgba(0,0,0,0.1),-12px_-12px_24px_rgba(255,255,255,0.9)] dark:shadow-[12px_12px_24px_rgba(0,0,0,0.4),-12px_-12px_24px_rgba(255,255,255,0.05)]">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Tips de Productividad</h2>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-sm text-foreground/80">
                    Usa <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Cmd/Ctrl</kbd> + <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">K</kbd> para acceder rápidamente a cualquier sección mediante el Command Palette.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-sm text-foreground/80">
                    Los atajos de navegación con <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">G</kbd> son secuenciales: presiona <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">G</kbd> y luego la letra de destino.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-sm text-foreground/80">
                    Combina <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">Shift</kbd> con las flechas de navegación para seleccionar múltiples filas en tablas.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                  <p className="text-sm text-foreground/80">
                    Usa <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded border border-border shadow-sm">ESC</kbd> para cerrar cualquier modal o diálogo abierto rápidamente.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
