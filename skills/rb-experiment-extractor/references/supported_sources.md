# Supported External Sources for RB Number Extraction

When querying a DOI via `extract_rb_from_doi`, the extractor queries multiple scientific APIs and endpoints in cascading order:

## 1. CrossRef API (`api.crossref.org`)
- **Endpoints**: `https://api.crossref.org/works/{doi}`
- **Data Extracted**:
  - Title, authors, container (journal) title, publication date.
  - Funder project numbers, grant references, and award acknowledgements in `funder` lists.
  - Abstract text when registered with CrossRef.

## 2. Europe PubMed Central (Europe PMC) API
- **Endpoints**: `https://www.ebi.ac.uk/europepmc/webservices/rest/search`
- **Data Extracted**:
  - Open-access full text XML.
  - Explicit `<ack>` (acknowledgements) and `<funding-group>` XML sections.
  - Extremely effective for biomedical and physical science papers with open-access mandates.

## 3. OpenAlex API (`api.openalex.org`)
- **Endpoints**: `https://api.openalex.org/works/{doi}`
- **Data Extracted**:
  - Grants and award metadata (`awards` and `funders`).
  - Open access PDF URLs and landing page metadata.

## 4. Publisher Landing Page & DOI Resolution
- Resolves HTTP `https://doi.org/{doi}` following redirects.
- Scrapes metadata tags (`citation_title`, `dc.description`, acknowledgements blocks).

## Fallback & Rate Limiting Strategy
- The tool includes polite User-Agent headers compliant with CrossRef and OpenAlex etiquette.
- All requests use timeouts (10 seconds) with graceful degradation: if an external service is unavailable or rate-limited, local heuristics and alternative endpoints continue processing.

