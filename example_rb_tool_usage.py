"""
Verification & Test Suite: Beamtime RB Experiment Number Agent Tool
===================================================================
Tests all features of `rb_extractor_tool.py`:
1. Extracting RB experiment numbers from DOIs (sample papers & CrossRef).
2. Generating and parsing a multi-page PDF document with page number tracking.
3. Unified agent tool dispatching (DOI, PDF, raw text).
4. Full pipeline: Search STFC ePubs -> Extract DOIs -> Extract RB Experiment Numbers.
5. Gemini Function Declarations verification.
"""

import os
import sys
import tempfile
import pypdf

# Ensure workspace root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from tool_src.rb_extractor_tool import (
    extract_rb_experiment_numbers,
    extract_rb_from_doi,
    extract_rb_from_pdf,
    scan_text_for_rb,
    get_rb_agent_tools,
    get_gemini_rb_tool_declarations,
)
from tool_src.stfc_epubs_tool import search_stfc_publications, extract_publication_dois


def _make_page_pdf_bytes(text: str) -> bytes:
    escaped = text.replace("(", "\\(").replace(")", "\\)")
    stream_content = f"BT\n/F1 12 Tf\n72 700 Td\n({escaped}) Tj\nET\n".encode("utf-8")
    length = len(stream_content)
    pdf = f"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length {length} >>
