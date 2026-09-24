---
name: rb-experiment-extractor
description: >-
  Extract and audit STFC national facility beamtime proposal numbers (RB#######)
  and allocation acknowledgements from publication DOIs, PDF files, and manuscript texts
  for ISIS Pulsed Neutron and Muon Source and Diamond Light Source.
license: Apache-2.0
metadata:
  adk_additional_tools:
    - extract_rb_experiment_numbers
    - extract_rb_from_doi
    - extract_rb_from_pdf
    - scan_text_for_rb
---

# STFC Beamtime & RB Proposal Experiment Number Extractor

This skill provides procedures, patterns, and tools for identifying, extracting, and auditing UK facility beamtime allocation experiment numbers (canonical form `RB#######`, e.g. `RB1910243`) across scientific literature, open-access full texts, and PDF manuscripts.

## Primary Capabilities

1. **DOI Metadata & Full-Text Inspection**: Uncover beamtime experiment proposals directly from paper DOIs (e.g. `10.1038/s41467-022-31842-x`) via CrossRef metadata, Europe PMC open-access XML, OpenAlex, and publisher landing pages.
2. **Page-by-Page PDF Manuscript Scanning**: Parse local or remote PDF papers, searching acknowledgements and experimental sections with page number tracking.
3. **Allocation Confidence Classification**: Distinguish confirmed formal beamtime allocations (`"supported by beamtime allocation RB#######"`) from general mentions.
4. **Facility Attribution**: Identify whether an allocation belongs to ISIS Pulsed Neutron and Muon Source, Diamond Light Source, or related STFC facilities.
5. **Unified Input Dispatch**: Automatically detect whether an input is a DOI, a file path to a PDF, or raw manuscript text.

## When to Use This Skill

- When auditing research outputs for compliance with STFC/ISIS/Diamond beamtime allocation reporting.
- When extracting ISIS or Diamond proposal numbers (`RB#######`) from a paper, DOI, or PDF manuscript.
- When validating whether a paper's acknowledgements contain explicit beamtime allocation awards.

## Workflows and Procedures

### 1. Extracting RB Proposals from a Publication DOI

When you have a publication DOI or DOI URL:

```python
from tool_src import extract_rb_from_doi

# Standard DOI or DOI URL
result = extract_rb_from_doi("10.1038/s41467-022-31842-x")
# result contains:
# - experiment_numbers: ['RB1910243', 'RB1920045']
# - has_exact_allocation_phrase: True
# - matches: list of match details with full sentences and facility attribution
```

### 2. Scanning PDF Manuscripts Page-by-Page

When given a path or URL to a PDF article:

```python
from tool_src import extract_rb_from_pdf

result = extract_rb_from_pdf("manuscripts/paper.pdf")
# result provides:
# - experiment_numbers: list of identified RB numbers
# - total_pages_scanned: number of pages analyzed
# - matches: includes page_number for each occurrence
```

### 3. Unified Dispatcher for Any Input

When user input may be a DOI, PDF path, or text snippet:

```python
from tool_src import extract_rb_experiment_numbers

# Flexible dispatcher:
res = extract_rb_experiment_numbers(doi_or_url="10.5286/edata/isis/r/rb1810012")
# or with direct text:
res = extract_rb_experiment_numbers(text="Measurements at ISIS under proposal RB1720341.")
```

### 4. Fast Regex Scanning of Raw Text

When processing large strings or in-memory chunks:

```python
from tool_src import scan_text_for_rb

matches = scan_text_for_rb("Supported by beamtime allocation RB1910243 at ISIS.")
# Returns structured list of matches with category, facility, and full sentence.
```

### 5. CLI Helpers (Script Execution)

If running in a shell or via `run_skill_script`:
- Audit a DOI:
  `python scripts/extract_rb.py --doi "10.1038/s41467-022-31842-x"`
- Audit a PDF:
  `python scripts/extract_rb.py --pdf "path/to/paper.pdf"`
- Audit text:
  `python scripts/extract_rb.py --text "Data collected under RB1910243 at ISIS."`

## Reference Documentation

- [RB Regex Patterns & Syntax Guide](./references/rb_patterns.md): Canonical formatting rules, regular expressions, and allocation phrasing patterns.
- [Supported External Sources](./references/supported_sources.md): How CrossRef, Europe PMC, and OpenAlex metadata are retrieved and parsed.

