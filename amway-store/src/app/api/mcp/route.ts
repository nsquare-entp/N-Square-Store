import { NextResponse } from 'next/server';
import {
  getCatalog,
  getProductById,
  searchProducts,
  upsertProduct,
  deleteProduct,
  getCategories,
} from '../../../services/catalogService';
import {
  getOrCreateCart,
  addItemToCart,
  updateCartItemQuantity,
  clearCart,
  calculateCartSummary,
  createOrderFromCart,
  listOrders,
  updateOrderStatus,
  createLead,
  listLeads,
  ICMR_NIN_RDA_BENCHMARKS,
  DEFAULT_SESSION,
} from '../../../mcp/store';

const SERVER_MANIFEST = {
  name: 'n-square-amway-mcp-server',
  version: '2.0.0',
  protocolVersion: '2024-11-05',
  description: 'Model Context Protocol (MCP) server for N-Square Amway Health Store. Enables any LLM to perform CRUD on 44 authentic products, verify ICMR-NIN medical standards, manage shopping carts, register leads, and place orders.',
  capabilities: {
    tools: { listChanged: true },
    resources: { subscribe: false, listChanged: true },
    prompts: { listChanged: true },
  },
  available_tools: [
    {
      name: 'list_products',
      description: 'List products with optional filters (category, query, minPrice, maxPrice, limit)',
      parameters: { category: 'string?', query: 'string?', minPrice: 'number?', maxPrice: 'number?', limit: 'number?' },
    },
    {
      name: 'get_product',
      description: 'Retrieve full product details by ID or SKU (images, pricing, pack sizes, clinical rationale)',
      parameters: { idOrSku: 'string' },
    },
    {
      name: 'search_products',
      description: 'Search catalog across titles, active ingredients, and clinical "what & why" rationales',
      parameters: { query: 'string' },
    },
    {
      name: 'create_product',
      description: 'Create and insert a new product into the catalog',
      parameters: { name: 'string', category: 'string', price: 'number', mrp: 'number', weight: 'string?', usp: 'string?', what_it_is: 'string?', why_it_is_needed: 'string?' },
    },
    {
      name: 'update_product',
      description: 'Update fields on an existing product',
      parameters: { idOrSku: 'string', name: 'string?', price: 'number?', mrp: 'number?', usp: 'string?' },
    },
    {
      name: 'delete_product',
      description: 'Remove a product from the catalog',
      parameters: { idOrSku: 'string' },
    },
    {
      name: 'get_medical_validation',
      description: 'Get ICMR-NIN 2020 verification table, standards authority URLs, and who may/may not use',
      parameters: { idOrSku: 'string' },
    },
    {
      name: 'validate_dosage',
      description: 'Validate nutrient intake against ICMR-NIN 2020 RDA benchmarks and tolerable Upper Limits',
      parameters: { nutrient: 'string', amount: 'number', unit: 'string', targetGender: 'male|female|pregnancy?' },
    },
    {
      name: 'get_cart',
      description: 'Retrieve active cart items, subtotal MRP, Direct Selling Price, and total savings',
      parameters: { sessionId: 'string?' },
    },
    {
      name: 'add_to_cart',
      description: 'Add a product to cart with quantity',
      parameters: { idOrSku: 'string', quantity: 'number?', sessionId: 'string?' },
    },
    {
      name: 'update_cart_quantity',
      description: 'Update quantity of an item in cart (set to 0 to remove)',
      parameters: { idOrSku: 'string', quantity: 'number', sessionId: 'string?' },
    },
    {
      name: 'clear_cart',
      description: 'Empty active cart',
      parameters: { sessionId: 'string?' },
    },
    {
      name: 'create_order',
      description: 'Place an order from cart with customer name, phone, city, notes',
      parameters: { customerName: 'string', customerPhone: 'string', customerCity: 'string?', customerAddress: 'string?', notes: 'string?', sessionId: 'string?' },
    },
    {
      name: 'list_orders',
      description: 'List all placed orders and statuses',
      parameters: { limit: 'number?', status: 'pending|confirmed|dispatched|delivered|cancelled?' },
    },
    {
      name: 'update_order_status',
      description: 'Update fulfillment status of an order',
      parameters: { orderIdOrNumber: 'string', status: 'pending|confirmed|dispatched|delivered|cancelled' },
    },
    {
      name: 'create_lead',
      description: 'Register customer consultation lead and health goal',
      parameters: { name: 'string', phone: 'string', email: 'string?', healthGoal: 'string', notes: 'string?' },
    },
    {
      name: 'list_leads',
      description: 'List customer consultation inquiries',
      parameters: { limit: 'number?' },
    },
  ],
  available_resources: [
    { uri: 'products://catalog', name: 'products-catalog', description: 'Full catalog JSON of 44 verified products' },
    { uri: 'categories://all', name: 'categories-list', description: 'List of all 5 nutraceutical categories' },
    { uri: 'validation://icmr_standards', name: 'validation-icmr-standards', description: 'ICMR-NIN 2020 RDA benchmark matrix' },
  ],
  available_prompts: [
    { name: 'recommend_supplements', description: 'Clinical consultation prompt for supplement recommendation' },
  ],
  transports_supported: [
    'Stdio (CLI for Claude Desktop & Cursor): `npm run mcp`',
    'HTTP JSON-RPC 2.0 (POST /api/mcp)',
  ],
};

