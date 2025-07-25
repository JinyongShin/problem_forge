# 아키텍처 정리 계획서 (Architecture Cleanup Plan)

## 🎯 **목표**
프론트엔드 주도 아키텍처로 변경되면서 백엔드에 남아있는 데드 코드를 정리하여 코드베이스를 단순화하고 유지보수성을 향상시킨다.

## 📊 **현재 상황 분석**

### ✅ **현재 아키텍처 (프론트엔드 주도)**
- **PDF 처리**: 프론트엔드에서 `pdfjs-dist`를 사용하여 클라이언트 사이드 텍스트 추출
- **문제 분할**: 백엔드 `preprocess.py`의 `split_problems` 함수 사용
- **에이전트 실행**: 백엔드 `server.py`의 `/agent/run` 엔드포인트
- **제목 생성**: 백엔드 `title_generator_agent` 사용

### ❌ **데드 코드 현황**
- `convert_file.py` - PDF 변환 통합 인터페이스 (미사용)
- `pdf_to_text.py` - 백엔드 PDF 텍스트 추출 (프론트엔드로 대체됨)
- `pdf_to_markdown.py` - PDF 마크다운 변환 (미사용)
- `api.py` - 테스트용 클라이언트 코드 (개발용, 프로덕션 미사용)
- `src/backend/pyproject.toml` - 중복된 의존성 파일 (루트에서 관리)
- 개발 히스토리 파일들 - 정리 필요

## 📋 **정리 작업 단계**

### **Phase 1: 데드 코드 제거** ✅ (진행중)
- [x] `convert_file.py` 삭제
- [x] `pdf_to_text.py` 삭제  
- [x] `pdf_to_markdown.py` 삭제
- [x] `api.py` 삭제
- [x] `src/backend/pyproject.toml` 워크스페이스 설정 확인 완료 (워크스페이스 멤버로 유지 필요)

### **Phase 2: 의존성 정리** ✅ (완료)
- [x] 루트 `pyproject.toml`에서 `pdfplumber` 패키지 제거
- [x] `src/backend/pyproject.toml`에서 `pdfplumber` 의존성 제거  
- [x] 의존성 최적화 및 정리 완료 (4개 패키지 제거)

### **Phase 3: 개발 문서 정리** ✅ (완료)
- [x] `history.md` → `plan.md` 통합 후 삭제
- [x] `src/backend/dev_history.md` 삭제 (PDF 기능 제거로 무효화)
- [x] `src/frontend/src/dev_history.md` 간소화 및 정리 (61줄 → 약 40줄)
- [x] `src/backend/dev_adk_api_history.md` 간소화 및 정리 (69줄 → 약 35줄)

### **Phase 4: 코드 구조 최적화** ✅ (완료)
- [x] `server.py` 코드 리팩토링 및 구조 개선 (타입 힌트, 상수 분리, 함수 분리)
- [x] 에러 핸들링 개선 및 일관성 확보 (proper logging, 구체적 예외 처리)
- [x] 코드 주석 및 문서화 개선 (docstring, 모듈 문서 추가)

### **Phase 5: 검증 및 테스트** ✅ (완료)
- [x] 정리 후 기능 동작 확인 (백엔드 핵심 기능 정상 동작)
- [x] 프론트엔드-백엔드 연동 테스트 (빌드 성공, 테스트 6개 통과)
- [x] 누락된 의존성 없는지 최종 확인 (89개 패키지로 최적화)

## 🚨 **주의사항**
1. **백업**: 중요한 코드는 삭제 전 백업 확인
2. **의존성**: 실제 사용되지 않는 패키지만 제거
3. **기능 확인**: 각 단계마다 핵심 기능 동작 확인
4. **워크스페이스**: uv 워크스페이스 설정과의 호환성 고려

## 📝 **진행 기록**

### 2024-01-XX 작업 시작
- [x] **Phase 1 시작**: 데드 코드 제거 착수
- [x] PDF 변환 관련 모듈 4개 파일 삭제 완료
  - `convert_file.py` ✅
  - `pdf_to_text.py` ✅ 
  - `pdf_to_markdown.py` ✅
  - `api.py` ✅
- [x] **Phase 1-3 완료**: 아키텍처 정리 작업 완료 🎉
- [x] **Phase 1-5 완료**: 아키텍처 정리 작업 전체 완성 🎉

### 작업 로그
```
[완료] Phase 1: 데드 코드 제거 ✅
- 4개 미사용 파일 삭제 완료
- 워크스페이스 구조 분석 완료

[완료] Phase 2: 의존성 정리 ✅

[완료] Phase 3: 개발 문서 정리 ✅

[완료] Phase 4: 코드 구조 최적화 ✅
- server.py 완전 리팩토링: 타입 힌트, 로깅, 문서화, 함수 분리
- 테스트 6개 모두 통과하여 기능 무결성 확인

[완료] Phase 5: 검증 및 테스트 ✅  
- 백엔드 핵심 기능 정상 동작 확인
- 프론트엔드 빌드 성공 (경고 1개, 기능 무관)
- 최종 의존성 89개 패키지로 안정화
- 개발 히스토리 파일 정리 완료:
  * history.md → plan.md 통합 후 삭제 ✅
  * backend/dev_history.md → 삭제 완료 (PDF 기능 제거로 무효화) ✅
  * frontend/dev_history.md → 핵심 내용 위주로 간소화 완료 ✅
  * backend/dev_adk_api_history.md → 가이드 형태로 간소화 완료 ✅
- pdfplumber 사용 현황 확인: 미사용 확인됨
- 양쪽 pyproject.toml에서 제거 완료
- 4개 패키지 제거됨: pdfminer-six, pdfplumber, pillow, pypdfium2
- 백엔드 서버 및 preprocess 모듈 정상 동작 확인
```

## 🎯 **예상 결과**
- 백엔드 코드베이스 20-30% 크기 감소
- 의존성 패키지 수 감소
- 개발자 혼란 요소 제거
- 유지보수성 향상 