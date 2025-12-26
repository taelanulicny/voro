"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoroBackendStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const apigateway = __importStar(require("aws-cdk-lib/aws-apigateway"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const cognito = __importStar(require("aws-cdk-lib/aws-cognito"));
const s3 = __importStar(require("aws-cdk-lib/aws-s3"));
const events = __importStar(require("aws-cdk-lib/aws-events"));
const targets = __importStar(require("aws-cdk-lib/aws-events-targets"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
class MoroBackendStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const tablePrefix = this.node.tryGetContext('tablePrefix') || 'moro';
        // Cognito User Pool
        const userPool = new cognito.UserPool(this, 'MoroUserPool', {
            userPoolName: `${tablePrefix}-user-pool`,
            signInAliases: {
                email: true,
                username: true,
            },
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
                    allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
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
        // Lambda execution role
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
            handler: 'index.handler',
            code: lambda.Code.fromAsset('dist'),
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
                AWS_REGION: this.region,
                DYNAMODB_TABLE_PREFIX: tablePrefix,
            },
        });
        // Lambda function for price updates
        const priceUpdateHandler = new lambda.Function(this, 'PriceUpdateHandler', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handlers.priceUpdates.updatePrices',
            code: lambda.Code.fromAsset('dist'),
            role: lambdaRole,
            environment: {
                ENTITIES_TABLE: entitiesTable.tableName,
                PRICE_HISTORY_TABLE: priceHistoryTable.tableName,
                AWS_REGION: this.region,
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
        // Deploy API to stage
        const deployment = new apigateway.Deployment(this, 'ApiDeployment', {
            api,
        });
        const stage = new apigateway.Stage(this, 'ApiStage', {
            deployment,
            stageName: 'prod',
        });
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
            value: `${api.url}prod`,
            exportName: `${tablePrefix}-ApiUrl`,
            description: 'API Gateway URL - use this in EXPO_PUBLIC_API_URL',
        });
        new cdk.CfnOutput(this, 'AssetsBucketName', {
            value: assetsBucket.bucketName,
            exportName: `${tablePrefix}-AssetsBucketName`,
        });
    }
}
exports.MoroBackendStack = MoroBackendStack;
//# sourceMappingURL=stack.js.map