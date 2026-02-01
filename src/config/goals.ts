// February 2026 Goals Configuration
// These values should be updated monthly

export const FEBRUARY_2026_GOALS = {
  // Total monthly targets
  billingGoal: 2500000,  // R$ 2.5M in closed contracts (faturamento)
  cashGoal: 1500000,     // R$ 1.5M new cash received (dinheiro em caixa)
  
  // Working days in February 2026
  workingDays: 16,
  
  // Start date of the month
  monthStart: new Date(2026, 1, 1), // February 1, 2026
  monthEnd: new Date(2026, 1, 28),   // February 28, 2026
  
  // Label for display
  label: 'Meta Fevereiro',
};

// Helper to get current month goals
export function getCurrentMonthGoals() {
  return FEBRUARY_2026_GOALS;
}

// Calculate remaining working days from today
export function getRemainingWorkingDays(): number {
  const today = new Date();
  const { workingDays, monthStart, monthEnd } = FEBRUARY_2026_GOALS;
  
  // If before month starts, return all working days
  if (today < monthStart) return workingDays;
  
  // If after month ends, return 0
  if (today > monthEnd) return 0;
  
  // Calculate days elapsed (simplified - assumes even distribution)
  const totalDaysInMonth = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysElapsed = Math.ceil((today.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));
  
  // Proportional working days remaining
  const workingDaysElapsed = Math.floor((daysElapsed / totalDaysInMonth) * workingDays);
  return Math.max(1, workingDays - workingDaysElapsed);
}

// Calculate dynamic daily goal based on remaining amount and remaining days
export function calculateDailyGoal(totalGoal: number, currentProgress: number, remainingDays: number): number {
  const remaining = Math.max(0, totalGoal - currentProgress);
  return remainingDays > 0 ? remaining / remainingDays : 0;
}

// Calculate weekly goal (approximately 5 working days worth)
export function calculateWeeklyGoal(totalGoal: number, currentProgress: number, remainingDays: number): number {
  const dailyGoal = calculateDailyGoal(totalGoal, currentProgress, remainingDays);
  return dailyGoal * 5;
}
