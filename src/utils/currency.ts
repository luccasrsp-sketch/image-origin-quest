/**
 * Format a number as Brazilian currency (R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse a Brazilian currency string to number
 * "1.234,56" -> 1234.56
 */
export function parseCurrency(value: string): number {
  if (!value) return 0;
  // Remove dots (thousands separator) and replace comma with dot (decimal separator)
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized) || 0;
}

/**
 * Format input value as currency while typing
 * Handles partial input and formats with proper separators
 */
export function formatCurrencyInput(value: string): string {
  // Remove everything except digits
  const digits = value.replace(/\D/g, '');
  
  if (!digits) return '';
  
  // Convert to number (treating as cents)
  const numericValue = parseInt(digits, 10);
  
  // Convert cents to reais
  const reais = numericValue / 100;
  
  // Format with Brazilian locale
  return reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
