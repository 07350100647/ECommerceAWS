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
    const promises = [];
    event.Records.forEach((record) => {
        promises.push(createEvent(record.Sns))
    })
    await Promise.all(promises);
    return {}
}

function createEvent(body) {
    const envelope = JSON.parse(body.Message);
    const event = JSON.parse(envelope.data);
    
    console.log(`Creating order event - MessageId: ${body.MessageId}`);
    
    const timestamp = Date.now();
    const ttl = ~~(timestamp / 1000 + 60 * 60); //60 minutes ahead, in seconds
    return ddbClient
        .put({
            TableName: eventsDdb,
            Item: {
                pk: `#order_${event.orderId}`,
                sk: `${envelope.eventType}#${timestamp}`, //ORDER_UPDATED#123456
                ttl: ttl,
                email: event.email,
                createdAt: timestamp,
                requestId: event.requestId,
                eventType: envelope.eventType,
                info: {
                    orderId: event.orderId,
                    productCodes: event.productCodes,
                    messageId: body.MessageId,
                }
            },
        })
        .promise();
}
