import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import { RemovalPolicy } from "@aws-cdk/core";

export class EventsDdbStack extends cdk.Stack {
    readonly table: dynamodb.Table;
    
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        this.table = new dynamodb.Table(this, "EventsDdb", {
            tableName: "events",
            removalPolicy: RemovalPolicy.DESTROY,
            partitionKey: {
                name: "pk",
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: "sk",
                type: dynamodb.AttributeType.STRING,
            },
            timeToLiveAttribute: "ttl",
            billingMode: dynamodb.BillingMode.PROVISIONED,
            readCapacity: 1,
            writeCapacity: 1,
        });
    }
}