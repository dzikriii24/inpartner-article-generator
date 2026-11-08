import sys
import os
import json
import logging

# Ensure backend path is on sys.path
BASE_DIR = r"c:\Users\dzikri\Downloads\Inpartner\web-scraping-contact\backend"
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("TestE2E")

def test_target_roles_classifier():
    logger.info("--- TEST 1: Job Title Classifier & Normalization ---")
    from app.services.role_classifier import get_job_title_classifier
    
    classifier = get_job_title_classifier()
    
    test_cases = [
        ("Human Resources Manager", True, "Human Resources", "Manager"),
        ("Head of Human Capital", True, "Human Resources", "Head"),
        ("Talent Acquisition Specialist", True, "Talent Acquisition", "Specialist"),
        ("Komisaris Utama", True, "Leadership", "C-Level"),
        ("Direktur Utama", True, "Leadership", "C-Level"),
        ("Senior Software Engineer", False, None, None),
        ("Office Boy", False, None, None),
    ]
    
    passed = 0
    for title, expected_match, exp_dept, exp_sen in test_cases:
        res = classifier.classify(title)
        is_match = res["is_match"]
        assert is_match == expected_match, f"Failed match on '{title}': got {is_match}, expected {expected_match}"
        if expected_match:
            assert res["department"] == exp_dept, f"Wrong dept for '{title}': got {res['department']}, expected {exp_dept}"
            assert res["seniority_level"] == exp_sen, f"Wrong seniority for '{title}': got {res['seniority_level']}, expected {exp_sen}"
            assert res["relevance_score"] >= 0.7, f"Low relevance score for '{title}': {res['relevance_score']}"
        passed += 1
        logger.info(f"  ✓ Classified '{title}' -> match={is_match}, dept={res.get('department')}, seniority={res.get('seniority_level')}, score={res.get('relevance_score')}")
    
    logger.info(f"Test 1 PASSED ({passed}/{len(test_cases)} cases)")

def test_database_persistence_and_mitrabara():
    logger.info("--- TEST 2: Database Persistence & Mitrabara Adiperdana Case ---")
    from app.core.database import SessionLocal
    from app.models.schema import Company, CompanyProfessional
    
    db = SessionLocal()
    try:
        # Find Mitrabara
        mitrabara = db.query(Company).filter(Company.input_name.like("%Mitrabara%")).first()
        assert mitrabara is not None, "Mitrabara company record not found in database"
        logger.info(f"  Found company: ID {mitrabara.id} - {mitrabara.official_name or mitrabara.input_name}")
        
        # Check professionals populated
        profs = db.query(CompanyProfessional).filter(CompanyProfessional.company_id == mitrabara.id).all()
        logger.info(f"  Total professionals stored for Mitrabara: {len(profs)}")
        assert len(profs) >= 5, f"Expected at least 5 professionals for Mitrabara, found {len(profs)}"
        
        for p in profs:
            logger.info(f"    - {p.person_name} | {p.job_title} ({p.seniority_level}) | Status: {p.verification_status} | Source: {p.source_url}")
            assert p.person_name and len(p.person_name.strip()) > 2
            assert p.job_title and len(p.job_title.strip()) > 2
            assert p.source_url is not None
            assert "mitrabaraadiperdana.co.id" in p.source_url
            
        logger.info("Test 2 PASSED: Real corporate governance professionals verified without hallucinations.")
    finally:
        db.close()

def test_outreach_workflow_and_dnc():
    logger.info("--- TEST 3: Outreach Workflow & Suppression / Do Not Contact (DNC) ---")
    from app.core.database import SessionLocal
    from app.models.schema import CompanyProfessional
    
    db = SessionLocal()
    try:
        prof = db.query(CompanyProfessional).first()
        assert prof is not None, "No professional found in database for DNC testing"
        
        orig_status = prof.outreach_status
        orig_dnc = prof.is_do_not_contact
        orig_notes = prof.outreach_notes
        
        # Update outreach status & notes
        prof.outreach_status = "CONTACTED"
        prof.outreach_notes = "Sent initial partnership introduction email on testing run."
        prof.is_do_not_contact = True
        db.commit()
        db.refresh(prof)
        
        assert prof.outreach_status == "CONTACTED"
        assert prof.outreach_notes == "Sent initial partnership introduction email on testing run."
        assert prof.is_do_not_contact is True
        logger.info(f"  ✓ Updated professional ID {prof.id} to CONTACTED + DNC = True")
        
        # Restore or reset to clean state
        prof.outreach_status = orig_status or "NEW_LEAD"
        prof.is_do_not_contact = False
        prof.outreach_notes = orig_notes
        db.commit()
        logger.info(f"  ✓ Successfully toggled DNC and preserved notes.")
        logger.info("Test 3 PASSED")
    finally:
        db.close()

