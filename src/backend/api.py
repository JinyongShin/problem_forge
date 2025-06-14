import requests

API_BASE_URL = "http://127.0.0.1:8000/"
APP_NAME = "agent"
USER_ID = "test_user"
SESSION_ID = "test-session"

def create_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID, state=None):
    url = f"{API_BASE_URL}apps/{app_name}/users/{user_id}/sessions/{session_id}"
    payload = {"state": state or {}}
    headers = {"Content-Type": "application/json"}
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"세션 생성 실패: {response.status_code}, {response.text}")
    return response.json()

def delete_session(app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID):
    url = f"{API_BASE_URL}apps/{app_name}/users/{user_id}/sessions/{session_id}"
    response = requests.delete(url)
    if response.status_code == 200 or response.status_code == 204:
        return True
    else:
        print(f"세션 삭제 실패: {response.status_code}, {response.text}")
        return False

def session_payload(user_text, app_name=APP_NAME, user_id=USER_ID, session_id=SESSION_ID):
    return {
        "appName": app_name,
        "userId": user_id,
        "sessionId": session_id,
        "newMessage": {
            "role": "user",
            "parts": [{
                "text": user_text
            }]
        }
    }

def send_query_sse(payload, streaming=False):
    url = API_BASE_URL + "run_sse"
    payload = dict(payload)
    payload["streaming"] = streaming
    headers = {"Content-Type": "application/json"}
    with requests.post(url, json=payload, headers=headers, stream=True) as response:
        assert response.status_code == 200
        for line in response.iter_lines(decode_unicode=True):
            if line and line.startswith("data: "):
                print(line)

if __name__ == "__main__":
    print(create_session(state={"key1": "value1", "key2": 42}))
    user_input = "안녕녕."
    print("\n/run_sse (streaming=False) 결과:")
    send_query_sse(session_payload(user_input), streaming=False)
    print("\n/run_sse (streaming=True) 결과:")
    send_query_sse(session_payload(user_input), streaming=True)
    print("\n세션 삭제 결과:")
    print(delete_session())