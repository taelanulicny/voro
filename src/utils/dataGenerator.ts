// Utility functions for formatting and generating mock data

// Token symbol: ⓜ (m inside a circle)
export const TOKEN_SYMBOL = 'ⓜ';

export const formatCurrency = (value: number): string => {
  // Format as token instead of USD
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${TOKEN_SYMBOL}${formatted}`;
};

export const formatPercent = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const formatNumber = (value: number): string => {
  if (value >= 1000000000) {
    return `${(value / 1000000000).toFixed(2)}B`;
  }
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  return value.toFixed(2);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

export const getChangeColor = (value: number): string => {
  if (value > 0) return '#10b981'; // green
  if (value < 0) return '#ef4444'; // red
  return '#6b7280'; // gray
};

// Mock data generators
export const generateMockPrice = (base: number = 100): number => {
  return base + (Math.random() - 0.5) * base * 0.1;
};

export const generateMockChange = (): number => {
  return (Math.random() - 0.5) * 10;
};

export const generateMockVolume = (): number => {
  return Math.floor(Math.random() * 1000000000) + 100000000;
};

