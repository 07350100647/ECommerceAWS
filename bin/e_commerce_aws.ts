#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ProductsFunctionStack } from '../lib/stacks/productsFunction-stack';
import { EcommerceApiStack } from '../lib/stacks/ECommerceApiStack/ecommerceApi-stack';
import { ProductsDdbStack } from '../lib/stacks/productsDdb-stack';
import { EventsDdbStack } from '../lib/stacks/eventsDdb-stack';
import { OrdersApplicationStack } from '../lib/stacks/orderApplication-stack';
const app = new cdk.App();
const environment = {
  region: "us-east-1",
  account: "796365253277"
}
const tags = {
  cost: "ECommerce",
  team: "Inatel"
}
const productsDdbStack = new ProductsDdbStack(app, "ProductsDdb", {
  env: environment,
  tags: tags,
})
const eventsDdbStack = new EventsDdbStack(app, "EventsDdb", {
  env: environment,
  tags: tags,
})
const productsFunctionStack = new ProductsFunctionStack(app, "ProductsFunction", {
  env: environment,
  tags: tags,
  productsDdb: productsDdbStack.table,
  eventsDdb: eventsDdbStack.table
})
productsFunctionStack.addDependency(productsDdbStack)
productsFunctionStack.addDependency(eventsDdbStack)

const ordersApplicationStack = new OrdersApplicationStack(app, "OrdersApplication", {
  productsDdb: productsDdbStack.table,
  eventsDdb: eventsDdbStack.table,
  env: environment,
  tags: tags,
})
ordersApplicationStack.addDependency(productsDdbStack)
ordersApplicationStack.addDependency(eventsDdbStack)

const eCommerceApiStack = new EcommerceApiStack(app, "ECommerceApi", {
  productsHandler: productsFunctionStack.productsHandler,
  ordersHandler: ordersApplicationStack.ordersHandler,
  env: environment,
  tags: tags
})
eCommerceApiStack.addDependency(productsFunctionStack)
eCommerceApiStack.addDependency(ordersApplicationStack)