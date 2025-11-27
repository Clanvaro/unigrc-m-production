import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Mail, Save, RefreshCw, Send, CheckCircle, XCircle, Info, Eye, EyeOff } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

type EmailProvider = 'mailgun' | 'smtp' | null;

interface MailgunConfig {
  apiKey: string;
  domain: string;
  from: string;
}

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
}

interface EmailConfig {
  provider: EmailProvider;
  configured: boolean;
  mailgun?: Partial<MailgunConfig>;
  smtp?: Partial<SmtpConfig>;
}

export default function EmailConfig() {
  const { toast } = useToast();
  
  const { data: config, isLoading } = useQuery<EmailConfig>({
    queryKey: ['/api/email-config'],
  });

  const [provider, setProvider] = useState<EmailProvider>(null);
  const [testEmail, setTestEmail] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  
  // Mailgun configuration
  const [mailgunConfig, setMailgunConfig] = useState<MailgunConfig>({
    apiKey: "",
    domain: "",
    from: "",
  });

  // SMTP configuration
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    user: "",
    password: "",
    from: "",
  });

  useEffect(() => {
    if (config) {
      setProvider(config.provider);
      if (config.mailgun) {
        setMailgunConfig({
          apiKey: "",
          domain: config.mailgun.domain || "",
          from: config.mailgun.from || "",
        });
      }
      if (config.smtp) {
        setSmtpConfig({
          host: config.smtp.host || "smtp-mail.outlook.com",
          port: config.smtp.port || 587,
          secure: config.smtp.secure !== undefined ? config.smtp.secure : false,
          user: config.smtp.user || "",
          password: "",
          from: config.smtp.from || "",
        });
      }
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/email-config', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/email-config'] });
      toast({
        title: "Configuración guardada",
        description: "El servicio de email se actualizó correctamente",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar la configuración",
        variant: "destructive",
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: async (data: { testEmail: string, config: any }) => {
      return await apiRequest('/api/email-config/test', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Email enviado",
        description: "El email de prueba se envió correctamente. Revisa tu bandeja de entrada.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error al enviar email",
        description: error.message || "No se pudo enviar el email de prueba",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!provider) {
      toast({
        title: "Error de validación",
        description: "Selecciona un proveedor de email",
        variant: "destructive",
      });
      return;
    }

    const emailConfig: any = {
      provider,
    };

    if (provider === 'mailgun') {
      if (!mailgunConfig.apiKey || !mailgunConfig.domain || !mailgunConfig.from) {
        toast({
          title: "Error de validación",
          description: "Completa todos los campos de Mailgun",
          variant: "destructive",
        });
        return;
      }
      emailConfig.mailgun = mailgunConfig;
    }

    if (provider === 'smtp') {
      if (!smtpConfig.host || !smtpConfig.port || !smtpConfig.user || !smtpConfig.password || !smtpConfig.from) {
        toast({
          title: "Error de validación",
          description: "Completa todos los campos de SMTP",
          variant: "destructive",
        });
        return;
      }
      emailConfig.smtp = smtpConfig;
    }

    saveMutation.mutate(emailConfig);
  };

  const handleTest = () => {
    if (!testEmail) {
      toast({
        title: "Error de validación",
        description: "Ingresa un email para enviar la prueba",
        variant: "destructive",
      });
      return;
    }

    const emailConfig: any = {
      provider,
    };

    if (provider === 'mailgun') {
      emailConfig.mailgun = mailgunConfig;
    }

    if (provider === 'smtp') {
      emailConfig.smtp = smtpConfig;
    }

    testMutation.mutate({ testEmail, config: emailConfig });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Configuración de Servicio de Email</CardTitle>
          </div>
          <CardDescription>
            Configura el servicio de email para enviar notificaciones y recordatorios del sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Información</AlertTitle>
            <AlertDescription>
              El sistema utiliza el servicio de email para enviar notificaciones de planes de acción, 
              invitaciones a autoevaluaciones de controles, y otros recordatorios importantes.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <Label>Selecciona el proveedor de email</Label>
            <RadioGroup value={provider || "none"} onValueChange={(value) => setProvider(value === "none" ? null : value as EmailProvider)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mailgun" id="mailgun" data-testid="radio-mailgun" />
                <Label htmlFor="mailgun" className="cursor-pointer">Mailgun</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="smtp" id="smtp" data-testid="radio-smtp" />
                <Label htmlFor="smtp" className="cursor-pointer">SMTP (Outlook / Office 365)</Label>
              </div>
            </RadioGroup>
          </div>

          {provider === 'mailgun' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuración de Mailgun</CardTitle>
                <CardDescription>
                  Ingresa tus credenciales de Mailgun. Puedes obtener estas en tu dashboard de Mailgun.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mailgun-apikey">API Key</Label>
                  <div className="relative">
                    <Input
                      id="mailgun-apikey"
                      type={showPasswords ? "text" : "password"}
                      value={mailgunConfig.apiKey}
                      onChange={(e) => setMailgunConfig({ ...mailgunConfig, apiKey: e.target.value })}
                      placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxx"
                      data-testid="input-mailgun-apikey"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswords(!showPasswords)}
                      data-testid="button-toggle-password"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mailgun-domain">Dominio</Label>
                  <Input
                    id="mailgun-domain"
                    value={mailgunConfig.domain}
                    onChange={(e) => setMailgunConfig({ ...mailgunConfig, domain: e.target.value })}
                    placeholder="mg.tudominio.com"
                    data-testid="input-mailgun-domain"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mailgun-from">Email de Remitente</Label>
                  <Input
                    id="mailgun-from"
                    type="email"
                    value={mailgunConfig.from}
                    onChange={(e) => setMailgunConfig({ ...mailgunConfig, from: e.target.value })}
                    placeholder="noreply@tudominio.com"
                    data-testid="input-mailgun-from"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {provider === 'smtp' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Configuración de SMTP</CardTitle>
                <CardDescription>
                  Configuración para Outlook/Office 365 u otro servidor SMTP
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="smtp-host">Servidor SMTP</Label>
                    <Input
                      id="smtp-host"
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                      placeholder="smtp-mail.outlook.com"
                      data-testid="input-smtp-host"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="smtp-port">Puerto</Label>
                    <Input
                      id="smtp-port"
                      type="number"
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                      placeholder="587"
                      data-testid="input-smtp-port"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="smtp-secure"
                    checked={smtpConfig.secure}
                    onCheckedChange={(checked) => setSmtpConfig({ ...smtpConfig, secure: checked })}
                    data-testid="switch-smtp-secure"
                  />
                  <Label htmlFor="smtp-secure" className="cursor-pointer">
                    Usar SSL/TLS (puerto 465)
                  </Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-user">Usuario</Label>
                  <Input
                    id="smtp-user"
                    type="email"
                    value={smtpConfig.user}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                    placeholder="tu-email@outlook.com"
                    data-testid="input-smtp-user"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-password">Contraseña</Label>
                  <div className="relative">
                    <Input
                      id="smtp-password"
                      type={showPasswords ? "text" : "password"}
                      value={smtpConfig.password}
                      onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                      placeholder="••••••••"
                      data-testid="input-smtp-password"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPasswords(!showPasswords)}
                      data-testid="button-toggle-password"
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smtp-from">Email de Remitente</Label>
                  <Input
                    id="smtp-from"
                    type="email"
                    value={smtpConfig.from}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, from: e.target.value })}
                    placeholder="noreply@tudominio.com"
                    data-testid="input-smtp-from"
                  />
                  <p className="text-sm text-muted-foreground">
                    Debe coincidir con el usuario de SMTP
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Configuración para Outlook/Office 365</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-4 mt-2 space-y-1">
                      <li>Servidor: smtp-mail.outlook.com</li>
                      <li>Puerto: 587 (STARTTLS) o 465 (SSL)</li>
                      <li>Usuario: tu dirección completa de email</li>
                      <li>El email de remitente debe coincidir con el usuario</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}

          {provider && (
            <>
              <div className="border-t pt-6">
                <h3 className="text-lg font-semibold mb-4">Probar Configuración</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="test-email">Email de Prueba</Label>
                    <Input
                      id="test-email"
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="tu-email@ejemplo.com"
                      data-testid="input-test-email"
                    />
                    <p className="text-sm text-muted-foreground">
                      Enviaremos un email de prueba a esta dirección
                    </p>
                  </div>

                  <Button
                    onClick={handleTest}
                    disabled={testMutation.isPending || !testEmail}
                    variant="outline"
                    data-testid="button-test-email"
                  >
                    {testMutation.isPending ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="mr-2 h-4 w-4" />
                    )}
                    Enviar Email de Prueba
                  </Button>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={handleSave}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-config"
                >
                  {saveMutation.isPending ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Guardar Configuración
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {config?.configured && config.provider && (
        <Card className="border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium">Servicio de Email Configurado</p>
                <p className="text-sm text-muted-foreground">
                  Proveedor activo: {config.provider === 'mailgun' ? 'Mailgun' : 'SMTP'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
