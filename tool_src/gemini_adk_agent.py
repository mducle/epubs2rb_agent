"""
STFC Research & Beamtime Inspector Gemini Agent (Google ADK)
============================================================
Implements a Gemini AI Agent and Multi-Agent System using the official
Google Agent Development Kit (ADK) (`google-adk` and `google-genai`).

The agent is equipped with all tools from this repository:
1. `search_stfc_publications`: Search STFC ePubs repository.
2. `download_stfc_dataset`: Bulk export publications to disk as CSV/RIS.
3. `extract_publication_dois`: Extract and normalize publication DOIs.
4. `get_stfc_departments_and_types`: Retrieve valid STFC facility codes and publication types.
5. `extract_rb_experiment_numbers`: Unified extractor for beamtime proposal numbers (RB#######).
6. `extract_rb_from_doi`: Deep metadata/OpenAlex/Europe PMC extraction of RB proposal numbers.
7. `extract_rb_from_pdf`: Page-by-page extraction of RB proposal numbers from PDF files.
"""

import asyncio
import os
import sys
import uuid
from typing import Any, AsyncGenerator, Dict, Generator, List, Optional

from google.adk.agents import LlmAgent
from google.adk.runners import InMemoryRunner
from google.adk.sessions import InMemorySessionService
from google.genai import types

# Import repository tools
from tool_src.stfc_epubs_tool import (
    search_stfc_publications,
    download_stfc_dataset,
    extract_publication_dois,
    get_stfc_departments_and_types,
)
from tool_src.rb_extractor_tool import (
    extract_rb_experiment_numbers,
    extract_rb_from_doi,
    extract_rb_from_pdf,
    scan_text_for_rb,
)
from tool_src.skills import (
    create_stfc_skill_toolset,
    create_discovery_skill_toolset,
    create_beamtime_skill_toolset,
    load_all_stfc_skills,
)

DEFAULT_MODEL = "gemini-2.5-flash"

STFC_AGENT_INSTRUCTION = """You are an expert scientific research assistant and beamtime auditor for the UK Science and Technology Facilities Council (STFC) and its associated national user facilities:
- ISIS Pulsed Neutron and Muon Source (Rutherford Appleton Laboratory - RAL)
- Diamond Light Source (synchrotron facility)
- Central Laser Facility (CLF)
- Scientific Computing Department / Daresbury Laboratory (DL)

Your primary objectives are:
1. Discovering scientific research publications, facility outputs, technical reports, and experimental datasets from the STFC ePubs repository.
2. Extracting and canonicalizing Digital Object Identifiers (DOIs) from publications.
3. Identifying and auditing specific facility experiment proposal numbers of the form `RB#######` (e.g. RB1910243) and formal beamtime allocation acknowledgements from publication metadata, open-access full texts, and PDF manuscripts.
4. Exporting datasets to local disk when requested.

Tool Usage Guidelines:
- Use `search_stfc_publications` to query publications by keywords, author names, year, facility, or topic. Always keep queries concise.
- Use `get_stfc_departments_and_types` to check valid facility names (e.g. 'ISIS', 'RAL', 'Diamond') or publication types if unsure.
- Use `extract_publication_dois` to extract canonical DOIs (10.xxxx/yyyy) from publication lists or CSV datasets.
- Use `extract_rb_from_doi` when you have a paper's DOI or DOI URL and need to uncover the beamtime experiment numbers (RB numbers) under which the beamtime was awarded.
- Use `extract_rb_from_pdf` when given a local path or remote URL to a PDF paper or technical report to scan page-by-page.
- Use `extract_rb_experiment_numbers` as a flexible unified extractor when the input might be a DOI, PDF path, or raw text.
- Use `download_stfc_dataset` when the user explicitly requests exporting or saving bulk datasets to a file.

Provide clear, structured, and factual responses. When reporting beamtime allocations, always specify the experiment number (e.g. RB1910243), the attributed facility (e.g. ISIS, Diamond), and quote the supporting sentence where available.
"""

DISCOVERY_AGENT_INSTRUCTION = """You are a specialist literature discovery agent for the STFC ePubs institutional repository.
Your role is to search for publications, filter by facility and year, parse and extract valid publication DOIs, and export datasets.
Always provide the discovered titles, publication years, work IDs, and DOIs to the lead coordinator.
"""

BEAMTIME_AGENT_INSTRUCTION = """You are a specialist beamtime allocation and proposal auditor for STFC facilities.
Your role is to inspect publication DOIs, PDF files, and manuscript texts to extract beamtime proposal experiment numbers (`RB#######`, e.g. RB1910243).
Identify whether allocations are explicitly confirmed ('supported by beamtime allocation RB#######') or general mentions, and note the facility attribution (e.g. ISIS, Diamond).
"""