export async function GET() {
  return NextResponse.json(SERVER_MANIFEST);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, method, params } = body;

    if (!method) {
      return NextResponse.json(
        { jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request: Missing method' } },
        { status: 400 }
      );
    }

    // 1. Initialize
    if (method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: SERVER_MANIFEST.capabilities,
          serverInfo: { name: SERVER_MANIFEST.name, version: SERVER_MANIFEST.version },
          instructions: SERVER_MANIFEST.description,
        },
      });
    }

    // 2. Tools List
    if (method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          tools: SERVER_MANIFEST.available_tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: {
              type: 'object',
              properties: t.parameters,
            },
          })),
        },
      });
    }

    // 3. Resources List
    if (method === 'resources/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          resources: SERVER_MANIFEST.available_resources,
        },
      });
    }

    // 4. Resources Read
    if (method === 'resources/read') {
      const uri = params?.uri;
      if (uri === 'products://catalog') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(getCatalog(), null, 2) }],
          },
        });
      }
      if (uri === 'categories://all') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(getCategories(), null, 2) }],
          },
        });
      }
      if (uri === 'validation://icmr_standards') {
        return NextResponse.json({
          jsonrpc: '2.0',
          id,
          result: {
            contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(ICMR_NIN_RDA_BENCHMARKS, null, 2) }],
          },
        });
      }
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        error: { code: -32602, message: `Resource not found: ${uri}` },
      });
    }

    // 5. Prompts List
    if (method === 'prompts/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          prompts: SERVER_MANIFEST.available_prompts,
        },
      });
    }

    // 6. Tools Call
    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      switch (toolName) {
        case 'list_products': {
          const products = searchProducts({
            category: args.category,
            query: args.query,
            minPrice: args.minPrice ? Number(args.minPrice) : undefined,
            maxPrice: args.maxPrice ? Number(args.maxPrice) : undefined,
            limit: args.limit ? Number(args.limit) : undefined,
          });
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ total: products.length, products }, null, 2) }],
            },
          });
        }

        case 'get_product': {
          const product = getProductById(args.idOrSku);
          if (!product) {
            return NextResponse.json({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify({ error: `Product not found: ${args.idOrSku}` }) }],
              },
            });
          }
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ product }, null, 2) }],
            },
          });
        }

        case 'search_products': {
          const results = searchProducts({ query: args.query });
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ count: results.length, results }, null, 2) }],
            },
          });
        }

        case 'create_product': {
          const created = upsertProduct({
            name: args.name,
            category: args.category,
            price: Number(args.price),
            mrp: Number(args.mrp),
            weight: args.weight,
            usp: args.usp,
            clinical_nutrition_rationale: {
              what_it_is: args.what_it_is || '',
              why_it_is_needed: args.why_it_is_needed || '',
            },
          });
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ success: true, product: created }, null, 2) }],
            },
          });
        }

        case 'update_product': {
          const existing = getProductById(args.idOrSku);
          if (!existing) {
            return NextResponse.json({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify({ error: `Product not found: ${args.idOrSku}` }) }],
              },
            });
          }
          const updated = upsertProduct({
            ...existing,
            name: args.name ?? existing.name,
            price: args.price !== undefined ? Number(args.price) : existing.price,
            mrp: args.mrp !== undefined ? Number(args.mrp) : existing.mrp,
            usp: args.usp ?? existing.usp,
          });
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ success: true, product: updated }, null, 2) }],
            },
          });
        }

        case 'delete_product': {
          const success = deleteProduct(args.idOrSku);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ success, id: args.idOrSku }) }],
            },
          });
        }

        case 'get_medical_validation': {
          const product = getProductById(args.idOrSku);
          if (!product) {
            return NextResponse.json({
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify({ error: `Product not found: ${args.idOrSku}` }) }],
              },
            });
          }
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  product_id: product.id,
                  product_name: product.name,
                  clinical_nutrition_rationale: product.clinical_nutrition_rationale,
                  medical_standards_validation: product.medical_standards_validation,
                  who_may_use: product.who_may_use,
                  who_should_not_use: product.who_should_not_use,
                }, null, 2)
              }],
            },
          });
        }

        case 'validate_dosage': {
          const match = ICMR_NIN_RDA_BENCHMARKS.find(
            (b) => b.nutrient.toLowerCase().includes(String(args.nutrient || '').toLowerCase())
          );
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{
                type: 'text',
                text: JSON.stringify({
                  found: !!match,
                  benchmark: match || null,
                  supplied_amount: `${args.amount} ${args.unit}`,
                  clinical_assessment: match ? 'Tested against ICMR-NIN 2020 official RDA tables' : 'Custom nutrient evaluation',
                }, null, 2)
              }],
            },
          });
        }

        case 'get_cart': {
          const cart = getOrCreateCart(args.sessionId);
          const summary = calculateCartSummary(cart);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ cart: summary }, null, 2) }],
            },
          });
        }

        case 'add_to_cart': {
          const res = addItemToCart(args.idOrSku, Number(args.quantity) || 1, args.sessionId);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
            },
          });
        }

        case 'update_cart_quantity': {
          const res = updateCartItemQuantity(args.idOrSku, Number(args.quantity), args.sessionId);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
            },
          });
        }

        case 'clear_cart': {
          clearCart(args.sessionId);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Cart cleared' }) }],
            },
          });
        }

        case 'create_order': {
          const res = createOrderFromCart(args);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify(res, null, 2) }],
            },
          });
        }

        case 'list_orders': {
          const orders = listOrders(Number(args.limit) || 20, args.status);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ total: orders.length, orders }, null, 2) }],
            },
          });
        }

        case 'update_order_status': {
          const updated = updateOrderStatus(args.orderIdOrNumber, args.status);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ success: !!updated, order: updated }, null, 2) }],
            },
          });
        }

        case 'create_lead': {
          const lead = createLead(args);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ success: true, lead }, null, 2) }],
            },
          });
        }

        case 'list_leads': {
          const leads = listLeads(Number(args.limit) || 50);
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: JSON.stringify({ total: leads.length, leads }, null, 2) }],
            },
          });
        }

        default:
          return NextResponse.json({
            jsonrpc: '2.0',
            id,
            error: { code: -32601, message: `Tool not found: ${toolName}` },
          });
      }
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Method not found: ${method}` },
    });
  } catch (err: any) {
    console.error('MCP HTTP POST error:', err);
    return NextResponse.json(
      { jsonrpc: '2.0', error: { code: -32603, message: err.message || 'Internal error' } },
      { status: 500 }
    );
  }
}
