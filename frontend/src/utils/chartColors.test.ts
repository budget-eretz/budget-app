// Simple test to verify color generation
import { generateColorPalette, generateBorderColors, getIncomeColors, getExpenseColors } from './chartColors';

// Test color generation
console.log('Testing color generation...');

// Test basic palette generation
const colors5 = generateColorPalette(5);
console.log('5 colors:', colors5);

const colors15 = generateColorPalette(15);
console.log('15 colors:', colors15);

// Test border colors
const borderColors = generateBorderColors(colors5);
console.log('Border colors:', borderColors);

// Test specific color functions
const incomeColors = getIncomeColors(3);
console.log('Income colors:', incomeColors);

const expenseColors = getExpenseColors(3);
console.log('Expense colors:', expenseColors);

// Verify no duplicates in primary colors
const uniqueColors = new Set(colors5);
console.log('Unique colors count (should be 5):', uniqueColors.size);

export {}; // Make this a module