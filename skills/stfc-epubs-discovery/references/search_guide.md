# STFC ePubs Search Guide & Query Best Practices

## Query Construction

The STFC ePubs search endpoint performs full-text matching across paper titles, abstracts, author names, and metadata keywords.

### Guidelines for AI Agents

1. **Concise Keywords**: Avoid lengthy full sentences as search queries. Extract the core scientific nouns and facility identifiers:
   - *Suboptimal*: "Can you show me all papers that have been published in recent years discussing the crystal structure of nickelates at ISIS?"
   - *Optimal*: `nickelates crystal structure`, `dept="ISIS"`

2. **Author Searches**:
   - Query format: `<Lastname> <First Initial>` or simply `<Lastname>` (e.g. `query="Adroja"`, `dept="ISIS"`).

3. **Facility & Department Scoping**:
   - Always supply `dept="ISIS"` or `dept="Diamond"` when the user's intent is facility-specific.
   - Searching without `dept` searches the entire STFC repository.

4. **Sorting Options**:
   - `score`: Relevance ranking (best for keyword topical searches).
   - `pub_date_desc`: Newest publications first (best for tracking recent research).
   - `pub_date_asc`: Oldest publications first.
   - `title_asc`: Alphabetical by title.

5. **Token Management & Limits**:
   - Default `limit=10` is optimal for LLM prompts.
   - Set `include_abstract=False` unless abstract text is specifically requested, as abstracts consume significant context window tokens.

## Output Schema

The `search_stfc_publications` tool returns:
- `status`: `"success"` or `"error"`.
- `query_info`: Echo of search parameters.
- `returned_count`: Number of items returned in current page.
- `estimated_total`: Estimated total matching papers in repository.
- `publications`: List of publication dicts:
  - `work_id`: Unique STFC ePubs work identifier (e.g. `"12345"`).
  - `title`: Publication title.
  - `authors`: List of author names.
  - `publication_year`: Year of publication.
  - `department`: Attributed department or facility.
  - `primary_doi`: Canonical DOI if identified (e.g. `"10.1038/s41467-022-31842-x"`).
  - `doi_url`: Direct HTTP URL for DOI.

