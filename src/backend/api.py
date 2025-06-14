from google.adk.cli.fast_api import get_fast_api_app
from google.adk.cli.utils.agent_loader import AgentLoader
import sys
import os

# sys.path에 src 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))
from src.backend.agent.agent import root_agent

# 커스텀 AgentLoader 정의
class CustomAgentLoader(AgentLoader):
    def __init__(self, agents_dir):
        super().__init__(agents_dir)

    def load_agent(self, agent_name):
        if agent_name == "problem_forge":
            return root_agent
        return super().load_agent(agent_name)

# monkey patch: fast_api.py 내부에서 사용할 agent_loader를 교체
import google.adk.cli.fast_api as fast_api_mod
fast_api_mod.AgentLoader = CustomAgentLoader

AGENTS_DIR = "agents"  # 실제 agents 폴더 경로로 필요시 수정
ALLOW_ORIGINS = ["*"]  # 개발 시 전체 허용, 배포 시 실제 도메인으로 제한

app = get_fast_api_app(
    agents_dir=AGENTS_DIR,
    allow_origins=ALLOW_ORIGINS,
    web=False,  # UI 필요시 True
)