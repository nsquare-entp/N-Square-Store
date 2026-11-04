import json
import glob
import os
import re
import urllib.request
import urllib.parse
import time

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
}

DATA_DIR = r'e:\NSquare\data'
LOCAL_DIR = r'e:\NSquare\product_images'
STORE_DIR = r'e:\NSquare\amway-store\public\images\products'

os.makedirs(LOCAL_DIR, exist_ok=True)
os.makedirs(STORE_DIR, exist_ok=True)

def fetch_url(url, timeout=12):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        return ""

def download_file(url, out_path):
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
            if len(data) > 1000:
                os.makedirs(os.path.dirname(out_path), exist_ok=True)
                with open(out_path, 'wb') as f:
                    f.write(data)
                return True
    except Exception as e:
        # print(f"Failed download {url}: {e}")
        pass
    return False

def clean_name_for_search(name):
    n = re.sub(r'NUTRILITE®|n by Nutrilite™|XS™|Amway|®|™', '', name, flags=re.IGNORECASE)
    n = re.sub(r'\(.*?\)', '', n)
    # remove descriptors
    for word in ['Tablets', 'Capsules', 'Softgels', 'Chewable', 'Powder', 'Drink', 'Gummies', 'Packaging', 'Pack']:
        n = re.sub(rf'\b{word}\b', '', n, flags=re.IGNORECASE)
    n = re.sub(r'\s+', ' ', n).strip()
    return n

def find_images_for_product(sku, name):
    found_images = []
    
    # 1. Direct SKU on amway.in/p/
    direct_url = f"https://www.amway.in/p/{sku}"
    html = fetch_url(direct_url)
    if html:
        imgs = re.findall(r'https://media\.amway\.in/sys-master/images/[^"\'\s&<>]+', html)
        for img in imgs:
            if any(ext in img.lower() for ext in ['.png', '.jpg', '.jpeg']) and 'logo' not in img.lower():
                if img not in found_images:
                    found_images.append(img)

    # 2. Search by cleaned name
    if len(found_images) < 2:
        search_query = clean_name_for_search(name)
        search_url = f"https://www.amway.in/search?text={urllib.parse.quote(search_query)}"
        html_search = fetch_url(search_url)
        if html_search:
            prod_links = set(re.findall(r'href=["\'](/[^"\']+/p/[^"\']+)["\']', html_search))
            for pl in list(prod_links)[:3]:
                pl_html = fetch_url(f"https://www.amway.in{pl}")
                if pl_html:
                    imgs = re.findall(r'https://media\.amway\.in/sys-master/images/[^"\'\s&<>]+', pl_html)
                    for img in imgs:
                        if any(ext in img.lower() for ext in ['.png', '.jpg', '.jpeg']) and 'logo' not in img.lower():
                            if img not in found_images:
                                found_images.append(img)
                if len(found_images) >= 4:
                    break

    # 3. Search by digits of SKU
    if not found_images:
        clean_sku = re.sub(r'[^\d]', '', sku)
        if clean_sku:
            search_url = f"https://www.amway.in/search?text={clean_sku}"
            html_search = fetch_url(search_url)
            if html_search:
                imgs = re.findall(r'https://media\.amway\.in/sys-master/images/[^"\'\s&<>]+', html_search)
                for img in imgs:
                    if any(ext in img.lower() for ext in ['.png', '.jpg', '.jpeg']) and 'logo' not in img.lower():
                        if img not in found_images:
                            found_images.append(img)

    def sort_key(img_url):
        score = 0
        if '800' in img_url: score += 20
        elif '560' in img_url: score += 15
        elif '375' in img_url: score += 10
        elif '200' in img_url: score += 5
        if '_1.png' in img_url or 'FRONT' in img_url: score += 10
        return -score

    found_images = sorted(list(set(found_images)), key=sort_key)
    return found_images

