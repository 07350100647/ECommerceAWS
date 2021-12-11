// asset-input/lambda/products/productsFunction.js
var AWS = require("aws-sdk");
exports.handler = async function(event, context) {
  const method = event.httpMethod;
  console.log(event);
  const apiRequestId = event.requestContext.requestId;
  const lambdaRequestId = context.awsRequestId;
  console.log(`API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`);
  if (event.resource === "/products") {
    am;
    if (method === "GET") {
      console.log("GET /products");
      return {
        statusCode: 200,
        headers: {},
        body: JSON.stringify({
          message: "GET Products",
          ApiGwRequestId: apiRequestId,
          LambdaRequestId: lambdaRequestId
        })
      };
    }
  }
  return {
    statusCode: 400,
    headers: {},
    body: JSON.stringify({
      message: "Bad request",
      ApiGwRequestId: apiRequestId,
      LambdaRequestId: lambdaRequestId
    })
  };
};
