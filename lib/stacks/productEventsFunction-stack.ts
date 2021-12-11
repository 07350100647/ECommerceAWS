import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNodeJS from "@aws-cdk/aws-lambda-nodejs";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as cdk from "@aws-cdk/core";

interface ProductEventsFunctionStackProps extends cdk.StackProps {
    eventsDdb: dynamodb.Table
}

export class ProductEventsFunctionStack extends cdk.Stack {
    readonly handler: lambdaNodeJS.NodejsFunction;
    constructor(
        scope: cdk.Construct,
        id: string,
        props: ProductEventsFunctionStackProps
    ) {
        super(scope, id, props);
        this.handler = new lambdaNodeJS.NodejsFunction(
            this,
            "ProductEventsFunction",
            {
                functionName: "ProductEventsFunction",
                entry: "lambda/products/productEventsFunction.js",
                handler: "handler",
                bundling: {
                    minify: false,
                    sourceMap: false,
                },
                tracing: lambda.Tracing.ACTIVE,
                memorySize: 128,
                timeout: cdk.Duration.seconds(30),
                environment: {
                    EVENTS_DDB: props.eventsDdb.tableName,
                },
                insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_98_0,
            }
        );
        props.eventsDdb.grantWriteData(this.handler);
    }
}
