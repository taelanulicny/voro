# Moro Security Audit Report

**Date:** December 30, 2025  
**Auditor:** Senior Application Security Engineer  
**Scope:** React Native (Expo) Frontend + AWS CDK Backend (Lambda, DynamoDB, Cognito)  
**Classification:** Confidential

---

## Executive Summary: "If I Shipped Today, Here's How I'd Get Hacked"

### Critical Risks (Ship-Blockers)

1. **OAuth Token Signature Verification Missing (P0)**: Google/Apple identity tokens are decoded but NOT cryptographically verified against provider JWKS. An attacker can forge identity tokens with any email/user ID.

2. **Cognito Token Only Decoded, Not Verified (P0)**: The backend decodes Cognito JWTs without verifying signatures against Cognito's JWKS. Attackers can forge Cognito tokens.

3. **Trading Race Conditions (P1)**: Non-atomic DynamoDB operations in trade execution allow double-spend through concurrent requests.

4. **CORS Wildcard (P1)**: API Gateway allows `Access-Control-Allow-Origin: *`, enabling malicious web pages to make authenticated requests.

5. **S3 Bucket Public Access on Avatars (P1)**: S3 bucket policy grants `s3:GetObject` to `AnyPrincipal` for the avatars folder, potentially exposing user data.

### High Priority Risks

6. **No Rate Limiting on API Gateway (P1)**: No throttling configured, enabling DoS and brute-force attacks.

7. **User Profile Endpoint Leaks Email (P2)**: Public user profile endpoint exposes email addresses.

8. **Missing Input Validation on Backend (P2)**: No schema validation (Zod/Joi) on backend handlers - only basic null checks.

9. **Console.log Leaking Sensitive Data (P2)**: 144+ console statements across backend could log tokens/PII to CloudWatch.

---

## A) Threat Model

### Assets

| Asset | Sensitivity | Location |
|-------|-------------|----------|
| Auth Tokens (JWT) | Critical | Mobile SecureStore, Lambda env vars |
| Refresh Tokens | Critical | Mobile SecureStore |
| User Credentials | Critical | Cognito (hashed) |
| User Accounts/PII | High | DynamoDB Users table (email, username, displayName) |
| Cash Balances | High | DynamoDB Users table (cashBalance) |
| Portfolio Holdings | High | DynamoDB Portfolios table |
| Transactions | High | DynamoDB Transactions table |
| Posts/Comments | Medium | DynamoDB Posts/Comments tables |
| Follower Graph | Medium | DynamoDB Follows table |
| S3 Avatars/Images | Medium | S3 moro-assets bucket |
| CloudWatch Logs | Medium | AWS CloudWatch |
| JWT_SECRET | Critical | Lambda env var (set at deploy time) |
| NEWS_API_KEY | Medium | Lambda env var |

### Adversaries

| Adversary | Capability | Goal |
|-----------|------------|------|
| Casual Attacker | Public internet access | Account takeover, free tokens |
| Malicious User | Valid account | Abuse platform, manipulate balances |
| Botnet | Mass automated requests | Spam, DoS, credential stuffing |
| Compromised Device | Access to app sandbox | Token theft, session hijacking |
| Compromised CI/CD | Build pipeline access | Inject malicious code, steal secrets |
| Insider | AWS Console access | Data exfiltration, privilege abuse |

### Top Abuse Cases

1. **Account Takeover**: Forge OAuth tokens → create account with victim's email → access their data
2. **Balance Manipulation**: Race condition in trades → double-spend → infinite tokens
3. **Data Exfiltration**: No IDOR checks on some endpoints → enumerate users/portfolios
4. **Feed Spam**: No rate limits → bot army posts spam/harassment
5. **Replay Attacks**: Idempotency key bypass → replay trade requests
6. **Token Theft**: Compromise device → extract tokens from storage → impersonate user
7. **IDOR**: Access other users' notifications/watchlists via predictable IDs

### Assumptions

| Assumption | Validation |
|------------|------------|
| Mobile app is untrusted | ✅ All auth happens via backend |
| TLS is used | ✅ API Gateway enforces HTTPS |
| JWT verification exists | ❌ **BROKEN** - tokens decoded but not verified |
| DynamoDB access is scoped | ❌ **PARTIAL** - single Lambda role has access to all tables |
| Secrets not in code | ✅ JWT_SECRET required at deploy time |
| Rate limiting exists | ❌ **MISSING** |

---

## B) Repo Security Map

### Authentication Flow

| Component | File | Security Status |
|-----------|------|-----------------|
| Frontend AuthContext | `src/context/AuthContext.tsx` | ✅ Uses SecureStore for tokens |
| Frontend Auth Service | `src/services/authService.ts` | ✅ Proper API calls |
| API Client | `src/config/api.ts` | ✅ Bearer token in headers |
| Backend Auth Middleware | `backend/src/middleware/auth.ts` | ❌ **Token verification broken** |
| Backend Auth Handlers | `backend/src/handlers/auth.ts` | ✅ Uses Cognito for login |
| Backend OAuth Handlers | `backend/src/handlers/oauth.ts` | ❌ **Token verification broken** |
| Backend Auth Service | `backend/src/services/authService.ts` | ✅ Cognito integration |
| CDK Cognito Config | `backend/infrastructure/stack.ts:27-55` | ✅ Good password policy |

### Trading Flow

| Component | File | Security Status |
|-----------|------|-----------------|
| Frontend TradingContext | `src/context/TradingContext.tsx` | ✅ Idempotency keys used |
| Backend Trading Handler | `backend/src/handlers/trading.ts` | ✅ Server-side market hours |
| Backend Trading Service | `backend/src/services/tradingService.ts` | ❌ **Non-atomic operations** |

