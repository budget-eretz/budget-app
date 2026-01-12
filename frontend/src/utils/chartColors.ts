// Comprehensive color palette for charts with high contrast and visual distinction
// Colors are carefully selected to be visually distinct and accessible

export const CHART_COLORS = {
  // Primary colors - highly distinct
  primary: [
    '#FF6B6B', // Bright Red
    '#4ECDC4', // Teal
    '#45B7D1', // Sky Blue
    '#96CEB4', // Mint Green
    '#FFEAA7', // Light Yellow
    '#DDA0DD', // Plum
    '#98D8C8', // Seafoam
    '#F7DC6F', // Golden Yellow
    '#BB8FCE', // Light Purple
    '#85C1E9', // Light Blue
    '#F8C471', // Peach
    '#82E0AA', // Light Green
  ],
  
  // Secondary colors - for when more colors are needed
  secondary: [
    '#FF8A80', // Light Red
    '#80CBC4', // Light Teal
    '#81C784', // Light Green
    '#FFB74D', // Orange
    '#CE93D8', // Light Purple
    '#90CAF9', // Light Blue
    '#A5D6A7', // Pale Green
    '#FFCC02', // Bright Yellow
    '#F48FB1', // Pink
    '#B39DDB', // Lavender
    '#BCAAA4', // Light Brown
    '#CFD8DC', // Blue Grey
  ],
  
  // Status colors for specific use cases
  status: {
    success: '#48BB78',
    warning: '#ED8936',
    error: '#F56565',
    info: '#4299E1',
    neutral: '#718096',
  },
  
  // Budget-specific colors
  budget: {
    income: '#48BB78',
    expense: '#F56565',
    planned: '#4299E1',
    actual: '#38A169',
    remaining: '#9F7AEA',
  },
};

// Generate a color palette for a given number of items
export function generateColorPalette(count: number): string[] {
  const colors: string[] = [];
  
  // First, use primary colors
  for (let i = 0; i < Math.min(count, CHART_COLORS.primary.length); i++) {
    colors.push(CHART_COLORS.primary[i]);
  }
  
  // If we need more colors, use secondary colors
  if (count > CHART_COLORS.primary.length) {
    const remainingCount = count - CHART_COLORS.primary.length;
    for (let i = 0; i < Math.min(remainingCount, CHART_COLORS.secondary.length); i++) {
      colors.push(CHART_COLORS.secondary[i]);
    }
  }
  
  // If we still need more colors, generate variations
  if (count > CHART_COLORS.primary.length + CHART_COLORS.secondary.length) {
    const baseColors = [...CHART_COLORS.primary, ...CHART_COLORS.secondary];
    const remainingCount = count - baseColors.length;
    
    for (let i = 0; i < remainingCount; i++) {
      const baseColor = baseColors[i % baseColors.length];
      // Create variations by adjusting opacity or lightness
      const variation = adjustColorBrightness(baseColor, 0.3 * (Math.floor(i / baseColors.length) + 1));
      colors.push(variation);
    }
  }
  
  return colors;
}

// Generate border colors (darker versions of background colors)
export function generateBorderColors(backgroundColors: string[]): string[] {
  return backgroundColors.map(color => adjustColorBrightness(color, -0.2));
}

// Utility function to adjust color brightness
function adjustColorBrightness(color: string, factor: number): string {
  // Convert hex to RGB
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Adjust brightness
  const newR = Math.max(0, Math.min(255, Math.round(r * (1 + factor))));
  const newG = Math.max(0, Math.min(255, Math.round(g * (1 + factor))));
  const newB = Math.max(0, Math.min(255, Math.round(b * (1 + factor))));
  
  // Convert back to hex
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// Get colors for specific chart types
export function getIncomeColors(count: number): string[] {
  const colors = generateColorPalette(count);
  // Ensure first color is income-related (green tones)
  if (count > 0) {
    colors[0] = CHART_COLORS.budget.income;
  }
  return colors;
}

export function getExpenseColors(count: number): string[] {
  const colors = generateColorPalette(count);
  // Ensure first color is expense-related (red tones)
  if (count > 0) {
    colors[0] = CHART_COLORS.budget.expense;
  }
  return colors;
}

export function getBudgetComparisonColors(): { planned: string; actual: string; remaining: string } {
  return {
    planned: CHART_COLORS.budget.planned,
    actual: CHART_COLORS.budget.actual,
    remaining: CHART_COLORS.budget.remaining,
  };
}

// Get colors with transparency for overlays
export function getColorsWithAlpha(colors: string[], alpha: number = 0.7): string[] {
  return colors.map(color => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  });
}