"""
Problem Forge Backend Server

FastAPI 기반 백엔드 서버로 AI 에이전트를 통한 문제 변형 생성을 제공합니다.
"""

import os
import sys
import logging
import asyncio
import json
from typing import Dict, Any, List, Optional
from queue import Queue
import threading
# from datetime import datetime  # 제거 - 더 이상 사용하지 않음

# Path configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from google.adk.cli.fast_api import get_fast_api_app
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse, StreamingResponse



# Import main agent for /run endpoint - ADK가 자동으로 처리하므로 불필요
# from agent import root_agent as main_agent

# Constants
USERS_FILE = "users.txt"
API_USER_ID = "api_user"
CORS_ORIGINS = ["*"]

# 로그 캡처를 위한 전역 큐
log_queues = {}  # session_id -> Queue 매핑

class SSELogHandler(logging.Handler):
    """SSE 로그 전달을 위한 커스텀 핸들러"""
    
    def __init__(self):
        super().__init__()
        self.setLevel(logging.INFO)
        
    def emit(self, record):
        try:
            log_entry = self.format(record)
            
            # PDF 관련 로그인지 식별
            is_pdf_log = any(name in record.name.lower() for name in ['pdf', 'parser'])
            log_type = 'pdf_log' if is_pdf_log else 'server_log'
            
            # 모든 활성 세션에 로그 전달
            for session_id, queue in log_queues.items():
                try:
                    # 큐가 가득 차면 오래된 로그 제거
                    if queue.qsize() > 100:
                        try:
                            queue.get_nowait()
                        except:
                            pass
                    queue.put_nowait({
                        'type': log_type,
                        'message': log_entry,
                        'timestamp': record.created,
                        'logger_name': record.name,
                        'level': record.levelname
                    })
                except:
                    pass  # 큐에 넣기 실패해도 계속 진행
        except:
            pass  # 로깅 핸들러에서 에러가 발생해도 메인 프로그램에 영향 주지 않음

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# 커스텀 로그 핸들러 추가
sse_handler = SSELogHandler()
sse_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

# 모든 로거에 SSE 핸들러 추가
root_logger = logging.getLogger()
root_logger.addHandler(sse_handler)

# ADK 관련 로거들에도 핸들러 추가
adk_loggers = [
    'google.adk',
    'google_adk',
    'google.adk.cli.fast_api',
    'google.adk.models.google_llm'
]

for logger_name in adk_loggers:
    adk_logger = logging.getLogger(logger_name)
    adk_logger.addHandler(sse_handler)
    adk_logger.setLevel(logging.INFO)

# PDF 파싱 에이전트 전용 로거 추가
pdf_parser_logger = logging.getLogger('pdf_parser')
pdf_parser_logger.addHandler(sse_handler)
pdf_parser_logger.setLevel(logging.INFO)

# PDF 파싱 관련 추가 로거들
pdf_related_loggers = [
    'pdf_agent',
    'pdf_parser_root',
    'google.adk.agents',
    'google.adk.models',
]

for logger_name in pdf_related_loggers:
    logger_obj = logging.getLogger(logger_name)
    logger_obj.addHandler(sse_handler)
    logger_obj.setLevel(logging.INFO)

# FastAPI app initialization - 기본 agent 앱 등록 
app = get_fast_api_app(
    agents_dir=os.path.join(SRC_DIR, "agent"),  # 기존 문제 변형 에이전트들 (agent 앱)
    web=True,            # True로 변경하여 /run 엔드포인트 활성화
    allow_origins=["*"], # CORS 허용
)

# 🚀 별도 PDF 파싱 에이전트 앱 생성 및 마운트
try:
    pdf_app = get_fast_api_app(
        agents_dir=os.path.join(SRC_DIR, "pdf_agent"),  # PDF 파싱 에이전트들
        web=True,  # PDF 앱도 독립적인 웹 서비스로 구성
        allow_origins=["*"],
    )
    
    # PDF 앱에 미들웨어 추가하여 요청 로깅
    @pdf_app.middleware("http")
    async def log_pdf_requests(request: Request, call_next):
        # PDF 파싱 요청인 경우 로깅
        if request.url.path.endswith("/run_sse"):
            try:
                # 요청 본문 읽기
                body = await request.body()
                if body:
                    import json
                    try:
                        request_data = json.loads(body)
                        if 'newMessage' in request_data and 'parts' in request_data['newMessage']:
                            for part in request_data['newMessage']['parts']:
                                if 'text' in part:
                                    text_content = part['text']
                                    pdf_parser_logger.info("=" * 80)
                                    pdf_parser_logger.info("📡 PDF 파싱 요청 수신")
                                    pdf_parser_logger.info("=" * 80)
                                    pdf_parser_logger.info(f"📏 요청 텍스트 길이: {len(text_content)} 문자")
                                    pdf_parser_logger.info("📝 요청 텍스트 전체 내용:")
                                    pdf_parser_logger.info("-" * 50)
                                    pdf_parser_logger.info(text_content)
                                    pdf_parser_logger.info("-" * 50)
                                    pdf_parser_logger.info("🚀 PDF 파싱 에이전트로 전달...")
                    except:
                        pass  # JSON 파싱 실패 시 무시
                
                # 요청 본문을 다시 설정 (FastAPI가 다시 읽을 수 있도록)
                async def receive():
                    return {"type": "http.request", "body": body}
                request._receive = receive
                
            except Exception as e:
                pdf_parser_logger.error(f"요청 로깅 중 오류: {e}")
        
        response = await call_next(request)
        return response
    
    # PDF 앱을 메인 앱에 서브앱으로 마운트
    app.mount("/pdf", pdf_app)
    pdf_parser_logger.info("📦 PDF 파싱 에이전트 앱을 /pdf 경로에 마운트 완료")
    
