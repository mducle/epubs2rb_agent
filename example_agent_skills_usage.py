"""
Verification & Test Suite: STFC Agent Skills (agentskills.io & Google ADK)
==========================================================================
Validates:
1. Loading of skills from `skills/` using Google ADK `load_skills_from_dir`.
2. Compliance with agentskills.io standard (name, description, references, scripts).
3. Creation and binding of `SkillToolset` with core tools and provided dynamic tools.
4. Execution of skill helper scripts via CLI/subprocess.
5. Integration of skills with `create_stfc_research_agent(use_skills=True)` and
   `create_stfc_multi_agent_system(use_skills=True)`.
6. Reading skill resources (markdown references) on-demand.
"""

import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Ensure workspace root is on sys.path
repo_root = Path(__file__).resolve().parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from google.adk.skills import Skill, load_skills_from_dir
from google.adk.tools.skill_toolset import SkillToolset
from google.adk.agents import LlmAgent

from tool_src import (
    load_all_stfc_skills,
    load_stfc_discovery_skill,
    load_rb_extractor_skill,
    create_stfc_skill_toolset,
    create_discovery_skill_toolset,
    create_beamtime_skill_toolset,
    create_stfc_research_agent,
    create_stfc_skill_agent,
    create_stfc_multi_agent_system,
)


