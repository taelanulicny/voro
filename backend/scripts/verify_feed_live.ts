// Using built-in fetch (Node.js 18+)
import { CognitoIdentityProviderClient, InitiateAuthCommand, SignUpCommand, AdminConfirmSignUpCommand } from '@aws-sdk/client-cognito-identity-provider';

// Configuration
const API_URL = process.env.API_URL || 'https://nrv9m5dpr1.execute-api.us-east-1.amazonaws.com/prod';
const USER_POOL_ID = 'us-east-1_irqEbJUrt';
const CLIENT_ID = '1cgsver1gisjq7fs3cou41dh65';
const REGION = 'us-east-1';

// Test User
const TEST_USER = {
    username: `feed_tester_${Date.now()}`,
    password: 'Password123!',
    email: `test_${Date.now()}@example.com`
};

async function main() {
    console.log('🚀 Starting Feed Verification...');
    console.log(`Target: ${API_URL}`);

    try {
        // 1. Authenticate (Sign Up or Sign In)
        const cognito = new CognitoIdentityProviderClient({ region: REGION });
        let idToken: string = '';

        console.log(`\n1. Creating test user: ${TEST_USER.username}...`);
        try {
            await cognito.send(new SignUpCommand({
                ClientId: CLIENT_ID,
                Username: TEST_USER.username,
                Password: TEST_USER.password,
                UserAttributes: [{ Name: 'email', Value: TEST_USER.email }]
            }));

            // Auto confirm (requires admin permissions or manual confirm, but let's try assuming preSignUp lambda handles it or we use admin command if creeds allow)
            // Actually, for this script to run locally we might not have IAM creds for AdminConfirm.
            // But the stack might have preSignUp auto-confirm enabled? 
            // Let's assume we can just login if auto-confirmed, otherwise we might fail here.
            console.log('User created.');
        } catch (e: any) {
            console.error('Signup failed:', e.message);
            return;
        }

        console.log('2. Logging in...');
        const authResponse = await cognito.send(new InitiateAuthCommand({
            AuthFlow: 'USER_PASSWORD_AUTH',
            ClientId: CLIENT_ID,
            AuthParameters: {
                USERNAME: TEST_USER.username,
                PASSWORD: TEST_USER.password
            }
        }));

        idToken = authResponse.AuthenticationResult?.IdToken || '';
        if (!idToken) throw new Error('Failed to get ID token');
        console.log('Login successful! Token obtained.');

        // 2. Create a Post
        console.log('\n3. Creating a new post...');
        const postContent = `Automated verification post ${Date.now()}`;
        const createRes = await fetch(`${API_URL}/api/social/posts`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({
                content: postContent,
                sentiment: 'positive'
            })
        });

        if (!createRes.ok) {
            const txt = await createRes.text();
            throw new Error(`Failed to create post: ${createRes.status} ${txt}`);
        }
        const createData = await createRes.json() as any;
        console.log('Post created:', createData.data?.postId);

        // 3. Fetch Feed
        console.log('\n4. Fetching Global Feed...');
        // Give DynamoDB a moment for eventual consistency (Scan is usually consistent enough for this, but waiting 1s is safe)
        await new Promise(r => setTimeout(r, 1000));

        const feedRes = await fetch(`${API_URL}/api/social/feed?limit=10`, {
            headers: { 'Authorization': `Bearer ${idToken}` }
        });

        if (!feedRes.ok) {
            const txt = await feedRes.text();
            throw new Error(`Failed to fetch feed: ${feedRes.status} ${txt}`);
        }

        const feedData = await feedRes.json() as any;
        const posts = feedData.data?.posts || [];
        console.log(`Fetched ${posts.length} posts.`);

        // 4. Verify
        const found = posts.find((p: any) => p.content === postContent);
        if (found) {
            console.log('\n✅ SUCCESS: Created post found in global feed!');
            console.log(`Post ID: ${found.postId}`);
            console.log(`Content: ${found.content}`);
        } else {
            console.log('\n❌ FAILURE: Created post NOT found in feed.');
            console.log('Top 5 posts content:');
            posts.slice(0, 5).forEach((p: any) => console.log(`- ${p.content}`));
        }

    } catch (error) {
        console.error('\n❌ ERROR:', error);
    }
}

main();
