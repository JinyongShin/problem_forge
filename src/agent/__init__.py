from google.adk.agents import LlmAgent, ParallelAgent
from google.adk.tools import agent_tool
from agent.instruction import (
    agent_emotion_atmosphere_guesser_instruction,
    agent_implied_meaning_finder_instruction,
    agent_blank_inference_phrase_instruction,
    agent_unsuitable_sentence_finder_instruction,
    agent_paragraph_order_sorter_instruction,
    agent_sentence_insertion_locator_instruction,
    agent_grammar_vocabulary_error_spotter_instruction,
    agent_summary_blank_inference_word_instruction,
    sat_problem_variant_generator_master_agent_instruction,
)

model = "gemini-2.0-flash"

# 심경/분위기 파악 문제 생성 에이전트
emotion_atmosphere_agent = LlmAgent(
    name="emotion_atmosphere_agent",
    model=model,
    description="심경/분위기 파악 변형 문제를 생성하는 assistant",
    instruction=agent_emotion_atmosphere_guesser_instruction
)

# 밑줄 친 표현의 맥락적 의미 파악 문제 생성 에이전트
implied_meaning_agent = LlmAgent(
    name="implied_meaning_agent",
    model=model,
    description="밑줄 친 표현의 맥락적 의미 파악 변형 문제를 생성하는 assistant",
    instruction=agent_implied_meaning_finder_instruction
)

# 빈칸 추론(구문) 문제 생성 에이전트
blank_inference_phrase_agent = LlmAgent(
    name="blank_inference_phrase_agent",
    model=model,
    description="빈칸 추론(구문) 변형 문제를 생성하는 assistant",
    instruction=agent_blank_inference_phrase_instruction
)

# 글 흐름에 부적절한 문장 찾기 문제 생성 에이전트
unsuitable_sentence_agent = LlmAgent(
    name="unsuitable_sentence_agent",
    model=model,
    description="글 흐름에 부적절한 문장 찾기 변형 문제를 생성하는 assistant",
    instruction=agent_unsuitable_sentence_finder_instruction
)

# 글 순서 맞추기 문제 생성 에이전트
paragraph_order_agent = LlmAgent(
    name="paragraph_order_agent",
    model=model,
    description="글 순서 맞추기 변형 문제를 생성하는 assistant",
    instruction=agent_paragraph_order_sorter_instruction
)

# 글 흐름에 맞게 문장 끼워넣기 문제 생성 에이전트
sentence_insertion_agent = LlmAgent(
    name="sentence_insertion_agent",
    model=model,
    description="글 흐름에 맞게 문장 끼워넣기 변형 문제를 생성하는 assistant",
    instruction=agent_sentence_insertion_locator_instruction
)

# 어법·어휘 상 틀린 표현 찾기 문제 생성 에이전트
grammar_vocabulary_error_agent = LlmAgent(
    name="grammar_vocabulary_error_agent",
    model=model,
    description="어법·어휘 상 틀린 표현 찾기 변형 문제를 생성하는 assistant",
    instruction=agent_grammar_vocabulary_error_spotter_instruction
)

# 지문 요약에서의 빈칸 추론(단어) 문제 생성 에이전트
summary_blank_inference_word_agent = LlmAgent(
    name="summary_blank_inference_word_agent",
    model=model,
    description="지문 요약에서의 빈칸 추론(단어) 변형 문제를 생성하는 assistant",
    instruction=agent_summary_blank_inference_word_instruction
)

parallel_agent = ParallelAgent(
    name="parallel_agent",
    description="다양한 변형 문제 생성 에이전트",
    sub_agents=[
        emotion_atmosphere_agent,
        implied_meaning_agent,
        blank_inference_phrase_agent,
        unsuitable_sentence_agent,
        paragraph_order_agent,
        sentence_insertion_agent,
        grammar_vocabulary_error_agent,
        summary_blank_inference_word_agent,
    ]
)

master_agent = LlmAgent(
    name="master_agent",
    model=model,
    description="수능 스타일 영어 지문 또는 문제를 기반으로 다양한 유형의 문제를 생성하는 assistant",
    instruction=sat_problem_variant_generator_master_agent_instruction,
    tools=[
        agent_tool.AgentTool(parallel_agent),
    ]
)

root_agent = LlmAgent(
    name="root_agent",
    model=model,
    description="사용자와 대화하고 수능 기출 지문을 기반으로 다양한 유형의 문제를 생성하는 assistant",
    instruction="""
사용자가 문제를 입력하거나 문제 변형을 요청하면 마스터 에이전트를 호출하여 문제 변형을 생성합니다.
항상 가능한 모든 유형으로 변환합니다.
문제 변형 관련 요청이 아닌경우 지문이나 기출 문제를 제공하도록 유도합합니다.
입력된 문제 혹은 지문에 대해 문제를 변형하여 제공하는 요청만 받아들입니다.

**항상** 생성된 모든 변형 문제와 답, 해설을 제공합니다.
""",
    tools=[
        agent_tool.AgentTool(master_agent),
    ]
)


