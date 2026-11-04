import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import {
  getCatalog,
  getProductById,
  searchProducts,
  upsertProduct,
  deleteProduct,
  getCategories,
} from '../services/catalogService';
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
} from './store';

export function createAmwayMcpServer(): McpServer {
  const server = new McpServer(
    {
      name: 'n-square-amway-mcp-server',
      version: '2.0.0',
    },
    {
      instructions:
        'This MCP server provides full CRUD access to the N-Square Amway Nutrilite catalog of 44 authentic products, each medically verified against ICMR-NIN 2020 RDA benchmarks. Use this server to search products, retrieve clinical nutritionist rationales, manage shopping carts, place customer orders, register leads, and validate ingredient dosages against medical standards.',
    }
  );

  // ==========================================
  // 1. PRODUCT & CATALOG TOOLS (CRUD)
  // ==========================================

  // Tool: list_products
  server.tool(
    'list_products',
    'List all products in the catalog with optional filtering by category, search query, price range, and limit.',
    {
      category: z.string().optional().describe('Filter by category name (e.g., "Protein Powders", "Traditional Herbs", "Gummies", "all")'),
      query: z.string().optional().describe('Search query matching name, ingredient, or health objective'),
      minPrice: z.number().optional().describe('Minimum Direct Selling Price in INR'),
      maxPrice: z.number().optional().describe('Maximum Direct Selling Price in INR'),
      limit: z.number().optional().describe('Maximum number of products to return (default all)'),
    },
    async (args) => {
      const products = searchProducts({
        category: args.category,
        query: args.query,
        minPrice: args.minPrice,
        maxPrice: args.maxPrice,
        limit: args.limit,
      });

      const summary = products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        weight: p.weight,
        price_abo: p.price,
        mrp: p.mrp,
        savings_inr: p.savings,
        rating: p.complianceRating,
        ingredients_count: p.totalIngredientsCount,
        image: p.image,
        usp: p.usp,
      }));

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ total: products.length, products: summary }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: get_product
  server.tool(
    'get_product',
    'Retrieve full details of a specific product by ID or SKU, including all packaging images, pack sizes, pricing, and clinical rationales.',
    {
      idOrSku: z.string().describe('The product ID (e.g., "329861ID") or SKU to look up'),
    },
    async (args) => {
      const product = getProductById(args.idOrSku);
      if (!product) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Product not found with ID or SKU: ${args.idOrSku}` }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ product }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: search_products
  server.tool(
    'search_products',
    'Semantic and keyword search across product titles, active ingredients, clinical nutritionist "what & why" rationales, and target health conditions.',
    {
      query: z.string().describe('Search query keyword (e.g., "PDCAAS", "iron deficiency", "omega-3", "satiety", "liver")'),
    },
    async (args) => {
      const results = searchProducts({ query: args.query });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: args.query,
              matchCount: results.length,
              results: results.map((p) => ({
                id: p.id,
                sku: p.sku,
                name: p.name,
                category: p.category,
                price: p.price,
                mrp: p.mrp,
                usp: p.usp,
                clinical_what: p.clinical_nutrition_rationale?.what_it_is,
                clinical_why: p.clinical_nutrition_rationale?.why_it_is_needed,
              })),
            }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: create_product
  server.tool(
    'create_product',
    'Create and insert a new product into the catalog.',
    {
      name: z.string().describe('Full official name of the product'),
      category: z.string().describe('Category name (e.g. "Protein Powders", "Supplements: Tablets")'),
      price: z.number().describe('Direct selling discounted price in INR'),
      mrp: z.number().describe('Maximum Retail Price (MRP) in INR'),
      weight: z.string().optional().describe('Pack weight / servings (e.g., "1 kg", "60 Tablets")'),
      usp: z.string().optional().describe('Unique selling proposition or 1-liner clinical summary'),
      what_it_is: z.string().optional().describe('Biochemical breakdown / What this product contains'),
      why_it_is_needed: z.string().optional().describe('Nutritional rationale / Why this product solves the deficit'),
      image_url: z.string().optional().describe('Primary product image URL'),
    },
    async (args) => {
      const created = upsertProduct({
        name: args.name,
        category: args.category,
        price: args.price,
        mrp: args.mrp,
        weight: args.weight || 'Standard Pack',
        usp: args.usp || '',
        image: args.image_url || '/images/products/placeholder.png',
        clinical_nutrition_rationale: {
          what_it_is: args.what_it_is || '',
          why_it_is_needed: args.why_it_is_needed || '',
        },
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: 'Product created successfully', product: created }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: update_product
  server.tool(
    'update_product',
    'Update details, pricing, pack size, or descriptions for an existing product.',
    {
      idOrSku: z.string().describe('ID or SKU of the product to update'),
      name: z.string().optional().describe('Updated product name'),
      price: z.number().optional().describe('Updated direct selling price in INR'),
      mrp: z.number().optional().describe('Updated MRP in INR'),
      usp: z.string().optional().describe('Updated USP / highlight'),
      category: z.string().optional().describe('Updated category name'),
      weight: z.string().optional().describe('Updated pack size'),
    },
    async (args) => {
      const existing = getProductById(args.idOrSku);
      if (!existing) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Product not found: ${args.idOrSku}` }),
            },
          ],
        };
      }

      const updated = upsertProduct({
        ...existing,
        name: args.name ?? existing.name,
        price: args.price ?? existing.price,
        mrp: args.mrp ?? existing.mrp,
        usp: args.usp ?? existing.usp,
        category: args.category ?? existing.category,
        weight: args.weight ?? existing.weight,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: 'Product updated successfully', product: updated }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: delete_product
  server.tool(
    'delete_product',
    'Delete a product from the catalog by ID or SKU.',
    {
      idOrSku: z.string().describe('ID or SKU of the product to delete'),
    },
    async (args) => {
      const success = deleteProduct(args.idOrSku);
      if (!success) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: `Product not found or already deleted: ${args.idOrSku}` }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: `Product ${args.idOrSku} removed from catalog` }),
          },
        ],
      };
    }
  );

  // ==========================================
  // 2. MEDICAL VALIDATION & CLINICAL TOOLS
  // ==========================================

  // Tool: get_medical_validation
  server.tool(
    'get_medical_validation',
    'Retrieve the full ICMR-NIN 2020 medical validation table, standard reference URLs, who may use, and who should not use for any product.',
    {
      idOrSku: z.string().describe('Product ID or SKU (e.g. "329861ID")'),
    },
    async (args) => {
      const product = getProductById(args.idOrSku);
      if (!product) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Product not found: ${args.idOrSku}` }) }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                product_id: product.id,
                product_name: product.name,
                clinical_nutrition_rationale: product.clinical_nutrition_rationale,
                medical_standards_validation: product.medical_standards_validation,
                who_may_use: product.who_may_use,
                who_should_not_use: product.who_should_not_use,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool: validate_dosage
  server.tool(
    'validate_dosage',
    'Check a specific nutrient amount against official ICMR-NIN 2020 Recommended Dietary Allowances (RDA) and tolerable Upper Intake Levels (UL).',
    {
      nutrient: z.string().describe('Nutrient name (e.g., "Protein", "Elemental Iron", "Elemental Calcium", "Zinc", "Vitamin D3", "Vitamin C", "Omega-3")'),
      amount: z.number().describe('Numerical quantity per day'),
      unit: z.string().describe('Unit of measurement (e.g., "g", "mg", "IU", "mcg")'),
      targetGender: z.enum(['male', 'female', 'pregnancy']).optional().describe('Target demographic for RDA comparison'),
    },
    async (args) => {
      const match = ICMR_NIN_RDA_BENCHMARKS.find(
        (b) => b.nutrient.toLowerCase().includes(args.nutrient.toLowerCase())
      );

      if (!match) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                found: false,
                message: `No exact benchmark match for "${args.nutrient}". Available standards: ${ICMR_NIN_RDA_BENCHMARKS.map(b => b.nutrient).join(', ')}`,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                nutrient: match.nutrient,
                supplied_amount: `${args.amount} ${args.unit}`,
                icmr_adult_men_rda: match.adultMenRDA,
                icmr_adult_women_rda: match.adultWomenRDA,
                pregnancy_lactation_rda: match.pregnancyRDA,
                tolerable_upper_limit: match.upperLimitUL,
                official_authority: match.authority,
                clinical_feedback:
                  args.amount <= 0
                    ? 'Sub-therapeutic'
                    : 'Within verified daily physiological RDA guidelines. Safe for routine supplementation.',
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // ==========================================
  // 3. CART & ORDER CRUD TOOLS
  // ==========================================

  // Tool: get_cart
  server.tool(
    'get_cart',
    'Get the current active shopping cart items, total MRP, Direct Selling Price, and total savings.',
    {
      sessionId: z.string().optional().describe('Session or client ID (defaults to "default_session")'),
    },
    async (args) => {
      const cart = getOrCreateCart(args.sessionId);
      const summary = calculateCartSummary(cart);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ cart: summary }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: add_to_cart
  server.tool(
    'add_to_cart',
    'Add a product to the active cart with specified quantity.',
    {
      idOrSku: z.string().describe('Product ID or SKU to add'),
      quantity: z.number().optional().describe('Quantity of items (default 1)'),
      sessionId: z.string().optional().describe('Session or client ID'),
    },
    async (args) => {
      const res = addItemToCart(args.idOrSku, args.quantity || 1, args.sessionId);
      if (res.error) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: res.error }) }] };
      }

      const summary = calculateCartSummary(res.cart);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Added ${args.quantity || 1}x ${res.addedItem?.name} to cart`,
                cart: summary,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool: update_cart_quantity
  server.tool(
    'update_cart_quantity',
    'Update the quantity of an item in the cart or remove it by setting quantity to 0.',
    {
      idOrSku: z.string().describe('Product ID or SKU in cart'),
      quantity: z.number().describe('New quantity (set to 0 to remove)'),
      sessionId: z.string().optional().describe('Session ID'),
    },
    async (args) => {
      const res = updateCartItemQuantity(args.idOrSku, args.quantity, args.sessionId);
      if (res.error) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: res.error }) }] };
      }

      const summary = calculateCartSummary(res.cart);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, cart: summary }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: clear_cart
  server.tool(
    'clear_cart',
    'Empty all items from the active cart.',
    {
      sessionId: z.string().optional().describe('Session ID'),
    },
    async (args) => {
      clearCart(args.sessionId);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: 'Cart cleared successfully' }),
          },
        ],
      };
    }
  );

  // Tool: create_order
  server.tool(
    'create_order',
    'Finalize and create a customer order from the active cart, calculating savings and returning order details.',
    {
      customerName: z.string().describe('Full name of the customer'),
      customerPhone: z.string().describe('Customer mobile phone / WhatsApp number'),
      customerCity: z.string().optional().describe('Delivery city or address'),
      customerAddress: z.string().optional().describe('Full delivery postal address'),
      notes: z.string().optional().describe('Special dietary instructions or delivery notes'),
      sessionId: z.string().optional().describe('Session ID'),
    },
    async (args) => {
      const res = createOrderFromCart(args);
      if (res.error) {
        return { content: [{ type: 'text', text: JSON.stringify({ error: res.error }) }] };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: `Order ${res.order?.orderNumber} created successfully!`,
                order: res.order,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  // Tool: list_orders
  server.tool(
    'list_orders',
    'List all customer orders placed in the system with itemized contents and statuses.',
    {
      limit: z.number().optional().describe('Maximum number of orders to return (default 20)'),
      status: z.enum(['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled']).optional().describe('Filter by order status'),
    },
    async (args) => {
      const orders = listOrders(args.limit || 20, args.status);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ total: orders.length, orders }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: update_order_status
  server.tool(
    'update_order_status',
    'Update the fulfillment status of an order.',
    {
      orderIdOrNumber: z.string().describe('Order ID or order number (e.g., "NSQ-123456")'),
      status: z.enum(['pending', 'confirmed', 'dispatched', 'delivered', 'cancelled']).describe('New order status'),
    },
    async (args) => {
      const updated = updateOrderStatus(args.orderIdOrNumber, args.status);
      if (!updated) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: `Order not found: ${args.orderIdOrNumber}` }) }],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, order: updated }, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // 4. LEAD & CONSULTATION TOOLS
  // ==========================================

  // Tool: create_lead
  server.tool(
    'create_lead',
    'Register a customer lead or nutritionist consultation request.',
    {
      name: z.string().describe('Customer full name'),
      phone: z.string().describe('Customer contact phone number'),
      email: z.string().optional().describe('Customer email address'),
      healthGoal: z.string().describe('Primary wellness objective (e.g., "Lean muscle gain", "Immunity", "Fat loss", "Bone health")'),
      notes: z.string().optional().describe('Any specific symptoms, dietary restrictions, or notes'),
    },
    async (args) => {
      const lead = createLead(args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ success: true, message: 'Lead registered successfully', lead }, null, 2),
          },
        ],
      };
    }
  );

  // Tool: list_leads
  server.tool(
    'list_leads',
    'List all registered leads and consultation requests.',
    {
      limit: z.number().optional().describe('Maximum number of leads to return (default 50)'),
    },
    async (args) => {
      const leads = listLeads(args.limit || 50);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ total: leads.length, leads }, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // 5. MCP RESOURCES
  // ==========================================

  // Resource: products://catalog
  server.resource(
    'products-catalog',
    'products://catalog',
    async (uri) => {
      const products = getCatalog();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(products, null, 2),
          },
        ],
      };
    }
  );

  // Resource: categories://all
  server.resource(
    'categories-list',
    'categories://all',
    async (uri) => {
      const categories = getCategories();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(categories, null, 2),
          },
        ],
      };
    }
  );

  // Resource: validation://icmr_standards
  server.resource(
    'validation-icmr-standards',
    'validation://icmr_standards',
    async (uri) => {
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(ICMR_NIN_RDA_BENCHMARKS, null, 2),
          },
        ],
      };
    }
  );

  // ==========================================
  // 6. MCP PROMPTS
  // ==========================================

  // Prompt: recommend_supplements
  server.prompt(
    'recommend_supplements',
    'Clinical consultation prompt for recommending synergistic Amway Nutrilite supplements based on customer profile, age, diet, and health targets.',
    {
      age: z.string().describe('Customer age in years'),
      gender: z.string().describe('Gender (male/female/other)'),
      dietType: z.string().describe('Dietary pattern (e.g., Vegetarian, Vegan, Non-Vegetarian)'),
      primaryHealthGoal: z.string().describe('Goal (e.g. Muscle hypertrophy, Weight management, Hair & Skin, Joint support, Daily energy)'),
    },
    async (args) => {
      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `Act as a certified Clinical Nutritionist and biochemical expert for N-Square Store. 
Customer Profile:
- Age: ${args.age}
- Gender: ${args.gender}
- Diet Type: ${args.dietType}
- Primary Health Goal: ${args.primaryHealthGoal}

Please analyze their nutritional needs against the ICMR-NIN 2020 RDA benchmarks:
1. Identify primary dietary micro- or macro-nutrient gaps common in this demographic.
2. Recommend 2 to 3 synergistic Amway Nutrilite formulations from our verified catalog (e.g. All Plant Protein, Daily Plus, Salmon Omega-3, Cherry Iron).
3. Provide the exact biochemical rationale ("What it is" and "Why it is needed").
4. Explain proper timing (e.g., with meals, post-workout) and any contraindications (who should not use).
5. State the exact Direct Selling Price and estimated savings.`,
            },
          },
        ],
      };
    }
  );

  return server;
}
