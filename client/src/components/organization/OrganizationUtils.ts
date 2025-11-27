export function getRiskColor(risk: number): string {
  if (risk === 0) return "bg-gray-100 text-gray-600";
  if (risk <= 6) return "bg-green-100 text-green-700";
  if (risk <= 12) return "bg-yellow-100 text-yellow-700";
  if (risk <= 16) return "bg-orange-100 text-orange-700";
  return "bg-red-100 text-red-700";
}

export function getRiskLevel(risk: number): string {
  if (risk === 0) return "Sin riesgo";
  if (risk <= 6) return "Bajo";
  if (risk <= 12) return "Medio";
  if (risk <= 16) return "Alto";
  return "Crítico";
}
