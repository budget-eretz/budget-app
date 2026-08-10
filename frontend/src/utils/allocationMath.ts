/**
 * עזרי חישוב להקצאות חודשיות.
 *
 * שתי בעיות שהחישוב הזה פותר:
 * 1. סכומים בשקלים מיוצגים כ-float, ולכן סכום של 12 הקצאות זהות עלול לחרוג
 *    מתקציב הסעיף בשבריר אגורה (למשל 8.15 * 12 = 97.80000000000003) ולהיחסם.
 * 2. תקציב שנתי שאינו מתחלק ב-12 ללא שארית (למשל ₪1,619.99) לא ניתן לביטוי
 *    כהקצאה קבועה: 134.99 משאיר יתרה של 0.11, ו-135.00 חורג ב-0.01.
 */

/** סבילות של חצי אגורה — מתחת לזה מדובר בשגיאת עיגול ולא בחריגה אמיתית. */
export const ALLOCATION_EPSILON = 0.005;

/** האם סך ההקצאות חורג מהתקציב חריגה אמיתית (מעל חצי אגורה). */
export function isOverAllocated(totalBudget: number, totalAllocated: number): boolean {
  return totalAllocated - totalBudget > ALLOCATION_EPSILON;
}

/** יתרה לא מוקצית, מעוגלת לאגורה כדי למנוע תצוגה של -0.00 / 0.10999999. */
export function getRemainingUnallocated(totalBudget: number, totalAllocated: number): number {
  return Math.round((totalBudget - totalAllocated) * 100) / 100;
}

/**
 * פורס סכום על פני מספר חודשים כך שהסכום הכולל שווה בדיוק לסכום המקורי.
 * השארית (באגורות) מתחלקת בין החודשים הראשונים.
 *
 * דוגמה: 1619.99 ל-12 חודשים → 11 חודשים של 135.00 וחודש אחד של 134.99.
 */
export function splitAmountAcrossMonths(total: number, months: number = 12): number[] {
  if (!Number.isFinite(total) || total <= 0 || months <= 0) {
    return Array.from({ length: Math.max(months, 0) }, () => 0);
  }

  const totalAgorot = Math.round(total * 100);
  const baseAgorot = Math.floor(totalAgorot / months);
  const remainderAgorot = totalAgorot - baseAgorot * months;

  return Array.from({ length: months }, (_, index) =>
    (baseAgorot + (index < remainderAgorot ? 1 : 0)) / 100
  );
}

/** האם הסכום מתחלק ל-12 חודשים בסכום חודשי אחיד (עגול לאגורה). */
export function isEvenlyDivisible(total: number, months: number = 12): boolean {
  return Math.round(total * 100) % months === 0;
}
