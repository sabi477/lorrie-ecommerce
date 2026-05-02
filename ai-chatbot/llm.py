from langchain_openai import ChatOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

llm = ChatOpenAI(
    model=os.getenv("MODEL_NAME", "openai/gpt-4o-mini"),
    openai_api_key=os.getenv("OPENROUTER_API_KEY"),
    openai_api_base="https://openrouter.ai/api/v1",
    default_headers={
        "HTTP-Referer": "http://localhost:8080",
        "X-Title": "ECommerce Chatbot"
    },
    streaming=False,
    request_timeout=30,
)
