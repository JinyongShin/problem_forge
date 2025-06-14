import pdfplumber
import sys

def pdf_to_markdown(pdf_path: str) -> str:
    """
    pdfplumber를 사용해 PDF 파일을 마크다운(Markdown) 텍스트로 변환한다.
    (1차 버전: 각 페이지의 텍스트를 마크다운 문단으로 변환)
    Args:
        pdf_path (str): PDF 파일 경로
    Returns:
        str: 변환된 마크다운 텍스트
    """
    md = ""
    with pdfplumber.open(pdf_path) as pdf:
        for i, page in enumerate(pdf.pages):
            page_text = page.extract_text() or ""
            if page_text.strip():
                md += f"\n\n<!-- Page {i+1} -->\n\n"
                # 각 줄을 마크다운 문단으로 변환 (빈 줄은 무시)
                for line in page_text.splitlines():
                    if line.strip():
                        md += line.strip() + "\n\n"
    return md.strip()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python pdf_to_markdown.py <pdf_path>")
        sys.exit(1)
    pdf_path = sys.argv[1]
    result = pdf_to_markdown(pdf_path)
    print(result) 