### Social Features

| Component | File | Security Status |
|-----------|------|-----------------|
| Frontend SocialContext | `src/context/SocialContext.tsx` | ✅ Proper auth checks |
| Backend Social Handler | `backend/src/handlers/social.ts` | ✅ Auth required |
| Backend Social Service | `backend/src/services/socialService.ts` | ✅ Content moderation |
| Content Moderation | `backend/src/utils/contentModeration.ts` | ⚠️ Slur list is empty |

### Infrastructure

| Component | File | Security Status |
|-----------|------|-----------------|
| CDK Stack | `backend/infrastructure/stack.ts` | ❌ **Multiple issues** |
| IAM Roles | `backend/infrastructure/stack.ts:270-296` | ❌ **Single overly broad role** |
| S3 Bucket | `backend/infrastructure/stack.ts:57-85` | ❌ **Public access on avatars** |
| API Gateway | `backend/infrastructure/stack.ts:354-376` | ❌ **No WAF, wildcard CORS** |

### Storage

| Component | File | Security Status |
|-----------|------|-----------------|
| Token Storage | `src/context/AuthContext.tsx:9-11` | ✅ SecureStore for tokens |
| User Data Storage | `src/context/AuthContext.tsx:11` | ⚠️ AsyncStorage for user profile |

### Third-Party Integrations

| Integration | File | Security Status |
|-------------|------|-----------------|
| Google OAuth | `backend/src/handlers/oauth.ts` | ❌ **No signature verification** |
| Apple OAuth | `backend/src/handlers/oauth.ts` | ❌ **No signature verification** |
| News API | `backend/src/services/newsApiService.ts` | ✅ API key in env var |

### Dev/Debug Bypasses

| Bypass | File:Line | Risk |
|--------|-----------|------|
| `skipAuth()` | `src/context/AuthContext.tsx:321-337` | ⚠️ DEV-only, properly guarded |
| Debug logging | `backend/src/index.ts:27-29` | Low - search request logging |

---

## C) Security Findings Table

### P0 - Critical (Ship Blockers)

| Area | Issue | Severity | Exploit Scenario | Evidence | Impact | Fix | Verification | Effort |
|------|-------|----------|------------------|----------|--------|-----|--------------|--------|
| Auth | **OAuth tokens not cryptographically verified** | P0 | 1. Attacker creates JWT with `{"iss":"https://accounts.google.com","sub":"attacker-id","email":"victim@gmail.com"}` 2. Signs with any key (signature ignored) 3. Sends to `/api/auth/google` 4. Gets valid Moro token for victim's email | `backend/src/handlers/oauth.ts:42-67` - `verifyGoogleToken()` calls `jwt.decode()` not `jwt.verify()` | Complete account takeover for any email | Verify signatures against Google/Apple JWKS using `jwks-rsa` library | Deploy fix, attempt forge → should fail | M |
| Auth | **Cognito tokens decoded but not verified** | P0 | 1. Attacker crafts JWT with valid-looking claims 2. Sets `sub` to any user ID 3. Signs with any key 4. Passes `verifyCognitoToken()` since it just decodes | `backend/src/middleware/auth.ts:38-69` - falls back to `jwt.decode()` | Complete account impersonation | Use `aws-jwt-verify` or verify against Cognito JWKS | Attempt with forged token → should fail | M |
| Trading | **Non-atomic trade execution allows double-spend** | P0 | 1. Attacker has $100 balance 2. Sends 10 concurrent buy requests for $50 each 3. All pass balance check before any write 4. All execute → -$400 balance | `backend/src/services/tradingService.ts:162-233` - Separate read/write operations | Infinite money glitch, economic collapse | Use DynamoDB TransactWriteItems with ConditionExpression on balance | Test concurrent trades, verify atomic | L |

### P1 - High Priority

| Area | Issue | Severity | Exploit Scenario | Evidence | Impact | Fix | Verification | Effort |
|------|-------|----------|------------------|----------|--------|-----|--------------|--------|
| Infra | **CORS allows all origins** | P1 | 1. Attacker creates evil.com with JS 2. Victim visits evil.com while logged into Moro 3. JS makes authenticated requests to Moro API 4. Steals data or performs actions | `backend/infrastructure/stack.ts:358-361` - `allowOrigins: apigateway.Cors.ALL_ORIGINS` | CSRF, data theft if web client exists | Restrict to actual mobile app origins or remove CORS entirely | Test from unauthorized origin → blocked | S |
| Infra | **No rate limiting on API Gateway** | P1 | 1. Attacker sends 10k login attempts/sec 2. Brute-forces passwords 3. Or floods social endpoints with spam | No throttling config in `stack.ts` | DoS, brute-force, spam floods | Add `UsagePlan` with `throttle` settings to API Gateway | Load test → requests rejected above threshold | M |
| Infra | **S3 public read on avatars folder** | P1 | 1. Enumerate S3 bucket 2. Access any user's avatar without auth 3. Potential for sensitive avatar images | `backend/infrastructure/stack.ts:77-85` - `AnyPrincipal` can `s3:GetObject` on `/avatars/*` | Privacy violation, PII exposure via images | Use CloudFront with signed URLs or presigned GET URLs | Direct S3 access → blocked, CloudFront → works | M |
| IAM | **Single Lambda role with access to all tables** | P1 | 1. Vulnerability in social handler 2. Attacker gains code execution 3. Can read/write ALL tables including transactions | `backend/infrastructure/stack.ts:279-296` - One `lambdaRole` granted all table access | Blast radius of any exploit is entire database | Create separate roles per handler domain (trading, social, auth) | Review IAM policies in AWS Console | L |
| Trading | **Idempotency check is not atomic** | P1 | 1. Generate idempotency key 2. Send same key in concurrent requests 3. Both pass the check (filter) before either writes 4. Trade executes twice | `backend/src/services/tradingService.ts:119-143` - Query then conditional write | Double-spend via race condition | Use ConditionExpression with `attribute_not_exists` on PUT | Concurrent same-key trades → only one succeeds | M |

