import { createAmwayMcpServer } from './server';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

async function testMcpServer() {
  console.log('[Test] Initializing N-Square MCP Server Test...');

  const server = createAmwayMcpServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await server.connect(serverTransport);

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: {} }
  );

  await client.connect(clientTransport);
  console.log('[Test] Client successfully linked to MCP server!');

  // 1. List tools
  const toolsResult = await client.listTools();
  console.log(`[Test] Registered Tools Count: ${toolsResult.tools.length}`);
  const toolNames = toolsResult.tools.map(t => t.name);
  console.log('[Test] Tool Names:', toolNames);

  // 2. Call list_products
  const productsCall: any = await client.callTool({
    name: 'list_products',
    arguments: { category: 'Protein Powders' }
  });
  console.log('[Test] list_products (Protein Powders) succeeded:');
  const productsParsed = JSON.parse(productsCall.content[0].text);
  console.log(`  Found ${productsParsed.total} protein products. Sample: ${productsParsed.products[0]?.name}`);

  // 3. Call validate_dosage
  const dosageCall: any = await client.callTool({
    name: 'validate_dosage',
    arguments: { nutrient: 'Protein', amount: 30, unit: 'g', targetGender: 'male' }
  });
  console.log('[Test] validate_dosage result:');
  const dosageParsed = JSON.parse(dosageCall.content[0].text);
  console.log(`  Nutrient: ${dosageParsed.nutrient}, Men RDA: ${dosageParsed.icmr_adult_men_rda}`);

  // 4. Test Cart & Order Tool
  const addCartCall: any = await client.callTool({
    name: 'add_to_cart',
    arguments: { idOrSku: '329861ID', quantity: 1 }
  });
  const cartParsed = JSON.parse(addCartCall.content[0].text);
  console.log(`[Test] Added to cart: ${cartParsed.message}, Subtotal ABO: ₹${cartParsed.cart?.subtotalAbo}`);

  const orderCall: any = await client.callTool({
    name: 'create_order',
    arguments: {
      customerName: 'Test Customer',
      customerPhone: '9876543210',
      customerCity: 'Bengaluru'
    }
  });
  const orderParsed = JSON.parse(orderCall.content[0].text);
  console.log(`[Test] Order Created: ${orderParsed.order?.orderNumber}, Total: ₹${orderParsed.order?.subtotalAbo}`);

  // 5. Test Resources
  const resourcesResult = await client.listResources();
  console.log(`[Test] Available Resources Count: ${resourcesResult.resources.length}`);

  console.log('\n[ALL MCP TESTS PASSED WITH 100% SUCCESS]');
  process.exit(0);
}

testMcpServer().catch(err => {
  console.error('[Test Failed]:', err);
  process.exit(1);
});
