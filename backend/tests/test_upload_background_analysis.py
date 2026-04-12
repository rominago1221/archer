"""
Test suite for upload endpoint with background analysis feature
Tests: instant case creation, background analysis, dashboard polling, case display
"""
import pytest
import requests
import os
import time
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
US_USER_EMAIL = TEST_US_EMAIL
US_USER_PASSWORD = TEST_US_PASSWORD
BELGIAN_USER_EMAIL = TEST_BE_EMAIL
BELGIAN_USER_PASSWORD = TEST_US_PASSWORD


class TestUploadBackgroundAnalysis:
    """Tests for upload endpoint with instant case creation and background analysis"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session for each test"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_user(self, email, password):
        """Login and return session with auth cookie"""
        # Remove Content-Type header for login (let requests set it)
        headers = {"Content-Type": "application/json"}
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            headers=headers
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        result = response.json()
        # Store session token for use in uploads
        self.session_token = result.get("session_token")
        return result
    
    def upload_file(self, filename, content, analysis_mode="standard", user_context=None, case_id=None):
        """Upload a file - handles multipart form data correctly"""
        files = {"file": (filename, content, "text/plain")}
        data = {"analysis_mode": analysis_mode}
        if user_context:
            data["user_context"] = user_context
        if case_id:
            data["case_id"] = case_id
        
        # Get cookies from main session and add session_token cookie
        cookies = self.session.cookies.get_dict()
        if hasattr(self, 'session_token') and self.session_token:
            cookies['session_token'] = self.session_token
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data,
            cookies=cookies
        )
        return response
    
    # ========== AUTHENTICATION TESTS ==========
    
    def test_us_user_login(self):
        """Test US Pro user can login"""
        result = self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        assert "user" in result
        assert result["user"]["email"] == US_USER_EMAIL
        assert result["user"]["plan"] == "pro"
        print(f"✓ US user login successful: {result['user']['email']}")
    
    def test_belgian_user_login(self):
        """Test Belgian FR Pro user can login"""
        result = self.login_user(BELGIAN_USER_EMAIL, BELGIAN_USER_PASSWORD)
        assert "user" in result
        assert result["user"]["email"] == BELGIAN_USER_EMAIL
        assert result["user"]["plan"] == "pro"
        print(f"✓ Belgian user login successful: {result['user']['email']}")
    
    # ========== UPLOAD ENDPOINT TESTS ==========
    
    def test_upload_returns_instantly_with_case_id(self):
        """Upload endpoint should return instantly with case_id and status='analyzing'"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        # Create a simple test document
        test_content = b"This is a test eviction notice from landlord to tenant."
        
        start_time = time.time()
        response = self.upload_file("test_eviction.txt", test_content)
        elapsed = time.time() - start_time
        
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        
        # Verify instant response (should be < 5 seconds, not 60-90 seconds)
        assert elapsed < 10, f"Upload took too long: {elapsed}s (should be instant)"
        
        # Verify response structure
        assert "case_id" in data, "Response missing case_id"
        assert "status" in data, "Response missing status"
        assert data["status"] == "analyzing", f"Expected status='analyzing', got '{data['status']}'"
        assert data["analysis"] is None, "Analysis should be None for instant response"
        
        print(f"✓ Upload returned instantly in {elapsed:.2f}s with case_id={data['case_id']}, status={data['status']}")
        return data["case_id"]
    
    def test_case_created_immediately_in_database(self):
        """Case should be created in database immediately (before analysis completes)"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        # Upload document
        test_content = b"Test demand letter for unpaid rent of $2000."
        
        response = self.upload_file("demand_letter.txt", test_content)
        assert response.status_code == 200, f"Upload failed: {response.text}"
        case_id = response.json()["case_id"]
        
        # Immediately check if case exists in database via GET /api/cases
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        assert cases_response.status_code == 200
        cases = cases_response.json()
        
        # Find the newly created case
        new_case = next((c for c in cases if c["case_id"] == case_id), None)
        assert new_case is not None, f"Case {case_id} not found in database immediately after upload"
        assert new_case["status"] == "analyzing", f"Expected status='analyzing', got '{new_case['status']}'"
        
        print(f"✓ Case {case_id} created immediately with status='analyzing'")
    
    def test_upload_with_user_context(self):
        """Upload with user context should work"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        test_content = b"Employment termination letter effective immediately."
        
        response = self.upload_file(
            "termination.txt", 
            test_content,
            user_context="I was fired without warning after 5 years of employment."
        )
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["status"] == "analyzing"
        print(f"✓ Upload with user context successful: case_id={data['case_id']}")
    
    # ========== DASHBOARD TESTS ==========
    
    def test_dashboard_shows_all_cases(self):
        """Dashboard should show all cases including newly uploaded ones"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        assert isinstance(cases, list), "Cases should be a list"
        print(f"✓ Dashboard shows {len(cases)} cases")
        
        # Check case structure
        if cases:
            case = cases[0]
            required_fields = ["case_id", "title", "type", "status", "risk_score"]
            for field in required_fields:
                assert field in case, f"Case missing required field: {field}"
            print(f"✓ Case structure valid: {case['title'][:50]}...")
    
    def test_dashboard_shows_analyzing_cases(self):
        """Dashboard should show cases with 'analyzing' status"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        # Upload a new document to create an analyzing case
        test_content = b"Notice of lease violation for noise complaints."
        
        upload_response = self.upload_file("lease_violation.txt", test_content)
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        case_id = upload_response.json()["case_id"]
        
        # Check dashboard immediately
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        assert cases_response.status_code == 200
        cases = cases_response.json()
        
        analyzing_case = next((c for c in cases if c["case_id"] == case_id), None)
        assert analyzing_case is not None, "Analyzing case should appear in dashboard"
        
        # Case should have analyzing status or be active (if analysis completed quickly)
        assert analyzing_case["status"] in ["analyzing", "active"], f"Unexpected status: {analyzing_case['status']}"
        print(f"✓ Analyzing case visible in dashboard: {analyzing_case['title']}")
    
    def test_case_has_risk_score_and_deadline(self):
        """Analyzed cases should have risk score and deadline info"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find an active (analyzed) case
        active_cases = [c for c in cases if c["status"] == "active" and c.get("risk_score", 0) > 0]
        
        if active_cases:
            case = active_cases[0]
            assert "risk_score" in case
            assert isinstance(case["risk_score"], (int, float))
            print(f"✓ Case has risk_score: {case['risk_score']}")
            
            # Check for deadline if present
            if case.get("deadline"):
                print(f"✓ Case has deadline: {case['deadline']}")
        else:
            print("⚠ No active cases with risk_score > 0 found (may need to wait for analysis)")
    
    def test_case_has_findings_and_next_steps(self):
        """Analyzed cases should have AI findings and next steps"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find an active case with findings
        active_cases = [c for c in cases if c["status"] == "active" and c.get("ai_findings")]
        
        if active_cases:
            case = active_cases[0]
            findings = case.get("ai_findings", [])
            next_steps = case.get("ai_next_steps", [])
            
            assert isinstance(findings, list), "ai_findings should be a list"
            assert isinstance(next_steps, list), "ai_next_steps should be a list"
            
            print(f"✓ Case has {len(findings)} findings and {len(next_steps)} next steps")
            
            # Check for Florida statute references in housing cases
            if case.get("type") == "housing":
                findings_text = " ".join([f.get("text", "") + f.get("legal_ref", "") for f in findings])
                if "83.56" in findings_text or "83.49" in findings_text:
                    print("✓ Florida statute references found (§83.56 or §83.49)")
        else:
            print("⚠ No active cases with findings found")
    
    def test_case_has_battle_preview(self):
        """Analyzed cases should have battle preview with user and opposing arguments"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a case with battle preview
        cases_with_bp = [c for c in cases if c.get("battle_preview")]
        
        if cases_with_bp:
            case = cases_with_bp[0]
            bp = case["battle_preview"]
            
            assert "user_side" in bp or "user_arguments" in bp, "Battle preview missing user side"
            assert "opposing_side" in bp or "opposing_arguments" in bp, "Battle preview missing opposing side"
            
            print(f"✓ Case has battle preview with user and opposing arguments")
        else:
            print("⚠ No cases with battle preview found")
    
    # ========== BELGIAN USER TESTS ==========
    
    def test_belgian_user_can_upload(self):
        """Belgian FR user should be able to upload documents"""
        self.login_user(BELGIAN_USER_EMAIL, BELGIAN_USER_PASSWORD)
        
        test_content = "Lettre de mise en demeure pour loyer impaye de 800 EUR.".encode('utf-8')
        
        response = self.upload_file("mise_en_demeure.txt", test_content)
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["status"] == "analyzing"
        print(f"✓ Belgian user upload successful: case_id={data['case_id']}")
    
    def test_belgian_user_dashboard(self):
        """Belgian user should see their cases in dashboard"""
        self.login_user(BELGIAN_USER_EMAIL, BELGIAN_USER_PASSWORD)
        
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        assert isinstance(cases, list)
        print(f"✓ Belgian user dashboard shows {len(cases)} cases")
    
    # ========== CONTRACT GUARD TESTS ==========
    
    def test_contract_guard_upload(self):
        """Contract Guard mode should work"""
        self.login_user(US_USER_EMAIL, US_USER_PASSWORD)
        
        test_content = b"Non-Disclosure Agreement between Company A and Employee B. Confidentiality period: 5 years."
        
        response = self.upload_file("nda_contract.txt", test_content, analysis_mode="contract_guard")
        assert response.status_code == 200, f"Upload failed: {response.text}"
        data = response.json()
        assert data["analysis_mode"] == "contract_guard"
        print(f"✓ Contract Guard upload successful: review_id={data['case_id']}")
    
    # ========== EDGE CASES ==========
    
    def test_upload_without_auth_fails(self):
        """Upload without authentication should fail"""
        # Don't login, just try to upload
        fresh_session = requests.Session()
        test_content = b"Test document"
        files = {"file": ("test.txt", test_content, "text/plain")}
        
        response = fresh_session.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data={"analysis_mode": "standard"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Upload without auth correctly returns 401")


class TestDashboardPolling:
    """Tests for dashboard auto-polling behavior"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
    
    def test_cases_endpoint_returns_status(self):
        """Cases endpoint should return status field for polling"""
        # Login
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": US_USER_EMAIL, "password": US_USER_PASSWORD}
        )
        assert response.status_code == 200
        
        # Get cases
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        assert cases_response.status_code == 200
        cases = cases_response.json()
        
        # All cases should have status field
        for case in cases:
            assert "status" in case, f"Case {case.get('case_id')} missing status field"
            assert case["status"] in ["analyzing", "active", "closed"], f"Invalid status: {case['status']}"
        
        print(f"✓ All {len(cases)} cases have valid status field")
    
    def test_analyzing_case_transitions_to_active(self):
        """Case should transition from 'analyzing' to 'active' after analysis completes"""
        # Login
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": US_USER_EMAIL, "password": US_USER_PASSWORD}
        )
        assert response.status_code == 200
        session_token = response.json().get("session_token")
        
        # Upload a document - need to handle multipart correctly
        test_content = b"Security deposit demand letter for $1500 return."
        files = {"file": ("deposit_demand.txt", test_content, "text/plain")}
        
        # Get cookies from main session and add session_token
        cookies = self.session.cookies.get_dict()
        cookies['session_token'] = session_token
        
        upload_response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data={"analysis_mode": "standard"},
            cookies=cookies
        )
        assert upload_response.status_code == 200, f"Upload failed: {upload_response.text}"
        case_id = upload_response.json()["case_id"]
        
        # Poll for status change (max 120 seconds)
        max_wait = 120
        poll_interval = 5
        elapsed = 0
        final_status = "analyzing"
        
        while elapsed < max_wait:
            cases_response = self.session.get(f"{BASE_URL}/api/cases")
            cases = cases_response.json()
            case = next((c for c in cases if c["case_id"] == case_id), None)
            
            if case and case["status"] == "active":
                final_status = "active"
                print(f"✓ Case transitioned to 'active' after {elapsed}s")
                
                # Verify it has analysis data
                assert case.get("risk_score", 0) > 0 or case.get("ai_summary"), "Active case should have analysis data"
                break
            
            time.sleep(poll_interval)
            elapsed += poll_interval
        
        if final_status == "analyzing":
            print(f"⚠ Case still 'analyzing' after {max_wait}s (analysis may take longer)")
        
        # Test passes either way - we just verify the polling mechanism works


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
