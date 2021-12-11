const AWS = require("aws-sdk");
const AWSXRay = require("aws-xray-sdk-core");
const uuid = require("uuid");
const xRay = AWSXRay.captureAWS(require("aws-sdk"));
const productsDdb = process.env.PRODUCTS_DDB;
const ordersDdb = process.env.ORDERS_DDB;
const awsRegion = process.env.AWS_REGION;
AWS.config.update({
    region: awsRegion,
});
const ddbClient = new AWS.DynamoDB.DocumentClient();
exports.handler = async function (event, context) {
    const method = event.httpMethod;
    console.log(event);
    const apiRequestId = event.requestContext.requestId;
    const lambdaRequestId = context.awsRequestId;
    console.log(
        `API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`
    );
    if (event.resource === "/orders") {
        if (method === "GET") {
            if (event.queryStringParameters) {
                if (event.queryStringParameters.email) {
                    if (event.queryStringParameters.orderId) {
                        console.log('Get all order')
                        const data = await getOrder(
                            event.queryStringParameters.email,
                            event.queryStringParameters.orderId
                        );
                        if (data.Item) {
                            return {
                                statusCode: 200,
                                body: JSON.stringify(convertToOrderResponse(data.Item)),
                            };
                        } else {
                            return {
                                statusCode: 404,
                                body: JSON.stringify(`Order not found`),
                            };
                        }

                        //Get one order from an user
                    } else {
                        //Get all orders from an user
                        const data = await getOrdersByEmail(
                            event.queryStringParameters.email
                        );
                        return {
                            body: JSON.stringify(data.Items.map(convertToOrderResponse)),
                        };
                    }
                }
            } else {
                //Get all orders
                const data = await getAllOrders();
                return {
                    body: JSON.stringify(data.Items.map(convertToOrderResponse)),
                };
            }
        } else if (method === "POST") {
            //Create an order
            console.log('Create an order')
            const orderRequest = JSON.parse(event.body);
            const result = await fetchProducts(orderRequest);
            if (result.Responses.products.length == orderRequest.productIds.length) {
                const products = [];
                result.Responses.products.forEach((product) => {
                    console.log(product);
                    products.push(product);
                });
                const orderCreated = await createOrder(orderRequest, products);
                console.log(orderCreated);
                return {
                    statusCode: 201,
                    body: JSON.stringify(convertToOrderResponse(orderCreated)),
                };
            } else {
                return {
                    statusCode: 404,
                    body: "Some product was not found",
                };
            }

        } else if (method === "DELETE") {

            //Delete an order
            const data = await getOrder(
                event.queryStringParameters.email,
                event.queryStringParameters.orderId
            );
            await deleteOrder(
                event.queryStringParameters.email,
                event.queryStringParameters.orderId
            );
            if (data.Item) {
                return {
                    statusCode: 200,
                    body: JSON.stringify(convertToOrderResponse(data.Item)),
                };
            } else {
                return {
                    statusCode: 404,
                    body: JSON.stringify(`Order not found`),
                };
            }


        }
    }

    return {
        statusCode: 404,
        body: JSON.stringify(`Bad request`),
    };
};

function getAllOrders() {
    return ddbClient
        .scan({
            TableName: ordersDdb,
        })
        .promise();
}

function getOrdersByEmail(email) {
    const params = {
        TableName: ordersDdb,
        KeyConditionExpression: "pk = :email",
        ExpressionAttributeValues: {
            ":email": email,
        },
    };
    return ddbClient.query(params).promise();
}

function getOrder(email, orderId) {
    return ddbClient
        .get({
            TableName: ordersDdb,
            Key: {
                pk: email,
                sk: orderId,
            },
        })
        .promise();
}
function deleteOrder(email, orderId) {
    return ddbClient
        .delete({
            TableName: ordersDdb,
            Key: {
                pk: email,
                sk: orderId,
            },
        })
        .promise();
}
function fetchProducts(orderRequest) {
    const keys = [];
    orderRequest.productIds.forEach((productId) => {
        keys.push({
            id: productId,
        });
    });
    const params = {
        RequestItems: {
            [productsDdb]: {
                Keys: keys,
            },
        },
    };
    return ddbClient.batchGet(params).promise();
}

async function createOrder(orderRequest, products) {
    const timestamp = Date.now();
    const orderProducts = [];
    let totalPrice = 0;
    products.forEach((product) => {
        totalPrice += product.price;
        orderProducts.push({
            code: product.code,
            price: product.price,
        });
    });
    const orderItem = {
        pk: orderRequest.email,
        sk: uuid.v4(),
        createdAt: timestamp,
        billing: {
            payment: orderRequest.payment,
            totalPrice: totalPrice,
        },
        shipping: {
            type: orderRequest.shipping.type,
            carrier: orderRequest.shipping.carrier,
        },
        products: orderProducts,
    };
    await ddbClient
        .put({
            TableName: ordersDdb,
            Item: orderItem,
        })
        .promise();
    return orderItem;
}

function convertToOrderResponse(order) {
    return {
        email: order.pk,
        id: order.sk,
        createdAt: order.createdAt,
        products: order.products,
        billing: {
            payment: order.billing.payment,
            totalPrice: order.billing.totalPrice,
        },
        shipping: {
            type: order.shipping.type,
            carrier: order.shipping.carrier,
        },
    };
}