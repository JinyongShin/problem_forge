import pdfplumber
import sys


def pdf_to_text(pdf_path: str) -> str:
    """
    pdfplumber를 사용해 PDF 파일에서 모든 페이지의 텍스트를 추출한다.
    Args:
        pdf_path (str): PDF 파일 경로
    Returns:
        str: 추출된 전체 텍스트
    """
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\n"
    return text.strip()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_text.py <pdf_path>")
        sys.exit(1)
    pdf_path = sys.argv[1]
    result = pdf_to_text(pdf_path)
    print(result) 