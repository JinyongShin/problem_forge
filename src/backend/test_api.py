import pytest
from fastapi.testclient import TestClient
import sys
import os

# 'src' 디렉토리를 Python 경로에 추가하여 모듈 임포트 허용
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.server import app

@pytest.fixture
def client():
    """FastAPI 앱을 위한 TestClient 인스턴스를 생성합니다."""
    return TestClient(app)

def test_login_success(client):
    """올바른 자격 증명으로 로그인 성공을 테스트합니다."""
    response = client.post("/api/login", json={"id": "root", "pw": "1234!"})
    assert response.status_code == 200
    assert response.json() == {"success": True}

def test_login_failure(client):
    """잘못된 자격 증명으로 로그인 실패를 테스트합니다."""
    response = client.post("/api/login", json={"id": "root", "pw": "wrongpassword"})
    assert response.status_code == 401
    assert response.json()["success"] is False

def test_split_problems_multiple(client):
    """여러 문제가 포함된 텍스트 분리를 테스트합니다."""
    text = "18. This is the first problem.\n\n19. This is the second problem."
    response = client.post("/api/split-problems", json={"text": text})
    assert response.status_code == 200
    data = response.json()
    assert "problems" in data
    assert len(data["problems"]) == 2
    assert "18. This is the first problem." in data["problems"][0]
    assert "19. This is the second problem." in data["problems"][1]

def test_split_problems_no_delimiter(client):
    """유효한 문제 구분자가 없는 텍스트 분리를 테스트합니다."""
    text = "This is a single block of text without standard numbering."
    response = client.post("/api/split-problems", json={"text": text})
    assert response.status_code == 200
    data = response.json()
    assert len(data["problems"]) == 1
    assert data["problems"][0] == text



# /run 엔드포인트 테스트는 비동기 특성과 AgentSession 의존성으로 인해 더 복잡합니다.
# 완전한 통합 테스트가 필요하지만, 지금은 다른 엔드포인트들이 작동하는지 확인합니다.

def test_run_endpoint_integration(client):
    """
    /run 엔드포인트를 위한 고수준 통합 테스트입니다.
    실제 문제 텍스트를 전송하고 에이전트로부터 유효하고 비어있지 않은 응답을 받는지 확인합니다.
    참고: 이 테스트는 실제 에이전트를 호출하므로 실행하는 데 몇 초가 걸릴 수 있습니다.
    """
    # 먼저 세션 생성
    session_response = client.post(
        "/apps/agent/users/test_user/sessions/test_session_run",
        json={"state": {}}
    )
    assert session_response.status_code == 200
    
    payload = {
        "app_name": "agent",
        "user_id": "test_user",
        "session_id": "test_session_run",
        "new_message": {
            "role": "user",
            "parts": [{
                "text": """ 테스트 메세지."""
            }]
        }
    }
    
    response = client.post("/run", json=payload)
    
    # /run 엔드포인트가 정상적으로 응답하는지만 확인
    assert response.status_code == 200
    data = response.json()
    
    # 응답이 리스트 형태이고 내용이 있는지만 확인
    assert isinstance(data, list)
    assert len(data) > 0
