# ADK API 인증/환경변수 문제 및 해결 히스토리

## 1. 문제 현상
- adk api_server로는 Google GenAI API 호출이 정상 동작
- 직접 작성한 FastAPI 코드(api.py, test_api.py)에서는
  - "API key not valid. Please pass a valid API key." 에러 발생
  - .env, API 키, 환경변수 모두 정상인데 인증 실패

## 2. 원인 분석
- adk api_server는 내부적으로 환경변수(.env) 로딩, 인증, config 세팅 등
  여러 초기화 과정을 자동으로 처리함
- 직접 작성한 코드는 기본적인 `load_dotenv()`만 사용해
  - 환경변수 이름/위치/override/탐색 범위 등에서 차이가 발생
- adk api_server는 `.env` 파일을 **루트까지 거슬러 올라가며 탐색**하고,
  이미 설정된 환경변수도 **override=True**로 강제 적용
- 인증/환경변수 이름(`GOOGLE_API_KEY`, `GENAI_API_KEY`, `GOOGLE_APPLICATION_CREDENTIALS` 등)도
  여러 개를 지원

## 3. adk api_server의 환경변수 로딩 방식 참고 경로/코드
- 경로: `.venv/Lib/site-packages/google/adk/cli/fast_api.py`
  - 예시: `envs.load_dotenv_for_agent("", agents_dir)`
- 실제 구현: `.venv/Lib/site-packages/google/adk/cli/utils/envs.py`
  - 함수: `load_dotenv_for_agent(agent_name, agent_parent_folder, filename='.env')`
  - 내부적으로 `_walk_to_root_until_found()`로 루트까지 .env 탐색
  - `load_dotenv(dotenv_file_path, override=True, verbose=True)`로 강제 적용

## 4. 해결 방법 (직접 작성한 코드에 적용)
- api.py 맨 위에 아래 코드 추가:

```python
import os
from dotenv import load_dotenv

def walk_to_root_until_found(folder, filename):
    checkpath = os.path.join(folder, filename)
    if os.path.exists(checkpath) and os.path.isfile(checkpath):
        return checkpath
    parent_folder = os.path.dirname(folder)
    if parent_folder == folder:
        return ''
    return walk_to_root_until_found(parent_folder, filename)

dotenv_path = walk_to_root_until_found(os.path.dirname(__file__), '.env')
if dotenv_path:
    load_dotenv(dotenv_path, override=True, verbose=True)
```
- 환경변수 이름도 여러 개를 지원하도록 .env에 모두 추가:
  ```
  GOOGLE_API_KEY=발급받은키
  GENAI_API_KEY=발급받은키
  GOOGLE_APPLICATION_CREDENTIALS=서비스계정키경로.json
  ```

## 5. 결과
- adk api_server와 동일하게 환경변수/인증이 적용되어
  직접 작성한 FastAPI 코드(api.py, test_api.py)에서도 정상 동작 확인

## 6. 참고/비교 경로
- adk api_server 환경변수 로딩:  
  `.venv/Lib/site-packages/google/adk/cli/fast_api.py`  
  `.venv/Lib/site-packages/google/adk/cli/utils/envs.py`
- 직접 작성한 환경변수 로딩 코드:  
  `src/backend/api.py` (2024-06-xx 기준)

---

> **핵심:**
> - adk api_server의 환경변수/인증 처리 방식을 그대로 따라하면
>   커스텀 FastAPI 코드에서도 인증 문제 없이 동작 가능! 