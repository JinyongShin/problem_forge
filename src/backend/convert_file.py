import os
import sys
import logging
from pdf_to_text import pdf_to_text

# 로깅 설정
logging.basicConfig(
    filename=os.path.join(os.path.dirname(__file__), 'error.log'),
    level=logging.ERROR,
    format='%(asctime)s [%(levelname)s] %(message)s'
)

def convert_file(file_path: str) -> str:
    """
    PDF/이미지 파일을 텍스트로 변환하는 통합 인터페이스
    Args:
        file_path (str): 변환할 파일 경로
    Returns:
        str: 변환된 텍스트 또는 에러 메시지
    """
    ext = os.path.splitext(file_path)[-1].lower()
    try:
        if ext == ".pdf":
            return pdf_to_text(file_path)
        elif ext in [".png", ".jpg", ".jpeg"]:
            # 이미지→텍스트 변환은 추후 구현 예정
            raise NotImplementedError("이미지→텍스트 변환은 현재 지원하지 않습니다.")
        else:
            return f"[ERROR] 지원하지 않는 파일 형식: {ext}"
    except Exception as e:
        logging.error(f"파일 변환 실패: {file_path}", exc_info=True)
        return f"[ERROR] 변환 중 예외 발생: {type(e).__name__}: {e} (자세한 내용은 error.log 참조)"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python convert_file.py <file_path>")
        sys.exit(1)
    file_path = sys.argv[1]
    result = convert_file(file_path)
    print(result) 