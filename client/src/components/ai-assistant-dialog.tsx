import { useState, useRef, useLayoutEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, Loader2, MessageSquare, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAIStatus } from "@/hooks/useAIStatus";
import { getCSRFTokenFromCookie } from "@/lib/csrf-cache";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIAssistantDialogProps {
  children?: React.ReactNode;
}

export default function AIAssistantDialog({ children }: AIAssistantDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: '¡Hola! Soy tu asistente de Unigrc con acceso completo a TODA la información del sistema.\n\n🎯 **Conocimiento completo**:\n• 📊 Riesgos y niveles de exposición\n• 🛡️ Controles y efectividad\n• 🏢 Estructura organizacional (Macroprocesos/Procesos)\n• 🔍 Auditorías y planes de auditoría\n• 📋 Eventos de riesgo materializados\n• ✅ Planes de acción y seguimiento\n• 📚 Documentación normativa y regulaciones\n\n⚡ **Streaming activado**: Respuestas instantáneas basadas en datos reales\n\nPregúntame sobre:\n"¿Cuántos riesgos críticos tenemos?" • "Resume el estado de las auditorías" • "¿Qué controles hay para riesgos operacionales?" • "Muestra los planes de acción pendientes"\n\n¿En qué puedo ayudarte?',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { ready: modelReady, isChecking: modelLoading } = useAIStatus();

  // Auto scroll to bottom when new messages are added
  useLayoutEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Create assistant message that will be updated with streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Build headers with CSRF token for production
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      const isProduction = import.meta.env.MODE === 'production';
      if (isProduction) {
        const csrfToken = getCSRFTokenFromCookie();
        if (csrfToken) {
          headers['x-csrf-token'] = csrfToken;
        }
      }

      // Use the Azure OpenAI assistant endpoint
      const response = await fetch(`${window.location.origin}/api/ai/assistant-stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          question: userMessage.content
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${response.statusText} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // Read the streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));

        for (const line of lines) {
          try {
            const jsonStr = line.replace('data: ', '');
            const data = JSON.parse(jsonStr);
            
            if (data.chunk) {
              accumulatedContent += data.chunk;
              // Update the message in real-time
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ));
            }
            
            if (data.done) {
              // Log system metadata if available
              if (data.metadata?.fullSystemContext) {
                console.log(`ℹ️ Respuesta generada con contexto completo del sistema:`);
                console.log(`  📚 ${data.metadata.documentsCount || 0} documentos normativos`);
                console.log(`  📊 ${data.metadata.risksCount || 0} riesgos`);
                console.log(`  🛡️ ${data.metadata.controlsCount || 0} controles`);
                console.log(`  🏢 ${data.metadata.macroprocesosCount || 0} macroprocesos`);
                console.log(`  📁 ${data.metadata.processesCount || 0} procesos`);
                console.log(`  🔍 ${data.metadata.auditsCount || 0} auditorías (${data.metadata.activeAuditsCount || 0} activas)`);
                console.log(`  📋 ${data.metadata.eventsCount || 0} eventos de riesgo`);
                console.log(`  ✅ ${data.metadata.actionPlansCount || 0} planes de acción (${data.metadata.pendingPlansCount || 0} pendientes)`);
                console.log(`  📜 ${data.metadata.regulationsCount || 0} regulaciones`);
              }
              break;
            }
            
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE chunk:', parseError);
          }
        }
      }
      
      // Ensure final message is set
      if (accumulatedContent) {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: accumulatedContent }
            : msg
        ));
      } else {
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId
            ? { ...msg, content: 'Lo siento, no pude procesar tu pregunta en este momento.' }
            : msg
        ));
      }
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      
      let errorContent = 'Lo siento, hay un problema con el servicio de IA. ';
      let toastTitle = "Error de Conexión";
      let toastDescription = "No se pudo conectar con el asistente de IA.";
      
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorContent += 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
          toastDescription = "Error de conexión de red. Verifica tu conexión a internet.";
        } else if (error.message.includes('AbortError')) {
          errorContent += 'La respuesta tardó demasiado tiempo. El modelo IA puede estar cargando, intenta de nuevo en un momento.';
          toastDescription = "Timeout en la respuesta. El modelo IA está cargando, intenta de nuevo.";
        } else {
          errorContent += `Error: ${error.message}`;
          toastDescription = `Error específico: ${error.message}`;
        }
      } else {
        errorContent += 'Error desconocido. Por favor, intenta más tarde.';
      }
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorContent,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: toastTitle,
        description: toastDescription,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageContent = (content: string) => {
    return content.split('\n').map((line, index) => (
      <span key={index}>
        {line}
        {index < content.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            size="lg"
            className={`fixed bottom-6 right-6 h-14 w-14 rounded-full text-white border-0 shadow-2xl hover:shadow-3xl transition-all duration-200 z-50 p-0 ${
              modelReady 
                ? 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700' 
                : 'bg-gray-400 hover:bg-gray-500 animate-pulse'
            }`}
            title={modelReady ? 'Asistente IA listo' : 'Cargando modelo IA...'}
            data-testid="button-ai-assistant"
          >
            {modelLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
            <span className="sr-only">Asistente IA</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            Asistente de Unigrc
          </DialogTitle>
          <DialogDescription>
            Tu asistente inteligente con acceso a toda la documentación normativa y funcionalidades del sistema.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pb-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.type === 'assistant' && (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-auto'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <div className="text-sm">
                      {formatMessageContent(message.content)}
                    </div>
                    <div className="text-xs mt-2 opacity-70">
                      {message.timestamp.toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  
                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                      <MessageSquare className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-muted text-muted-foreground p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm font-medium">Procesando...</span>
                    </div>
                    <p className="text-xs opacity-70">
                      {messages.length <= 2 ? 'Cargando modelo IA por primera vez (1-2 minutos)...' : 'Generando respuesta (30-60s)...'}
                    </p>
                  </div>
                </div>
              )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex gap-2 pt-4 border-t">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Pregunta sobre normativas, funcionalidades o procesos..."
            className="flex-1"
            disabled={isLoading}
            data-testid="input-ai-message"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!inputMessage.trim() || isLoading}
            size="sm"
            data-testid="button-send-message"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1 pt-2">
          <Badge variant="outline" className="text-xs">
            📚 Ejemplos: "¿Qué leyes tenemos sobre protección de datos?" • "¿Cómo crear un riesgo?" • "Resume nuestras políticas"
          </Badge>
        </div>
      </DialogContent>
    </Dialog>
  );
}