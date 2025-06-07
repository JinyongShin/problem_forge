# Problem Forge

## 프로젝트 개요
- 백엔드는 Python, 프론트엔드는 React(JS)로 구성된 웹 애플리케이션 프로젝트입니다.
- 프로젝트 초기 세팅 및 개발 환경 구성을 완료하였으며, 채팅 기반 UI에서 텍스트, PDF, 이미지 파일로 문제를 입력할 수 있습니다.
- 첨부파일은 PDF/이미지 파일만 지원하며, 잘못된 파일 첨부 시 경고 메시지가 표시됩니다.

## 디렉토리 구조
```
problem_forge/
├─ src/
│  ├─ backend/      # 파이썬 백엔드 코드
│  └─ frontend/     # React 프론트엔드 코드
├─ requirements.txt # (파이썬 패키지 목록, 필요시)
├─ README.md
├─ .gitignore
```

## 사용 기술
- **백엔드:** Python (가상환경 사용)
- **프론트엔드:** React (npm, react-router-dom, axios)
- **버전 관리:** Git, GitHub

## 주요 기능
- 채팅 기반 UI에서 문제 입력(텍스트, PDF, 이미지 첨부)
- 대화 목록 관리(추가, 선택, 이름 변경, 삭제)
- 첨부파일명 표시 및 파일별 입력 구분
- PDF/이미지 외 파일 첨부 시 경고 메시지 안내
- 입력값 검증 및 기본 보안 처리(스크립트/특수문자 등)

## 초기 세팅 방법

### 1. 저장소 클론 및 가상환경
```bash
git clone https://github.com/JinyongShin/problem_forge.git
cd problem_forge
# (파이썬 가상환경 활성화)
# INSTALL UV
pip install uv
# 가상 환경 세팅
uv sync
# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

### 2. 프론트엔드(React) 설치
```bash
cd src/frontend
npm install
```

## 개발/실행 방법

### 백엔드(Python)
- 필요한 패키지는 진행하면서 requirements.txt에 추가
- 예시 실행:
```bash
python main.py
```

### 프론트엔드(React)
```bash
cd src/frontend
npm start
```

## 기타
- .gitignore에 node_modules, venv, __pycache__ 등 불필요한 파일/폴더가 포함되어 있습니다.
- 추가적인 기능/모듈은 진행하면서 Task로 관리합니다.
