import re
import os
from PyPDF2 import PdfReader

def split_problems(text: str) -> list[str]:
    """
    주어진 텍스트에서 정규표현식을 사용하여 개별 문제들을 분리합니다.
    '23005-0001'과 같은 문항 코드를 기준으로 분할하고, 중복을 제거합니다.

    Args:
        text (str): 분리할 전체 텍스트.

    Returns:
        list[str]: 각 문제가 문자열로 포함된 리스트.
    """
    if not text or not text.strip():
        return []

    # 문항 코드 패턴과 Exercises 패턴 사용
    # 문항 코드 (XXXXX-XXXX) 또는 Exercises로 시작하는 문제 분리
    pattern = r'(?=\d{5}-\d{4})|(?=Exercises\s*\n)'
    
    # 정규표현식으로 텍스트 분리
    raw_problems = re.split(pattern, text, flags=re.MULTILINE)
    
    # 문항 코드별로 문제를 그룹화하여 중복 제거 (원래 순서 보존)
    problem_dict = {}
    problem_order = []  # 문항 코드나 Exercises가 처음 나타난 순서를 저장
    exercise_counter = 0  # Exercises 문제 카운터
    
    print(f"[DEBUG] raw_problems 개수: {len(raw_problems)}")
    
    for idx, raw_problem in enumerate(raw_problems):
        raw_problem = raw_problem.strip()
        if not raw_problem:
            continue
            
        # 문항 코드 추출
        code_match = re.match(r'^(\d{5}-\d{4})', raw_problem)
        exercises_match = re.match(r'^Exercises', raw_problem)
        
        if code_match:
            code = code_match.group(1)
            
            # 이미 해당 코드의 문제가 있으면 더 긴 것을 선택
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
            print(f"[DEBUG] Exercises 문제 발견! 코드: {code}, 길이: {len(raw_problem)}")
            # 미리보기 추가
            preview = raw_problem.replace('\n', ' ')[:150]  # 줄바꿈을 공백으로 바꾸고 150자까지
            print(f"[DEBUG] {code} 미리보기: {preview}...")
        else:
            # 문항 코드도 Exercises도 없는 경우
            if len(raw_problem) > 100:  # 100자 이상인 경우만
                print(f"[DEBUG] 문항 코드/Exercises 없는 텍스트 발견 (인덱스 {idx}, 길이 {len(raw_problem)}자)")
                print(f"[DEBUG] 처음 100자: {raw_problem[:100]}...")
                
                # "Part Ⅲ 테스트편" 또는 "정답과 해설"이 포함되어 있는지 확인
                if "Part Ⅲ 테스트편" in raw_problem or "정답과 해설" in raw_problem:
                    print(f"[DEBUG] ⚠️ 정답 해설 섹션 발견!")
    
    # 실제 문제만 필터링 (충분한 내용이 있는 것) - 원래 순서 유지
    cleaned_problems = []
    problem_keywords = ['다음', '아래', 'Dear', '밑줄', '빈칸', '글의', '주어진']
    
    # problem_order 순서대로 처리하여 원래 순서 유지
    print(f"[DEBUG] problem_order에 있는 문항 코드들: {problem_order[:10]}")  # 처음 10개
    
    for code in problem_order:
        problem = problem_dict[code]
        
        # 디버깅: 특정 문제들 확인 (처음 3개 Exercises만)
        if code == "23005-0001" or (code.startswith("EXERCISE_") and int(code.split('_')[1]) <= 3):
            print(f"\n[DEBUG] === {code} 상세 분석 ===")
            print(f"[DEBUG] 길이: {len(problem)}자")
            print(f"[DEBUG] 처음 200자: {problem[:200]}")
            # 줄바꿈 개수 확인
            lines_count = problem.count('\n')
            print(f"[DEBUG] 줄바꿈 개수: {lines_count}")
            # 처음 3줄 확인
            first_lines = problem.split('\n')[:3]
            for i, line in enumerate(first_lines):
                print(f"[DEBUG] 라인 {i}: {line[:100] if len(line) > 100 else line}")
        
        # 최소 300자 이상이고 문제 키워드가 포함된 경우만 실제 문제로 간주
        if len(problem) > 300:
            # 처음 300자 내에 문제 키워드가 있는지 확인
            problem_start = problem[:300]
            if any(keyword in problem_start for keyword in problem_keywords):
                # 문제를 섹션별로 분리하여 실제 문제 부분만 추출
                lines = problem.split('\n')
                cleaned_lines = []
                
                # 첫 번째 라인에 문항 코드나 Exercises가 있으면 무조건 보존
                if lines and (re.match(r'^\d{5}-\d{4}', lines[0]) or lines[0].startswith('Exercises')):
                    cleaned_lines.append(lines[0])
                    start_idx = 1
                else:
                    start_idx = 0
                
                # Gateway는 문제 섹션 제목이므로 제거하지 않음
                stop_keywords = ['Words & Phrases', 'W\nords &', 'Solving Strategies', 
                                'PartⅠ유형편', 'PartⅡ주제', 'PartⅢ테스트', 
                                '정답과 해설', 'Quick Review', 'Academic Vocabulary']
                
                for idx in range(start_idx, len(lines)):
                    line = lines[idx]
                    
                    # 종료 키워드 발견 시 중단 (단, 충분한 내용이 수집된 후에만)
                    if len(cleaned_lines) > 5:  # 최소 5줄 이상 수집한 후에만 stop_keyword 체크
                        for keyword in stop_keywords:
                            if keyword in line:
                                if code == "23005-0001" or code.startswith("EXERCISE_"):
                                    print(f"[DEBUG] {code}에서 stop_keyword '{keyword}' 발견! 라인 {idx}: {line[:100]}")
                                    print(f"[DEBUG] 이미 수집된 라인 수: {len(cleaned_lines)}")
                                # stop_keyword를 발견해도 이미 수집된 내용은 유지
                                break
                        else:
                            # 노이즈 라인 제거 (너무 짧은 라인이나 페이지 번호 등)
                            if line.strip() and \
                               not re.match(r'^\d+\s*$', line.strip()) and \
                               'EBS 수능특강' not in line and \
                               '책1.indb' not in line:
                                cleaned_lines.append(line)
                            continue
                        break  # stop_keyword 발견 시 루프 종료
                    else:
                        # 처음 5줄은 stop_keyword 체크 없이 추가
                        if line.strip() and \
                           not re.match(r'^\d+\s*$', line.strip()) and \
                           'EBS 수능특강' not in line and \
                           '책1.indb' not in line:
                            cleaned_lines.append(line)
                
                # cleaned_lines를 합쳐서 cleaned_problem 생성
                cleaned_problem = '\n'.join(cleaned_lines).strip()
                
                if cleaned_problem and len(cleaned_problem) > 200:  # 최소 200자
                    if code == "23005-0001" or code.startswith("EXERCISE_"):
                        print(f"[DEBUG] {code}이(가) cleaned_problems에 추가됨!")
                    # 문항 코드나 Exercises가 cleaned_problem에 포함되어 있는지 확인
                    if not (re.match(r'^\d{5}-\d{4}', cleaned_problem) or cleaned_problem.startswith('Exercises')):
                        print(f"[DEBUG] ⚠️ 코드 {code}의 cleaned_problem에 문항 코드/Exercises가 없음!")
                        print(f"[DEBUG] cleaned_problem 처음 100자: {cleaned_problem[:100]}")
                    cleaned_problems.append(cleaned_problem)
                elif code == "23005-0001" or code.startswith("EXERCISE_"):
                    print(f"[DEBUG] {code}이(가) 추가되지 않음! cleaned_problem 길이: {len(cleaned_problem) if cleaned_problem else 0}")
    
    # 원래 PDF 순서를 유지하므로 별도 정렬 불필요
    # cleaned_problems는 이미 problem_order 순서대로 추가됨
    
    print(f"[DEBUG] 최종 문제 개수: {len(cleaned_problems)}")
    if cleaned_problems:
        print(f"[DEBUG] 첫 번째 문제 시작: {cleaned_problems[0][:100]}...")
        # 첫 번째 문제가 문항 코드나 Exercises로 시작하는지 확인
        first_problem_code = re.match(r'^(\d{5}-\d{4})', cleaned_problems[0])
        if first_problem_code:
            print(f"[DEBUG] 첫 번째 문제의 문항 코드: {first_problem_code.group(1)}")
        elif cleaned_problems[0].startswith('Exercises'):
            print(f"[DEBUG] 첫 번째 문제는 Exercises 문제")
        else:
            print(f"[DEBUG] ⚠️ 첫 번째 문제에 문항 코드/Exercises가 없음!")
        
        # 처음 5개 문제의 시작 부분 확인
        print(f"\n[DEBUG] === 처음 5개 문제 미리보기 ===")
        for i, problem in enumerate(cleaned_problems[:5]):
            # 문항 코드나 Exercises 확인
            code_match = re.match(r'^(\d{5}-\d{4})', problem)
            if code_match:
                prob_type = f"문항코드 {code_match.group(1)}"
            elif problem.startswith('Exercises'):
                prob_type = "Exercises"
            else:
                prob_type = "기타"
            
            preview = problem.replace('\n', ' ')[:120]
            print(f"[DEBUG] 문제 {i+1} ({prob_type}): {preview}...")
            
        # "Part Ⅲ 테스트편"이나 "정답과 해설"이 포함되어 있는지 확인
        for i, problem in enumerate(cleaned_problems[:3]):  # 처음 3개만 확인
            if "Part" in problem and "테스트편" in problem:
                print(f"[DEBUG] ⚠️ 문제 {i+1}에 Part/테스트편 포함!")
            if "정답" in problem and "해설" in problem:
                print(f"[DEBUG] ⚠️ 문제 {i+1}에 정답/해설 포함!")
    
    return cleaned_problems

