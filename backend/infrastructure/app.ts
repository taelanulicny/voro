#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MoroBackendStack } from './stack';

// Pre-deployment validation
if (!process.env.JWT_SECRET) {
  console.error('❌ ERROR: JWT_SECRET environment variable is required');
  console.error('Set it before deploying:');
  console.error('  export JWT_SECRET=$(openssl rand -hex 32)');
  console.error('Or create a .env file with JWT_SECRET=your-secret-key');
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️  WARNING: JWT_SECRET should be at least 32 characters for security');
}

const app = new cdk.App();

new MoroBackendStack(app, 'MoroBackendStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