def create_stfc_research_agent(
    model: str = DEFAULT_MODEL,
    instruction: Optional[str] = None,
    use_skills: bool = True,
) -> LlmAgent:
    """
    Creates a unified Gemini LLM Agent using Google ADK equipped with STFC skills
    (or legacy direct tools) for STFC literature discovery and RB beamtime auditing.

    Args:
        model: Gemini model version (default: 'gemini-2.5-flash').
        instruction: Optional custom system instructions.
        use_skills: If True (default), equips the agent with Google ADK `SkillToolset`
                    incorporating `stfc-epubs-discovery` and `rb-experiment-extractor`.
                    If False, loads direct function tools.

    Returns:
        Configured Google ADK LlmAgent instance.
    """
    if use_skills:
        tools = [create_stfc_skill_toolset()]
    else:
        tools = [
            search_stfc_publications,
            download_stfc_dataset,
            extract_publication_dois,
            get_stfc_departments_and_types,
            extract_rb_experiment_numbers,
            extract_rb_from_doi,
            extract_rb_from_pdf,
        ]

    return LlmAgent(
        name="stfc_research_agent",
        description="Unified research agent for STFC literature search and facility beamtime proposal auditing.",
        model=model,
        instruction=instruction or STFC_AGENT_INSTRUCTION,
        tools=tools,
        generate_content_config=types.GenerateContentConfig(
            temperature=0.2,
        ),
    )


def create_stfc_skill_agent(
    model: str = DEFAULT_MODEL,
    instruction: Optional[str] = None,
) -> LlmAgent:
    """Convenience alias to create an STFC research agent driven by Agent Skills."""
    return create_stfc_research_agent(model=model, instruction=instruction, use_skills=True)


def create_stfc_multi_agent_system(
    model: str = DEFAULT_MODEL,
    use_skills: bool = True,
) -> LlmAgent:
    """
    Creates a hierarchical multi-agent system using Google ADK's sub-agent architecture:
    1. `stfc_discovery_agent`: Dedicated to repository searching & DOI extraction.
    2. `rb_beamtime_agent`: Dedicated to DOI & PDF experiment proposal auditing.
    3. `stfc_lead_coordinator`: Root agent coordinating delegation between the sub-agents.

    Args:
        model: Gemini model version (default: 'gemini-2.5-flash').
        use_skills: If True (default), equips sub-agents with dedicated SkillToolsets.

    Returns:
        The root coordinator LlmAgent equipped with the specialized sub-agents.
    """
    if use_skills:
        discovery_tools = [create_discovery_skill_toolset()]
        beamtime_tools = [create_beamtime_skill_toolset()]
    else:
        discovery_tools = [
            search_stfc_publications,
            download_stfc_dataset,
            extract_publication_dois,
            get_stfc_departments_and_types,
        ]
        beamtime_tools = [
            extract_rb_experiment_numbers,
            extract_rb_from_doi,
            extract_rb_from_pdf,
        ]

    # 1. Discovery Sub-Agent
    discovery_agent = LlmAgent(
        name="stfc_discovery_agent",
        description="Specialist agent that searches STFC ePubs repository and extracts publication DOIs.",
        model=model,
        instruction=DISCOVERY_AGENT_INSTRUCTION,
        tools=discovery_tools,
    )

    # 2. Beamtime Auditor Sub-Agent
    beamtime_agent = LlmAgent(
        name="rb_beamtime_agent",
        description="Specialist auditor that extracts beamtime proposal experiment numbers (RB#######) from DOIs and PDFs.",
        model=model,
        instruction=BEAMTIME_AGENT_INSTRUCTION,
        tools=beamtime_tools,
    )

    # 3. Root Coordinator Agent
    coordinator_agent = LlmAgent(
        name="stfc_lead_coordinator",
        description="Lead research coordinator delegating tasks to discovery and beamtime auditing sub-agents.",
        model=model,
        instruction="""You are the lead coordinator for STFC scientific investigations.
Coordinate research requests by delegating to:
- `stfc_discovery_agent` to query publications, facilities, and extract DOIs.
- `rb_beamtime_agent` to analyze DOIs and PDF papers for facility experiment numbers (`RB#######`).
Synthesize the findings from your sub-agents into a comprehensive, well-structured final report.""",
        sub_agents=[discovery_agent, beamtime_agent],
        generate_content_config=types.GenerateContentConfig(
            temperature=0.2,
        ),
    )

    return coordinator_agent


