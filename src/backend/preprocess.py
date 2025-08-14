import re
import os
from PyPDF2 import PdfReader



def extract_text_from_pdf(pdf_path: str) -> str:
    """
    PDF 파일에서 텍스트를 추출합니다.
    
    Args:
        pdf_path (str): PDF 파일 경로
        
    Returns:
        str: 추출된 텍스트
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
    
    try:
        reader = PdfReader(pdf_path)
        text = ""
        
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    
    except Exception as e:
        raise Exception(f"PDF 텍스트 추출 중 오류 발생: {str(e)}")

if __name__ == '__main__':
    # 실제 PDF 파일에서 텍스트를 추출하여 문제 분리 테스트
    pdf_path = "test.pdf"
    
    try:
        # PDF에서 텍스트 추출
        print("PDF 파일에서 텍스트를 추출하는 중...")
        extracted_text = extract_text_from_pdf(pdf_path)
        print(f"추출된 텍스트 길이: {len(extracted_text)} 문자")
        print(f"추출된 텍스트 미리보기 (처음 200자):\n{extracted_text[:200]}...\n")
        
        # 문제 분리 기능은 더이상 사용되지 않음
        print("PDF 텍스트 추출이 완료되었습니다.")
        print("문제 분리 기능은 별도의 PDF 파싱 에이전트에서 처리됩니다.")
            
    except FileNotFoundError as e:
        print(f"파일 오류: {e}")
        print("현재 디렉토리에 test.pdf 파일이 있는지 확인해주세요.")
    except Exception as e:
        print(f"처리 중 오류 발생: {e}")
        print("PDF 파일 처리에 실패했습니다. 파일이 암호화되어 있거나 손상되었을 수 있습니다.")
        

