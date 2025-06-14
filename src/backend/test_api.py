from fastapi.testclient import TestClient
from api import app

def test_generate_question():
    client = TestClient(app)
    payload = {
        "input": """
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
        """,
        "user_id": "test_user",
        "session_id": "test-session",
        "app_name": "problem_forge"
    }
    response = client.post("/generate-question", json=payload)
    print("Status code:", response.status_code)
    print("Response:", response.text)
    assert response.status_code == 200
    data = response.json()
    assert "result" in data
    print("API 응답:", data["result"])

if __name__ == "__main__":
    test_generate_question() 