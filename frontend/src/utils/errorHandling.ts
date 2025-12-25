// Error handling utilities for reports
export interface ReportError {
  code: string;
  message: string;
  details?: string;
  recoverable: boolean;
}

export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  SERVER_ERROR: 'SERVER_ERROR',
  TIMEOUT: 'TIMEOUT',
  INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
  INVALID_DATE_RANGE: 'INVALID_DATE_RANGE',
  ACCESS_DENIED: 'ACCESS_DENIED',
  CALCULATION_ERROR: 'CALCULATION_ERROR',
  EXPORT_FAILED: 'EXPORT_FAILED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export const ERROR_MESSAGES = {
  [ERROR_CODES.NETWORK_ERROR]: {
    title: 'שגיאת רשת',
    message: 'לא ניתן להתחבר לשרת. אנא בדוק את החיבור לאינטרנט ונסה שוב.',
    recoverable: true
  },
  [ERROR_CODES.UNAUTHORIZED]: {
    title: 'נדרשת הזדהות',
    message: 'פג תוקף ההתחברות. אנא התחבר מחדש.',
    recoverable: false
  },
  [ERROR_CODES.FORBIDDEN]: {
    title: 'אין הרשאה',
    message: 'אין לך הרשאה לצפות בדוח זה.',
    recoverable: false
  },
  [ERROR_CODES.NOT_FOUND]: {
    title: 'דוח לא נמצא',
    message: 'הדוח המבוקש לא נמצא או לא קיים.',
    recoverable: true
  },
  [ERROR_CODES.VALIDATION_ERROR]: {
    title: 'שגיאת נתונים',
    message: 'הנתונים שהוזנו אינם תקינים.',
    recoverable: true
  },
  [ERROR_CODES.SERVER_ERROR]: {
    title: 'שגיאת שרת',
    message: 'אירעה שגיאה בשרת. אנא נסה שוב מאוחר יותר.',
    recoverable: true
  },
  [ERROR_CODES.TIMEOUT]: {
    title: 'תם הזמן הקצוב',
    message: 'הבקשה ארכה זמן רב מדי. אנא נסה שוב.',
    recoverable: true
  },
  [ERROR_CODES.INSUFFICIENT_DATA]: {
    title: 'אין מספיק נתונים',
    message: 'אין מספיק נתונים כדי ליצור את הדוח עבור התקופה הנבחרת.',
    recoverable: false
  },
  [ERROR_CODES.INVALID_DATE_RANGE]: {
    title: 'טווח תאריכים לא תקין',
    message: 'טווח התאריכים שנבחר אינו תקין.',
    recoverable: true
  },
  [ERROR_CODES.ACCESS_DENIED]: {
    title: 'גישה נדחתה',
    message: 'אין לך הרשאה לגשת לנתונים אלה.',
    recoverable: false
  },
  [ERROR_CODES.CALCULATION_ERROR]: {
    title: 'שגיאה בחישוב',
    message: 'אירעה שגיאה בחישוב הדוח. אנא נסה שוב.',
    recoverable: true
  },
  [ERROR_CODES.EXPORT_FAILED]: {
    title: 'שגיאה בייצוא',
    message: 'לא ניתן לייצא את הדוח. אנא נסה שוב.',
    recoverable: true
  },
  [ERROR_CODES.UNKNOWN_ERROR]: {
    title: 'שגיאה לא ידועה',
    message: 'אירעה שגיאה לא צפויה. אנא נסה שוב.',
    recoverable: true
  }
};

