import sys

def test_pdf(pdf_path):
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            print(f"PyPDF2 extracted {len(text)} characters.")
            if len(text) > 0:
                print("First 100 chars:", repr(text[:100]))
    except Exception as e:
        print("PyPDF2 failed:", e)

if __name__ == "__main__":
    test_pdf(sys.argv[1])