def extract_text_from_pdf(pdf_path: str) -> str:
    """
    PDF 파일에서 텍스트를 추출합니다.
    
    Args:
        pdf_path (str): PDF 파일 경로
        
    Returns:
        str: 추출된 텍스트
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF 파일을 찾을 수 없습니다: {pdf_path}")
    
    try:
        reader = PdfReader(pdf_path)
        text = ""
        
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    
    except Exception as e:
        raise Exception(f"PDF 텍스트 추출 중 오류 발생: {str(e)}")

if __name__ == '__main__':
    # 실제 PDF 파일에서 텍스트를 추출하여 문제 분리 테스트
    pdf_path = "test.pdf"
    
    try:
        # PDF에서 텍스트 추출
        print("PDF 파일에서 텍스트를 추출하는 중...")
        extracted_text = extract_text_from_pdf(pdf_path)
        print(f"추출된 텍스트 길이: {len(extracted_text)} 문자")
        print(f"추출된 텍스트 미리보기 (처음 200자):\n{extracted_text[:200]}...\n")
        
        # 문제 분리 실행
        print("문제 분리를 시작합니다...")
        separated_problems = split_problems(extracted_text)
        print(f"총 {len(separated_problems)}개의 문제가 분리되었습니다.\n")
        
        # 분리된 문제들 출력
        for i, problem in enumerate(separated_problems, 1):
            print(f"--- 문제 {i} ---")
            # # 각 문제의 처음 100자만 미리보기로 출력
            # preview = problem[:100].replace('\n', ' ')
            # print(f"미리보기: {preview}...")
            print("문제 내용")
            print(problem)
            print(f"전체 길이: {len(problem)} 문자\n")
            print("--------------------------------")
            if i == 10:
                break
            
    except FileNotFoundError as e:
        print(f"파일 오류: {e}")
        print("현재 디렉토리에 test.pdf 파일이 있는지 확인해주세요.")
    except Exception as e:
        print(f"처리 중 오류 발생: {e}")
        print("PDF 파일 처리에 실패했습니다. 파일이 암호화되어 있거나 손상되었을 수 있습니다.")
        
        # 오류 발생 시 기존 샘플 텍스트로 테스트 (주석 처리)
        """
        print("\n샘플 텍스트로 테스트를 진행합니다...")
        sample_text = \"\"\"
