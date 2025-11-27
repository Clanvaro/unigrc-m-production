
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Loader2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getCSRFTokenFromCookie } from "@/lib/csrf-cache";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface SpecializedAIButtonProps {
  area: 'risk' | 'controls' | 'audits';
  contextId?: string; // ID específico del riesgo, control o auditoría
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'default' | 'sm' | 'lg' | 'icon';
}

const areaConfig = {
  risk: {
    icon: '📊',
    title: 'Asistente de Riesgos IA',
    endpoint: '/api/ai/assistant-stream',
    placeholder: 'Pregunta sobre este riesgo...',
    examples: [
      '¿Cómo puedo mitigar este riesgo?',
      '¿Qué controles recomiendas?',
      '¿Cuál es el nivel de exposición?'
    ]
  },
  controls: {
    icon: '🛡️',
    title: 'Asistente de Controles IA',
    endpoint: '/api/ai/assistant-stream',
    placeholder: 'Pregunta sobre controles...',
    examples: [
      '¿Este control es efectivo?',
      '¿Con qué frecuencia debo ejecutarlo?',
      '¿Cómo puedo mejorar este control?'
    ]
  },
  audits: {
    icon: '🔍',
    title: 'Asistente de Auditorías IA',
    endpoint: '/api/ai/assistant-stream',
    placeholder: 'Pregunta sobre esta auditoría...',
    examples: [
      '¿Qué procedimientos debo seguir?',
      '¿Cuáles son los hallazgos críticos?',
      '¿Cómo interpretar estos resultados?'
    ]
  }
};

export default function SpecializedAIButton({ 
  area, 
  contextId, 
  buttonText, 
  buttonVariant = 'outline',
  buttonSize = 'sm'
}: SpecializedAIButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  const config = areaConfig[area];

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

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      type: 'assistant',
      content: '',
      timestamp: new Date()
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const bodyData: any = { question: userMessage.content };
      
      if (area === 'risk' && contextId) bodyData.riskId = contextId;
      if (area === 'controls' && contextId) bodyData.controlId = contextId;
      if (area === 'audits' && contextId) bodyData.auditId = contextId;

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

      const response = await fetch(`${window.location.origin}${config.endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyData),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI Assistant error:', errorText);
        throw new Error(`Error ${response.status}: - ${errorText}`);
      }
      if (!response.body) throw new Error('Response body is null');

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
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ));
            }
            
            if (data.done) break;
            if (data.error) throw new Error(data.error);
          } catch (parseError) {
            console.warn('Failed to parse SSE chunk:', parseError);
          }
        }
      }
      
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId
          ? { ...msg, content: 'Error al procesar la consulta. Intenta de nuevo.' }
          : msg
      ));
      
      toast({
        title: "Error",
        description: "No se pudo conectar con el asistente IA.",
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <Sparkles className="h-4 w-4 mr-2" />
          {buttonText || `${config.icon} IA`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {config.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col gap-4 h-[500px]">
          <div className="flex-1 overflow-y-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p className="mb-4">Preguntas sugeridas:</p>
                {config.examples.map((example, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="mb-2 w-full text-left justify-start"
                    onClick={() => setInputMessage(example)}
                  >
                    {example}
                  </Button>
                ))}
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'assistant' && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                
                <div className={`max-w-[80%] p-3 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Procesando...</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2 pt-4 border-t">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={config.placeholder}
              disabled={isLoading}
            />
            <Button onClick={handleSendMessage} disabled={!inputMessage.trim() || isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
