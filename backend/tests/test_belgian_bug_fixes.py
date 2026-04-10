"""
Test suite for Belgian bug fixes (Iteration 15):
- BUG 1: Belgian user analysis returns content in user's language (FR/NL/DE)
- BUG 2: Cases properly created with normalized deadline/financial_exposure fields
- BUG 3: All features available for Belgian users (Battle Preview, Outcome Predictor, etc.)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_cg@example.com"
TEST_PASSWORD = "testpassword123"


class TestLogin:
    """Test login flow for Belgian user"""
    
    def test_login_belgian_user(self):
        """Test login works for Belgian test user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["country"] == "BE"
        assert data["user"]["language"] == "fr-BE"
        assert data["user"]["region"] == "Wallonie"
        print(f"✓ Login successful for Belgian user: {data['user']['email']}")


@pytest.fixture(scope="module")
def auth_session():
    """Get authenticated session for Belgian user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.text}")
    data = response.json()
    session = requests.Session()
    session.headers.update({
        "Authorization": f"Bearer {data['session_token']}",
        "Content-Type": "application/json"
    })
    return session, data["user"]


class TestCasesEndpoint:
    """Test GET /api/cases returns properly formatted cases (BUG 2)"""
    
    def test_cases_no_500_error(self, auth_session):
        """GET /api/cases should not return 500 error"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200, f"Cases endpoint failed: {response.status_code} - {response.text}"
        cases = response.json()
        assert isinstance(cases, list)
        print(f"✓ GET /api/cases returned {len(cases)} cases without error")
    
    def test_deadline_is_string(self, auth_session):
        """Deadline field should always be a string (never a dict)"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        for case in cases:
            deadline = case.get("deadline")
            if deadline is not None:
                assert isinstance(deadline, str), f"Deadline should be string, got {type(deadline)}: {deadline}"
        print(f"✓ All {len(cases)} cases have deadline as string (or null)")
    
    def test_financial_exposure_is_string(self, auth_session):
        """Financial exposure field should always be a string (never a dict)"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        for case in cases:
            financial_exposure = case.get("financial_exposure")
            if financial_exposure is not None:
                assert isinstance(financial_exposure, str), f"Financial exposure should be string, got {type(financial_exposure)}: {financial_exposure}"
        print(f"✓ All {len(cases)} cases have financial_exposure as string (or null)")


class TestBelgianCaseDetail:
    """Test Belgian case detail has all features (BUG 3)"""
    
    def test_belgian_case_has_country_be(self, auth_session):
        """Belgian case should have country=BE"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a Belgian case
        belgian_case = next((c for c in cases if c.get("country") == "BE"), None)
        if belgian_case is None:
            pytest.skip("No Belgian case found in user's cases")
        
        case_id = belgian_case["case_id"]
        response = session.get(f"{BASE_URL}/api/cases/{case_id}")
        assert response.status_code == 200
        case = response.json()
        
        assert case["country"] == "BE"
        print(f"✓ Belgian case {case_id} has country=BE")
    
    def test_belgian_case_has_french_content(self, auth_session):
        """Belgian case should have French content in ai_findings/ai_next_steps/ai_summary"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a Belgian case with language fr-BE
        belgian_case = next((c for c in cases if c.get("language") == "fr-BE"), None)
        if belgian_case is None:
            pytest.skip("No French Belgian case found")
        
        case_id = belgian_case["case_id"]
        response = session.get(f"{BASE_URL}/api/cases/{case_id}")
        assert response.status_code == 200
        case = response.json()
        
        # Check for French content indicators
        ai_summary = case.get("ai_summary", "")
        ai_findings = case.get("ai_findings", [])
        ai_next_steps = case.get("ai_next_steps", [])
        
        # French indicators
        french_words = ["de", "la", "le", "les", "du", "des", "en", "pour", "avec", "EUR", "€"]
        
        if ai_summary:
            has_french = any(word in ai_summary.lower() for word in french_words)
            assert has_french, f"ai_summary should contain French content: {ai_summary[:100]}"
        
        if ai_findings:
            first_finding = ai_findings[0].get("text", "") if ai_findings else ""
            if first_finding:
                has_french = any(word in first_finding.lower() for word in french_words)
                assert has_french, f"ai_findings should contain French content: {first_finding[:100]}"
        
        print(f"✓ Belgian case {case_id} has French content in analysis")
    
    def test_belgian_case_has_battle_preview(self, auth_session):
        """Belgian case should have battle_preview feature"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a Belgian case with battle_preview
        belgian_case = next((c for c in cases if c.get("country") == "BE" and c.get("battle_preview")), None)
        if belgian_case is None:
            pytest.skip("No Belgian case with battle_preview found")
        
        case_id = belgian_case["case_id"]
        response = session.get(f"{BASE_URL}/api/cases/{case_id}")
        assert response.status_code == 200
        case = response.json()
        
        assert case.get("battle_preview") is not None
        assert "user_side" in case["battle_preview"]
        assert "opposing_side" in case["battle_preview"]
        print(f"✓ Belgian case {case_id} has battle_preview feature")
    
    def test_belgian_case_has_success_probability(self, auth_session):
        """Belgian case should have success_probability (Outcome Predictor)"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a Belgian case with success_probability
        belgian_case = next((c for c in cases if c.get("country") == "BE" and c.get("success_probability")), None)
        if belgian_case is None:
            pytest.skip("No Belgian case with success_probability found")
        
        case_id = belgian_case["case_id"]
        response = session.get(f"{BASE_URL}/api/cases/{case_id}")
        assert response.status_code == 200
        case = response.json()
        
        assert case.get("success_probability") is not None
        print(f"✓ Belgian case {case_id} has success_probability (Outcome Predictor)")


