# PDF 문제 파싱 로직 설명서

> **최종 업데이트**: 2025년 1월
> **버전**: 2.0 (Exercises 패턴 지원, Y좌표 기반 추출, 순서 보존)

## 개요
이 문서는 `preprocess.py` 파일의 PDF 문제 파싱 로직을 설명합니다. 
이 시스템은 수능특강 등의 문제집 PDF에서 개별 문제를 자동으로 추출하고 정제합니다.

## 주요 기능

### 1. PDF 텍스트 추출

#### 백엔드 (`extract_text_from_pdf`)
- **목적**: PDF 파일에서 전체 텍스트를 추출
- **사용 라이브러리**: PyPDF2
- **프로세스**:
  1. PDF 파일 존재 여부 확인
  2. 각 페이지에서 텍스트 추출
  3. 모든 페이지의 텍스트를 연결하여 반환

#### 프론트엔드 (개선됨)
- **사용 라이브러리**: pdf.js
- **Y좌표 기반 줄바꿈 처리**: 
  ```javascript
  // Y 좌표가 변경되면 새로운 줄로 인식
  if (lastY !== null && Math.abs(lastY - item.transform[5]) > 2) {
    pageLines.push(currentLine.join(' '));
    currentLine = [];
  }
  ```
- **장점**: PDF 구조를 더 정확하게 보존

### 2. 문제 분리 (`split_problems`)
개별 문제를 식별하고 분리하는 핵심 함수입니다.

#### 2.1 문항 코드 및 Exercises 패턴 기반 분리
```python
# 문항 코드 (XXXXX-XXXX) 또는 Exercises로 시작하는 문제 분리
pattern = r'(?=\d{5}-\d{4})|(?=Exercises\s*\n)'
```
- **패턴 설명**: 
  - `\d{5}-\d{4}`: 5자리 숫자 + 하이픈 + 4자리 숫자 (예: 23005-0001)
  - `Exercises\s*\n`: Exercises로 시작하는 문제
- **분리 방식**: 전방탐색(lookahead)을 사용하여 패턴을 포함한 채로 분리

#### 2.2 중복 제거 및 순서 보존
```python
problem_dict = {}
problem_order = []  # 문항 코드나 Exercises가 처음 나타난 순서를 저장
exercise_counter = 0  # Exercises 문제 카운터

for raw_problem in raw_problems:
    code_match = re.match(r'^(\d{5}-\d{4})', raw_problem)
    exercises_match = re.match(r'^Exercises', raw_problem)
    
    if code_match:
        code = code_match.group(1)
        # 같은 코드가 여러 번 나타나면 가장 긴 것을 선택
        if code in problem_dict:
            if len(raw_problem) > len(problem_dict[code]):
                problem_dict[code] = raw_problem
        else:
            problem_dict[code] = raw_problem
            problem_order.append(code)  # 처음 나타난 순서 기록
    elif exercises_match:
        # Exercises로 시작하는 문제들
        exercise_counter += 1
        code = f"EXERCISE_{exercise_counter:03d}"  # 가상의 코드 생성
        problem_dict[code] = raw_problem
        problem_order.append(code)
```
- **목적**: 
  - 같은 문항 코드가 여러 조각으로 분리된 경우 처리
  - Exercises 문제에 가상 코드 부여
  - PDF에 나타난 원래 순서 보존
- **방법**: 
  - 딕셔너리를 사용하여 각 코드별로 문제 저장
  - `problem_order` 리스트로 원래 순서 유지

#### 2.3 실제 문제 필터링
```python
problem_keywords = ['다음', '아래', 'Dear', '밑줄', '빈칸', '글의', '주어진']
```
- **최소 길이 조건**: 300자 이상
- **키워드 검사**: 처음 300자 내에 문제 키워드가 포함되어야 함
- **유효성 검증**: 실제 문제만 선별

#### 2.4 노이즈 제거 (개선됨)
```python
# 첫 번째 라인에 문항 코드나 Exercises가 있으면 무조건 보존
if lines and (re.match(r'^\d{5}-\d{4}', lines[0]) or lines[0].startswith('Exercises')):
    cleaned_lines.append(lines[0])
    start_idx = 1
else:
    start_idx = 0

stop_keywords = ['Words & Phrases', 'W\nords &', 'Solving Strategies', 
                'PartⅠ유형편', 'PartⅡ주제', 'PartⅢ테스트', 
                '정답과 해설', 'Quick Review', 'Academic Vocabulary']
```

**제거 대상**:
- 해설 섹션 (Words & Phrases, Solving Strategies 등)
- 페이지 번호 (정규표현식: `^\d+\s*$`)
- 책 메타정보 ("EBS 수능특강", "책1.indb")
- 빈 줄

**개선된 제거 방법**:
1. **문항 코드/Exercises 첫 줄 보존**: 필터링 전에 먼저 보존
2. **최소 5줄 수집 후 stop_keyword 체크**: 충분한 내용 확보
3. stop_keyword 발견 시에도 이미 수집된 내용은 유지
4. 각 라인별로 노이즈 패턴 검사 및 제거
5. 최종적으로 200자 이상인 문제만 유지

#### 2.5 순서 유지
```python
# 원래 PDF 순서를 유지하므로 별도 정렬 불필요
# cleaned_problems는 이미 problem_order 순서대로 추가됨
```
- **목적**: PDF에 나타난 원래 문제 순서 유지
- **방법**: `problem_order` 리스트 순서대로 처리하여 자동으로 순서 보존