def run_tests():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("=" * 72)
    print("[*] RUNNING STFC AGENT SKILLS VERIFICATION SUITE")
    print("=" * 72)

    # ------------------------------------------------------------------------
    # Test 1: Load and Validate Skills from Directory
    # ------------------------------------------------------------------------
    print("\n[Test 1] Loading and validating skills from 'skills/' directory...")
    skills = load_all_stfc_skills()
    assert len(skills) >= 2, f"Expected at least 2 skills, found {len(skills)}"
    skill_names = [s.name for s in skills]
    assert "stfc-epubs-discovery" in skill_names, "Missing 'stfc-epubs-discovery' skill"
    assert "rb-experiment-extractor" in skill_names, "Missing 'rb-experiment-extractor' skill"

    for s in skills:
        assert len(s.name) > 0, "Skill name must not be empty"
        assert len(s.description) > 0, "Skill description must not be empty"
        assert len(s.description) <= 1024, f"Skill description too long ({len(s.description)} chars)"
        assert len(s.instructions) > 0, "Skill instructions (SKILL.md body) must not be empty"
        print(f"  [OK] Loaded skill: '{s.name}'")
        print(f"       Description: {s.description[:80]}...")
        print(f"       References:  {s.resources.list_references()}")
        print(f"       Scripts:     {s.resources.list_scripts()}")

    # ------------------------------------------------------------------------
    # Test 2: Inspect Specific Skills and Resources
    # ------------------------------------------------------------------------
    print("\n[Test 2] Verifying skill resources and on-demand reference loading...")
    disc_skill = load_stfc_discovery_skill()
    assert disc_skill.name == "stfc-epubs-discovery"
    assert "facilities.md" in disc_skill.resources.list_references()
    facilities_ref = disc_skill.resources.get_reference("facilities.md")
    assert "ISIS" in facilities_ref
    assert "Diamond Light Source" in facilities_ref
    print(f"  [OK] Discovery skill facilities reference verified ({len(facilities_ref)} bytes)")

    rb_skill = load_rb_extractor_skill()
    assert rb_skill.name == "rb-experiment-extractor"
    assert "rb_patterns.md" in rb_skill.resources.list_references()
    patterns_ref = rb_skill.resources.get_reference("rb_patterns.md")
    assert "RB1910243" in patterns_ref
    print(f"  [OK] RB extractor pattern reference verified ({len(patterns_ref)} bytes)")

    # ------------------------------------------------------------------------
    # Test 3: Construct SkillToolset and Verify Tool Registrations
    # ------------------------------------------------------------------------
    print("\n[Test 3] Constructing ADK SkillToolset and verifying tool bindings...")
    toolset = create_stfc_skill_toolset()
    assert isinstance(toolset, SkillToolset)
    core_tool_names = [t.name for t in toolset._tools]
    assert "list_skills" in core_tool_names
    assert "load_skill" in core_tool_names
    assert "load_skill_resource" in core_tool_names
    assert "run_skill_script" in core_tool_names
    print(f"  [OK] Core SkillToolset tools initialized: {core_tool_names}")

    provided = list(toolset._provided_tools_by_name.keys())
    expected_tools = [
        "search_stfc_publications",
        "download_stfc_dataset",
        "extract_publication_dois",
        "get_stfc_departments_and_types",
        "extract_rb_experiment_numbers",
        "extract_rb_from_doi",
        "extract_rb_from_pdf",
        "scan_text_for_rb",
    ]
    for exp in expected_tools:
        assert exp in provided, f"Expected provided tool {exp} not registered in SkillToolset"
    print(f"  [OK] Successfully bound {len(provided)} underlying tools into SkillToolset")

    # ------------------------------------------------------------------------
    # Test 4: Execute Skill Scripts via CLI
    # ------------------------------------------------------------------------
    print("\n[Test 4] Testing skill CLI scripts execution...")
    # A) search_epubs.py
    script_search = repo_root / "skills" / "stfc-epubs-discovery" / "scripts" / "search_epubs.py"
    proc_search = subprocess.run(
        [sys.executable, str(script_search), "--query", "ISIS neutron", "--limit", "2"],
        capture_output=True,
        text=True,
        cwd=str(repo_root),
    )
    assert proc_search.returncode == 0, f"search_epubs.py failed:\n{proc_search.stderr}"
    search_json = json.loads(proc_search.stdout)
    assert search_json["status"] == "success"
    assert len(search_json["publications"]) > 0
    print(f"  [OK] search_epubs.py returned {len(search_json['publications'])} publications.")

    # B) extract_rb.py
    script_rb = repo_root / "skills" / "rb-experiment-extractor" / "scripts" / "extract_rb.py"
    proc_rb = subprocess.run(
        [sys.executable, str(script_rb), "--text", "Supported by beamtime allocation RB1910243 at ISIS."],
        capture_output=True,
        text=True,
        cwd=str(repo_root),
    )
    assert proc_rb.returncode == 0, f"extract_rb.py failed:\n{proc_rb.stderr}"
    rb_json = json.loads(proc_rb.stdout)
    assert rb_json["status"] == "success"
    assert "RB1910243" in rb_json["experiment_numbers"]
    print(f"  [OK] extract_rb.py successfully extracted: {rb_json['experiment_numbers']}")

    # ------------------------------------------------------------------------
    # Test 5: Verify Skill-Enabled Agents in Google ADK
    # ------------------------------------------------------------------------
    print("\n[Test 5] Initializing skill-enabled LlmAgents in Google ADK...")
    agent = create_stfc_research_agent(use_skills=True)
    assert isinstance(agent, LlmAgent)
    assert len(agent.tools) == 1
    assert isinstance(agent.tools[0], SkillToolset)
    print(f"  [OK] Unified Agent '{agent.name}' equipped with SkillToolset")

    alias_agent = create_stfc_skill_agent()
    assert isinstance(alias_agent, LlmAgent)
    assert isinstance(alias_agent.tools[0], SkillToolset)
    print(f"  [OK] Convenience create_stfc_skill_agent() verified")

    multi_agent = create_stfc_multi_agent_system(use_skills=True)
    assert isinstance(multi_agent, LlmAgent)
    assert len(multi_agent.sub_agents) == 2
    for sa in multi_agent.sub_agents:
        assert isinstance(sa.tools[0], SkillToolset)
        print(f"  [OK] Sub-Agent '{sa.name}' equipped with dedicated SkillToolset ({len(sa.tools[0].skills)} skill)")

    # ------------------------------------------------------------------------
    # Test 6: Verify Antigravity Workspace Junction
    # ------------------------------------------------------------------------
    print("\n[Test 6] Verifying Antigravity workspace skills directory (.agents/skills)...")
    agents_skills = repo_root / ".agents" / "skills"
    assert agents_skills.exists(), "Directory .agents/skills does not exist"
    loaded_from_agents = load_skills_from_dir(agents_skills)
    assert len(loaded_from_agents) >= 2
    print(f"  [OK] Antigravity workspace discovery path verified ({len(loaded_from_agents)} skills found)")

    print("\n" + "=" * 72)
    print("[OK] ALL STFC AGENT SKILLS TESTS PASSED SUCCESSFULLY!")
    print("=" * 72)


if __name__ == "__main__":
    run_tests()

