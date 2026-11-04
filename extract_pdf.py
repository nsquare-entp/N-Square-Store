import pdfplumber
import pandas as pd
import sys

def extract_amway_prices(pdf_path, output_csv):
    all_rows = []
    
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            # The first page might be a cover page.
            tables = page.extract_tables()
            for table in tables:
                for row in table:
                    # Clean up newlines in cells
                    cleaned_row = [str(cell).replace('\n', ' ').strip() if cell else '' for cell in row]
                    
                    # Heuristic to find header row (usually contains 'Sno' or 'SKU No.')
                    if 'Sno' in cleaned_row or 'SKU No.' in cleaned_row or 'SKU' in cleaned_row:
                        # Only add header once
                        if not all_rows:
                            all_rows.append(cleaned_row)
                    elif len(cleaned_row) > 5 and cleaned_row[0].isdigit():
                        # Looks like a data row (first column is Sno)
                        all_rows.append(cleaned_row)
    
    if not all_rows:
        print("No data extracted!")
        return
    
    header = all_rows[0]
    num_cols = len(header)
    
    cleaned_data = []
    for row in all_rows[1:]:
        if len(row) > num_cols:
            # truncate
            cleaned_data.append(row[:num_cols])
        elif len(row) < num_cols:
            # pad
            cleaned_data.append(row + [''] * (num_cols - len(row)))
        else:
            cleaned_data.append(row)
            
    df = pd.DataFrame(cleaned_data, columns=header)
    
    # We will rename or add columns as per User's request 
    # (they want Short Description, Direct URL, Area of Usage)
    # We will add empty columns for the missing ones.
    
    # Let's see what columns we actually got
    print("Columns found:", list(df.columns))
    
    # Add new requested columns
    if 'Short Description' not in df.columns:
        df['Short Description'] = ''
    if 'Direct URL' not in df.columns:
        df['Direct URL'] = ''
    if 'Area of Usage' not in df.columns:
        df['Area of Usage'] = ''
        
    df.to_csv(output_csv, index=False)
    print(f"Saved {len(df)} rows to {output_csv}")

if __name__ == '__main__':
    extract_amway_prices('Amway_Price_list_August_2026_ABOS.pdf', 'Amway_Product_Catalog.csv')
