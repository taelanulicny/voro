import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PriceDataPoint {
  time: number; // Unix timestamp in seconds
  price: number;
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
  currentVolume?: number;
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
  currentVolume = 0,
}) => {
  const { theme } = useTheme();
  const chartTheme = themeMode || (theme.background === '#000000' ? 'dark' : 'light');
  const webViewRef = useRef<WebView>(null);

  // Use custom data if provided, otherwise use symbol
  const useCustomData = customData.length > 0 || currentPrice !== undefined;

  // Helper function to check if timestamp is within trading hours (8am-2am EST)
  const isTradingHour = (timestamp: number): boolean => {
    const date = new Date(timestamp * 1000);
    const estDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const hour = estDate.getHours();
    // Trading hours: 8am (8) to 2am (2) next day
    // So hours 0-1 and 8-23 are trading hours
    return hour >= 8 || hour < 2;
  };

  // Process data to only include trading hours and connect gaps
  const processTradingHoursData = (data: PriceDataPoint[]): PriceDataPoint[] => {
    if (data.length === 0) return [];
    
    const processed: PriceDataPoint[] = [];
    let lastTradingPoint: PriceDataPoint | null = null;
    
    for (let i = 0; i < data.length; i++) {
      const point = data[i];
      
      if (isTradingHour(point.time)) {
        // If there was a gap (last point was before 2am, current is after 8am), connect them
        if (lastTradingPoint) {
          const lastDate = new Date(lastTradingPoint.time * 1000);
          const lastEstDate = new Date(lastDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const lastHour = lastEstDate.getHours();
          
          const currentDate = new Date(point.time * 1000);
          const currentEstDate = new Date(currentDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
          const currentHour = currentEstDate.getHours();
          
          // If last was 0-1 (before 2am) and current is 8-23 (after 8am), connect
          if (lastHour < 2 && currentHour >= 8) {
            processed.push(lastTradingPoint);
            processed.push(point);
          } else {
            processed.push(point);
          }
        } else {
          processed.push(point);
        }
        lastTradingPoint = point;
      }
    }
    
    return processed;
  };

  // Process data for trading hours only
  const processedData = processTradingHoursData(customData);
  
  // Convert custom data to JSON string for injection
  const dataJson = JSON.stringify(processedData);

  // Calculate initial time range: 6 hours before current time
  const now = Math.floor(Date.now() / 1000);
  const sixHoursAgo = now - (6 * 60 * 60); // 6 hours in seconds

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
            overflow: visible;
          }
          canvas {
            display: block;
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
                fontSize: 12,
              },
              grid: {
                vertLines: { color: '${chartTheme === 'dark' ? '#2A2A2A' : '#E5E7EB'}' },
                horzLines: { color: '${chartTheme === 'dark' ? '#2A2A2A' : '#E5E7EB'}' },
              },
              timeScale: {
                visible: true,
                timeVisible: true,
                secondsVisible: true,
                shiftVisibleRangeOnNewBar: true,
                allowShiftVisibleRangeOnWhitespaceReplacement: true,
                ticksVisible: true,
                rightOffset: 12,
                barSpacing: 3,
                fixLeftEdge: false,
                fixRightEdge: false,
                borderVisible: true,
                borderColor: '${chartTheme === 'dark' ? '#374151' : '#E5E7EB'}',
              },
              rightPriceScale: {
                visible: true,
                autoScale: true,
                mode: 0, // PriceScaleMode.Normal (0 = Normal, 1 = Log, 2 = Percentage)
                invertScale: false,
                alignLabels: true,
                scaleMargins: {
                  top: 0.05,
                  bottom: 0.25, // More bottom margin for volume histogram
                },
                borderVisible: true,
                borderColor: '${chartTheme === 'dark' ? '#374151' : '#E5E7EB'}',
                textColor: '${chartTheme === 'dark' ? '#D1D5DB' : '#111827'}',
                entireTextOnly: false,
                ticksVisible: true,
                ensureEdgeTickMarksVisible: false,
              },
              leftPriceScale: {
                visible: false, // Hide left price scale, only show right
              },
            });

            // Create line series for price
            const lineSeries = chart.addLineSeries({
              color: '#14B8A6',
              lineWidth: 2,
              priceFormat: {
                type: 'price',
                precision: 2,
                minMove: 0.01,
              },
            });

            // Create histogram series for volume at bottom
            const volumeSeries = chart.addHistogramSeries({
              color: '#26a69a',
              priceFormat: {
                type: 'volume',
              },
              priceScaleId: 'volume', // Use separate price scale for volume
              scaleMargins: {
                top: 0.8,
                bottom: 0,
              },
            });

            // Set up overlay price scale for volume
            chart.priceScale('volume').applyOptions({
              scaleMargins: {
                top: 0.8,
                bottom: 0,
              },
            });

            // Convert data to format expected by lightweight-charts
            const formattedData = chartData.map(item => ({
              time: item.time,
              value: item.price,
            }));

            const volumeData = chartData.map(item => ({
              time: item.time,
              value: item.volume,
              color: 'rgba(16, 185, 129, 0.5)',
            }));

            if (formattedData.length > 0) {
              lineSeries.setData(formattedData);
              if (volumeData.length > 0) {
                volumeSeries.setData(volumeData);
              }
            }

            // Set initial view: 6 hours before current time on left
            // Use setTimeout to ensure chart is fully initialized
            setTimeout(() => {
              const now = Math.floor(Date.now() / 1000);
              const sixHoursAgo = now - (6 * 60 * 60); // 6 hours in seconds
              
              // Try to set visible range, fallback to fitContent if no data
              if (formattedData.length > 0) {
                // Find the data point closest to 6 hours ago
                const targetTime = sixHoursAgo;
                let closestIndex = 0;
                let minDiff = Math.abs(formattedData[0].time - targetTime);
                
                for (let i = 1; i < formattedData.length; i++) {
                  const diff = Math.abs(formattedData[i].time - targetTime);
                  if (diff < minDiff) {
                    minDiff = diff;
                    closestIndex = i;
                  }
                }
                
                // Set visible range to show from 6 hours ago to now
                try {
                  chart.timeScale().setVisibleRange({
                    from: formattedData[closestIndex].time,
                    to: now,
                  });
                } catch (e) {
                  // If setVisibleRange fails (e.g., data not in range), use fitContent
                  chart.timeScale().fitContent();
                }
              } else {
                // No data yet, set range for when data arrives
                chart.timeScale().setVisibleRange({
                  from: sixHoursAgo,
                  to: now,
                });
              }
            }, 100);

            // Function to update chart with new data
            window.updateChart = function(newData) {
              const formatted = newData.map(item => ({
                time: item.time,
                value: item.price,
              }));
              const volumes = newData.map(item => ({
                time: item.time,
                value: item.volume,
                color: 'rgba(16, 185, 129, 0.5)',
              }));
              lineSeries.setData(formatted);
              if (volumes.length > 0) {
                volumeSeries.setData(volumes);
              }
            };

            // Subscribe to visible time range changes to maintain 6-hour window
            let isAutoScrolling = true;
            chart.timeScale().subscribeVisibleTimeRangeChange(function(newVisibleTimeRange) {
              if (newVisibleTimeRange === null || !isAutoScrolling) {
                return;
              }
              
              // Track if user manually scrolled (if range is not near current time)
              const now = Math.floor(Date.now() / 1000);
              const timeDiff = Math.abs(newVisibleTimeRange.to - now);
              
              // If user scrolled more than 1 hour away from current time, disable auto-scroll
              if (timeDiff > 3600) {
                isAutoScrolling = false;
              }
            });

            // Function to update current price (for real-time updates every second)
            window.updatePrice = function(timestamp, price, volume) {
              lineSeries.update({
                time: timestamp,
                value: price,
              });
              if (volume !== undefined && volume > 0) {
                volumeSeries.update({
                  time: timestamp,
                  value: volume,
                  color: 'rgba(16, 185, 129, 0.5)',
                });
              }
              
              // Maintain 6-hour window: scroll forward as new data arrives (only if auto-scrolling)
              if (isAutoScrolling) {
                const now = Math.floor(Date.now() / 1000);
                const sixHoursAgo = now - (6 * 60 * 60);
                try {
                  const visibleRange = chart.timeScale().getVisibleRange();
                  if (visibleRange && visibleRange.to < now) {
                    // Only update if we're near the right edge (within 1 hour)
                    if (visibleRange.to >= now - 3600) {
                      chart.timeScale().setVisibleRange({
                        from: sixHoursAgo,
                        to: now,
                      });
                    }
                  }
                } catch (e) {
                  // Ignore errors if range can't be set
                }
              }
            };

            // Function to re-enable auto-scroll (can be called when user wants to go back to live)
            window.enableAutoScroll = function() {
              isAutoScrolling = true;
              const now = Math.floor(Date.now() / 1000);
              const sixHoursAgo = now - (6 * 60 * 60);
              try {
                chart.timeScale().setVisibleRange({
                  from: sixHoursAgo,
                  to: now,
                });
              } catch (e) {
                // Ignore errors
              }
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

  // Update chart when custom data changes (full data update)
  useEffect(() => {
    if (useCustomData && processedData.length > 0 && webViewRef.current) {
      const dataJson = JSON.stringify(processedData);
      webViewRef.current.injectJavaScript(`
        if (window.updateChart) {
          window.updateChart(${dataJson});
        }
        true;
      `);
    }
  }, [processedData, useCustomData]);

  // Update current price every second (real-time price updates)
  useEffect(() => {
    if (useCustomData && currentPrice !== undefined && webViewRef.current) {
      const now = Math.floor(Date.now() / 1000);
      webViewRef.current.injectJavaScript(`
        if (window.updatePrice) {
          window.updatePrice(${now}, ${currentPrice}, ${currentVolume || 0});
        }
        true;
      `);
    }
  }, [currentPrice, currentVolume, useCustomData]);

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
    borderRadius: 0,
    overflow: 'visible', // Changed from 'hidden' to 'visible' to show axes
    borderWidth: 0, // Remove border to allow axes to show
    borderColor: 'transparent',
  },
  webview: {
    backgroundColor: 'transparent',
  },
});

export default TradingViewChart;