def process_all_products():
    cat_files = glob.glob(os.path.join(DATA_DIR, 'category*.json'))
    total_processed = 0
    total_downloaded = 0

    bundle = {}

    for cat_file in sorted(cat_files):
        with open(cat_file, 'r', encoding='utf-8') as f:
            cat_data = json.load(f)

        cat_name = cat_data.get('category_name', os.path.basename(cat_file))
        print(f"\n==========================================")
        print(f"Processing Category: {cat_name} ({len(cat_data.get('products', []))} products)")
        print(f"==========================================")

        for prod in cat_data.get('products', []):
            total_processed += 1
            sku = prod.get('sku') or prod.get('id')
            name = prod.get('name')
            print(f"\n[{total_processed}] Fetching images for: {sku} - {name}")

            online_images = find_images_for_product(sku, name)
            local_images = []

            if online_images:
                print(f"  Found {len(online_images)} online images. Downloading...")
                # Download primary and up to 2 secondary images
                for idx, img_url in enumerate(online_images[:3]):
                    suffix = "" if idx == 0 else f"_{idx}"
                    filename = f"{sku}{suffix}.png"
                    
                    local_path = os.path.join(LOCAL_DIR, filename)
                    store_path = os.path.join(STORE_DIR, filename)

                    # Download to local_dir
                    success = download_file(img_url, local_path)
                    if success:
                        # Copy or download to store_dir
                        download_file(img_url, store_path)
                        # Relative URL for web application
                        web_path = f"/images/products/{filename}"
                        local_images.append(web_path)
                        total_downloaded += 1
                        print(f"  [OK] Saved {filename} ({os.path.getsize(local_path):,} bytes)")
                    time.sleep(0.1)

            if local_images:
                # Update product record
                prod['image_url'] = local_images[0]
                prod['image'] = local_images[0]
                prod['images'] = local_images
                prod['official_online_image'] = online_images[0]
            else:
                print(f"  [!] No images found online for {sku}. Keeping existing reference.")

            time.sleep(0.2)

        # Save updated category JSON
        with open(cat_file, 'w', encoding='utf-8') as f:
            json.dump(cat_data, f, indent=2, ensure_ascii=False)
        print(f"Updated {cat_file}")

        # Also sync to amway-store/public/data
        store_cat_file = os.path.join(r'e:\NSquare\amway-store\public\data', os.path.basename(cat_file))
        with open(store_cat_file, 'w', encoding='utf-8') as f:
            json.dump(cat_data, f, indent=2, ensure_ascii=False)

        cat_key = cat_data.get('category_id') or os.path.basename(cat_file).split('_')[0]
        bundle[cat_key] = cat_data

    # Also load scenario files into bundle
    for scn_file in ['scenario1_book_of_knowledge.json', 'scenario2_book_of_knowledge.json']:
        p = os.path.join(DATA_DIR, scn_file)
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as sf:
                skey = 'scenario1' if 'scenario1' in scn_file else 'scenario2'
                bundle[skey] = json.load(sf)

    # Regenerate reports_bundle.js
    bundle_path = os.path.join(DATA_DIR, 'reports_bundle.js')
    with open(bundle_path, 'w', encoding='utf-8') as bf:
        bf.write('window.REPORTS_DATA = ' + json.dumps(bundle, indent=2, ensure_ascii=False) + ';\n')
    
    # Sync bundle to amway-store
    store_bundle = os.path.join(r'e:\NSquare\amway-store\public\data', 'reports_bundle.js')
    with open(store_bundle, 'w', encoding='utf-8') as sbf:
        sbf.write('window.REPORTS_DATA = ' + json.dumps(bundle, indent=2, ensure_ascii=False) + ';\n')

    print(f"\n==========================================")
    print(f"COMPLETED! Processed {total_processed} products.")
    print(f"Total images saved locally: {total_downloaded}")
    print(f"Images stored in: {LOCAL_DIR} and {STORE_DIR}")
    print(f"==========================================")

if __name__ == '__main__':
    process_all_products()