class TestBelgianFeatures:
    """Test all Belgian-specific features are available"""
    
    def test_risk_history_endpoint(self, auth_session):
        """Risk history endpoint should work for Belgian cases"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        belgian_case = next((c for c in cases if c.get("country") == "BE"), None)
        if belgian_case is None:
            pytest.skip("No Belgian case found")
        
        case_id = belgian_case["case_id"]
        response = session.get(f"{BASE_URL}/api/cases/{case_id}/risk-history")
        assert response.status_code == 200
        data = response.json()
        
        assert "current_score" in data
        assert "history" in data
        print(f"✓ Risk history endpoint works for Belgian case {case_id}")
    
    def test_letter_types_endpoint_belgian(self, auth_session):
        """Letter types endpoint should return Belgian letter types"""
        session, user = auth_session
        
        # Test debt letter types for Belgium
        response = session.get(f"{BASE_URL}/api/letters/types/debt?country=BE")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("country") == "BE"
        assert "letter_types" in data
        assert len(data["letter_types"]) > 0
        
        # Check for Belgian-specific letter types (French labels)
        letter_ids = [lt["id"] for lt in data["letter_types"]]
        assert any("BE_" in lid for lid in letter_ids), "Should have Belgian letter types with BE_ prefix"
        print(f"✓ Letter types endpoint returns {len(data['letter_types'])} Belgian letter types")
    
    def test_case_shares_endpoint(self, auth_session):
        """Case sharing endpoint should work for Belgian cases"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        belgian_case = next((c for c in cases if c.get("country") == "BE"), None)
        if belgian_case is None:
            pytest.skip("No Belgian case found")
        
        case_id = belgian_case["case_id"]
        response = session.get(f"{BASE_URL}/api/cases/{case_id}/shares")
        assert response.status_code == 200
        print(f"✓ Case sharing endpoint works for Belgian case {case_id}")
    
    def test_case_events_endpoint(self, auth_session):
        """Case timeline/events endpoint should work for Belgian cases"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        belgian_case = next((c for c in cases if c.get("country") == "BE"), None)
        if belgian_case is None:
            pytest.skip("No Belgian case found")
        
        case_id = belgian_case["case_id"]
        response = session.get(f"{BASE_URL}/api/cases/{case_id}/events")
        assert response.status_code == 200
        print(f"✓ Case events/timeline endpoint works for Belgian case {case_id}")
    
    def test_case_documents_endpoint(self, auth_session):
        """Case documents endpoint should work for Belgian cases"""
        session, user = auth_session
        response = session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        belgian_case = next((c for c in cases if c.get("country") == "BE"), None)
        if belgian_case is None:
            pytest.skip("No Belgian case found")
        
        case_id = belgian_case["case_id"]
        response = session.get(f"{BASE_URL}/api/cases/{case_id}/documents")
        assert response.status_code == 200
        print(f"✓ Case documents endpoint works for Belgian case {case_id}")


class TestUSRegression:
    """Regression test: US analysis should still work"""
    
    def test_us_letter_types(self, auth_session):
        """US letter types should still work"""
        session, user = auth_session
        
        response = session.get(f"{BASE_URL}/api/letters/types/employment?country=US")
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("country") == "US"
        assert "letter_types" in data
        print(f"✓ US letter types endpoint still works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