### P2 - Medium Priority

| Area | Issue | Severity | Exploit Scenario | Evidence | Impact | Fix | Verification | Effort |
|------|-------|----------|------------------|----------|--------|-----|--------------|--------|
| Privacy | **User profile endpoint exposes email** | P2 | 1. Call `/api/user/{userId}` 2. Get user's email address 3. Build email list for spam/phishing | `backend/src/handlers/user.ts:32-45` - Returns `email` in response | PII exposure, GDPR violation | Remove email from public profile response | Check response → no email field | S |
| API | **No request body schema validation** | P2 | 1. Send malformed JSON 2. Unexpected types cause crashes or bypass logic 3. e.g., `quantity: "lots"` instead of number | `backend/src/handlers/trading.ts:40-52` - Manual null checks only, no Zod/Joi | Logic bypass, potential injection | Add Zod schemas to all handlers matching frontend schemas | Send invalid types → proper 400 error | M |
| Logging | **Console statements may leak sensitive data** | P2 | 1. Error occurs with token in context 2. Logged to CloudWatch with token 3. Anyone with log access can steal tokens | 144 console statements in `backend/src/**` (grep count) | Token leakage, PII in logs | Use structured logger with redaction, remove console.* | Audit CloudWatch logs → no tokens/PII | M |
| Social | **Content moderation slur list is empty** | P2 | 1. Post hateful slurs 2. Pass moderation 3. App store rejection, user harm | `backend/src/utils/contentModeration.ts:10-18` - `SLURS: string[] = []` | App store rejection, user safety | Populate SLURS array or integrate AWS Comprehend | Post slurs → rejected | S |
| DynamoDB | **No Point-in-Time Recovery enabled** | P2 | 1. Bug or attack deletes data 2. No way to recover | `backend/infrastructure/stack.ts` - No `pointInTimeRecovery: true` | Permanent data loss | Add `pointInTimeRecovery: true` to all tables | Check DynamoDB settings in Console | S |
| Auth | **No MFA on Cognito** | P2 | 1. Attacker phishes password 2. No second factor 3. Account compromised | `backend/infrastructure/stack.ts:27-46` - No MFA config | Account takeover via credential theft | Add `mfa: cognito.Mfa.OPTIONAL` and `mfaSecondFactor` | Enable MFA → prompted during login | M |
| Infra | **DynamoDB tables not encrypted with CMK** | P2 | 1. AWS-managed key rotation is less controlled 2. Regulatory compliance issues | `backend/infrastructure/stack.ts` - No `encryption` property on tables | Compliance, weaker key management | Add `encryption: dynamodb.TableEncryption.CUSTOMER_MANAGED` with KMS key | Check DynamoDB encryption in Console | M |

### P3 - Low Priority

| Area | Issue | Severity | Exploit Scenario | Evidence | Impact | Fix | Verification | Effort |
|------|-------|----------|------------------|----------|--------|-----|--------------|--------|
| Mobile | **No screenshot protection on iOS** | P3 | 1. User views portfolio 2. App switcher captures screenshot 3. Visible to others looking at phone | No `UIWindow.isSecureTextEntry` or similar | Minor privacy leak | Add screenshot prevention in `App.tsx` | Check app switcher → blurred | S |
| Mobile | **No certificate pinning** | P3 | 1. Attacker on same WiFi 2. MITM with custom CA 3. Intercept traffic (unlikely with proper TLS) | No pinning config in `app.json` or code | MITM by sophisticated attacker | Implement with `react-native-ssl-pinning` for production | Test with proxy → should fail | M |
| Auth | **Dev skipAuth could be left enabled** | P3 | 1. Build shipped with `__DEV__` check bypassed 2. Anyone calls `skipAuth()` | `src/context/AuthContext.tsx:322-324` - Guarded by `__DEV__` | Unlikely if builds are proper | Add build-time stripping of dev code | Production build → skipAuth throws | S |
| Error | **Stack traces in dev error responses** | P3 | 1. Trigger error 2. Get stack trace with file paths 3. Learn internal structure | `backend/src/middleware/auth.ts:149` - `NODE_ENV === 'development'` check | Information disclosure in dev | Ensure NODE_ENV=production in Lambda | Trigger error → no stack trace | S |

---

## D) Mobile App Security Deep Dive

### Token Storage ✅ GOOD

**Evidence:** `src/context/AuthContext.tsx:9-10`
```typescript
const SECURE_AUTH_TOKEN_KEY = 'moro_auth_token';
const SECURE_REFRESH_TOKEN_KEY = 'moro_refresh_token';
```

Uses `expo-secure-store` which maps to iOS Keychain and Android Keystore.

**Recommendation:** Verify Keychain access group in production build.

### Session Lifecycle ✅ GOOD

**Evidence:** `src/context/AuthContext.tsx:228-283`
- Token refresh logic with `isTokenExpiredOrNearExpiry(token, 5)` checks
- Mutex with `refreshInProgress` ref prevents concurrent refreshes
- 401 responses trigger refresh attempt in `src/config/api.ts:524-540`

**Recommendation:** Add explicit logout on multiple refresh failures.

### API Transport ⚠️ NEEDS IMPROVEMENT

**Evidence:** `src/config/api.ts:9`
```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';
```

- Production URLs should be HTTPS (enforced by API Gateway)
- Fallback to localhost is dev-only
- **No certificate pinning** implemented

