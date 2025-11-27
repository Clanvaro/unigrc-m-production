import { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (result: { successful: { name: string; size: number; type: string; uploadURL: string }[] }) => void;
  onUploadStart?: () => void;
  buttonClassName?: string;
  children: ReactNode;
}

/**
 * A simplified file upload component that uses native file input and direct upload to presigned URL.
 * This avoids the complex Uppy dependency and CSS issues while providing the same functionality.
 */
export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760, // 10MB default
  onGetUploadParameters,
  onComplete,
  onUploadStart,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0]; // Only handle single file for now

    // Validate file size
    if (file.size > maxFileSize) {
      toast({
        title: "Archivo demasiado grande",
        description: `El archivo debe ser menor a ${(maxFileSize / 1024 / 1024).toFixed(0)} MB`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      onUploadStart?.();

      // Get upload parameters
      const { method, url } = await onGetUploadParameters();

      // Upload file directly
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Success
          onComplete?.({
            successful: [{
              name: file.name,
              size: file.size,
              type: file.type,
              uploadURL: url
            }]
          });
          
          toast({
            title: "Archivo subido exitosamente",
            description: `${file.name} se ha subido correctamente.`,
          });
        } else {
          throw new Error(`Upload failed with status ${xhr.status}`);
        }
        setIsUploading(false);
        setUploadProgress(0);
      });

      xhr.addEventListener('error', () => {
        toast({
          title: "Error al subir archivo",
          description: "Ocurrió un error durante la subida. Intenta nuevamente.",
          variant: "destructive",
        });
        setIsUploading(false);
        setUploadProgress(0);
      });

      xhr.open(method, url);
      xhr.setRequestHeader('Content-Type', file.type);
      xhr.send(file);

    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Error al subir archivo",
        description: "No se pudo obtener los parámetros de subida. Intenta nuevamente.",
        variant: "destructive",
      });
      setIsUploading(false);
      setUploadProgress(0);
    }

    // Clear the input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <Input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
        accept="*/*"
        disabled={isUploading}
      />
      
      <Button 
        type="button"
        onClick={handleButtonClick} 
        className={buttonClassName}
        disabled={isUploading}
      >
        {children}
      </Button>

      {isUploading && (
        <div className="space-y-2">
          <div className="text-sm text-gray-600">
            Subiendo archivo... {Math.round(uploadProgress)}%
          </div>
          <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
  );
}