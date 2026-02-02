import React from 'react';
import { useTrading } from '../context/TradingContext';
import { useTheme } from '../context/ThemeContext';
import ConfirmationModal from './ConfirmationModal';

/**
 * Renders a themed error/warning modal when a trade fails (e.g. insufficient funds).
 * Uses TradingContext.tradeError and clears it on dismiss.
 */
export default function TradeErrorModal() {
  const { tradeError, clearTradeError } = useTrading();
  const { theme } = useTheme();

  if (!tradeError) return null;

  return (
    <ConfirmationModal
      visible={!!tradeError}
      title={tradeError.title}
      message={tradeError.message}
      type={tradeError.type}
      confirmText="Got it"
      onConfirm={clearTradeError}
      showCancel={false}
      theme={theme}
    />
  );
}
