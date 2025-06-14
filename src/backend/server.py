from google.adk.cli.fast_api import get_fast_api_app

app = get_fast_api_app(
    agents_dir="agent",  # 실제 agent 디렉토리 경로
    web=False,            # UI가 필요하면 True
    allow_origins=["*"], # CORS 허용
)

# 실행: uvicorn server:app --reload 