**Recommendation:** Implement certificate pinning for production using `react-native-ssl-pinning` or Expo's `fetch` with custom certificate.

### Sensitive Data Leakage ⚠️ NEEDS IMPROVEMENT

**Console Logging:**
- `src/context/AuthContext.tsx:71,125` - Logs errors with context
- Error reporting service properly redacts in production (`src/services/errorReporting.ts:110-117`)

**Screenshot Protection:**
- None implemented

**Recommendation:**
1. Add iOS screenshot blurring in `App.tsx`
2. Add Android `FLAG_SECURE` for sensitive screens

### Input Handling ✅ GOOD

**Evidence:** `src/validators/schemas.ts`
- Comprehensive Zod schemas for all data types
- `ExecuteTradeRequestSchema` validates trades
- `CreatePostRequestSchema` limits content length

### Deep Links ⚠️ REVIEW NEEDED

**Evidence:** `app.json:41`
```json
"scheme": "moro"
```

**Risk:** Deep links could potentially navigate to auth-required screens.

**Recommendation:** Audit navigation to ensure deep links can't bypass auth checks.

### Dependencies ✅ GENERALLY GOOD

**Evidence:** `package.json`
```json
"expo": "~54.0.30",
"expo-secure-store": "~15.0.8",
"zod": "^4.2.1"
```

Key security dependencies are up-to-date. No known critical vulnerabilities in listed packages.

**Recommendation:** Run `npm audit` regularly.

### Expo Config ✅ GOOD

**Evidence:** `app.json:22`
```json
"ITSAppUsesNonExemptEncryption": false
```

Minimal permissions declared. No overbroad camera/location permissions.

---

## E) Backend/API Security Deep Dive

### Auth & Authorization ❌ CRITICAL ISSUES

**Issue 1: OAuth Tokens Not Verified**

**Evidence:** `backend/src/handlers/oauth.ts:42-67`
```typescript
async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    // Decode the token (in production, verify signature with Google's JWKS)
    const decoded = jwt.decode(idToken) as GoogleTokenPayload; // ← NOT jwt.verify()!
    ...
  }
}
```

**Issue 2: Cognito Tokens Not Verified**

**Evidence:** `backend/src/middleware/auth.ts:38-69`
```typescript
async function verifyCognitoToken(token: string): Promise<any> {
  try {
    const decoded = jwt.decode(token) as any; // ← NOT jwt.verify()!
    if (!decoded) {
      throw new Error('Invalid token format');
    }
    // For Cognito ID tokens, we can decode and trust them ← WRONG!
    if (decoded.sub) {
      return { sub: decoded.sub, email: decoded.email };
    }
    ...
  }
}
```

**Fix Required:**

```typescript
// Install: npm install aws-jwt-verify
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

async function verifyCognitoToken(token: string) {
  const payload = await verifier.verify(token); // Cryptographically verified
  return { sub: payload.sub, email: payload.email };
}
```

For Google/Apple:
```typescript
// Install: npm install jwks-rsa
import jwksClient from 'jwks-rsa';

const googleClient = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  cache: true,
});

async function verifyGoogleToken(idToken: string) {
  const decoded = jwt.decode(idToken, { complete: true });
  const key = await googleClient.getSigningKey(decoded.header.kid);
  const payload = jwt.verify(idToken, key.getPublicKey(), {
    algorithms: ['RS256'],
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
  });
  return payload;
}
```

### IDOR Checks ⚠️ MOSTLY GOOD

**Good:** All authenticated endpoints extract `userId` from JWT claims, not request body:
- `backend/src/handlers/trading.ts:37` - `const userId = auth.event.userId!;`
- `backend/src/handlers/social.ts:26` - `const userId = auth.event.userId!;`

**Concern:** Notifications don't verify ownership before marking as read:
- `backend/src/handlers/notifications.ts:93` - Uses userId from auth, but should verify notification belongs to user

### Input Validation ❌ INSUFFICIENT

**Evidence:** `backend/src/handlers/trading.ts:40-52`
```typescript
const { entityId, type, quantity, pricePerToken, idempotencyKey } = body;

if (!entityId || !type || !quantity || !pricePerToken) {
  return createErrorResponse(400, 'Missing required fields...');
}

if (type !== 'buy' && type !== 'sell') { ... }
if (quantity <= 0) { ... }
```

Manual checks, no schema validation. Doesn't validate:
- Type safety (`quantity` could be string)
- Integer overflow on quantity
- Float precision on pricePerToken

**Fix Required:** Add Zod validation matching frontend schemas.

### Trade Security ⚠️ NEEDS IMPROVEMENT

**Idempotency:** ✅ Implemented but not atomic

**Evidence:** `backend/src/services/tradingService.ts:119-143`
```typescript
if (idempotencyKey) {
  const existingTransactions = await docClient.send(
    new QueryCommand({ ... })  // Read
  );
  if (existingTransactions.Items?.length > 0) {
    return { success: true, ... };  // Return existing
  }
}
// Then execute trade...
```

**Race condition:** Two concurrent requests can both pass the check.

**Double-spend prevention:** ❌ MISSING

**Evidence:** `backend/src/services/tradingService.ts:162-165`
```typescript
if (type === 'buy') {
  if (totalAmount > portfolio.cashBalance) {
    return { success: false, error: 'Insufficient funds' };
  }
  // Then separate write operation...
```

Balance check and deduction are separate operations.

**Fix Required:**
```typescript
// Use TransactWriteItems for atomic balance update
import { TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';

await docClient.send(new TransactWriteItemsCommand({
  TransactItems: [
    {
      Update: {
        TableName: USERS_TABLE,
        Key: { userId },
        UpdateExpression: 'SET cashBalance = cashBalance - :amount',
        ConditionExpression: 'cashBalance >= :amount',  // Atomic check
        ExpressionAttributeValues: { ':amount': totalAmount },
      },
    },
    // ... other operations
  ],
}));
```

