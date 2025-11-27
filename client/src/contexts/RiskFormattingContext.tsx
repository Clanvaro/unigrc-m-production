import { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

interface RiskFormattingConfig {
  enabled: boolean;
  precision: number;
}

interface RiskFormattingContextType {
  config: RiskFormattingConfig;
  formatRiskValue: (value: number | null | undefined) => string;
  isLoading: boolean;
  refreshConfig: () => void;
}

const RiskFormattingContext = createContext<RiskFormattingContextType | undefined>(undefined);

export const useRiskFormatting = () => {
  const context = useContext(RiskFormattingContext);
  if (!context) {
    throw new Error('useRiskFormatting must be used within a RiskFormattingProvider');
  }
  return context;
};

interface RiskFormattingProviderProps {
  children: React.ReactNode;
}

export const RiskFormattingProvider = ({ children }: RiskFormattingProviderProps) => {
  const [config, setConfig] = useState<RiskFormattingConfig>({
    enabled: false,
    precision: 0
  });

  const { data, isLoading, refetch } = useQuery<RiskFormattingConfig>({
    queryKey: ['/api/system-config/risk-decimals'],
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  useEffect(() => {
    if (data) {
      setConfig(data);
    }
  }, [data]);

  const formatRiskValue = (value: number | string | null | undefined): string => {
    // Convert to number first
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    if (numValue === null || numValue === undefined || isNaN(numValue)) {
      return '0';
    }

    if (!config.enabled) {
      // When decimals are disabled, always round to integer
      return Math.round(numValue).toString();
    }

    // When decimals are enabled, format to the specified precision
    return numValue.toFixed(config.precision);
  };

  const refreshConfig = () => {
    refetch();
  };

  return (
    <RiskFormattingContext.Provider value={{
      config,
      formatRiskValue,
      isLoading,
      refreshConfig
    }}>
      {children}
    </RiskFormattingContext.Provider>
  );
};