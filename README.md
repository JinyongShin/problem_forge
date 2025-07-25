# Problem Forge

## 프로젝트 개요
Problem Forge는 AI 에이전트를 활용하여 수능 스타일 영어 지문을 기반으로 다양한 유형의 변형 문제를 자동 생성하는 웹 애플리케이션입니다.

- **백엔드**: Python FastAPI + Google ADK를 활용한 AI 에이전트 시스템
- **프론트엔드**: React(JS)로 구성된 채팅 기반 UI
- **주요 타겟**: 수험생, 학원 강사, 교사 등 대학입시 관련 사용자

## 주요 기능
- 📝 **다양한 입력 방식**: 텍스트 직접 입력, PDF 파일, 이미지 파일 첨부
- 🤖 **AI 문제 생성**: Google ADK 기반 에이전트를 통한 자동 문제 변형 생성
- 🔄 **다중 문제 처리**: PDF/텍스트 내 여러 문제 자동 분리 및 개별 처리
- 💬 **채팅 UI**: 직관적인 대화형 인터페이스
- 📋 **대화 관리**: 대화 목록 생성, 선택, 이름 변경, 삭제
- 🎯 **문제 유형**: 심경·분위기 파악, 요지·주제 추론 등 다양한 수능 문제 유형 지원
- 🏷️ **자동 제목 생성**: 첫 메시지 기반 대화 제목 자동 생성

## 디렉토리 구조
```
problem_forge/
├─ src/
│  ├─ agent/           # AI 에이전트 instruction 정의
│  │  ├─ __init__.py
│  │  └─ instruction.py
│  ├─ backend/         # FastAPI 백엔드 서버
│  │  ├─ server.py     # 메인 서버 파일
│  │  ├─ preprocess.py # 문제 분리 전처리
│  │  ├─ test_api.py   # API 테스트
│  │  ├─ users.txt     # 사용자 인증 정보
│  │  └─ pyproject.toml
│  └─ frontend/        # React 프론트엔드
│     ├─ src/
│     │  ├─ components/
│     │  │  ├─ ChatInput.js    # 채팅 입력 컴포넌트
│     │  │  ├─ ChatWindow.js   # 채팅 윈도우
│     │  │  ├─ ChatSidebar.js  # 채팅 사이드바
│     │  │  ├─ Login.js        # 로그인 컴포넌트
│     │  │  ├─ PdfUpload.js    # PDF 업로드
│     │  │  ├─ ImageUpload.js  # 이미지 업로드
│     │  │  └─ TextInput.js    # 텍스트 입력
│     │  ├─ assets/            # 폰트 등 자산
│     │  └─ App.js
│     ├─ package.json
│     └─ package-lock.json
├─ pyproject.toml      # 프로젝트 메타데이터 및 의존성
├─ uv.lock            # uv 패키지 잠금 파일
├─ plan.md            # 프로젝트 계획서
├─ architecture_cleanup_plan.md
├─ weighting_module_plan.md
└─ README.md
```

## 사용 기술
- **백엔드**: 
  - Python FastAPI
  - Google ADK (AI Development Kit)
  - uvicorn (ASGI 서버)
- **프론트엔드**: 
  - React 19.1.0
  - axios (HTTP 클라이언트)
  - react-router-dom (라우팅)
  - pdfjs-dist (PDF 처리)
  - react-markdown (마크다운 렌더링)
- **패키지 관리**: uv (Python), npm (Node.js)
- **버전 관리**: Git, GitHub

## 설치 및 실행

### 1. 저장소 클론 및 Python 환경 설정
```bash
git clone https://github.com/JinyongShin/problem_forge.git
cd problem_forge

# uv 설치 (Python 패키지 관리자)
pip install uv

# 가상환경 생성 및 의존성 설치
uv sync
```

### 2. 프론트엔드 의존성 설치
```bash
cd src/frontend
npm install
```

### 3. 실행 방법

#### 백엔드 서버 실행
```bash
# 프로젝트 루트에서
cd src/backend
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

#### 프론트엔드 개발 서버 실행
```bash
# 새 터미널에서
cd src/frontend  
npm start
```

서버 실행 후 브라우저에서 `http://localhost:3000`으로 접속하세요.

## API 엔드포인트
- `POST /api/login` - 사용자 로그인
- `POST /api/split-problems` - 텍스트에서 다중 문제 분리
- `POST /api/generate-title` - 대화 제목 자동 생성
- Google ADK 기반 에이전트 엔드포인트들 (`/agents/*`)

## 개발 현황
- ✅ **Phase 1**: 프로젝트 환경 설정 완료
- ✅ **Phase 2**: React 기반 채팅 UI 및 파일 업로드 기능 완료
- ✅ **Phase 3**: 백엔드 전처리 및 AI 에이전트 통합 완료
- 🔄 **Phase 4**: 추가 문제 유형 및 기능 확장 진행 중

## 보안 및 인증
- 사용자 인증 시스템 (users.txt 기반)
- 입력값 검증 및 기본 보안 처리
- CORS 설정으로 프론트엔드-백엔드 통신 보안

## 라이선스
이 프로젝트는 적절한 라이선스 하에 배포됩니다.

## 기여하기
프로젝트에 기여하고 싶으시다면 이슈를 생성하거나 풀 리퀘스트를 보내주세요.
