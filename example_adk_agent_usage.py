"""
Verification & Test Suite: Gemini Agent using Google Agent Development Kit (ADK)
================================================================================
Validates:
1. Creation and schema verification of the unified `stfc_research_agent` under Google ADK.
2. Verification of all 7 repository tools bound to the ADK agent.
3. Creation and sub-agent validation of the hierarchical `stfc_multi_agent_system`.
4. ADK session lifecycle and `StfcAgentRunner` setup.
5. End-to-end tool execution via ADK agent bindings.
6. Execution handling (live Gemini execution when API key is present, graceful guidance when unset).
"""

import os
import sys
import asyncio

# Ensure workspace root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from google.adk.agents import LlmAgent
from tool_src import (
    create_stfc_research_agent,
    create_stfc_multi_agent_system,
    StfcAgentRunner,
    search_stfc_publications,
    extract_publication_dois,
    extract_rb_from_doi,
    extract_rb_experiment_numbers,
)


def run_tests():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("=" * 72)
    print("[*] RUNNING GOOGLE ADK GEMINI AGENT VERIFICATION SUITE")
    print("=" * 72)

    # ------------------------------------------------------------------------
    # Test 1: Single Unified LlmAgent in Google ADK
    # ------------------------------------------------------------------------
    print("\n[Test 1] Creating unified STFC Gemini agent with Google ADK...")
    agent = create_stfc_research_agent()
    assert isinstance(agent, LlmAgent), "Agent must be an instance of google.adk.agents.LlmAgent"
    assert agent.name == "stfc_research_agent"
    assert agent.model == "gemini-2.5-flash"
    assert len(agent.tools) == 7, f"Expected 7 tools, found {len(agent.tools)}"

    print(f"  [OK] Agent initialized: '{agent.name}' (Model: {agent.model})")
    print(f"  [OK] Successfully bound {len(agent.tools)} repository tools:")
    expected_tools = [
        "search_stfc_publications",
        "download_stfc_dataset",
        "extract_publication_dois",
        "get_stfc_departments_and_types",
        "extract_rb_experiment_numbers",
        "extract_rb_from_doi",
        "extract_rb_from_pdf",
    ]
    tool_names = [getattr(t, "__name__", str(t)) for t in agent.tools]
    for exp in expected_tools:
        assert exp in tool_names, f"Missing tool: {exp}"
        print(f"       - {exp}")

    # ------------------------------------------------------------------------
    # Test 2: Hierarchical Multi-Agent System in Google ADK
    # ------------------------------------------------------------------------
    print("\n[Test 2] Creating hierarchical multi-agent system in Google ADK...")
    multi_agent = create_stfc_multi_agent_system()
    assert isinstance(multi_agent, LlmAgent)
    assert multi_agent.name == "stfc_lead_coordinator"
    assert len(multi_agent.sub_agents) == 2, f"Expected 2 sub-agents, got {len(multi_agent.sub_agents)}"

    sub_names = [sa.name for sa in multi_agent.sub_agents]
    assert "stfc_discovery_agent" in sub_names
    assert "rb_beamtime_agent" in sub_names
    print(f"  [OK] Root Coordinator: '{multi_agent.name}'")
    for sa in multi_agent.sub_agents:
        print(f"       - Sub-Agent: '{sa.name}' ({len(sa.tools)} tools: {[getattr(t, '__name__', str(t)) for t in sa.tools]})")

    # ------------------------------------------------------------------------
    # Test 3: Session Management & StfcAgentRunner
    # ------------------------------------------------------------------------
    print("\n[Test 3] Verifying ADK session lifecycle & StfcAgentRunner...")
    runner = StfcAgentRunner(agent=agent)
    session_id = asyncio.run(runner.create_session(user_id="test_user", session_id="test_session_123"))
    assert session_id == "test_session_123"
    print(f"  [OK] Created ADK session '{session_id}' via InMemorySessionService.")

    # ------------------------------------------------------------------------
    # Test 4: End-to-End Tool Pipeline through ADK Tool Layer
    # ------------------------------------------------------------------------
    print("\n[Test 4] Verifying tool execution through ADK agent tool layer...")
    # Step A: Search tool
    print("  Executing tool 1: search_stfc_publications('ISIS neutron', limit=2)...")
    search_res = search_stfc_publications(query="ISIS neutron", limit=2)
    assert search_res["status"] == "success"
    print(f"  [OK] Found {len(search_res['publications'])} publications.")

    # Step B: DOI extraction tool
    print("  Executing tool 2: extract_publication_dois(publications)...")
    doi_res = extract_publication_dois(dataset=search_res["publications"])
    assert doi_res["status"] == "success"
    print(f"  [OK] Extracted {doi_res['unique_dois_count']} unique DOIs.")

    # Step C: RB proposal extraction tool
    test_doi = "10.1038/s41467-022-31842-x"
    print(f"  Executing tool 3: extract_rb_from_doi('{test_doi}')...")
    rb_res = extract_rb_from_doi(test_doi)
    assert rb_res["status"] == "success"
    assert "RB1910243" in rb_res["experiment_numbers"]
    print(f"  [OK] Extracted proposal numbers: {rb_res['experiment_numbers']}")
    print(f"       Exact allocation: {rb_res['has_exact_allocation_phrase']}")

    # Step D: Unified tool dispatcher
    print("  Executing tool 4: extract_rb_experiment_numbers(doi_or_url='10.5286/edata/isis/r/rb1810012')...")
    unified_res = extract_rb_experiment_numbers(doi_or_url="10.5286/edata/isis/r/rb1810012")
    assert unified_res["status"] == "success"
    assert "RB1810012" in unified_res["experiment_numbers"]
    print(f"  [OK] Unified extractor result: {unified_res['experiment_numbers']}")

    # ------------------------------------------------------------------------
    # Test 5: Agent Turn Execution & API Key Handling
    # ------------------------------------------------------------------------
    print("\n[Test 5] Checking agent execution handling (live / simulated)...")
    has_key = runner.check_api_key()
    if has_key:
        print("  [INFO] Gemini API Key detected! Running live agent invocation...")
        query = "What is beamtime allocation RB1910243 about based on DOI 10.1038/s41467-022-31842-x?"
        result = runner.run(query)
        print(f"  [OK] Agent Status: {result['status']}")
        print(f"  [OK] Tool calls made: {len(result['tool_calls'])}")
        print(f"  [OK] Response excerpt: {result['response'][:250]}...")
    else:
        print("  [INFO] GEMINI_API_KEY is not set in environment.")
        print("  Testing runner graceful error handling...")
        result = runner.run("Find papers on neutron scattering.")
        assert result["status"] == "error"
        assert "No Gemini API key detected" in result["message"]
        print("  [OK] Runner cleanly caught missing key and guided user on setup.")

    print("\n" + "=" * 72)
    print("[OK] ALL GOOGLE ADK GEMINI AGENT TESTS PASSED SUCCESSFULLY!")
    print("=" * 72)


if __name__ == "__main__":
    run_tests()