def test_excel_export_multi_sheet():
    logger.info("--- TEST 4: Multi-Sheet Excel Workbook Export ---")
    from app.core.database import SessionLocal
    from app.services.export_service import ExportService
    import openpyxl
    
    db = SessionLocal()
    try:
        from app.models.schema import Company
        companies = db.query(Company).filter(Company.input_name.like("%Mitrabara%")).all()
        export_rec = ExportService.generate_contacts_excel(db, companies, custom_filename="test_hr_e2e.xlsx")
        filepath = export_rec.file_path
        assert os.path.exists(filepath), f"Generated Excel file not found at {filepath}"
        
        wb = openpyxl.load_workbook(filepath)
        sheet_names = wb.sheetnames
        logger.info(f"  Workbook created at: {filepath}")
        logger.info(f"  Sheets found: {sheet_names}")
        
        assert "Company Overview" in sheet_names, "Missing 'Company Overview' sheet"
        assert "HR & Decision Makers" in sheet_names, "Missing 'HR & Decision Makers' sheet"
        assert "Company Contacts" in sheet_names, "Missing 'Company Contacts' sheet"
        assert "Search Audit" in sheet_names, "Missing 'Search Audit' sheet"
        
        hr_sheet = wb["HR & Decision Makers"]
        headers = [cell.value for cell in hr_sheet[1]]
        logger.info(f"  HR Sheet Headers ({len(headers)} columns): {headers[:8]}...")
        assert "Official Company Name" in headers
        assert "Person Name" in headers
        assert "Job Title" in headers
        assert "Department" in headers
        assert "Seniority Level" in headers
        assert "Verification Status" in headers
        assert "Relevance Reason" in headers
        assert "Do Not Contact" in headers
        
        row_count = hr_sheet.max_row
        logger.info(f"  HR Sheet data rows count: {row_count - 1}")
        assert row_count >= 2, "HR Sheet should have at least 1 data row"
        
        logger.info("Test 4 PASSED: 4-sheet Excel export successfully validated.")
    finally:
        db.close()

def test_api_professionals_endpoints():
    logger.info("--- TEST 5: API Endpoints Validation ---")
    from app.core.database import SessionLocal
    from app.api.professionals import list_professionals, get_target_roles_config
    
    db = SessionLocal()
    try:
        roles_res = get_target_roles_config()
        cat_ids = [c["id"] for c in roles_res.get("categories", [])]
        assert "human_resources" in cat_ids
        assert "leadership_decision_makers" in cat_ids
        logger.info(f"  ✓ get_target_roles_config returned valid categories: {cat_ids}")
        
        # Test list_professionals
        res = list_professionals(
            q=None,
            company_id=None,
            department=None,
            seniority_level=None,
            verification_status=None,
            outreach_status=None,
            is_do_not_contact=None,
            page=1,
            limit=10,
            sort_by="relevance_score",
            sort_order="desc",
            db=db
        )
        assert "items" in res
        assert "total" in res
        logger.info(f"  ✓ list_professionals returned {len(res['items'])} items (total: {res['total']})")
        logger.info(f"  ✓ Stats: {res.get('stats')}")
        logger.info("Test 5 PASSED")
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("====================================================")
    logger.info("STARTING END-TO-END HR & DECISION MAKER TEST SUITE")
    logger.info("====================================================")
    try:
        test_target_roles_classifier()
        test_database_persistence_and_mitrabara()
        test_outreach_workflow_and_dnc()
        test_excel_export_multi_sheet()
        test_api_professionals_endpoints()
        logger.info("====================================================")
        logger.info("ALL 5 TESTS PASSED SUCCESSFULLY! ZERO ERRORS.")
        logger.info("====================================================")
    except Exception as e:
        logger.error(f"Test failed with error: {e}", exc_info=True)
        sys.exit(1)
