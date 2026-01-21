import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PriceDataPoint {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradingViewChartProps {
  symbol?: string;
  width?: number;
  height?: number;
  interval?: string;
  theme?: 'light' | 'dark';
  // Custom data props
  customData?: PriceDataPoint[];
  entityName?: string;
  currentPrice?: number;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol,
  width = SCREEN_WIDTH - 32,
  height = 450,
  interval = 'D',
  theme: themeMode,
  customData = [],
  entityName = 'Example Entity',
  currentPrice,
}) => {
  const { theme } = useTheme();
  const chartTheme = themeMode || (theme.background === '#000000' ? 'dark' : 'light');
  const webViewRef = useRef<WebView>(null);

  // Use custom data if provided, otherwise use symbol
  const useCustomData = customData.length > 0 || currentPrice !== undefined;

  // Convert custom data to JSON string for injection
  const dataJson = JSON.stringify(customData);

  // TradingView widget HTML with custom data support
  const htmlContent = useCustomData ? `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script type="text/javascript" src="https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: ${chartTheme === 'dark' ? '#1B1B1B' : '#FFFFFF'};
            overflow: hidden;
          }
          #chart_container {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div id="chart_container"></div>
        <script type="text/javascript">
          (function() {
            const chartData = ${dataJson};
            const container = document.getElementById('chart_container');
            const chart = LightweightCharts.createChart(container, {
              width: ${width},
              height: ${height},
              layout: {
                background: { color: '${chartTheme === 'dark' ? '#1B1B1B' : '#FFFFFF'}' },
                textColor: '${chartTheme === 'dark' ? '#D1D5DB' : '#111827'}',
              },
              grid: {
                vertLines: { color: '${chartTheme === 'dark' ? '#2A2A2A' : '#E5E7EB'}' },
                horzLines: { color: '${chartTheme === 'dark' ? '#2A2A2A' : '#E5E7EB'}' },
              },
              timeScale: {
                timeVisible: true,
                secondsVisible: false,
              },
            });

            const candlestickSeries = chart.addCandlestickSeries({
              upColor: '#10B981',
              downColor: '#EF4444',
              borderVisible: false,
              wickUpColor: '#10B981',
              wickDownColor: '#EF4444',
            });

            const volumeSeries = chart.addHistogramSeries({
              color: '#26a69a',
              priceFormat: {
                type: 'volume',
              },
              priceScaleId: '',
              scaleMargins: {
                top: 0.8,
                bottom: 0,
              },
            });

            // Convert data to format expected by lightweight-charts
            const formattedData = chartData.map(item => ({
              time: item.time,
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
            }));

            const volumeData = chartData.map(item => ({
              time: item.time,
              value: item.volume,
              color: item.close >= item.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
            }));

            if (formattedData.length > 0) {
              candlestickSeries.setData(formattedData);
              volumeSeries.setData(volumeData);
            }

            // Function to update chart with new data
            window.updateChart = function(newData) {
              const formatted = newData.map(item => ({
                time: item.time,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
              }));
              const volumes = newData.map(item => ({
                time: item.time,
                value: item.volume,
                color: item.close >= item.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
              }));
              candlestickSeries.setData(formatted);
              volumeSeries.setData(volumes);
            };

            // Handle window resize
            window.addEventListener('resize', () => {
              chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
            });
          })();
        </script>
      </body>
    </html>
  ` : `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <script type="text/javascript" src="https://s3.tradingview.com/tv.js"></script>
        <style>
          body {
            margin: 0;
            padding: 0;
            background: ${chartTheme === 'dark' ? '#1B1B1B' : '#FFFFFF'};
          }
          #tradingview_widget {
            width: 100%;
            height: 100%;
          }
        </style>
      </head>
      <body>
        <div id="tradingview_widget"></div>
        <script type="text/javascript">
          new TradingView.widget({
            "width": "${width}",
            "height": "${height}",
            "symbol": "${symbol || 'AAPL'}",
            "interval": "${interval}",
            "timezone": "America/New_York",
            "theme": "${chartTheme}",
            "style": "1",
            "locale": "en",
            "toolbar_bg": "${chartTheme === 'dark' ? '#1B1B1B' : '#FFFFFF'}",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "container_id": "tradingview_widget",
            "studies": [
              "Volume@tv-basicstudies"
            ],
            "show_popup_button": true,
            "popup_width": "1000",
            "popup_height": "650"
          });
        </script>
      </body>
    </html>
  `;

  // Update chart when custom data changes
  useEffect(() => {
    if (useCustomData && customData.length > 0 && webViewRef.current) {
      const dataJson = JSON.stringify(customData);
      webViewRef.current.injectJavaScript(`
        if (window.updateChart) {
          window.updateChart(${dataJson});
        }
        true;
      `);
    }
  }, [customData, useCustomData]);

  return (
    <View style={[styles.container, { width, height }]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        scrollEnabled={false}
        onMessage={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

export default TradingViewChart;
