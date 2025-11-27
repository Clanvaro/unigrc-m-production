import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RiskEvent, Control } from '@shared/schema';

interface BowTieDiagramProps {
  event: RiskEvent;
  controls: Control[];
}

export default function BowTieDiagram({ event, controls }: BowTieDiagramProps) {
  // Filtrar controles por tipo
  const preventiveControls = useMemo(() => 
    controls.filter(c => c.type === 'preventive'),
    [controls]
  );

  const detectiveControls = useMemo(() => 
    controls.filter(c => c.type === 'detective'),
    [controls]
  );

  const causas = event.causas || [];
  const consecuencias = event.consecuencias || [];

  if (!causas.length && !consecuencias.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Análisis Bow Tie</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No hay datos de causas o consecuencias para visualizar el análisis Bow Tie.
            Agrega causas y consecuencias al evento para ver el diagrama.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Análisis Bow Tie</span>
          <Badge variant="outline" className="text-xs">
            {preventiveControls.length} Preventivos | {detectiveControls.length} Detectivos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-[500px] bg-background rounded-lg overflow-hidden" data-testid="bow-tie-diagram">
          <svg width="100%" height="100%" viewBox="0 0 1200 500" preserveAspectRatio="xMidYMid meet">
            {/* Fondo triangular izquierdo (Causas) */}
            <defs>
              <linearGradient id="causasGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#1e3a5f', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: '#3b5a7d', stopOpacity: 0.8 }} />
              </linearGradient>
              <linearGradient id="consecuenciasGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: '#dc2626', stopOpacity: 0.8 }} />
                <stop offset="100%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
              </linearGradient>
            </defs>

            {/* Trapecio izquierdo - Causas (azul oscuro) */}
            <polygon 
              points="50,50 350,150 350,350 50,450" 
              fill="url(#causasGradient)"
              className="opacity-90"
            />
            
            {/* Trapecio derecho - Consecuencias (rojo) */}
            <polygon 
              points="850,150 1150,50 1150,450 850,350" 
              fill="url(#consecuenciasGradient)"
              className="opacity-90"
            />

            {/* Etiqueta CAUSAS POTENCIALES */}
            <text x="200" y="480" textAnchor="middle" className="fill-foreground font-bold text-sm">
              CAUSAS POTENCIALES
            </text>

            {/* Etiqueta PREVENCIÓN */}
            <text x="280" y="130" textAnchor="middle" className="fill-foreground font-bold text-sm" transform="rotate(-15 280 130)">
              PREVENCIÓN
            </text>

            {/* Lista de Causas */}
            {causas.slice(0, 4).map((causa, index) => {
              const y = 100 + (index * 90);
              return (
                <g key={index}>
                  <rect 
                    x="70" 
                    y={y - 20} 
                    width="160" 
                    height="40" 
                    fill="white" 
                    stroke="#1e3a5f" 
                    strokeWidth="2"
                    rx="4"
                  />
                  <text 
                    x="150" 
                    y={y + 5} 
                    textAnchor="middle" 
                    className="fill-foreground font-medium text-xs"
                  >
                    {causa.length > 18 ? causa.substring(0, 18) + '...' : causa}
                  </text>
                </g>
              );
            })}

            {/* Barreras Preventivas (triángulos/flechas) */}
            {preventiveControls.slice(0, 4).map((control, index) => {
              const y = 120 + (index * 90);
              const x1 = 250;
              const x2 = 450;
              return (
                <g key={`prev-${index}`}>
                  {/* Línea de conexión */}
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke="#64748b" strokeWidth="3" />
                  {/* Triángulo/Barrera */}
                  <polygon 
                    points={`${x1 + 50},${y - 20} ${x1 + 80},${y} ${x1 + 50},${y + 20}`}
                    fill="#10b981"
                    stroke="#059669"
                    strokeWidth="2"
                  />
                  {/* Etiqueta del control */}
                  <text 
                    x={x1 + 100} 
                    y={y - 25} 
                    className="fill-foreground text-[10px] font-medium"
                  >
                    {control.code}
                  </text>
                </g>
              );
            })}

            {/* Evento de Riesgo Central (círculo rojo) */}
            <circle 
              cx="600" 
              cy="250" 
              r="80" 
              fill="#dc2626" 
              stroke="#991b1b" 
              strokeWidth="3"
            />
            <text 
              x="600" 
              y="240" 
              textAnchor="middle" 
              className="fill-white font-bold text-sm"
            >
              Evento de
            </text>
            <text 
              x="600" 
              y="265" 
              textAnchor="middle" 
              className="fill-white font-bold text-sm"
            >
              Riesgo
            </text>

            {/* Etiqueta MITIGACIÓN */}
            <text x="920" y="130" textAnchor="middle" className="fill-foreground font-bold text-sm" transform="rotate(15 920 130)">
              MITIGACIÓN
            </text>

            {/* Barreras de Mitigación/Detectivas (triángulos/flechas) */}
            {detectiveControls.slice(0, 4).map((control, index) => {
              const y = 120 + (index * 90);
              const x1 = 750;
              const x2 = 950;
              return (
                <g key={`det-${index}`}>
                  {/* Línea de conexión */}
                  <line x1={x1} y1={y} x2={x2} y2={y} stroke="#64748b" strokeWidth="3" />
                  {/* Triángulo/Barrera */}
                  <polygon 
                    points={`${x1 + 120},${y - 20} ${x1 + 150},${y} ${x1 + 120},${y + 20}`}
                    fill="#3b82f6"
                    stroke="#2563eb"
                    strokeWidth="2"
                  />
                  {/* Etiqueta del control */}
                  <text 
                    x={x1 + 50} 
                    y={y - 25} 
                    className="fill-foreground text-[10px] font-medium"
                  >
                    {control.code}
                  </text>
                </g>
              );
            })}

            {/* Lista de Consecuencias */}
            {consecuencias.slice(0, 4).map((consecuencia, index) => {
              const y = 100 + (index * 90);
              return (
                <g key={index}>
                  <rect 
                    x="970" 
                    y={y - 20} 
                    width="160" 
                    height="40" 
                    fill="white" 
                    stroke="#dc2626" 
                    strokeWidth="2"
                    rx="4"
                  />
                  <text 
                    x="1050" 
                    y={y + 5} 
                    textAnchor="middle" 
                    className="fill-foreground font-medium text-xs"
                  >
                    {consecuencia.length > 18 ? consecuencia.substring(0, 18) + '...' : consecuencia}
                  </text>
                </g>
              );
            })}

            {/* Etiqueta CONSECUENCIAS POTENCIALES */}
            <text x="1000" y="480" textAnchor="middle" className="fill-foreground font-bold text-sm">
              CONSECUENCIAS POTENCIALES
            </text>

            {/* Líneas de conexión desde causas al evento */}
            {causas.slice(0, 4).map((_, index) => {
              const y = 100 + (index * 90);
              return (
                <line 
                  key={`causa-line-${index}`}
                  x1="230" 
                  y1={y} 
                  x2="520" 
                  y2="250" 
                  stroke="#64748b" 
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="opacity-40"
                />
              );
            })}

            {/* Líneas de conexión desde evento a consecuencias */}
            {consecuencias.slice(0, 4).map((_, index) => {
              const y = 100 + (index * 90);
              return (
                <line 
                  key={`consec-line-${index}`}
                  x1="680" 
                  y1="250" 
                  x2="970" 
                  y2={y} 
                  stroke="#64748b" 
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="opacity-40"
                />
              );
            })}

            {/* Texto CONTROLES PREVENTIVOS */}
            <text x="350" y="380" textAnchor="middle" className="fill-foreground font-bold text-xs">
              CONTROLES
            </text>
            <text x="350" y="395" textAnchor="middle" className="fill-foreground font-bold text-xs">
              PREVENTIVOS
            </text>

            {/* Texto MEDIDAS DE MITIGACIÓN */}
            <text x="850" y="380" textAnchor="middle" className="fill-foreground font-bold text-xs">
              MEDIDAS DE
            </text>
            <text x="850" y="395" textAnchor="middle" className="fill-foreground font-bold text-xs">
              MITIGACIÓN
            </text>
          </svg>
        </div>

        {/* Leyenda */}
        <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-[#1e3a5f] rounded"></div>
            <span>Causas Potenciales</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span>Controles Preventivos (reducen probabilidad)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-600 rounded"></div>
            <span>Evento de Riesgo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span>Controles Detectivos (identifican/mitigan)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span>Consecuencias Potenciales</span>
          </div>
        </div>

        {/* Contadores de elementos ocultos */}
        {(causas.length > 4 || consecuencias.length > 4 || preventiveControls.length > 4 || detectiveControls.length > 4) && (
          <div className="mt-4 p-3 bg-muted rounded-md text-xs">
            <p className="font-medium mb-1">Elementos adicionales no mostrados en el diagrama:</p>
            <div className="flex flex-wrap gap-3">
              {causas.length > 4 && <span>+{causas.length - 4} causas</span>}
              {preventiveControls.length > 4 && <span>+{preventiveControls.length - 4} controles preventivos</span>}
              {detectiveControls.length > 4 && <span>+{detectiveControls.length - 4} controles detectivos</span>}
              {consecuencias.length > 4 && <span>+{consecuencias.length - 4} consecuencias</span>}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
