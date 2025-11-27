import { lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Lazy load the AI Assistant Dialog
const AIAssistantDialog = lazy(() => import("@/components/ai-assistant-dialog"));

// Loading fallback for the AI Assistant
function AIAssistantLoading() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando asistente...</p>
      </div>
    </div>
  );
}

// Wrapper component that lazy loads the AI Assistant
export default function AIAssistantLazy({ children }: { children?: React.ReactNode }) {
  return (
    <Suspense fallback={<AIAssistantLoading />}>
      <AIAssistantDialog>{children}</AIAssistantDialog>
    </Suspense>
  );
}