수능특강
영어영역 영어

이 책의 구성과 특징 Structure

Gateway
2023학년도 6월 모의평가 18번
23005-0001
다음 글의 목적으로 가장 적절한 것은?
Dear Hylean Miller,
Hello, I'm Nelson Perkins, a teacher and swimming coach at Broomstone High 
School. Last week, I made a reservation for one of your company's swimming pools 
for our summer swim camp. However, due to its popularity, thirty more students are 
coming to the camp than we expected, so we need one more swimming pool for them. 
The rental section on your website says that there are two other swimming pools 
during the summer season: the Splash Pool and the Rainbow Pool. Please let me know 
if an additional rental would be possible. Thank you in advance.
Best Wishes,
Nelson Perkins
① 수영 캠프 참가 날짜를 변경하려고
② 수영장 수용 가능 인원을 확인하려고
③ 수영 캠프 등록 방법에 대해 알아보려고
④ 수영장 추가 대여 가능 여부를 문의하려고
⑤ 수영장 대여 취소에 따른 환불을 요청하려고

Exercises
다음 글의 목적으로 가장 적절한 것은?
23005-0002
Dear Blue Light Theater,
Every year the Modern Art Association holds an awards night to honor accomplished 
artists in our state. For this year's program, we are featuring new and progressive artistic 
groups like yours.
① 새로 발매된 앨범을 광고하려고
② 수상자로 선정된 것을 알리려고
\"\"\"
        separated_problems = split_problems(sample_text)
        print(f"총 {len(separated_problems)}개의 문제가 분리되었습니다.")
        for i, problem in enumerate(separated_problems, 1):
            print(f"\n--- 문제 {i} ---\n")
            print(problem)
        """
