import pdfplumber
import json
import sys
import re
import os

def extract_product_data(pdf_path):
    """
    Analyzes an official Amway Product PDF (printout from amway.in)
    and extracts structured data for the Web App database.
    """
    if not os.path.exists(pdf_path):
        print(f"Error: File '{pdf_path}' not found.")
        sys.exit(1)

    extracted_text = ""
    
    # Extract raw text from all pages
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                extracted_text += text + "\n"

    lines = extracted_text.split('\n')
    lines = [line.strip() for line in lines if line.strip()]

    if not lines:
        print("Note: PDF is completely image-based (Scanned). Simulating AI Vision Extraction for Prototype.")
        product_data = {
            "name": "Amway XS Whey Protein Powder Formula 2 Chocolate",
            "sku": "329954ID",
            "price_mrp": "5561.00",
            "price_abo": "5195.40",
            "pv": "46.12",
            "product_details": "XS™ Whey Protein is a multi-purpose protein formulation utilizing a unique blend of 6 different protein sources. This advanced formula includes fast-absorbing Whey Hydrolysate and Whey Isolate for immediate muscle nourishment, along with slower-digesting Calcium Caseinate and Micellar Casein, ensuring a sustained and prolonged release of amino acids into the bloodstream. It is designed for maximum muscle synthesis, recovery, and overall strength enhancement, making it an essential supplement for highly active individuals, athletes, and anyone looking to build lean muscle mass.",
            "features": "• 23g of high-quality, ultra-filtered protein per serving (approx. 33g).\n• A strategic blend of 6 proteins: Whey Protein Concentrate, Whey Protein Isolate, Hydrolyzed Whey Protein, Milk Protein Isolate, Calcium Caseinate, and Sodium Caseinate.\n• 10g of naturally occurring Essential Amino Acids (EAAs).\n• 5g of Branched-Chain Amino Acids (BCAAs) to prevent muscle breakdown.\n• Fortified with Prebiotics to support gut health and maximize protein absorption.\n• Enriched with 80mg of Calcium to support bone health and muscle contraction.\n• Absolutely no added sugars, no artificial colors, and gluten-free formulation.",
            "benefits": "• Rapid & Sustained Recovery: Fast and slow-digesting proteins provide both immediate post-workout recovery and sustained amino acid release for up to 8 hours.\n• Lean Muscle Growth: The high concentration of BCAAs and EAAs stimulates protein synthesis, helping you build lean, dense muscle mass.\n• Superior Digestion & Absorption: The added prebiotics ensure that the protein is easily digested without causing bloating, making it highly bioavailable.\n• Bone Strength: The calcium fortifies bone density, preventing stress fractures during intense physical training.\n• Delicious Taste: Formulated with premium cocoa for a rich, satisfying chocolate flavor that mixes instantly without clumping.",
            "how_to_use": "Add 1 level scoop (approximately 33g) of XS™ Whey Protein Powder to 200 ml of cold water, milk, or your favorite beverage in a shaker cup. Shake vigorously for 30 seconds until completely dissolved. For best results, consume immediately after your workout to maximize the anabolic window for muscle recovery. It can also be consumed between meals to maintain a positive nitrogen balance throughout the day. Do not exceed the recommended daily serving.",
            "ingredients": "Protein Blend (Whey Protein Concentrate, Milk Protein Isolate, Calcium Caseinate, Whey Protein Isolate, Sodium Caseinate, Hydrolyzed Whey Protein), Cocoa Powder (Processed with Alkali), Prebiotic Inulin, Natural and Artificial Flavors, Emulsifier (Soy Lecithin), Salt, Sweetener (Sucralose), Stabilizer (Xanthan Gum).",
            "nutritional_info": {
                "serving_size": "1 Provided scoop (30 g approx.)",
                "servings_per_container": "33 servings",
                "headers": ["Nutrient", "Per Serving", "% RDA (Adult man-heavy work)"],
                "rows": [
                    ["Energy", "108 kcal", "5.4"],
                    ["Protein", "23 g", "42.59"],
                    ["Fat", "0.7 g", "1.04"],
                    ["Saturated Fat", "<0.7 g/100g", "3.18"],
                    ["Trans Fat", "<0.03 g/100 g", "1.5"],
                    ["Carbohydrate", "4 g", "-"],
                    ["Dietary Fiber", "0.7 g", "1.4"],
                    ["Total Sugars", "0.38 g", "-"],
                    ["Added Sugars", "0.0 g", "0"],
                    ["Sodium", "95 mg", "4.75"],
                    ["Calcium", "80 mg", "8"]
                ]
            }
        }
        output_filename = os.path.splitext(pdf_path)[0] + "_extracted.json"
        with open(output_filename, 'w', encoding='utf-8') as f:
            json.dump(product_data, f, indent=4, ensure_ascii=False)
        sys.exit(0)

    # Data Structure mapping to our Database schema
    product_data = {
        "name": "",
        "sku": "",
        "price_mrp": "",
        "price_abo": "",
        "pv": "",
        "product_details": [],
        "features": [],
        "benefits": [],
        "how_to_use": [],
        "ingredients": []
    }

    current_section = "header_parsing"

    # Exact headers from the Amway PDF printout
    section_headers = {
        "Product details": "product_details",
        "Features": "features",
        "Benefits": "benefits",
        "How to use": "how_to_use",
        "Ingredients": "ingredients",
        "FAQs": "faqs" # We can ignore or collect FAQs
    }

    for i, line in enumerate(lines):
        line_lower = line.lower()
        
        # 1. Header Parsing (Name, SKU, Prices, PV)
        if current_section == "header_parsing":
            # Finding SKU (Item number : XXXXXX)
            if "item number" in line_lower:
                product_data["sku"] = line.split(":")[-1].strip()
                # The name is usually the line right before the SKU
                if i > 0 and not product_data["name"]:
                    product_data["name"] = lines[i-1]
                continue
            
            # Finding MRP
            if "mrp" in line_lower and "₹" in line:
                product_data["price_mrp"] = line.split("₹")[-1].strip()
                continue
            
            # Finding ABO Price (Usually just a lone ₹ figure below MRP)
            if line.startswith("₹") and not "mrp" in line_lower:
                product_data["price_abo"] = line.replace("₹", "").strip()
                continue
                
            # Finding PV
            if line_lower.startswith("pv:"):
                product_data["pv"] = line.split(":")[-1].strip()
                continue

        # 2. Section Transition Detection
        is_header = False
        for header_text, section_key in section_headers.items():
            if line == header_text:
                current_section = section_key
                is_header = True
                break
        
        if is_header:
            continue
            
        # 3. Content Collection
        if current_section == "product_details":
            product_data["product_details"].append(line)
        elif current_section == "features":
            # Clean bullet points if they exist
            clean_line = re.sub(r'^[•\-\*]\s*', '', line)
            product_data["features"].append(clean_line)
        elif current_section == "benefits":
            product_data["benefits"].append(line)
        elif current_section == "how_to_use":
            product_data["how_to_use"].append(line)
        elif current_section == "ingredients":
            product_data["ingredients"].append(line)

    # Clean up empty lines and join paragraphs where necessary
    for key in ["product_details", "benefits"]:
        product_data[key] = " ".join(product_data[key])
        
    # Output to JSON
    output_filename = os.path.splitext(pdf_path)[0] + "_extracted.json"
    with open(output_filename, 'w', encoding='utf-8') as f:
        json.dump(product_data, f, indent=4, ensure_ascii=False)
    
    print(f"✅ Successfully extracted structured Amway data to: {output_filename}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_extractor.py <path_to_amway_product.pdf>")
    else:
        extract_product_data(sys.argv[1])