stream
{stream_content.decode('latin1')}endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000233 00000 n 
0000000305 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
500
%%EOF""".encode("latin1")
    return pdf


def create_sample_pdf(file_path: str):
    """Generates a real 3-page PDF with beamtime acknowledgements on page 3."""
    import io
    writer = pypdf.PdfWriter()

    p1 = pypdf.PdfReader(io.BytesIO(_make_page_pdf_bytes("Page 1: Title and Abstract"))).pages[0]
    p2 = pypdf.PdfReader(io.BytesIO(_make_page_pdf_bytes("Page 2: Experimental Methods and Materials"))).pages[0]
    p3 = pypdf.PdfReader(io.BytesIO(_make_page_pdf_bytes(
        "Acknowledgements and Funding: This research was supported by beamtime allocation RB1910243 at ISIS. "
        "Complementary synchrotron measurements were conducted under allocation RB2010189 at Diamond Light Source."
    ))).pages[0]

    writer.add_page(p1)
    writer.add_page(p2)
    writer.add_page(p3)

    with open(file_path, "wb") as f:
        writer.write(f)


def run_tests():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    print("=" * 72)
    print("[*] RUNNING BEAMTIME RB EXPERIMENT NUMBER AGENT TOOL TEST SUITE")
    print("=" * 72)

    # ------------------------------------------------------------------------
    # Test 1: Extract RB numbers from DOI URL (Nature Communications paper)
    # ------------------------------------------------------------------------
    print("\n[Test 1] Extracting RB experiment numbers from DOI URL (Nature Communications)...")
    doi_test1 = "https://doi.org/10.1038/s41467-022-31842-x"
    res1 = extract_rb_from_doi(doi_test1)
    assert res1["status"] == "success", f"Failed: {res1}"
    assert "RB1910243" in res1["experiment_numbers"], "Expected RB1910243"
    assert "RB1920045" in res1["experiment_numbers"], "Expected RB1920045"
    assert res1["has_exact_allocation_phrase"] is True
    print(f"  [OK] Successfully extracted {len(res1['experiment_numbers'])} RB numbers from DOI:")
    for num in res1["experiment_numbers"]:
        print(f"       -> {num}")
    print(f"  [OK] Title: {res1['title']}")
    print(f"  [OK] Exact allocation phrase detected: {res1['has_exact_allocation_phrase']}")

    # ------------------------------------------------------------------------
    # Test 2: Extract RB numbers from Chemistry of Materials DOI (Diamond Light Source)
    # ------------------------------------------------------------------------
    print("\n[Test 2] Extracting RB numbers from Chemistry of Materials DOI...")
    doi_test2 = "10.1021/acs.chemmater.1c02891"
    res2 = extract_rb_from_doi(doi_test2)
    assert res2["status"] == "success"
    assert "RB2108742" in res2["experiment_numbers"]
    print(f"  [OK] Extracted: {res2['experiment_numbers']}")
    print(f"  [OK] Facility attribution: {res2['matches'][0]['facility']}")

    # ------------------------------------------------------------------------
    # Test 3: Generate and scan a PDF document with beamtime acknowledgements
    # ------------------------------------------------------------------------
    temp_dir = tempfile.mkdtemp(prefix="rb_agent_test_")
    test_pdf_path = os.path.join(temp_dir, "test_manuscript.pdf")
    print(f"\n[Test 3] Generating 3-page test PDF with acknowledgements: {test_pdf_path}...")
    create_sample_pdf(test_pdf_path)

    print("  Scanning PDF page-by-page...")
    pdf_res = extract_rb_from_pdf(test_pdf_path)
    assert pdf_res["status"] == "success", f"PDF scan failed: {pdf_res}"
    assert "RB1910243" in pdf_res["experiment_numbers"], "Expected RB1910243 in PDF"
    assert "RB2010189" in pdf_res["experiment_numbers"], "Expected RB2010189 in PDF"
    assert pdf_res["total_pages_scanned"] == 3
    print(f"  [OK] Scanned {pdf_res['total_pages_scanned']} pages.")
    print(f"  [OK] Found {len(pdf_res['experiment_numbers'])} experiment numbers:")
    for m in pdf_res["matches"]:
        print(f"       - Number: {m['rb_number']} (Page {m.get('page_number')})")
        print(f"         Category: {m['category']}")
        print(f"         Sentence: {m['full_sentence']}")

    # Cleanup temp pdf
    try:
        os.remove(test_pdf_path)
        os.rmdir(temp_dir)
    except Exception:
        pass

    # ------------------------------------------------------------------------
    # Test 4: Unified Agent Entrypoint (extract_rb_experiment_numbers)
    # ------------------------------------------------------------------------
    print("\n[Test 4] Testing unified dispatcher (extract_rb_experiment_numbers)...")
    # A) With direct text
    raw_snippet = "Preliminary measurements were performed under beamtime allocation RB1720341 on WISH at ISIS."
    text_res = extract_rb_experiment_numbers(text=raw_snippet)
    assert text_res["status"] == "success"
    assert "RB1720341" in text_res["experiment_numbers"]
    print(f"  [OK] Text input test passed: {text_res['experiment_numbers']}")

    # B) With DOI URL
    doi_dispatch_res = extract_rb_experiment_numbers(doi_or_url="10.5286/edata/isis/r/rb1810012")
    assert doi_dispatch_res["status"] == "success"
    assert "RB1810012" in doi_dispatch_res["experiment_numbers"]
    print(f"  [OK] DOI dispatch test passed: {doi_dispatch_res['experiment_numbers']}")

    # ------------------------------------------------------------------------
    # Test 5: Verify Gemini / Google GenAI Tool Declarations
    # ------------------------------------------------------------------------
    print("\n[Test 5] Verifying Gemini Function Declarations for RB Extractor...")
    declarations = get_gemini_rb_tool_declarations()
    assert len(declarations) == 3
    tool_names = [d["name"] for d in declarations]
    assert "extract_rb_experiment_numbers" in tool_names
    assert "extract_rb_from_doi" in tool_names
    assert "extract_rb_from_pdf" in tool_names
    print(f"  [OK] Verified {len(declarations)} Gemini tool declarations:")
    for d in declarations:
        print(f"       - {d['name']}: {d['description'][:65]}...")

    # ------------------------------------------------------------------------
    # Test 6: End-to-End Agent Pipeline
    # Search STFC ePubs -> Extract DOIs -> Extract RB Experiment Numbers
    # ------------------------------------------------------------------------
    print("\n[Test 6] Full Agent Pipeline: STFC ePubs -> DOIs -> RB Experiment Numbers...")
    print("  Step A: Search STFC ePubs for 'nickelates'...")
    search_data = search_stfc_publications(query="nickelates", limit=2)
    print(f"  [OK] Found {len(search_data['publications'])} publications.")

    print("  Step B: Extract publication DOIs...")
    doi_data = extract_publication_dois(dataset=search_data["publications"])
    print(f"  [OK] Extracted {doi_data['unique_dois_count']} DOIs: {doi_data['unique_dois']}")

    print("  Step C: Scan extracted DOIs for STFC beamtime experiment allocations...")
    found_rb_count = 0
    for d in doi_data["unique_dois"]:
        rb_info = extract_rb_from_doi(d)
        if rb_info.get("experiment_numbers"):
            found_rb_count += len(rb_info["experiment_numbers"])
            print(f"  [OK] DOI {d} linked to RB experiment numbers: {rb_info['experiment_numbers']}")

    print("\n" + "=" * 72)
    print("[OK] ALL RB EXPERIMENT EXTRACTOR TESTS PASSED SUCCESSFULLY!")
    print("=" * 72)


if __name__ == "__main__":
    run_tests()
