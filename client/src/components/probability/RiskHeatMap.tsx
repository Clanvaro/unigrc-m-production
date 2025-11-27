import { useState, useCallback, useEffect } from "react";

interface RiskHeatMapProps {
  initialProbability?: number;
  initialImpact?: number;
  onValueChange: (probability: number, impact: number) => void;
}

const RiskHeatMap = ({ 
  initialProbability = 1, 
  initialImpact = 1, 
  onValueChange 
}: RiskHeatMapProps) => {
  const [selectedProbability, setSelectedProbability] = useState(initialProbability);
  const [selectedImpact, setSelectedImpact] = useState(initialImpact);
  const [hoveredTooltip, setHoveredTooltip] = useState<{type: string, level: number} | null>(null);

  // Sync state with props when they change
  useEffect(() => {
    setSelectedProbability(initialProbability);
  }, [initialProbability]);

  useEffect(() => {
    setSelectedImpact(initialImpact);
  }, [initialImpact]);

  const handleProbabilityClick = useCallback((value: number) => {
    setSelectedProbability(value);
    onValueChange(value, selectedImpact);
  }, [selectedImpact, onValueChange]);

  const handleImpactClick = useCallback((value: number) => {
    setSelectedImpact(value);
    onValueChange(selectedProbability, value);
  }, [selectedProbability, onValueChange]);

  const getLevelButtonClass = (value: number, selectedValue: number) => {
    const isSelected = value === selectedValue;
    
    // Colores gradientes de verde a rojo según el nivel
    const baseColors = {
      1: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200',
      2: 'bg-lime-100 border-lime-300 text-lime-800 hover:bg-lime-200',
      3: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200',
      4: 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200',
      5: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200'
    };

    const selectedColors = {
      1: 'bg-green-300 border-green-600 shadow-lg text-green-900',
      2: 'bg-lime-300 border-lime-600 shadow-lg text-lime-900',
      3: 'bg-yellow-300 border-yellow-600 shadow-lg text-yellow-900',
      4: 'bg-orange-300 border-orange-600 shadow-lg text-orange-900',
      5: 'bg-red-300 border-red-600 shadow-lg text-red-900'
    };

    return `
      flex items-center justify-center w-16 h-12 border-2 rounded-lg cursor-pointer
      transition-all duration-200 text-lg font-bold
      ${isSelected 
        ? selectedColors[value as keyof typeof selectedColors]
        : baseColors[value as keyof typeof baseColors]
      }
    `;
  };

  // Descripciones para los tooltips
  const getProbabilityDescription = (level: number) => {
    const descriptions = {
      1: "Muy Baja - Es muy poco probable que ocurra",
      2: "Baja - Es poco probable que ocurra",
      3: "Media - Puede ocurrir en algunas circunstancias",
      4: "Alta - Es probable que ocurra",
      5: "Muy Alta - Es muy probable que ocurra"
    };
    return descriptions[level as keyof typeof descriptions];
  };

  const getImpactDescription = (level: number) => {
    const descriptions = {
      1: "Insignificante - Impacto mínimo o nulo",
      2: "Menor - Impacto bajo, fácilmente manejable",
      3: "Moderado - Impacto medio, requiere atención",
      4: "Mayor - Impacto alto, consecuencias significativas",
      5: "Catastrófico - Impacto extremo, consecuencias graves"
    };
    return descriptions[level as keyof typeof descriptions];
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="text-center mb-6">
        <div className="mt-3 text-sm">
          <span className="font-medium">Selección actual:</span>{" "}
          <span className="font-bold text-blue-600">
            Probabilidad {selectedProbability} × Impacto {selectedImpact} = Riesgo {selectedProbability * selectedImpact}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Header con niveles */}
        <div className="grid grid-cols-6 gap-2 items-center">
          <div className="text-sm font-medium text-gray-600">Factor</div>
          <div className="text-center text-sm font-medium text-gray-500">Nivel 1</div>
          <div className="text-center text-sm font-medium text-gray-500">Nivel 2</div>
          <div className="text-center text-sm font-medium text-gray-500">Nivel 3</div>
          <div className="text-center text-sm font-medium text-gray-500">Nivel 4</div>
          <div className="text-center text-sm font-medium text-gray-500">Nivel 5</div>
        </div>

        {/* Fila de Probabilidad */}
        <div className="grid grid-cols-6 gap-2 items-center">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-blue-600">📊</span>
            <span>Probabilidad</span>
          </div>
          {[1, 2, 3, 4, 5].map((level) => (
            <div key={`prob-${level}`} className="relative">
              <button
                type="button"
                data-testid={`probability-level-${level}`}
                onClick={() => handleProbabilityClick(level)}
                className={getLevelButtonClass(level, selectedProbability)}
                onMouseEnter={() => setHoveredTooltip({type: 'probability', level})}
                onMouseLeave={() => setHoveredTooltip(null)}
              >
                {level}
              </button>
              {hoveredTooltip?.type === 'probability' && hoveredTooltip?.level === level && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
                  {getProbabilityDescription(level)}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Fila de Impacto */}
        <div className="grid grid-cols-6 gap-2 items-center">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="text-yellow-600">💰</span>
            <span>Impacto</span>
          </div>
          {[1, 2, 3, 4, 5].map((level) => (
            <div key={`impact-${level}`} className="relative">
              <button
                type="button"
                data-testid={`impact-level-${level}`}
                onClick={() => handleImpactClick(level)}
                className={getLevelButtonClass(level, selectedImpact)}
                onMouseEnter={() => setHoveredTooltip({type: 'impact', level})}
                onMouseLeave={() => setHoveredTooltip(null)}
              >
                {level}
              </button>
              {hoveredTooltip?.type === 'impact' && hoveredTooltip?.level === level && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50">
                  {getImpactDescription(level)}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-800"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RiskHeatMap;