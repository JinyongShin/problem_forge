import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.abspath(os.path.join(BASE_DIR, ".."))

# src를 sys.path에 추가 (agent 패키지 인식)
if SRC_DIR not in sys.path:
    sys.path.insert(0, SRC_DIR)

from google.adk.cli.fast_api import get_fast_api_app
from fastapi import Request
from fastapi.responses import JSONResponse

app = get_fast_api_app(
    agents_dir=os.path.join(SRC_DIR, "agent"),  # src/agent로 지정
    web=False,            # UI가 필요하면 True
    allow_origins=["*"], # CORS 허용
)

def check_login(user_id, password):
    try:
        with open(os.path.join(BASE_DIR, 'users.txt'), 'r', encoding='utf-8') as f:
            for line in f:
                if not line.strip():
                    continue
                uid, pw = line.strip().split(':', 1)
                if uid == user_id and pw == password:
                    return True
    except Exception as e:
        print(f'Login file error: {e}')
    return False

@app.post('/api/login')
async def login(request: Request):
    data = await request.json()
    user_id = data.get('id')
    password = data.get('pw')
    if check_login(user_id, password):
        return JSONResponse({'success': True})
    else:
        return JSONResponse({'success': False, 'error': '로그인 실패'}, status_code=401)

# 실행: uvicorn server:app --reload 