import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Edit2, Check, Target } from "lucide-react";

interface ObjectivesEditorProps {
  objectives: string[];
  onChange: (objectives: string[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ObjectivesEditor({ objectives, onChange, disabled = false, className = "" }: ObjectivesEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [newObjective, setNewObjective] = useState("");

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      onChange([...objectives, newObjective.trim()]);
      setNewObjective("");
    }
  };

  const handleEditObjective = (index: number) => {
    setEditingIndex(index);
    setEditingValue(objectives[index]);
  };

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingValue.trim()) {
      const updated = [...objectives];
      updated[editingIndex] = editingValue.trim();
      onChange(updated);
      setEditingIndex(null);
      setEditingValue("");
    }
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditingValue("");
  };

  const handleDeleteObjective = (index: number) => {
    const updated = objectives.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleKeyPress = (e: React.KeyboardEvent, action: 'add' | 'save') => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (action === 'add') {
        handleAddObjective();
      } else if (action === 'save') {
        handleSaveEdit();
      }
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-5 w-5 text-primary" />
        <Label className="text-base font-semibold">Objetivos Específicos</Label>
      </div>

      {/* Lista de objetivos existentes */}
      <div className="space-y-3">
        {objectives.map((objective, index) => (
          <Card key={index} className="p-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold mt-0.5 flex-shrink-0">
                {index + 1}
              </div>
              
              <div className="flex-1 min-w-0">
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyDown={(e) => handleKeyPress(e, 'save')}
                      className="min-h-[60px] resize-none"
                      placeholder="Escribe el objetivo específico..."
                      disabled={disabled}
                      data-testid={`textarea-edit-objective-${index}`}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSaveEdit}
                        disabled={disabled || !editingValue.trim()}
                        data-testid={`button-save-objective-${index}`}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Guardar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={disabled}
                        data-testid={`button-cancel-objective-${index}`}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm flex-1 leading-relaxed" data-testid={`text-objective-${index}`}>
                      {objective}
                    </p>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEditObjective(index)}
                        disabled={disabled}
                        data-testid={`button-edit-objective-${index}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteObjective(index)}
                        disabled={disabled}
                        data-testid={`button-delete-objective-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
        
        {objectives.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay objetivos específicos definidos</p>
            <p className="text-xs">Agrega objetivos para definir el alcance de la auditoría</p>
          </div>
        )}
      </div>

      {/* Agregar nuevo objetivo */}
      <Card className="p-3 border-dashed">
        <div className="space-y-3">
          <Label htmlFor="new-objective" className="text-sm font-medium">
            Agregar nuevo objetivo
          </Label>
          <div className="space-y-2">
            <Textarea
              id="new-objective"
              value={newObjective}
              onChange={(e) => setNewObjective(e.target.value)}
              onKeyDown={(e) => handleKeyPress(e, 'add')}
              className="min-h-[60px] resize-none"
              placeholder="Ej: Evaluar la efectividad de los controles implementados..."
              disabled={disabled}
              data-testid="textarea-new-objective"
            />
            <Button
              type="button"
              onClick={handleAddObjective}
              disabled={disabled || !newObjective.trim()}
              className="w-full"
              data-testid="button-add-objective"
            >
              <Plus className="h-4 w-4 mr-2" />
              Agregar Objetivo
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}