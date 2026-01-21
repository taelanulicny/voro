import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTheme } from '../context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface TradingViewChartProps {
  symbol?: string;
  width?: number;
  height?: number;
  interval?: string;
  theme?: 'light' | 'dark';
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol = 'AAPL',
  width = SCREEN_WIDTH - 32,
  height = 450,
  interval = 'D',
  theme: themeMode,
}) => {
  const { theme } = useTheme();
  const chartTheme = themeMode || (theme.background === '#000000' ? 'dark' : 'light');

  // TradingView widget HTML
  const htmlContent = `
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
            "symbol": "${symbol}",
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

  return (
    <View style={[styles.container, { width, height }]}>
      <WebView
        source={{ html: htmlContent }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        scrollEnabled={false}
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
