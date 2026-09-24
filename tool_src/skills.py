"""
STFC Research & Beamtime Inspector - Agent Skills Module
=========================================================
Implements the agentskills.io standard for Google Agent Development Kit (ADK)
and Antigravity AI Agent workflows.

Provides:
- `load_stfc_discovery_skill`: Loads the STFC ePubs discovery skill.
- `load_rb_extractor_skill`: Loads the ISIS/Diamond RB proposal extraction skill.
- `load_all_stfc_skills`: Loads all repository skills.
- `create_stfc_skill_toolset`: Constructs a Google ADK `SkillToolset` bundling
  skills and their corresponding underlying tools.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import List, Optional

from google.adk.skills import Skill, load_skill_from_dir, load_skills_from_dir
from google.adk.tools.skill_toolset import SkillToolset

# Import underlying Python tools
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

# Canonical path to skills folder in repository
_REPO_ROOT = Path(__file__).resolve().parent.parent
SKILLS_DIR = _REPO_ROOT / "skills"
DISCOVERY_SKILL_DIR = SKILLS_DIR / "stfc-epubs-discovery"
RB_EXTRACTOR_SKILL_DIR = SKILLS_DIR / "rb-experiment-extractor"

ALL_DISCOVERY_TOOLS = [
    search_stfc_publications,
    download_stfc_dataset,
    extract_publication_dois,
    get_stfc_departments_and_types,
]

ALL_RB_TOOLS = [
    extract_rb_experiment_numbers,
    extract_rb_from_doi,
    extract_rb_from_pdf,
    scan_text_for_rb,
]

ALL_STFC_TOOLS = ALL_DISCOVERY_TOOLS + ALL_RB_TOOLS


def load_stfc_discovery_skill() -> Skill:
    """Loads the STFC ePubs discovery skill from disk."""
    if not DISCOVERY_SKILL_DIR.exists():
        raise FileNotFoundError(f"Discovery skill directory not found: {DISCOVERY_SKILL_DIR}")
    return load_skill_from_dir(DISCOVERY_SKILL_DIR)


def load_rb_extractor_skill() -> Skill:
    """Loads the RB experiment proposal extractor skill from disk."""
    if not RB_EXTRACTOR_SKILL_DIR.exists():
        raise FileNotFoundError(f"RB extractor skill directory not found: {RB_EXTRACTOR_SKILL_DIR}")
    return load_skill_from_dir(RB_EXTRACTOR_SKILL_DIR)


def load_all_stfc_skills() -> List[Skill]:
    """Loads all repository skills from the canonical skills folder."""
    if not SKILLS_DIR.exists():
        raise FileNotFoundError(f"Skills directory not found: {SKILLS_DIR}")
    return load_skills_from_dir(SKILLS_DIR)


def create_stfc_skill_toolset(
    skills: Optional[List[Skill]] = None,
    include_tools: bool = True,
    tool_name_prefix: Optional[str] = None,
) -> SkillToolset:
    """
    Constructs an ADK SkillToolset pre-configured with STFC skills and
    additional tool declarations.

    Args:
        skills: Specific skills to register. If None, loads all repository skills.
        include_tools: If True, registers the underlying Python tools so that when
                       skills are activated, the agent can call the tools directly.
        tool_name_prefix: Optional prefix to prepend to skill tool names.

    Returns:
        Configured Google ADK SkillToolset instance.
    """
    loaded_skills = skills if skills is not None else load_all_stfc_skills()
    additional_tools = ALL_STFC_TOOLS if include_tools else None

    return SkillToolset(
        skills=loaded_skills,
        additional_tools=additional_tools,
        tool_name_prefix=tool_name_prefix,
    )


def create_discovery_skill_toolset() -> SkillToolset:
    """Constructs a SkillToolset specifically for literature and DOI discovery."""
    return SkillToolset(
        skills=[load_stfc_discovery_skill()],
        additional_tools=ALL_DISCOVERY_TOOLS,
    )


def create_beamtime_skill_toolset() -> SkillToolset:
    """Constructs a SkillToolset specifically for RB beamtime auditing."""
    return SkillToolset(
        skills=[load_rb_extractor_skill()],
        additional_tools=ALL_RB_TOOLS,
    )
