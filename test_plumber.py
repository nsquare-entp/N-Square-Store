import sys
import pdfplumber

def test(pdf_path):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for i, page in enumerate(pdf.pages):
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
                print(f"Page {i}: {len(extracted or '')} chars, {len(page.images)} images")
            print("Total extracted chars:", len(text))
            if text:
                print("First 100 chars:", repr(text[:100]))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    test(sys.argv[1])
