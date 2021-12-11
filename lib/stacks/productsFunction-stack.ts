//https://docs.aws.amazon.com/cdk/api/latest/docs/aws-construct-library.html
//https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-readme.html

import * as lambda from "@aws-cdk/aws-lambda";
//https://docs.aws.amazon.com/cdk/api/latest/docs/aws-lambda-nodejs-readme.html
import * as lambdaNodeJS from "@aws-cdk/aws-lambda-nodejs";
//https://docs.aws.amazon.com/cdk/api/latest/docs/core-readme.html
import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";

interface ProductsFunctionStackProps extends cdk.StackProps {
    productsDdb: dynamodb.Table
    eventsDdb: dynamodb.Table
}

export class ProductsFunctionStack extends cdk.Stack {
    readonly productsHandler: lambdaNodeJS.NodejsFunction;
    
    constructor(scope: cdk.Construct, id: string, props: ProductsFunctionStackProps) {
        super(scope, id, props);
        
        const productEventsHandler = new lambdaNodeJS.NodejsFunction(this, "ProductEventsFunction", {
            functionName: "ProductEventsFunction",
            entry: "lambda/products/productEventsFunction.js",
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
            props.eventsDdb.grantWriteData(productEventsHandler)
            
   

        this.productsHandler = new lambdaNodeJS.NodejsFunction(this, "ProductsFunction", {
            functionName: "ProductsFunction",
            entry: "lambda/products/productsFunction.js",
            handler: "handler",
            bundling: {
                minify: false,
                sourceMap: false,
            },
            tracing: lambda.Tracing.ACTIVE,
            insightsVersion: lambda.LambdaInsightsVersion.VERSION_1_0_98_0,
            memorySize: 128,
            timeout: cdk.Duration.seconds(30),
            environment: {
                PRODUCTS_DDB: props.productsDdb.tableName,
                PRODUCT_EVENTS_FUNCTION_NAME: productEventsHandler.functionName
                
            },

        });
        props.productsDdb.grantReadWriteData(this.productsHandler);
        productEventsHandler.grantInvoke(this.productsHandler)
 
    }
}