### Rate Limiting ❌ MISSING

**Evidence:** `backend/infrastructure/stack.ts` - No `UsagePlan` or `Throttle` configuration.

**Fix Required:**
```typescript
// In stack.ts after API creation
const usagePlan = api.addUsagePlan('MoroUsagePlan', {
  name: 'Standard',
  throttle: {
    rateLimit: 100,  // requests per second
    burstLimit: 200,
  },
  quota: {
    limit: 10000,
    period: apigateway.Period.DAY,
  },
});
```

### CORS ❌ TOO PERMISSIVE

**Evidence:** `backend/infrastructure/stack.ts:358-361`
```typescript
defaultCorsPreflightOptions: {
  allowOrigins: apigateway.Cors.ALL_ORIGINS,  // ← DANGEROUS
  allowMethods: apigateway.Cors.ALL_METHODS,
  allowHeaders: ['Content-Type', 'Authorization'],
},
```

**Fix:** Since this is a mobile-only API, remove CORS or restrict heavily:
```typescript
defaultCorsPreflightOptions: {
  allowOrigins: ['https://moro-internal-tools.yourcompany.com'],  // Or disable entirely
  ...
},
```

### Error Handling ⚠️ PARTIALLY GOOD

**Good:** `backend/src/middleware/auth.ts:149`
```typescript
...(error && process.env.NODE_ENV === 'development' && { details: error }),
```

Stack traces only in development.

**Concern:** Lambda might expose details in 500 errors. Ensure `NODE_ENV=production` in Lambda.

### Logging ⚠️ NEEDS IMPROVEMENT

**Evidence:** 144 console statements in backend code.

**Concerns:**
1. Tokens could be logged in error contexts
2. PII (emails) logged in auth flows
3. No log level control

**Fix Required:**
1. Replace all `console.*` with structured logger
2. Add token/PII redaction
3. Set CloudWatch log retention to 90 days

### Data Protection ⚠️ NEEDS IMPROVEMENT

**Encryption at Rest:** Using default AWS-managed keys (acceptable for MVP)

**Missing:**
- Point-in-Time Recovery on DynamoDB tables
- No explicit KMS CMK
- No backup strategy documented

### Secrets Management ✅ GOOD

**Evidence:** `backend/infrastructure/stack.ts:16-23`
```typescript
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required for deployment...');
}
```

JWT_SECRET must be set at deploy time, not hardcoded.

### IAM Least Privilege ❌ VIOLATED

**Evidence:** `backend/infrastructure/stack.ts:279-296`
```typescript
usersTable.grantReadWriteData(lambdaRole);
entitiesTable.grantReadWriteData(lambdaRole);
portfoliosTable.grantReadWriteData(lambdaRole);
// ... ALL tables granted to single role
```

All handlers use the same role with access to all 15+ tables.

**Fix Required:** Create domain-specific roles:
- `tradingLambdaRole` → Users, Portfolios, Transactions, Entities tables
- `socialLambdaRole` → Posts, Comments, Likes, Follows tables
- `authLambdaRole` → Users, Cognito operations

---

## F) Infrastructure / CDK Security Review

### Cognito Settings ⚠️ NEEDS IMPROVEMENT

**Evidence:** `backend/infrastructure/stack.ts:27-46`

**Good:**
- Password policy: 8 chars, upper/lower/digits ✅
- Auto-verify email ✅
- Self-signup enabled ✅

**Missing:**
- MFA not configured
- Advanced security features (risk-based auth) not enabled
- Token lifetime not customized (defaults are fine)

**Fix Required:**
```typescript
const userPool = new cognito.UserPool(this, 'MoroUserPool', {
  ...
  mfa: cognito.Mfa.OPTIONAL,
  mfaSecondFactor: {
    sms: true,
    otp: true,
  },
  advancedSecurityMode: cognito.AdvancedSecurityMode.ENFORCED,
});
```

### API Gateway ⚠️ NEEDS IMPROVEMENT

**Missing:**
- WAF integration
- Request validation
- Rate limiting

**Fix Required:**
```typescript
import * as waf from 'aws-cdk-lib/aws-wafv2';

// Create WAF WebACL
const webAcl = new waf.CfnWebACL(this, 'ApiWaf', {
  scope: 'REGIONAL',
  defaultAction: { allow: {} },
  visibilityConfig: {
    cloudWatchMetricsEnabled: true,
    metricName: 'moro-api-waf',
    sampledRequestsEnabled: true,
  },
  rules: [
    {
      name: 'RateLimitRule',
      priority: 1,
      action: { block: {} },
      statement: {
        rateBasedStatement: {
          limit: 2000,
          aggregateKeyType: 'IP',
        },
      },
      visibilityConfig: { ... },
    },
  ],
});
```

### DynamoDB ⚠️ NEEDS IMPROVEMENT

**Missing:**
- Point-in-Time Recovery
- TTL on session/notification tables
- Backup strategy

**Fix Required:**
```typescript
const usersTable = new dynamodb.Table(this, 'UsersTable', {
  ...
  pointInTimeRecovery: true,  // Add this to ALL tables
});

notificationsTable.addGlobalSecondaryIndex({ ... });
// Consider TTL for old notifications
```

### S3 ❌ SECURITY ISSUE

