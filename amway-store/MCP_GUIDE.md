# N-Square Amway Health Store — Model Context Protocol (MCP) Integration Guide

This application provides a **Model Context Protocol (MCP)** server that allows any Large Language Model (such as Claude Desktop, Cursor, or web-based agents) to interact with our store, perform full CRUD operations on products and orders, consult clinical nutritionist rationales, and medically validate ingredient dosages against official **ICMR-NIN 2020 RDA** benchmarks.

---

## 1. Quick Overview

| Feature | Details |
| :--- | :--- |
| **Catalog** | 44 authentic Amway Nutrilite™ formulations across 5 categories |
| **Ingredients Tested** | 341 active ingredients with ICMR-NIN 2020 RDA fit ratings |
| **Transports Supported** | **Stdio** (Desktop LLMs) & **HTTP JSON-RPC 2.0** (Web LLMs) |
| **CLI Command** | `npm run mcp` (or `npx tsx src/mcp/cli.ts`) |
| **HTTP Endpoint** | `POST http://localhost:3000/api/mcp` |

---

## 2. Configuration for Claude Desktop

To connect Claude Desktop to this store, edit your `claude_desktop_config.json`:
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add the following under `"mcpServers"`:

```json
{
  "mcpServers": {
    "amway-nutrilite-store": {
      "command": "cmd.exe",
      "args": [
        "/c",
        "npx",
        "tsx",
        "e:\\NSquare\\amway-store\\src\\mcp\\cli.ts"
      ],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

Once configured, restart Claude Desktop. A hammer 🔨 icon will appear in the chat interface showing all 17 available tools!

---

## 3. Configuration for Cursor IDE

In Cursor, open **Settings** → **Features** → **MCP Servers** (or create `.cursor/mcp.json` in your workspace):

```json
{
  "mcpServers": {
    "amway-store": {
      "command": "npx tsx e:/NSquare/amway-store/src/mcp/cli.ts"
    }
  }
}
```

---

## 4. Available MCP Tools (CRUD Capabilities)

### Product & Catalog Operations
- **`list_products`**: Filter and list products by category, keyword, and price range.
  ```json
  { "category": "Protein Powders", "minPrice": 1000, "maxPrice": 6000 }
  ```
- **`get_product`**: Retrieve all product information, high-res photos, packaging sizes, ABO and MRP pricing, and clinical nutritionist rationale.
  ```json
  { "idOrSku": "329861ID" }
  ```
- **`search_products`**: Deep keyword and semantic search across titles, active ingredients, and clinical "what & why" rationales.
  ```json
  { "query": "PDCAAS 1.0 mTOR muscle synthesis" }
  ```
- **`create_product`**: Insert a new product into the catalog.
  ```json
  {
    "name": "Nutrilite CoQ10 Plus",
    "category": "Supplements: Tablets & Capsules",
    "price": 2850,
    "mrp": 3190,
    "weight": "60 Softgels",
    "usp": "Cellular mitochondrial energy and cardio-protection matrix.",
    "what_it_is": "Ubiquinone 100mg formulated with citrus bioflavonoids.",
    "why_it_is_needed": "Restores endogenous CoQ10 levels depleted by oxidative stress."
  }
  ```
- **`update_product`**: Update pricing, pack size, or descriptions of an existing product.
  ```json
  { "idOrSku": "329861ID", "price": 3499, "mrp": 4140 }
  ```
- **`delete_product`**: Remove an item from the catalog.
  ```json
  { "idOrSku": "CUSTOM-123" }
  ```

---

### Medical Standards & Clinical Validation
- **`get_medical_validation`**: Retrieve standard measurements, ICMR authority URLs, verification tables, who may use, and who should not use.
  ```json
  { "idOrSku": "329861ID" }
  ```
- **`validate_dosage`**: Compare user-specified daily nutrient intake with ICMR-NIN 2020 RDA tables and tolerable upper limits.
  ```json
  { "nutrient": "Elemental Iron", "amount": 25, "unit": "mg", "targetGender": "female" }
  ```

---

### Cart & Orders Management
- **`get_cart`**: View active items, subtotal MRP, ABO price, and total savings.
- **`add_to_cart`**: Add product with quantity.
  ```json
  { "idOrSku": "329861ID", "quantity": 2 }
  ```
- **`update_cart_quantity`**: Adjust quantity or remove item (quantity: 0).
- **`clear_cart`**: Empty the active cart.
- **`create_order`**: Place order from cart and receive order number and formatted delivery summary.
  ```json
  {
    "customerName": "Rahul Verma",
    "customerPhone": "9876543210",
    "customerCity": "Hyderabad",
    "customerAddress": "Banjara Hills, Road No. 12",
    "notes": "Deliver in morning hours"
  }
  ```
- **`list_orders`**: Review placed orders and fulfillment status.
- **`update_order_status`**: Change status (`pending`, `confirmed`, `dispatched`, `delivered`, `cancelled`).

---

### Lead Generation & Nutritionist Inquiries
- **`create_lead`**: Register customer inquiry for personalized health consultations.
  ```json
  {
    "name": "Priya Sharma",
    "phone": "9988776655",
    "email": "priya@example.com",
    "healthGoal": "Post-workout recovery and daily fatigue"
  }
  ```
- **`list_leads`**: View all pending consultation requests.

---

## 5. Available MCP Resources

LLMs can inspect these live resources at any time:
- `products://catalog`: Complete JSON array of all 44 verified products.
- `categories://all`: Summary of all 5 nutraceutical categories.
- `validation://icmr_standards`: Full ICMR-NIN 2020 RDA reference table for Indian adults.

---

## 6. HTTP JSON-RPC 2.0 Interface

For web-based agents (e.g. LangChain, Flowise, AutoGen), send standard JSON-RPC 2.0 requests:

```bash
curl -X POST http://localhost:3000/api/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
      "name": "get_product",
      "arguments": { "idOrSku": "329861ID" }
    }
  }'
```
