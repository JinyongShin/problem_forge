import logging
from google.adk.agents import LlmAgent
from pdf_agent.instruction import (
    english_problem_extractor_instruction,
)

model = "gemini-2.0-flash"

# 로거 설정 - 단순하게 로깅만 추가
pdf_logger = logging.getLogger('pdf_parser')
pdf_logger.setLevel(logging.INFO)

# 에이전트 실행 전 텍스트를 로깅하는 함수
def log_pdf_text_input(text):
    """PDF 텍스트 입력을 로깅하는 함수"""
    if text and text.strip():
        pdf_logger.info("=" * 80)
        pdf_logger.info("📄 PDF 페이지 텍스트 수신")
        pdf_logger.info("=" * 80)
        pdf_logger.info(f"📏 텍스트 길이: {len(text)} 문자")
        pdf_logger.info("📝 전달된 텍스트 내용:")
        pdf_logger.info("-" * 40)
        pdf_logger.info(text)
        pdf_logger.info("-" * 40)
        pdf_logger.info("🔍 에이전트에서 영어 문제 추출 시작...")

# 기존 방식대로 단순한 LlmAgent 사용
root_agent = LlmAgent(
    name="pdf_parser_root",
    model=model,
    description="PDF에서 영어 문제를 추출하고 분석하는 루트 에이전트",
    instruction=english_problem_extractor_instruction
)
