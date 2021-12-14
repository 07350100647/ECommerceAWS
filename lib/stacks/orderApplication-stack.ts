import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJS from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as sns from "@aws-cdk/aws-sns";
import * as subs from "@aws-cdk/aws-sns-subscriptions";
import * as iam from "@aws-cdk/aws-iam"

interface OrdersApplicationStackProps extends cdk.StackProps {
    productsDdb: dynamodb.Table,
    eventsDdb: dynamodb.Table
}
export class OrdersApplicationStack extends cdk.Stack {

    readonly ordersHandler: lambdaNodeJS.NodejsFunction

    constructor(scope: cdk.Construct, id: string, props: OrdersApplicationStackProps) {
        super(scope, id, props);
        const ordersDdb = new dynamodb.Table(this, "OrdersDdb", {
            tableName: "orders",
            partitionKey: {
                name: "pk",
                type: dynamodb.AttributeType.STRING
            },
            sortKey: {
                name: "sk",
                type: dynamodb.AttributeType.STRING
            },
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1
        })
        const ordersTopic = new sns.Topic(this, "OrderEventsTopic", {
            displayName: "Order events topic",
            topicName: "order-events",
        });

    
        this.ordersHandler = new lambdaNodeJS.NodejsFunction(this, "OrdersFunction", {
            functionName: "OrdersFunction",
            entry: "lambda/products/ordersFunction.js",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(30),
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_98_0,
            environment: {
                PRODUCTS_DDB: props.productsDdb.tableName,
                ORDERS_DDB: ordersDdb.tableName,
                ORDER_EVENTS_TOPIC_ARN: ordersTopic.topicArn

            },
            bundling: {
                minify: false,
                sourceMap: false
            }
        })

        ordersDdb.grantReadWriteData(this.ordersHandler)
        props.productsDdb.grantReadData(this.ordersHandler)
        ordersTopic.grantPublish(this.ordersHandler)


        const orderEventsHandler = new lambdaNodeJS.NodejsFunction(this, "orderEventsFunction", {
            functionName: "OrderEventsFunction",
            entry: "lambda/products/orderEventsFunction.js",
            handler: "handler",
            memorySize: 128,
            timeout: cdk.Duration.seconds(30),
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_98_0,
            environment: {
                EVENTS_DDB: props.eventsDdb.tableName
            },
            bundling: {
                minify: false,
                sourceMap: false
            }
        })
        
        const eventsDdbPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:PutItem'],
            resources: [props.eventsDdb.tableArn],
            //pk: "#order_*"
            conditions: {
                ['ForAllValues:StringLike']:{
                    'dynamodb:LeadingKeys': ['#order_*']
                }
            }
        })
        orderEventsHandler.addToRolePolicy(eventsDdbPolicy)
        ordersTopic.addSubscription(new subs.LambdaSubscription(orderEventsHandler)) 


    }
}