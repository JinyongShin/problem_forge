import re

def split_problems(text: str) -> list[str]:
    """
    주어진 텍스트에서 정규표현식을 사용하여 개별 문제들을 분리합니다.
    '2023학년도'와 같은 학년도 표시 또는 '23005-0001'과 같은 문항 코드를 기준으로 분할합니다.

    Args:
        text (str): 분리할 전체 텍스트.

    Returns:
        list[str]: 각 문제가 문자열로 포함된 리스트.
    """
    if not text or not text.strip():
        return []

    # 문제 시작을 알리는 신뢰성 높은 패턴:
    # 1. 'YYYY학년도' (예: 2023학년도)
    # 2. 문항 코드 'XXXXX-XXXX' (예: 23005-0001)
    # 3. 단순 번호 패턴 (예: 18., 19.)
    # 이 패턴들 중 하나라도 나타나면 새로운 문제의 시작으로 간주합니다.
    # (?=...)는 분리자로 사용된 문자열을 결과에 포함시키는 전방탐색(lookahead) 구문입니다.
    pattern = r'(?=\d{4}학년도|\d{5}-\d{4}|^\d+\.\s)'

    # 정규표현식으로 텍스트 분리
    problems = re.split(pattern, text, flags=re.MULTILINE)

    # 분리 후 생길 수 있는 빈 문자열이나 공백만 있는 문자열 제거
    # 그리고 첫 번째 요소가 유효한 문제 시작 패턴을 포함하지 않는 머리말일 경우 제거
    cleaned_problems = []
    for p in problems:
        p_stripped = p.strip()
        if p_stripped:
            # 실제 문제 내용이 있는지 확인 (최소한의 내용이 있는지만 체크)
            if len(p_stripped.split()) > 2:  # 5에서 2로 변경하여 짧은 문제도 포함
                 cleaned_problems.append(p_stripped)

    return cleaned_problems

if __name__ == '__main__':
    # test.pdf의 OCR 결과를 기반으로 한 샘플 텍스트
    sample_text = """
수능특강
영어영역 영어

이 책의 구성과 특징 Structure

Gateway
2023학년도 6월 모의평가 18번
23005-0001
다음 글의 목적으로 가장 적절한 것은?
Dear Hylean Miller,
Hello, I’m Nelson Perkins, a teacher and swimming coach at Broomstone High 
School. Last week, I made a reservation for one of your company’s swimming pools 
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
artists in our state. For this year’s program, we are featuring new and progressive artistic 
groups like yours.
① 새로 발매된 앨범을 광고하려고
② 수상자로 선정된 것을 알리려고
"""
    separated_problems = split_problems(sample_text)
    print(f"총 {len(separated_problems)}개의 문제가 분리되었습니다.")
    for i, problem in enumerate(separated_problems, 1):
        print(f"\n--- 문제 {i} ---\n")
        print(problem)
