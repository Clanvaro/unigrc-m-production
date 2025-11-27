import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ImportSession {
  id: string;
  status: "uploading" | "validating" | "processing" | "completed" | "failed";
  progress: number;
  fileName: string;
  summary?: {
    created: number;
    updated: number;
    skipped: number;
    errors: number;
  };
  errors?: Array<{
    sheet: string;
    row: number;
    field: string;
    message: string;
  }>;
}

export default function Import() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importSession, setImportSession] = useState<ImportSession | null>(null);
  const [isDryRun, setIsDryRun] = useState(true);

  const handleFileSelect = (file: File) => {
    if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || 
        file.type === "application/vnd.ms-excel") {
      setSelectedFile(file);
    } else {
      alert("Por favor seleccione un archivo Excel (.xlsx o .xls)");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async (dryRun: boolean = true) => {
    if (!selectedFile) return;

    try {
      // Crear FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('isDryRun', dryRun.toString());

      // Crear sesión de importación
      const response = await fetch('/api/imports', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir archivo');
      }

      const { sessionId } = await response.json();

      // Inicializar sesión de importación
      setImportSession({
        id: sessionId,
        status: "uploading",
        progress: 0,
        fileName: selectedFile.name,
      });

      // Monitorear progreso de la importación
      const monitorProgress = async () => {
        try {
          const progressResponse = await fetch(`/api/imports/${sessionId}`);
          if (!progressResponse.ok) {
            throw new Error('Error al obtener estado de importación');
          }

          const sessionData = await progressResponse.json();
          setImportSession(sessionData);

          // Continuar monitoreando si no ha terminado
          if (sessionData.status !== 'completed' && sessionData.status !== 'failed') {
            setTimeout(monitorProgress, 1000);
          }
        } catch (error) {
          console.error('Error monitoring progress:', error);
          setImportSession(prev => prev ? {
            ...prev,
            status: "failed",
            progress: 100,
          } : null);
        }
      };

      // Comenzar monitoreo después de un breve delay
      setTimeout(monitorProgress, 1000);

    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir archivo. Por favor intente nuevamente.');
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/imports/template');
      if (!response.ok) {
        throw new Error('Error al descargar plantilla');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla_importacion.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
      alert('Error al descargar plantilla. Por favor intente nuevamente.');
    }
  };

  const downloadErrorReport = async () => {
    if (!importSession?.id) return;

    try {
      const response = await fetch(`/api/imports/${importSession.id}/report`);
      if (!response.ok) {
        throw new Error('Error al descargar reporte de errores');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `errores_importacion_${importSession.id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading error report:', error);
      alert('Error al descargar reporte de errores. Por favor intente nuevamente.');
    }
  };

  const resetImport = () => {
    setSelectedFile(null);
    setImportSession(null);
    setIsDryRun(true);
  };

  return (
    <div className="space-y-6">
      {/* Template Download */}
      <Card data-testid="card-template-download">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Plantilla de Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                Descargue la plantilla oficial con las hojas y columnas requeridas
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">Entidades Fiscales</Badge>
                <Badge variant="outline">Propietarios de Procesos</Badge>
                <Badge variant="outline">Macroprocesos</Badge>
                <Badge variant="outline">Procesos</Badge>
                <Badge variant="outline">Subprocesos</Badge>
                <Badge variant="outline">Riesgos</Badge>
                <Badge variant="outline">Controles</Badge>
                <Badge variant="outline">Planes de Acción</Badge>
              </div>
            </div>
            <Button 
              onClick={downloadTemplate}
              data-testid="button-download-template"
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar Plantilla
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card data-testid="card-file-upload">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Cargar Archivo Excel
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedFile && !importSession && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25"
              }`}
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              data-testid="dropzone-upload"
            >
              <FileSpreadsheet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Arrastre su archivo Excel aquí o haga clic para seleccionar
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Archivos soportados: .xlsx, .xls (máximo 10MB)
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-input"
                data-testid="input-file"
              />
              <label htmlFor="file-input">
                <Button asChild data-testid="button-select-file">
                  <span>Seleccionar Archivo</span>
                </Button>
              </label>
            </div>
          )}

          {selectedFile && !importSession && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  data-testid="button-remove-file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="dry-run"
                      checked={isDryRun}
                      onChange={(e) => setIsDryRun(e.target.checked)}
                      className="rounded"
                      data-testid="checkbox-dry-run"
                    />
                    <label htmlFor="dry-run">
                      Ejecutar validación únicamente (recomendado para el primer intento)
                    </label>
                  </div>
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleUpload(isDryRun)}
                  className="flex-1"
                  data-testid="button-start-import"
                >
                  {isDryRun ? "Validar Datos" : "Importar Datos"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedFile(null)}
                  data-testid="button-cancel"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Progress */}
      {importSession && (
        <Card data-testid="card-import-progress">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {importSession.status === "completed" ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
              Estado de Importación
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Archivo: {importSession.fileName}</span>
              <Badge 
                variant={importSession.status === "completed" ? "default" : "secondary"}
                data-testid={`status-${importSession.status}`}
              >
                {importSession.status === "uploading" && "Subiendo"}
                {importSession.status === "validating" && "Validando"}
                {importSession.status === "processing" && "Procesando"}
                {importSession.status === "completed" && "Completado"}
                {importSession.status === "failed" && "Error"}
              </Badge>
            </div>

            <Progress value={importSession.progress} className="w-full" />

            {importSession.summary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importSession.summary.created}</div>
                  <div className="text-sm text-muted-foreground">Creados</div>
                </div>
                <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{importSession.summary.updated}</div>
                  <div className="text-sm text-muted-foreground">Actualizados</div>
                </div>
                <div className="text-center p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{importSession.summary.skipped}</div>
                  <div className="text-sm text-muted-foreground">Omitidos</div>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importSession.summary.errors}</div>
                  <div className="text-sm text-muted-foreground">Errores</div>
                </div>
              </div>
            )}

            {importSession.errors && importSession.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-600">Errores encontrados:</h4>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {importSession.errors.map((error, index) => (
                    <div key={index} className="text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-4 border-red-500">
                      <span className="font-medium">{error.sheet}</span> - Fila {error.row}, Campo {error.field}: {error.message}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {importSession.status === "completed" && (
                <>
                  <Button
                    onClick={downloadErrorReport}
                    variant="outline"
                    disabled={!importSession.errors || importSession.errors.length === 0}
                    data-testid="button-download-errors"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar Reporte de Errores
                  </Button>
                  <Button
                    onClick={resetImport}
                    data-testid="button-new-import"
                  >
                    Nueva Importación
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}