## 처리 흐름도

```
PDF 파일
    ↓
[1. 텍스트 추출]
    - 백엔드: PyPDF2
    - 프론트엔드: pdf.js (Y좌표 기반 줄바꿈)
    ↓
전체 텍스트 (약 395,310자)
    ↓
[2. 패턴 기반 분리]
    - 문항 코드 패턴 (23005-0001)
    - Exercises 패턴
    ↓
원시 문제 조각들 (약 300개+)
    ↓
[3. 중복 제거 및 코드 부여]
    - 문항 코드: 중복 시 긴 것 선택
    - Exercises: 가상 코드 부여 (EXERCISE_001 등)
    - 원래 순서 보존
    ↓
고유 문제들 (약 250개)
    ↓
[4. 유효성 검증]
    - 300자 이상
    - 문제 키워드 포함
    ↓
[5. 노이즈 제거 (개선)]
    - 첫 줄 (문항코드/Exercises) 보존
    - 최소 5줄 수집 후 stop_keyword 체크
    - 해설 섹션 제거
    - 메타정보 제거
    ↓
[6. 최종 필터링]
    - 200자 이상만 유지
    ↓
[7. 순서 유지]
    - PDF 원래 순서 그대로 유지
    ↓
최종 정제된 문제들 (약 200개+)
```

## 성능 지표

### 최신 개선 후 성능
| 지표 | 이전 버전 | 최신 버전 | 개선 내용 |
|------|---------|---------|----------|
| 추출된 문제 수 | 약 130개 | 약 200개+ | Exercises 문제 추가 |
| 문항 코드 문제 | 130개 | 163개 | 개선된 파싱 |
| Exercises 문제 | 0개 | 50개+ | 새로 지원 |
| 정확도 | 높음 | 매우 높음 | 첫 줄 보존, 개선된 필터링 |
| 순서 정확도 | 코드 정렬 | PDF 순서 유지 | 원본 순서 보존 |
| 줄바꿈 처리 | 공백 연결 | Y좌표 기반 | 구조 정확도 향상 |

### 주요 개선사항
1. **Exercises 패턴 인식**: 문항 코드 없는 문제도 처리
2. **프론트엔드 PDF 추출 개선**: Y좌표 기반 줄바꿈으로 구조 보존
3. **첫 줄 보존 로직**: 문항 코드/Exercises 라인 무조건 보존
4. **stop_keyword 처리 개선**: 최소 5줄 수집 후 체크
5. **원본 순서 유지**: 정렬 대신 PDF 순서 그대로 보존
6. **가상 코드 부여**: Exercises 문제에 EXERCISE_XXX 코드 자동 생성

## 사용 예시

### 기본 사용법
```python
from preprocess import extract_text_from_pdf, split_problems

# PDF에서 텍스트 추출
pdf_text = extract_text_from_pdf("test.pdf")

# 문제 분리
problems = split_problems(pdf_text)

# 결과 출력
for i, problem in enumerate(problems, 1):
    print(f"문제 {i}:")
    print(problem[:200] + "...")  # 처음 200자만 출력
```

### 실행 결과 예시
```
PDF 파일에서 텍스트를 추출하는 중...
추출된 텍스트 길이: 395310 문자
[DEBUG] Exercises 문제 발견! 코드: EXERCISE_001, 길이: 911
[DEBUG] EXERCISE_001 미리보기: Exercises 다음 글의 목적으로 가장 적절한 것은? Dear Blue Light Theater...
문제 분리를 시작합니다...
총 213개의 문제가 분리되었습니다.
[백엔드] 문제 타입: 문항코드 163개, Exercises 50개, 기타 0개

--- 문제 1 ---
23005-0001
다음 글의 목적으로 가장 적절한 것은?
Dear Hylean Miller,
Hello, I'm Nelson Perkins, a teacher and swimming coach...

--- 문제 2 ---
Exercises
다음 글의 목적으로 가장 적절한 것은?
Dear Blue Light Theater,
Every year the Modern Art Association holds an awards night...
```

## 한계점 및 개선 방향

### 현재 한계점
1. **PDF 구조 의존성**: PyPDF2(백엔드), pdf.js(프론트) 라이브러리에 의존
2. **패턴 의존성**: 수능특강 형식과 Exercises 패턴에 특화됨
3. **이미지 문제**: 그래프나 도표가 포함된 문제는 텍스트만 추출
4. **stop_keywords 하드코딩**: 특정 키워드에 의존한 필터링

### 향후 개선 방향
1. **OCR 통합**: 이미지 기반 텍스트 추출 지원
2. **패턴 설정 파일**: 다양한 문제집 형식을 위한 설정 파일 도입
3. **머신러닝 활용**: 문제 경계 자동 학습 및 분류
4. **메타데이터 추출**: 문제 유형, 난이도, 과목 등 추가 정보 파싱
5. **동적 stop_keywords**: 문제집 종류에 따른 키워드 자동 설정
6. **더 많은 문제 패턴 지원**: Test, Quiz 등 다양한 섹션 인식

## 의존성

### 백엔드
- Python 3.x
- PyPDF2: PDF 텍스트 추출 (백엔드)
- re (정규표현식): 내장 모듈

### 프론트엔드
- pdf.js (pdfjs-dist): PDF 텍스트 추출 (프론트엔드)
- React: UI 프레임워크

## 라이선스
이 코드는 프로젝트의 라이선스를 따릅니다.
