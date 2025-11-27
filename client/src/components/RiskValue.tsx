import { useRiskFormatting } from '@/contexts/RiskFormattingContext';

interface RiskValueProps {
  value: number | null | undefined;
  className?: string;
  children?: (formattedValue: string) => React.ReactNode;
}

export const RiskValue = ({ value, className = "", children }: RiskValueProps) => {
  const { formatRiskValue } = useRiskFormatting();
  const formattedValue = formatRiskValue(value);

  if (children) {
    return <>{children(formattedValue)}</>;
  }

  return (
    <span className={className} data-testid={`risk-value-${formattedValue}`}>
      {formattedValue}
    </span>
  );
};