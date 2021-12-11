const AWS = require("aws-sdk");
const AWSXRay = require("aws-xray-sdk-core");
const xRay = AWSXRay.captureAWS(require("aws-sdk"));
const awsRegion = process.env.AWS_REGION;
const eventsDdb = process.env.EVENTS_DDB;

AWS.config.update({
    region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async function (event, context) {
    console.log(event);
    await createEvent(event.productEvent);
    context.succeed(
        JSON.stringify({
            invoiceEventCreated: true,
            message: "OK",
        })
    );
};

function createEvent(productEvent) {
    const timestamp = Date.now();
    const ttl = ~~(timestamp / 1000 + 5 * 60); //5 minutes ahead, in seconds
    return ddbClient
        .put({
            TableName: eventsDdb,
            Item: {
                pk: `#product_${productEvent.productCode}`,
                sk: `${productEvent.eventType}#${timestamp}`, //PRODUCT_UPDATED#123456
                ttl: ttl,
                email: productEvent.email,
                createdAt: timestamp,
                requestId: productEvent.requestId,
                eventType: productEvent.eventType,
                info: {
                    productId: productEvent.productId,
                    price: productEvent.productPrice
                }
            },
        })
        .promise();
}