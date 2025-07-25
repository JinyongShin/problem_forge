"""
Problem Forge Backend Server

FastAPI 기반 백엔드 서버로 AI 에이전트를 통한 문제 변형 생성을 제공합니다.
"""

import os
import sys
import logging
from typing import Dict, Any, List, Optional
# from datetime import datetime  # 제거 - 더 이상 사용하지 않음

# Path configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from google.adk.cli.fast_api import get_fast_api_app
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from backend.preprocess import split_problems
from google.adk.runners import InMemoryRunner
from google.genai.types import Content, Part
from agent import title_generator_agent

# Import main agent for /run endpoint - ADK가 자동으로 처리하므로 불필요
# from agent import root_agent as main_agent

# Constants
USERS_FILE = "users.txt"
TITLE_GENERATOR_APP_NAME = "title_generator"
API_USER_ID = "api_user"
CORS_ORIGINS = ["*"]

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# FastAPI app initialization
app = get_fast_api_app(
    agents_dir=os.path.join(SRC_DIR, "agent"),  # src/agent로 지정
    web=True,            # True로 변경하여 /run 엔드포인트 활성화
    allow_origins=["*"], # CORS 허용
)

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


async def run_title_generator(text: str) -> str:
    """
    제목 생성 에이전트 실행
    
    Args:
        text (str): 제목을 생성할 텍스트
        
    Returns:
        str: 생성된 제목
        
    Raises:
        HTTPException: 에이전트 실행 실패 시
    """
    runner = InMemoryRunner(
        app_name=TITLE_GENERATOR_APP_NAME,
        agent=title_generator_agent,
    )
    
    try:
        # 세션 생성
        session = await runner.session_service.create_session(
            app_name=TITLE_GENERATOR_APP_NAME,
            user_id=API_USER_ID,
        )
        
        # 사용자 메시지 생성
        user_message = Content(
            role="user",
            parts=[Part.from_text(text=text)]
        )
        
        # 에이전트 실행
        events = list(runner.run(
            user_id=API_USER_ID,
            session_id=session.id,
            new_message=user_message,
        ))
        
        # 응답 텍스트 추출
        response_text = ""
        for event in events:
            if hasattr(event, 'content') and event.content:
                for part in event.content.parts:
                    if hasattr(part, 'text'):
                        response_text += part.text
        
        if not response_text.strip():
            logger.warning("Title generator returned empty response")
            return "새 대화"  # 기본 제목
            
        logger.info(f"Title generated successfully: {response_text[:50]}...")
        return response_text.strip()
        
    except Exception as e:
        logger.error(f"Title generation failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Title generation error: {str(e)}"
        )


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


@app.post("/api/split-problems")
async def split_problems_endpoint(request: Request) -> JSONResponse:
    """
    텍스트 내 다중 문제 분할 API
    
    Args:
        request: 분할할 텍스트 요청
        
    Returns:
        JSONResponse: 분할된 문제 리스트
    """
    try:
        data = await request.json()
        text = data.get("text")
        
        if not text or not text.strip():
            raise HTTPException(
                status_code=400, 
                detail="분할할 텍스트를 입력해주세요."
            )
        
        problems = split_problems(text)
        logger.info(f"Problems split successfully: {len(problems)} problems found")
        
        return JSONResponse(content={"problems": problems})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Problem splitting error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"문제 분할 중 오류가 발생했습니다: {str(e)}"
        )


@app.post("/api/generate-title")
async def generate_title_endpoint(request: Request) -> JSONResponse:
    """
    대화 제목 생성 API
    
    Args:
        request: 제목 생성할 텍스트 요청
        
    Returns:
        JSONResponse: 생성된 제목
    """
    try:
        data = await request.json()
        text = data.get("text")
        
        if not text or not text.strip():
            raise HTTPException(
                status_code=400, 
                detail="제목을 생성할 텍스트를 입력해주세요."
            )
        
        title = await run_title_generator(text)
        return JSONResponse(content={"title": title})
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Title generation endpoint error: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"제목 생성 중 오류가 발생했습니다: {str(e)}"
        )



if __name__ == "__main__":
    # Development server
    import uvicorn
    logger.info("Starting Problem Forge backend server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)