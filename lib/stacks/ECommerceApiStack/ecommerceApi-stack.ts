import * as cdk from "@aws-cdk/core";
import * as lambdaNodeJS from "@aws-cdk/aws-lambda-nodejs";
import * as apigateway from "@aws-cdk/aws-apigateway"
interface EcommerceApiStackProps extends cdk.StackProps {
   productsHandler: lambdaNodeJS.NodejsFunction,
   ordersHandler: lambdaNodeJS.NodejsFunction
}
export class EcommerceApiStack extends cdk.Stack {
   constructor(scope: cdk.Construct, id: string, props: EcommerceApiStackProps) {
      super(scope, id, props);
      const api = new apigateway.RestApi(this, "ECommerceApi", {
         restApiName: "ECommerceApi",
         description: "This is the ECommerce API service"
      })
      const productsFunctionIntegration = new apigateway.LambdaIntegration(props.productsHandler)
      // /products
      const productsResource = api.root.addResource("products")
      // GET /products
      productsResource.addMethod("GET", productsFunctionIntegration)
      // POST /products

      const productRequestValidator = new apigateway.RequestValidator(this,
         "ProductRequestValidator", {
         restApi: api,
         requestValidatorName: `Product request validator`,
         validateRequestBody: true,
      })

      const productModel = new apigateway.Model(this, "ProductModel", {
         modelName: "ProductModel",
         restApi: api,
         contentType: "application/json",
         schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
               productName: {
                  type: apigateway.JsonSchemaType.STRING,
               },    
               code: {
                  type: apigateway.JsonSchemaType.STRING,                  
               }
            },
            required: [
               "productName",
               "code"               
            ]
         }
      })

      productsResource.addMethod("POST", productsFunctionIntegration, {
         requestValidator: productRequestValidator,
         requestModels: { "application/json": productModel }
      })
      // /products/{id}
      const productByIdResource = productsResource.addResource("{id}")
      // GET /products/{id}
      productByIdResource.addMethod("GET", productsFunctionIntegration)
      // PUT /products/{id}

      
      productByIdResource.addMethod("PUT", productsFunctionIntegration, {
         requestValidator: productRequestValidator,
         requestModels: { "application/json": productModel }
      })
      // DELETE /products/{id}
      productByIdResource.addMethod("DELETE", productsFunctionIntegration)
      const ordersFunctionIntegration = new apigateway.LambdaIntegration(props.ordersHandler)
      // resource - /orders
      const ordersResource = api.root.addResource("orders")
      //GET /orders
      //GET /orders?email=matilde@inatel.br
      //GET /orders?email=matilde@inatel.br&orderId=123-456
      ordersResource.addMethod("GET", ordersFunctionIntegration)
      //DELETE /orders?email=matilde@inatel.br&orderId=123-456
      ordersResource.addMethod("DELETE", ordersFunctionIntegration, {
         requestParameters: {
            'method.request.querystring.email': true,
            'method.request.querystring.orderId': true,
         },
         requestValidatorOptions: {
            requestValidatorName: "Email and OrderId parameters validator",
            validateRequestParameters: true
         }
      });



      const orderRequestValidator = new apigateway.RequestValidator(this,
         "OrderRequestValidator", {
         restApi: api,
         requestValidatorName: `Order request validator`,
         validateRequestBody: true,
      })

      const orderModel = new apigateway.Model(this, "OrderModel", {
         modelName: "OrderModel",
         restApi: api,
         contentType: "application/json",
         schema: {
            type: apigateway.JsonSchemaType.OBJECT,
            properties: {
               email: {
                  type: apigateway.JsonSchemaType.STRING
               },
               productIds: {
                  type: apigateway.JsonSchemaType.ARRAY,
                  minItems: 1,
                  items: {
                     type: apigateway.JsonSchemaType.STRING
                  }
               },
               payment: {
                  type: apigateway.JsonSchemaType.STRING,
                  enum: ["CASH", "DEBIT_CARD", "CREDIT_CARD"]
               }
            },
            required: [
               "email",
               "productIds",
               "payment"
            ]
         }
      })
      //POST /orders
      ordersResource.addMethod("POST", ordersFunctionIntegration, {
         requestValidator: orderRequestValidator,
         requestModels: { "application/json": orderModel }
      });
   }
}