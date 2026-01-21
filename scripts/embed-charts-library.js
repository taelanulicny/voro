#!/usr/bin/env node
/**
 * Build script to embed lightweight-charts library into TradingViewChart component
 * This reads the standalone production file and generates code to embed it
 */

const fs = require('fs');
const path = require('path');

const chartsLibPath = path.join(__dirname, '../assets/charts/lightweight-charts.standalone.production.js');
const outputPath = path.join(__dirname, '../src/components/lightweightChartsLib.ts');

try {
  const libContent = fs.readFileSync(chartsLibPath, 'utf8');
  
  // Escape the content for use in template literals
  const escapedContent = libContent
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/`/g, '\\`')    // Escape backticks
    .replace(/\${/g, '\\${'); // Escape template literal expressions
  
  // Generate the TypeScript file
  const output = `// Auto-generated file - DO NOT EDIT MANUALLY
// Generated from: assets/charts/lightweight-charts.standalone.production.js
// To regenerate: npm run embed-charts-lib

export const lightweightChartsLib = \`${escapedContent}\`;
`;

  fs.writeFileSync(outputPath, output);
  console.log(`✅ Successfully embedded charts library (${libContent.length} chars) to ${outputPath}`);
} catch (error) {
  console.error('❌ Error embedding charts library:', error);
  process.exit(1);
}
