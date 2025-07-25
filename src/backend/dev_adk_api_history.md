# ADK API 인증 문제 해결 가이드

## 🚨 **문제 상황**
- **adk api_server**: Google GenAI API 호출 정상 동작 ✅
- **직접 작성한 FastAPI 코드**: "API key not valid. Please pass a valid API key." 에러 ❌

## 🔍 **원인 분석**
ADK와 커스텀 FastAPI 코드 간의 환경변수 로딩 방식 차이:

| 구분 | ADK api_server | 커스텀 FastAPI |
|------|----------------|----------------|
| **탐색 방식** | 루트까지 거슬러 올라가며 .env 탐색 | 현재 디렉토리만 확인 |
| **덮어쓰기** | `override=True` 강제 적용 | 기존 환경변수 우선 |
| **지원 변수명** | 여러 API 키 이름 지원 | 단일 변수명만 |

## ⚡ **해결책**

### 1. ADK 스타일 환경변수 로딩 구현
```python
import os
from dotenv import load_dotenv

def walk_to_root_until_found(folder, filename):
    """루트까지 거슬러 올라가며 .env 파일 탐색"""
    checkpath = os.path.join(folder, filename)
    if os.path.exists(checkpath) and os.path.isfile(checkpath):
        return checkpath
    parent_folder = os.path.dirname(folder)
    if parent_folder == folder:
        return ''
    return walk_to_root_until_found(parent_folder, filename)

# ADK와 동일한 환경변수 로딩
dotenv_path = walk_to_root_until_found(os.path.dirname(__file__), '.env')
if dotenv_path:
    load_dotenv(dotenv_path, override=True, verbose=True)
```

### 2. 다중 API 키 변수명 지원
`.env` 파일에 여러 변수명으로 동일한 키 설정:
```env
GOOGLE_API_KEY=your_api_key_here
GENAI_API_KEY=your_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json
```

## ✅ **결과**
- 커스텀 FastAPI 코드에서도 ADK와 동일한 인증 처리 가능
- 환경변수 탐색 및 로딩 방식 통일

## 📚 **참고 자료**
- **ADK 환경변수 로딩 구현**: `.venv/Lib/site-packages/google/adk/cli/utils/envs.py`
- **함수**: `load_dotenv_for_agent()` → `_walk_to_root_until_found()`

---
**💡 핵심**: ADK의 환경변수 처리 방식을 그대로 따라하면 커스텀 FastAPI에서도 인증 문제 없이 동작! 