class StfcAgentRunner:
    """
    High-level runner managing sessions, API keys, and execution for Google ADK agents.
    """

    def __init__(
        self,
        agent: Optional[LlmAgent] = None,
        model: str = DEFAULT_MODEL,
        app_name: str = "stfc_research_app",
    ):
        self.agent = agent or create_stfc_research_agent(model=model)
        self.app_name = app_name
        self.session_service = InMemorySessionService()
        self.runner = InMemoryRunner(agent=self.agent, app_name=self.app_name)

    @staticmethod
    def check_api_key() -> bool:
        """Checks if a Gemini API key is configured in the environment."""
        return bool(
            os.environ.get("GEMINI_API_KEY")
            or os.environ.get("GOOGLE_API_KEY")
            or os.environ.get("VERTEXAI_PROJECT")
        )

    async def create_session(self, user_id: str = "user", session_id: Optional[str] = None) -> str:
        """Initializes a new session in the ADK session service."""
        sid = session_id or str(uuid.uuid4())
        await self.runner.session_service.create_session(
            app_name=self.runner.app_name,
            user_id=user_id,
            session_id=sid,
        )
        return sid

    def run(
        self,
        query: str,
        user_id: str = "default_user",
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Synchronously runs a prompt through the ADK agent runner.

        Args:
            query: User's question or instruction.
            user_id: Identifier for the user.
            session_id: Optional existing session ID; creates a new one if None.

        Returns:
            Dictionary with response text, tool calls made, and execution metadata.
        """
        return asyncio.run(self.run_async(query, user_id=user_id, session_id=session_id))

    async def run_async(
        self,
        query: str,
        user_id: str = "default_user",
        session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Asynchronously runs a prompt through the ADK agent runner.

        Args:
            query: User's question or instruction.
            user_id: Identifier for the user.
            session_id: Optional existing session ID.

        Returns:
            Dictionary with response text, tool calls made, and execution metadata.
        """
        if not self.check_api_key():
            return {
                "status": "error",
                "message": (
                    "No Gemini API key detected. Please set GEMINI_API_KEY or GOOGLE_API_KEY "
                    "in your environment to execute live LLM calls: "
                    "$env:GEMINI_API_KEY='your-key-here'"
                ),
                "response": "",
                "tool_calls": [],
                "session_id": session_id or "uninitialized",
            }

        sid = session_id or await self.create_session(user_id=user_id)
        content_message = types.Content(parts=[types.Part.from_text(text=query)])

        response_chunks: List[str] = []
        tool_calls_logged: List[Dict[str, Any]] = []

        try:
            for event in self.runner.run(user_id=user_id, session_id=sid, new_message=content_message):
                # Handle error event
                if hasattr(event, "error_message") and event.error_message:
                    return {
                        "status": "error",
                        "message": event.error_message,
                        "response": "".join(response_chunks),
                        "tool_calls": tool_calls_logged,
                        "session_id": sid,
                    }

                # Extract text content from model responses
                if hasattr(event, "content") and event.content:
                    for part in getattr(event.content, "parts", []):
                        if hasattr(part, "text") and part.text:
                            response_chunks.append(part.text)
                        # Check for function call
                        if hasattr(part, "function_call") and part.function_call:
                            tool_calls_logged.append({
                                "name": getattr(part.function_call, "name", "unknown"),
                                "args": getattr(part.function_call, "args", {}),
                            })

            return {
                "status": "success",
                "response": "".join(response_chunks).strip(),
                "tool_calls": tool_calls_logged,
                "session_id": sid,
            }

        except Exception as e:
            return {
                "status": "error",
                "message": f"Agent execution error: {str(e)}",
                "response": "".join(response_chunks),
                "tool_calls": tool_calls_logged,
                "session_id": sid,
            }


# ============================================================================
# CLI Quick Test
# ============================================================================

def main():
    """Command-line interface to inspect and interact with the STFC Gemini ADK Agent."""
    print("=" * 70)
    print("STFC Research & Beamtime Inspector - Google ADK Gemini Agent")
    print("=" * 70)

    agent = create_stfc_research_agent()
    print(f"Agent Name:    {agent.name}")
    print(f"Model:         {agent.model}")
    print(f"Tools Loaded:  {len(agent.tools)}")
    for t in agent.tools:
        name = getattr(t, "__name__", str(t))
        print(f"  - {name}")

    runner = StfcAgentRunner(agent=agent)
    has_key = runner.check_api_key()
    print(f"\nGemini API Key: {'[CONFIGURED]' if has_key else '[NOT CONFIGURED]'}")

    if not has_key:
        print("\nNote: Set GEMINI_API_KEY or GOOGLE_API_KEY to test live conversational turns.")
        print("Example: $env:GEMINI_API_KEY = 'AIzaSy...'")
        return

    query = "Find 2 publications on neutron scattering at ISIS in 2023 and extract any beamtime proposal numbers."
    print(f"\nRunning test query: '{query}'...")
    res = runner.run(query)
    print("\nResult:")
    print(res.get("response") or res.get("message"))


if __name__ == "__main__":
    main()

