---
name: stfc-epubs-discovery
description: >-
  Search the STFC ePubs repository for scientific publications, technical reports,
  and datasets from ISIS, Diamond Light Source, and RAL. Supports filtering by facility,
  exporting datasets, and extracting canonical publication DOIs.
license: Apache-2.0
metadata:
  adk_additional_tools:
    - search_stfc_publications
    - download_stfc_dataset
    - extract_publication_dois
    - get_stfc_departments_and_types
---

# STFC ePubs Literature & Dataset Discovery

This skill provides step-by-step procedures and tools for exploring research outputs from the UK Science and Technology Facilities Council (STFC) institutional repository (https://epubs.stfc.ac.uk/).

## Primary Capabilities

1. **Facility Literature Search**: Query research publications across national facilities including ISIS Pulsed Neutron and Muon Source, Diamond Light Source, Central Laser Facility (CLF), and Rutherford Appleton Laboratory (RAL).
2. **DOI Extraction**: Extract and canonicalize Digital Object Identifiers (`10.xxxx/...`) from publication records or downloaded CSV datasets.
3. **Bulk Dataset Export**: Download structured publication metadata (CSV/RIS) to local disk for offline analysis.
4. **Facility & Output Classification**: Validate facility abbreviations and publication categories (journal articles, technical reports, theses).

## When to Use This Skill

- When the user asks to find, search, or list publications, reports, or data from STFC, ISIS, Diamond Light Source, or RAL.
- When an investigation requires locating paper titles, publication years, authors, or DOIs for beamtime proposal audits.
- When exporting publication lists or datasets to disk.

## Workflows and Procedures

### 1. Discovering Publications by Keyword and Facility

Use the `search_stfc_publications` tool to query ePubs:

- **Keywords**: Keep queries focused (e.g. `muon spectroscopy`, `battery electrolyte`, `superconductivity`).
- **Facility Filtering**: Specify `dept` (e.g. `ISIS`, `Diamond Light Source`, `RAL`) to restrict the scope. If unsure of valid facility names, refer to `references/facilities.md` or invoke `get_stfc_departments_and_types`.
- **Publication Year**: Use `year` to restrict the search to a specific year (e.g. `year=2023`).
- **Pagination & Limits**: Set `limit` (e.g. 5–20) to balance completeness and token efficiency.

Example Tool Call:
```python
search_stfc_publications(
    query="neutron diffraction battery",
    dept="ISIS",
    year=2023,
    limit=10,
    sort_by="score"
)
```

### 2. Extracting Canonical DOIs

Once publications are retrieved, feed them directly into `extract_publication_dois`:

```python
results = search_stfc_publications(query="nickelates", limit=5)
doi_info = extract_publication_dois(dataset=results["publications"])
# doi_info["unique_dois"] provides validated DOIs (e.g. "10.1038/s41467-022-31842-x")
```

If DOIs must be parsed from a previously exported CSV file:
```python
doi_info = extract_publication_dois(file_path="exports/isis_papers.csv")
```

### 3. Exporting Datasets to Disk

When the user asks to save, download, or export a publication dataset:

```python
download_stfc_dataset(
    query="spin liquid",
    dept="ISIS",
    output_path="exports/isis_spin_liquid.csv",
    export_format="csv",
    limit=50
)
```

### 4. CLI Helpers (Script Execution)

If running in a shell or via `run_skill_script`:
- Query publications:
  `python scripts/search_epubs.py --query "ISIS neutron" --limit 5`
- Download dataset:
  `python scripts/download_dataset.py --query "perovskite" --dept "ISIS" --output "perovskite.csv"`

## Reference Documentation

- [STFC Facilities and Publication Types](./references/facilities.md): Full list of department codes and taxonomy.
- [ePubs Search Guide](./references/search_guide.md): Advanced search syntax, sorting fields, and best practices.
