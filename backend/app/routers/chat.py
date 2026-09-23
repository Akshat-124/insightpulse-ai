from fastapi import APIRouter
from app.agent.orchestrator import AgentOrchestrator
from app.schemas.models import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/chat", tags=["Agent Chat"])

@router.post("", response_model=ChatResponse)
async def chat_with_analyst(payload: ChatRequest):
    """Processes natural language questions, runs SQL/anomalies/visualizations, and returns findings."""
    orchestrator = AgentOrchestrator.get_instance()
    session_id = payload.session_id or "default"
    response = orchestrator.process_query(payload.query, session_id=session_id)
    return response

@router.post("/clear")
async def clear_chat_history(session_id: str = "default"):
    """Resets conversation history for a given session."""
    orchestrator = AgentOrchestrator.get_instance()
    orchestrator.clear_session(session_id)
    return {"status": "cleared", "session_id": session_id}