export function parseError(error: any): ReportError {
  // Network errors
  if (!error.response) {
    return {
      code: ERROR_CODES.NETWORK_ERROR,
      message: ERROR_MESSAGES[ERROR_CODES.NETWORK_ERROR].message,
      recoverable: true
    };
  }

  const status = error.response.status;
  const data = error.response.data;

  // Handle specific HTTP status codes
  switch (status) {
    case 401:
      return {
        code: ERROR_CODES.UNAUTHORIZED,
        message: ERROR_MESSAGES[ERROR_CODES.UNAUTHORIZED].message,
        recoverable: false
      };
    
    case 403:
      return {
        code: ERROR_CODES.FORBIDDEN,
        message: ERROR_MESSAGES[ERROR_CODES.FORBIDDEN].message,
        recoverable: false
      };
    
    case 404:
      return {
        code: ERROR_CODES.NOT_FOUND,
        message: ERROR_MESSAGES[ERROR_CODES.NOT_FOUND].message,
        recoverable: true
      };
    
    case 400:
      return {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: data?.error || ERROR_MESSAGES[ERROR_CODES.VALIDATION_ERROR].message,
        details: data?.details,
        recoverable: true
      };
    
    case 408:
      return {
        code: ERROR_CODES.TIMEOUT,
        message: ERROR_MESSAGES[ERROR_CODES.TIMEOUT].message,
        recoverable: true
      };
    
    case 500:
    case 502:
    case 503:
    case 504:
      return {
        code: ERROR_CODES.SERVER_ERROR,
        message: ERROR_MESSAGES[ERROR_CODES.SERVER_ERROR].message,
        recoverable: true
      };
    
    default:
      // Handle specific report errors from backend
      if (data?.code) {
        const errorInfo = ERROR_MESSAGES[data.code as keyof typeof ERROR_MESSAGES];
        if (errorInfo) {
          return {
            code: data.code,
            message: data.error || errorInfo.message,
            details: data.details,
            recoverable: errorInfo.recoverable
          };
        }
      }
      
      return {
        code: ERROR_CODES.UNKNOWN_ERROR,
        message: data?.error || ERROR_MESSAGES[ERROR_CODES.UNKNOWN_ERROR].message,
        recoverable: true
      };
  }
}

export function getErrorActions(error: ReportError): Array<{
  label: string;
  action: string;
  primary?: boolean;
}> {
  const actions = [];

  if (error.recoverable) {
    actions.push({
      label: 'נסה שוב',
      action: 'retry',
      primary: true
    });
  }

  switch (error.code) {
    case ERROR_CODES.UNAUTHORIZED:
      actions.push({
        label: 'התחבר מחדש',
        action: 'login',
        primary: true
      });
      break;
    
    case ERROR_CODES.INSUFFICIENT_DATA:
      actions.push({
        label: 'בחר תקופה אחרת',
        action: 'change-period'
      });
      break;
    
    case ERROR_CODES.INVALID_DATE_RANGE:
      actions.push({
        label: 'תקן תאריכים',
        action: 'fix-dates'
      });
      break;
    
    case ERROR_CODES.NETWORK_ERROR:
      actions.push({
        label: 'בדוק חיבור',
        action: 'check-connection'
      });
      break;
  }

  // Always provide option to go back
  actions.push({
    label: 'חזור לדף הראשי',
    action: 'go-home'
  });

  return actions;
}

export function shouldShowErrorDetails(error: ReportError): boolean {
  return !![ERROR_CODES.VALIDATION_ERROR, ERROR_CODES.CALCULATION_ERROR].includes(error.code as any);
}

export function getErrorSeverity(error: ReportError): 'low' | 'medium' | 'high' {
  switch (error.code) {
    case ERROR_CODES.INSUFFICIENT_DATA:
    case ERROR_CODES.NOT_FOUND:
      return 'low';
    
    case ERROR_CODES.VALIDATION_ERROR:
    case ERROR_CODES.INVALID_DATE_RANGE:
    case ERROR_CODES.EXPORT_FAILED:
      return 'medium';
    
    case ERROR_CODES.UNAUTHORIZED:
    case ERROR_CODES.FORBIDDEN:
    case ERROR_CODES.ACCESS_DENIED:
    case ERROR_CODES.SERVER_ERROR:
    case ERROR_CODES.NETWORK_ERROR:
      return 'high';
    
    default:
      return 'medium';
  }
}