**Evidence:** `backend/infrastructure/stack.ts:77-85`
```typescript
assetsBucket.addToResourcePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    principals: [new iam.AnyPrincipal()],  // ← PUBLIC ACCESS
    actions: ['s3:GetObject'],
    resources: [`${assetsBucket.bucketArn}/avatars/*`],
  })
);
```

**Fix Required:** Remove public access, use CloudFront with OAI or presigned URLs:
```typescript
// Remove the addToResourcePolicy call

// Instead, generate presigned URLs for avatar access in handler:
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
const url = await getSignedUrl(s3Client, new GetObjectCommand({
  Bucket: BUCKET,
  Key: avatarKey,
}), { expiresIn: 3600 });
```

### Monitoring ⚠️ MISSING

**Missing:**
- CloudWatch alarms on error rates
- Suspicious auth attempt detection
- API Gateway access logging

**Fix Required:**
```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';

const errorAlarm = new cloudwatch.Alarm(this, 'ApiErrorAlarm', {
  metric: api.metricServerError(),
  threshold: 10,
  evaluationPeriods: 1,
  alarmDescription: 'High API error rate',
});
```

---

## G) Product Abuse + Safety

### Spam/Abuse Vectors

| Vector | Current State | Mitigation |
|--------|---------------|------------|
| Bot signups | No CAPTCHA, email verification optional | Add Cognito email verification enforcement |
| Mass follows | No limit | Add rate limit: 100 follows/hour |
| Post spam | Content moderation exists but weak | Populate slur list, add AWS Comprehend |
| Comment flooding | No limit | Add rate limit: 10 comments/minute |
| Report abuse | Report system exists | Add admin review queue |

### Account Creation Abuse

| Attack | Current State | Mitigation |
|--------|---------------|------------|
| Disposable emails | No checking | Add disposable email blocklist |
| Credential stuffing | No rate limit on login | Add Cognito advanced security |
| OAuth abuse | Weak verification | Fix token verification (P0) |

### MVP-Safe Plan (Minimum Viable Security)

1. **Week 1 (Must-Do Before Launch):**
   - Fix OAuth/Cognito token verification (P0)
   - Fix trading race conditions (P0)
   - Add basic API rate limiting

2. **Week 2:**
   - Restrict CORS
   - Remove email from public profiles
   - Add content moderation words

3. **Week 3:**
   - Implement per-user rate limits
   - Add CloudWatch alarms
   - Enable DynamoDB PITR

4. **Post-Launch:**
   - Add MFA option
   - Implement certificate pinning
   - Add WAF

---

## H) Deliverables

### Top 15 Fixes in Priority Order

#### 1. Fix Cognito Token Verification (P0)
**File:** `backend/src/middleware/auth.ts`
```typescript
// Add at top of file
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID!,
  tokenUse: 'id',
  clientId: process.env.COGNITO_CLIENT_ID!,
});

// Replace verifyCognitoToken function
async function verifyCognitoToken(token: string): Promise<any> {
  const payload = await verifier.verify(token);
  return {
    sub: payload.sub,
    email: payload.email as string,
  };
}
```
**Test:** Attempt authentication with a forged JWT → should reject with 401.

#### 2. Fix Google OAuth Token Verification (P0)
**File:** `backend/src/handlers/oauth.ts`
```typescript
// Add at top
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

const googleJwksClient = jwksClient({
  jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
  cache: true,
  cacheMaxAge: 86400000,
});

async function verifyGoogleToken(idToken: string): Promise<GoogleTokenPayload | null> {
  try {
    const decoded = jwt.decode(idToken, { complete: true });
    if (!decoded || typeof decoded === 'string') return null;
    
    const key = await googleJwksClient.getSigningKey(decoded.header.kid);
    const publicKey = key.getPublicKey();
    
    const payload = jwt.verify(idToken, publicKey, {
      algorithms: ['RS256'],
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
    }) as GoogleTokenPayload;
    
    return payload;
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
}
```
**Test:** Create a forged Google token → should return null.

#### 3. Fix Apple OAuth Token Verification (P0)
**File:** `backend/src/handlers/oauth.ts`
```typescript
const appleJwksClient = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
});

async function verifyAppleToken(identityToken: string): Promise<AppleTokenPayload | null> {
  try {
    const decoded = jwt.decode(identityToken, { complete: true });
    if (!decoded || typeof decoded === 'string') return null;
    
    const key = await appleJwksClient.getSigningKey(decoded.header.kid);
    const publicKey = key.getPublicKey();
    
    const payload = jwt.verify(identityToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: 'com.moro.mobile',
    }) as AppleTokenPayload;
    
    return payload;
  } catch (error) {
    console.error('Error verifying Apple token:', error);
    return null;
  }
}
```
**Test:** Create a forged Apple token → should return null.

#### 4. Fix Trading Race Condition with TransactWriteItems (P0)
**File:** `backend/src/services/tradingService.ts`
```typescript
import { TransactWriteItemsCommand } from '@aws-sdk/lib-dynamodb';

export async function executeTrade(...): Promise<...> {
  // ... existing validation ...
  
  const now = new Date().toISOString();
  const transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    if (type === 'buy') {
      await docClient.send(new TransactWriteItemsCommand({
        TransactItems: [
          {
            Update: {
              TableName: TABLE_NAMES.USERS,
              Key: { userId: { S: userId } },
              UpdateExpression: 'SET cashBalance = cashBalance - :amount, updatedAt = :ua',
              ConditionExpression: 'cashBalance >= :amount',
              ExpressionAttributeValues: {
                ':amount': { N: totalAmount.toString() },
                ':ua': { S: now },
              },
            },
          },
          // ... portfolio update, transaction record
        ],
      }));
    }
    // Similar for sell
  } catch (error) {
    if (error.name === 'TransactionCanceledException') {
      return { success: false, error: 'Insufficient funds or concurrent trade conflict' };
    }
    throw error;
  }
}
```
**Test:** Send 10 concurrent $100 buys with $100 balance → only 1 succeeds.

#### 5. Add API Rate Limiting (P1)
**File:** `backend/infrastructure/stack.ts`
```typescript
// After API creation
const apiKey = api.addApiKey('MoroApiKey');

const usagePlan = api.addUsagePlan('MoroUsagePlan', {
  name: 'Standard',
  throttle: {
    rateLimit: 100,
    burstLimit: 200,
  },
});

usagePlan.addApiKey(apiKey);
usagePlan.addApiStage({ stage: api.deploymentStage });
```
**Test:** Send 300 requests/sec → 429 errors after threshold.

#### 6. Restrict CORS (P1)
**File:** `backend/infrastructure/stack.ts`
```typescript
const api = new apigateway.RestApi(this, 'MoroApi', {
  ...
  defaultCorsPreflightOptions: {
    allowOrigins: [],  // No web origins for mobile-only API
    allowMethods: [],
    allowHeaders: [],
    disableCache: true,
  },
});
```
**Test:** Web request from browser → CORS blocked.

#### 7. Fix S3 Public Access (P1)
**File:** `backend/infrastructure/stack.ts`
```diff
-    // Bucket policy to allow public read access to avatars folder only
-    assetsBucket.addToResourcePolicy(
-      new iam.PolicyStatement({
-        effect: iam.Effect.ALLOW,
-        principals: [new iam.AnyPrincipal()],
-        actions: ['s3:GetObject'],
-        resources: [`${assetsBucket.bucketArn}/avatars/*`],
-      })
-    );
```
And generate presigned URLs in the user handler.
**Test:** Direct S3 URL → 403 Forbidden.

#### 8. Remove Email from Public Profile (P2)
**File:** `backend/src/handlers/user.ts`
```diff
     return createResponse(200, {
       success: true,
       data: {
         id: user.userId,
-        email: user.email,
         username: user.username,
         displayName: user.displayName,
         avatarUrl,
```
**Test:** GET /api/user/:id → no email field in response.

#### 9. Add Backend Input Validation (P2)
**File:** `backend/src/handlers/trading.ts`
```typescript
import { z } from 'zod';

const ExecuteTradeSchema = z.object({
  entityId: z.number().int().positive(),
  type: z.enum(['buy', 'sell']),
  quantity: z.number().positive().max(1000000),
  pricePerToken: z.number().positive().max(10000),
  idempotencyKey: z.string().optional(),
});

export async function executeTrade(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  // ... auth check ...
  
  const parseResult = ExecuteTradeSchema.safeParse(JSON.parse(event.body || '{}'));
  if (!parseResult.success) {
    return createErrorResponse(400, 'Invalid request: ' + parseResult.error.message);
  }
  const { entityId, type, quantity, pricePerToken, idempotencyKey } = parseResult.data;
  // ... rest of handler
}
```
**Test:** Send `{ quantity: "lots" }` → 400 error with validation message.

#### 10. Populate Content Moderation List (P2)
**File:** `backend/src/utils/contentModeration.ts`
```typescript
const SLURS: string[] = [
  // Add actual slurs to block (not shown here for appropriateness)
  // In production, use a maintained library or AWS Comprehend
];
```
Or integrate AWS Comprehend:
```typescript
import { ComprehendClient, DetectToxicContentCommand } from '@aws-sdk/client-comprehend';

const comprehend = new ComprehendClient({ region: 'us-east-1' });

export async function moderateWithComprehend(content: string): Promise<{approved: boolean}> {
  const result = await comprehend.send(new DetectToxicContentCommand({
    TextSegments: [{ Text: content }],
    LanguageCode: 'en',
  }));
  
  const toxic = result.ResultList?.[0]?.Labels?.some(
    label => label.Score && label.Score > 0.7
  );
  
  return { approved: !toxic };
}
```
**Test:** Post hateful content → rejected.

#### 11. Enable DynamoDB PITR (P2)
**File:** `backend/infrastructure/stack.ts`
```typescript
const usersTable = new dynamodb.Table(this, 'UsersTable', {
  ...
  pointInTimeRecovery: true,
});
// Add to all tables
```
**Test:** Check DynamoDB console → PITR enabled.

#### 12. Add CloudWatch Alarms (P2)
**File:** `backend/infrastructure/stack.ts`
```typescript
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as sns from 'aws-cdk-lib/aws-sns';

const alertTopic = new sns.Topic(this, 'AlertTopic');

new cloudwatch.Alarm(this, 'High5xxErrors', {
  metric: api.metricServerError(),
  threshold: 10,
  evaluationPeriods: 2,
  alarmDescription: 'High rate of 5xx errors',
}).addAlarmAction(new cloudwatch_actions.SnsAction(alertTopic));

new cloudwatch.Alarm(this, 'HighLatency', {
  metric: api.metricLatency({ statistic: 'p99' }),
  threshold: 5000,
  evaluationPeriods: 2,
});
```
**Test:** Trigger errors → alarm fires.

#### 13. Separate IAM Roles (P1)
**File:** `backend/infrastructure/stack.ts`
```typescript
const tradingLambdaRole = new iam.Role(this, 'TradingLambdaRole', {
  assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
  managedPolicies: [
    iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
  ],
});
usersTable.grantReadWriteData(tradingLambdaRole);
portfoliosTable.grantReadWriteData(tradingLambdaRole);
transactionsTable.grantReadWriteData(tradingLambdaRole);
entitiesTable.grantReadData(tradingLambdaRole);

const socialLambdaRole = new iam.Role(this, 'SocialLambdaRole', { ... });
// Grant only Posts, Comments, Likes, Follows tables
```
This requires refactoring to multiple Lambda functions.
**Test:** Exploit in social handler → cannot access Transactions table.

#### 14. Add Structured Logging with Redaction (P2)
**File:** New `backend/src/utils/logger.ts`
```typescript
const REDACT_PATTERNS = [
  /Authorization:\s*Bearer\s+[^\s]+/gi,
  /password["\s:]+[^,}\s]+/gi,
  /token["\s:]+[^,}\s]+/gi,
];

export function sanitizeForLogging(obj: any): any {
  const str = JSON.stringify(obj);
  let sanitized = str;
  for (const pattern of REDACT_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return JSON.parse(sanitized);
}

export const logger = {
  info: (msg: string, data?: any) => console.log(msg, data ? sanitizeForLogging(data) : ''),
  error: (msg: string, error?: any) => console.error(msg, error ? sanitizeForLogging(error) : ''),
};
```
**Test:** Audit CloudWatch logs → no tokens visible.

#### 15. Add Optional MFA (P2)
**File:** `backend/infrastructure/stack.ts`
```typescript
const userPool = new cognito.UserPool(this, 'MoroUserPool', {
  ...
  mfa: cognito.Mfa.OPTIONAL,
  mfaSecondFactor: {
    sms: false,
    otp: true,
  },
});
```
**Test:** Enable MFA in app → TOTP code required.

---

### Hardening Checklist for Launch

#### Cognito
- [ ] Verify email before account is usable
- [ ] Enable advanced security features
- [ ] Set reasonable token lifetimes (ID: 1hr, Refresh: 30 days)
- [ ] Consider MFA for high-value accounts

#### API Gateway
- [ ] Remove wildcard CORS or restrict to internal tools
- [ ] Enable access logging to CloudWatch
- [ ] Add request validators
- [ ] Consider WAF integration

#### DynamoDB
- [ ] Enable Point-in-Time Recovery on all tables
- [ ] Set TTL on transient data (notifications, sessions)
- [ ] Consider encryption with CMK for compliance

#### Lambda
- [ ] Ensure NODE_ENV=production
- [ ] Set appropriate timeout (30s is fine)
- [ ] Configure reserved concurrency to prevent runaway costs
- [ ] Enable X-Ray tracing

#### S3
- [ ] Remove all public access
- [ ] Enable versioning for recovery
- [ ] Configure lifecycle policies for old objects

#### Logging/Monitoring
- [ ] Redact sensitive data in logs
- [ ] Set CloudWatch log retention (90 days)
- [ ] Create alarms for error rates and latency
- [ ] Set up SNS notifications for alarms

---

### Secure Coding Conventions for the Team

#### 1. Authentication & Authorization
```typescript
// ALWAYS get userId from auth context, never request body
const userId = auth.event.userId!;  // ✅
const userId = body.userId;          // ❌ NEVER

// ALWAYS verify ownership before operations
const item = await getItem(itemId);
if (item.userId !== auth.event.userId) {
  return createErrorResponse(403, 'Forbidden');
}
```

#### 2. Input Validation
```typescript
// ALWAYS validate with Zod before processing
const schema = z.object({
  entityId: z.number().int().positive(),
  quantity: z.number().positive().max(MAX_TRADE_QUANTITY),
});

const result = schema.safeParse(body);
if (!result.success) {
  return createErrorResponse(400, result.error.message);
}
```

#### 3. Database Operations
```typescript
// ALWAYS use TransactWriteItems for multi-step operations
// that must be atomic
await docClient.send(new TransactWriteItemsCommand({
  TransactItems: [
    { Update: { ... ConditionExpression: 'balance >= :amount' } },
    { Put: { ... } },
  ],
}));

// NEVER do read-then-write without conditions
const item = await get(key);  // ❌ Race condition
item.value += 1;
await put(item);              // ❌ Overwrites concurrent updates
```

#### 4. Logging Hygiene
```typescript
// NEVER log tokens or credentials
console.log('Auth header:', event.headers.Authorization);  // ❌

// ALWAYS use structured, sanitized logging
logger.info('User authenticated', { userId: auth.event.userId });  // ✅
```

#### 5. Error Handling
```typescript
// NEVER expose internal details in production
return createErrorResponse(500, 'Internal error', error);  // ❌ Leaks stack

// ALWAYS use generic messages in production
return createErrorResponse(500, 'An unexpected error occurred');  // ✅
```

#### 6. Secrets
```typescript
// NEVER hardcode secrets
const secret = 'my-jwt-secret';  // ❌

// ALWAYS use environment variables or Secrets Manager
const secret = process.env.JWT_SECRET!;  // ✅
if (!secret) throw new Error('JWT_SECRET not configured');
```

---

## Appendix: Files Reviewed

| File | Lines | Key Findings |
|------|-------|--------------|
| `backend/infrastructure/stack.ts` | 405 | CORS, IAM, S3 public access, no rate limiting |
| `backend/src/middleware/auth.ts` | 153 | Token verification broken |
| `backend/src/handlers/oauth.ts` | 377 | Token verification broken |
| `backend/src/handlers/trading.ts` | 269 | Input validation weak |
| `backend/src/services/tradingService.ts` | 484 | Non-atomic operations |
| `backend/src/handlers/social.ts` | 425 | Good auth checks |
| `backend/src/services/socialService.ts` | 835 | Content moderation weak |
| `backend/src/utils/contentModeration.ts` | 127 | Empty slur list |
| `src/context/AuthContext.tsx` | 365 | Good SecureStore usage |
| `src/config/api.ts` | 560 | Proper token handling |
| `src/validators/schemas.ts` | 466 | Good frontend validation |
| `app.json` | 49 | Minimal permissions |
| `package.json` (frontend) | 42 | Dependencies up to date |
| `package.json` (backend) | 45 | Dependencies up to date |

---

**Report Generated:** December 30, 2025  
**Next Review:** Before Production Launch

