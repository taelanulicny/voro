import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class MoroBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // SECURITY: Require JWT_SECRET to be set - never deploy with a hardcoded secret
    if (!process.env.JWT_SECRET) {
      throw new Error(
        'JWT_SECRET environment variable is required for deployment.\n' +
        'Generate one with: export JWT_SECRET=$(openssl rand -hex 32)\n' +
        'Then run: npx cdk deploy'
      );
    }

    const tablePrefix = this.node.tryGetContext('tablePrefix') || 'moro';

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, 'MoroUserPool', {
      userPoolName: `${tablePrefix}-user-pool`,
      signInAliases: {
        email: true,
        username: true,
      },
      selfSignUpEnabled: true, // Allow users to sign up themselves
      autoVerify: {
        email: true,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const userPoolClient = userPool.addClient('MoroUserPoolClient', {
      userPoolClientName: `${tablePrefix}-client`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
    });

    // S3 Bucket for assets
    const assetsBucket = new s3.Bucket(this, 'MoroAssetsBucket', {
      bucketName: `${tablePrefix}-assets-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: false,
      cors: [
        {
          allowedOrigins: ['*'],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedHeaders: ['*'],
        },
      ],
    });

    // DynamoDB Tables
    const usersTable = new dynamodb.Table(this, 'UsersTable', {
      tableName: `${tablePrefix}-Users`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const entitiesTable = new dynamodb.Table(this, 'EntitiesTable', {
      tableName: `${tablePrefix}-Entities`,
      partitionKey: { name: 'entityId', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const portfoliosTable = new dynamodb.Table(this, 'PortfoliosTable', {
      tableName: `${tablePrefix}-Portfolios`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'entityId', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const transactionsTable = new dynamodb.Table(this, 'TransactionsTable', {
      tableName: `${tablePrefix}-Transactions`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    transactionsTable.addGlobalSecondaryIndex({
      indexName: 'entityId-timestamp-index',
      partitionKey: { name: 'entityId', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    const postsTable = new dynamodb.Table(this, 'PostsTable', {
      tableName: `${tablePrefix}-Posts`,
      partitionKey: { name: 'postId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    postsTable.addGlobalSecondaryIndex({
      indexName: 'userId-timestamp-index',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });
    postsTable.addGlobalSecondaryIndex({
      indexName: 'entityId-timestamp-index',
      partitionKey: { name: 'entityId', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    const commentsTable = new dynamodb.Table(this, 'CommentsTable', {
      tableName: `${tablePrefix}-Comments`,
      partitionKey: { name: 'commentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    commentsTable.addGlobalSecondaryIndex({
      indexName: 'postId-timestamp-index',
      partitionKey: { name: 'postId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
    });

    const followsTable = new dynamodb.Table(this, 'FollowsTable', {
      tableName: `${tablePrefix}-Follows`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'followingUserId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const likesTable = new dynamodb.Table(this, 'LikesTable', {
      tableName: `${tablePrefix}-Likes`,
      partitionKey: { name: 'likeId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    likesTable.addGlobalSecondaryIndex({
      indexName: 'postId-userId-index',
      partitionKey: { name: 'postId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
    });

    const watchlistsTable = new dynamodb.Table(this, 'WatchlistsTable', {
      tableName: `${tablePrefix}-Watchlists`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'entityId', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const newsArticlesTable = new dynamodb.Table(this, 'NewsArticlesTable', {
      tableName: `${tablePrefix}-NewsArticles`,
      partitionKey: { name: 'articleId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    newsArticlesTable.addGlobalSecondaryIndex({
      indexName: 'entityId-publishedAt-index',
      partitionKey: { name: 'entityId', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'publishedAt', type: dynamodb.AttributeType.STRING },
    });

    const priceHistoryTable = new dynamodb.Table(this, 'PriceHistoryTable', {
      tableName: `${tablePrefix}-PriceHistory`,
      partitionKey: { name: 'entityId', type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const blocksTable = new dynamodb.Table(this, 'BlocksTable', {
      tableName: `${tablePrefix}-Blocks`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'blockedUserId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const reportsTable = new dynamodb.Table(this, 'ReportsTable', {
      tableName: `${tablePrefix}-Reports`,
      partitionKey: { name: 'reportId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Separate role for pre-signup Lambda (to avoid circular dependencies)
    const preSignUpLambdaRole = new iam.Role(this, 'PreSignUpLambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Pre-signup Lambda trigger for auto-confirming users
    const preSignUpLambda = new lambda.Function(this, 'PreSignUpLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'src/handlers/cognitoTriggers.preSignUp',
      code: lambda.Code.fromAsset('bundle'),
      role: preSignUpLambdaRole,
      timeout: cdk.Duration.seconds(10),
    });

    // Add the pre-signup trigger to the user pool
    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpLambda);

    // Lambda execution role for API handlers
    const lambdaRole = new iam.Role(this, 'LambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant permissions
    usersTable.grantReadWriteData(lambdaRole);
    entitiesTable.grantReadWriteData(lambdaRole);
    portfoliosTable.grantReadWriteData(lambdaRole);
    transactionsTable.grantReadWriteData(lambdaRole);
    postsTable.grantReadWriteData(lambdaRole);
    commentsTable.grantReadWriteData(lambdaRole);
    followsTable.grantReadWriteData(lambdaRole);
    likesTable.grantReadWriteData(lambdaRole);
    watchlistsTable.grantReadWriteData(lambdaRole);
    newsArticlesTable.grantReadWriteData(lambdaRole);
    priceHistoryTable.grantReadWriteData(lambdaRole);
    blocksTable.grantReadWriteData(lambdaRole);
    reportsTable.grantReadWriteData(lambdaRole);
    assetsBucket.grantReadWrite(lambdaRole);
    userPool.grant(lambdaRole, 'cognito-idp:AdminCreateUser', 'cognito-idp:AdminGetUser', 'cognito-idp:AdminDeleteUser');

    // Single Lambda function that handles all API requests
    // The handler routes to appropriate functions based on the path
    const apiLambda = new lambda.Function(this, 'ApiLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'src/index.handler',
      code: lambda.Code.fromAsset('bundle'),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(30),
      environment: {
        USERS_TABLE: usersTable.tableName,
        ENTITIES_TABLE: entitiesTable.tableName,
        PORTFOLIOS_TABLE: portfoliosTable.tableName,
        TRANSACTIONS_TABLE: transactionsTable.tableName,
        POSTS_TABLE: postsTable.tableName,
        COMMENTS_TABLE: commentsTable.tableName,
        FOLLOWS_TABLE: followsTable.tableName,
        LIKES_TABLE: likesTable.tableName,
        WATCHLISTS_TABLE: watchlistsTable.tableName,
        NEWS_ARTICLES_TABLE: newsArticlesTable.tableName,
        PRICE_HISTORY_TABLE: priceHistoryTable.tableName,
        BLOCKS_TABLE: blocksTable.tableName,
        REPORTS_TABLE: reportsTable.tableName,
        COGNITO_USER_POOL_ID: userPool.userPoolId,
        COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
        S3_BUCKET_NAME: assetsBucket.bucketName,
        DYNAMODB_TABLE_PREFIX: tablePrefix,
        NEWS_API_KEY: process.env.NEWS_API_KEY || '', // Set via: export NEWS_API_KEY=your-key before deploy
        JWT_SECRET: process.env.JWT_SECRET!, // REQUIRED: Set via export JWT_SECRET=$(openssl rand -hex 32) before deploy
      },
    });

    // Lambda function for price updates
    const priceUpdateHandler = new lambda.Function(this, 'PriceUpdateHandler', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'src/handlers/priceUpdates.updatePrices',
      code: lambda.Code.fromAsset('bundle'),
      role: lambdaRole,
      environment: {
        ENTITIES_TABLE: entitiesTable.tableName,
        PRICE_HISTORY_TABLE: priceHistoryTable.tableName,
        DYNAMODB_TABLE_PREFIX: tablePrefix,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // EventBridge rule to trigger price updates every 5 minutes
    const priceUpdateRule = new events.Rule(this, 'PriceUpdateRule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(5)),
      description: 'Updates entity prices every 5 minutes',
    });

    priceUpdateRule.addTarget(new targets.LambdaFunction(priceUpdateHandler));

    // API Gateway
    const api = new apigateway.RestApi(this, 'MoroApi', {
      restApiName: `${tablePrefix}-api`,
      description: 'Moro App API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization'],
      },
    });

    // Create API Gateway routes - use proxy integration to route all requests to single Lambda
    const apiResource = api.root.addResource('api');
    const proxyResource = apiResource.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(apiLambda),
      anyMethod: true,
    });

    // Also add root-level proxy for direct API calls
    const rootProxy = api.root.addProxy({
      defaultIntegration: new apigateway.LambdaIntegration(apiLambda),
      anyMethod: true,
    });

    // Note: RestApi automatically creates a 'prod' stage via deployOptions
    // No need to create explicit Deployment and Stage

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      exportName: `${tablePrefix}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      exportName: `${tablePrefix}-UserPoolClientId`,
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      exportName: `${tablePrefix}-ApiUrl`,
      description: 'API Gateway URL - use this in EXPO_PUBLIC_API_URL',
    });

    new cdk.CfnOutput(this, 'AssetsBucketName', {
      value: assetsBucket.bucketName,
      exportName: `${tablePrefix}-AssetsBucketName`,
    });
  }
}

