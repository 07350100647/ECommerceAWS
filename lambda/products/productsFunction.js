const AWSXRay = require("aws-xray-sdk-core");
const xRay = AWSXRay.captureAWS(require("aws-sdk"));
const AWS = require("aws-sdk");
const uuid = require("uuid");
const { JsonSchemaType } = require("@aws-cdk/aws-apigateway");

const productsDdb = process.env.PRODUCTS_DDB;
const productEventsFunctionName = process.env.PRODUCT_EVENTS_FUNCTION_NAME;
const awsRegion = process.env.AWS_REGION;

AWS.config.update({
   region: awsRegion,
});

const ddbClient = new AWS.DynamoDB.DocumentClient();
const lamdbdaClient =new AWS.Lambda();

exports.handler = async function (event, context) {
   const method = event.httpMethod;
   console.log(event);
   const apiRequestId = event.requestContext.requestId;
   const lambdaRequestId = context.awsRequestId;
   console.log(
      `API Gateway RequestId: ${apiRequestId} - Lambda RequestId: ${lambdaRequestId}`
   );
   if (event.resource === "/products") {
      if (method === "GET") {
         console.log("Get /products");
         const data = await getAllProducts();
         return {
            statusCode: 200,
            headers: {},
            body: JSON.stringify(data.Items),
         };
      } else if (method === "POST") {
         //POST /products
         console.log("Post /products");
         const product = JSON.parse(event.body);
         product.id = uuid.v4();
         await createProduct(product);
         const result = await createProductEvent(product, "PRODUCT_CREATED","josias@inatel.br",lambdaRequestId)
         console.log(result)
         return {
            statusCode: 201,
            body: JSON.stringify(product),
         };
      }
   } else if (event.resource === "/products/{id}") {
      const productId = event.pathParameters.id;
      if (method === "GET") {
         const data = await getProductById(productId);
         console.log(data);
         if (data.Item) {
            return {
               statusCode: 200,
               body: JSON.stringify(data.Item),
            };
         } else {
            return {
               statusCode: 404,
               body: JSON.stringify(`Product with ID ${productId} not found`),
            };
         }
      } else if (method === "PUT") {
         console.log("PUT {id}");
         const data = await getProductById(productId);
         if (data.Item) {
            const product = JSON.parse(event.body);
            await updateProduct(productId, product);
            const result = await createProductEvent(product, "PRODUCT_UPDATED","noa@inatel.br",lambdaRequestId);
            console.log(result);
           
            return {
               statusCode: 200,
               body: JSON.stringify(product),
            };
         } else {
            return {
               statusCode: 404,
               body: JSON.stringify(`Product with ID ${productId} not found`),
            };
         }
      } else if (method === 'DELETE') {
         // DELETE /products/{id}
         console.log("DELETE /products/{id}")
         //const data = await getProductById(productId)
         //if (data.Item) {
         const deleteResult = await deleteProduct(productId)
         if (deleteResult.Attributes) {
         await createProductEvent(deleteResult.Attributes, "PRODUCT_DELETED", 
         "clotilde@inatel.br", lambdaRequestId)
         return {
         statusCode: 200,
         body: JSON.stringify(deleteResult.Attributes)
         }
         } else {
         return {
         statusCode: 404,
         body: JSON.stringify(`Product not found with ID: ${productId}`)
         }
         }
         }
/*       else if (method === "DELETE") {
         console.log("DELETE {id}");
         const data = await getProductById(productId);
         if (data.Item) {
            
            await deleteProduct(productId);

            const result = await createProductEvent(date.item, "PRODUCT_DELETED","josias@inatel.br",lambdaRequestId);
            console.log(result);
            
            return {
               statusCode: 200,
               body: JSON.stringify(data.Item),
            };
         } else {
            return {
               statusCode: 404,
               body: JSON.stringify(`Product with ID ${productId} not found`),
            };
         }
      } */
   }
   return {
      statusCode: 400,
      headers: {},
      body: JSON.stringify("Bad request"),
   };
};

function createProductEvent(product, event, email, lambdaRequestId) {
   const params = {
   FunctionName: productEventsFunctionName,
   //InvocationType: "RequestResponse",
   InvocationType: "Event",
   Payload: JSON.stringify({
   productEvent: {
   requestId: lambdaRequestId,
   eventType: event,
   productId: product.id,
   productCode: product.code,
   productPrice: product.price,
   email: email,
   },
   }),
   };
   return lamdbdaClient.invoke(params).promise();
}
  

function getAllProducts() {
   return ddbClient
      .scan({
         TableName: productsDdb,
      })
      .promise();
}
function getProductById(productId) {
   return ddbClient
      .get({
         TableName: productsDdb,
         Key: {
            id: productId,
         },
      })
      .promise();
}
function createProduct(product) {
   return ddbClient
      .put({
         TableName: productsDdb,
         Item: {
            id: product.id,
            productName: product.productName,
            code: product.code,
            price: product.price,
            model: product.model,
            productUrl: product.productUrl,
         },
      })
      .promise();
}
function updateProduct(productId, product) {
   return ddbClient
      .update({
         TableName: productsDdb,
         Key: {
            id: productId,
         },
         UpdateExpression: "set productName = :n, code = :c, price = :p, model = :m, productUrl = :u",
         ExpressionAttributeValues: {
            ":n": product.productName,
            ":c": product.code,
            ":p": product.price,
            ":m": product.model,
            ":u": product.productUrl,
         },
         ReturnValues: "UPDATED_NEW",
      })
      .promise();
}

function deleteProduct(productId) {
   const params = {
   TableName: productsDdb,
   Key: {
   id: productId
   },
   ReturnValues: "ALL_OLD"
   }
   return ddbClient.delete(params).promise()
  }
/* function deleteProduct(productId) {
   return ddbClient
      .delete({
         TableName: productsDdb,
         Key: {
            id: productId,
         },
      })
      .promise();
} */