except Exception as e:
    pdf_parser_logger.error(f"❌ PDF 파싱 에이전트 앱 마운트 실패: {e}")
    pdf_parser_logger.info("🔄 수동 PDF 에이전트 임포트 시도...")
    
    # 실패 시 수동으로 PDF 에이전트만 로드
    try:
        from pdf_agent import root_agent as pdf_root_agent
        pdf_parser_logger.info("📦 PDF 루트 에이전트 로드 완료")
    except Exception as fallback_error:
        pdf_parser_logger.error(f"❌ PDF 에이전트 수동 로드 실패: {fallback_error}")

# In-memory session storage - ADK가 자체 세션 관리를 하므로 불필요
# sessions = {}


def check_login(user_id: str, password: str) -> bool:
    """
    사용자 로그인 검증
    
    Args:
        user_id (str): 사용자 ID
        password (str): 비밀번호
        
    Returns:
        bool: 로그인 성공 여부
    """
    try:
        users_file_path = os.path.join(BASE_DIR, USERS_FILE)
        with open(users_file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                
                try:
                    uid, pw = line.split(':', 1)
                    if uid == user_id and pw == password:
                        logger.info(f"User {user_id} login successful")
                        return True
                except ValueError:
                    logger.warning(f"Invalid line format in users file: {line}")
                    continue
                    
    except FileNotFoundError:
        logger.error(f"Users file not found: {users_file_path}")
    except Exception as e:
        logger.error(f"Login verification error: {e}")
    
    logger.warning(f"Login failed for user: {user_id}")
    return False





@app.post('/api/login')
async def login_endpoint(request: Request) -> JSONResponse:
    """
    사용자 로그인 API
    
    Args:
        request: 로그인 요청 (id, pw 포함)
        
    Returns:
        JSONResponse: 로그인 결과
    """
    try:
        data = await request.json()
        user_id = data.get('id')
        password = data.get('pw')
        
        if not user_id or not password:
            return JSONResponse(
                {'success': False, 'error': 'ID와 비밀번호를 입력해주세요.'}, 
                status_code=400
            )
        
        if check_login(user_id, password):
            return JSONResponse({'success': True})
        else:
            return JSONResponse(
                {'success': False, 'error': '로그인에 실패했습니다.'}, 
                status_code=401
            )
            
    except Exception as e:
        logger.error(f"Login endpoint error: {e}")
        return JSONResponse(
            {'success': False, 'error': '서버 오류가 발생했습니다.'}, 
            status_code=500
        )








# 기존 API 엔드포인트 제거 - 이제 모든 PDF 파싱은 ADK 방식으로 처리


@app.get("/api/logs/{session_id}")
async def get_logs_stream(session_id: str):
    """
    실시간 서버 로그 스트리밍 엔드포인트
    
    Args:
        session_id (str): 세션 ID
        
    Returns:
        StreamingResponse: SSE 형태의 로그 스트림
    """
    async def log_stream():
        # 세션용 로그 큐 생성
        if session_id not in log_queues:
            log_queues[session_id] = Queue()
        
        queue = log_queues[session_id]
        
        try:
            # 초기 연결 확인 메시지
            yield f"data: {json.dumps({'type': 'connection', 'message': 'Server log stream connected'})}\n\n"
            
            while True:
                try:
                    # 큐에서 로그 가져오기 (논블로킹)
                    logs_to_send = []
                    
                    # 최대 10개의 로그를 한 번에 가져오기
                    for _ in range(10):
                        try:
                            log_item = queue.get_nowait()
                            logs_to_send.append(log_item)
                        except:
                            break  # 큐가 비어있으면 중단
                    
                    # 로그가 있으면 전송
                    for log_item in logs_to_send:
                        yield f"data: {json.dumps(log_item)}\n\n"
                    
                    # 짧은 대기 후 다시 확인
                    await asyncio.sleep(0.1)
                    
                except Exception as e:
                    logger.error(f"Log streaming error: {e}")
                    break
                    
        except Exception as e:
            logger.error(f"Log stream connection error: {e}")
        finally:
            # 연결 종료 시 큐 정리
            if session_id in log_queues:
                del log_queues[session_id]
            yield f"data: {json.dumps({'type': 'disconnect', 'message': 'Server log stream disconnected'})}\n\n"
    
    return StreamingResponse(
        log_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "*",
        }
    )


if __name__ == "__main__":
    # Development server
    import uvicorn
    logger.info("Starting Problem Forge backend server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)