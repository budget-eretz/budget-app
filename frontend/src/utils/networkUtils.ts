import React from 'react';

// Network utilities for handling connectivity and retries
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2
};

export async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    // Check if browser reports online status
    if (!navigator.onLine) {
      return false;
    }
    
    // Try to fetch a small resource from the API server
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4567/api';
    const healthUrl = apiUrl.replace('/api', '/health');
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      cache: 'no-cache',
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch {
    // If health check fails, still return true if browser is online
    // This allows the actual API call to proceed and handle its own errors
    return navigator.onLine;
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;
  
  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry on certain error types
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw error;
      }
      
      // If this was the last attempt, throw the error
      if (attempt === opts.maxRetries) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delayMs = Math.min(
        opts.baseDelay * Math.pow(opts.backoffFactor, attempt),
        opts.maxDelay
      );
      
      console.log(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delayMs}ms`);
      await delay(delayMs);
    }
  }
  
  throw lastError!;
}

export class NetworkMonitor {
  private listeners: Array<(isOnline: boolean) => void> = [];
  private isOnline: boolean = navigator.onLine;
  
  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }
  
  private handleOnline = () => {
    this.isOnline = true;
    this.notifyListeners(true);
  };
  
  private handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners(false);
  };
  
  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }
  
  public addListener(listener: (isOnline: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  
  public getStatus(): boolean {
    return this.isOnline;
  }
  
  public async checkConnectivity(): Promise<boolean> {
    const isConnected = await checkNetworkConnectivity();
    if (isConnected !== this.isOnline) {
      this.isOnline = isConnected;
      this.notifyListeners(isConnected);
    }
    return isConnected;
  }
  
  public destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners = [];
  }
}

// Global network monitor instance
export const networkMonitor = new NetworkMonitor();

// Hook for using network status in React components
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(networkMonitor.getStatus());
  
  React.useEffect(() => {
    const unsubscribe = networkMonitor.addListener(setIsOnline);
    return unsubscribe;
  }, []);
  
  return {
    isOnline,
    checkConnectivity: networkMonitor.checkConnectivity.bind(networkMonitor)
  };
}

// Enhanced API wrapper with retry logic
export async function apiCallWithRetry<T>(
  apiCall: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  return retryWithBackoff(async () => {
    // Check connectivity before making the call
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      throw new Error('No network connectivity');
    }
    
    return await apiCall();
  }, options);
}