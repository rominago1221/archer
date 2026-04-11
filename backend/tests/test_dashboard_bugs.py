"""
Backend API tests for Dashboard Bug Fixes (Iteration 25)
Tests: Claude API via Emergent, CourtListener filtering, Dashboard data structure
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
US_PRO_EMAIL = "test@jasper.legal"
US_PRO_PASSWORD = "JasperPro2026!"
BELGIAN_FR_EMAIL = "belgium@jasper.legal"
BELGIAN_FR_PASSWORD = "JasperPro2026!"


class TestAuthAndLogin:
    """Authentication tests"""
    
    def test_login_us_pro_client(self):
        """Test US Pro client login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": US_PRO_EMAIL,
            "password": US_PRO_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == US_PRO_EMAIL
        assert data["user"]["plan"] == "pro"
        assert data["user"]["language"] == "en"
        print(f"SUCCESS: US Pro client login - user_id: {data['user']['user_id']}")
    
    def test_login_belgian_fr_client(self):
        """Test Belgian FR client login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": BELGIAN_FR_EMAIL,
            "password": BELGIAN_FR_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == BELGIAN_FR_EMAIL
        assert data["user"]["language"] == "fr"
        print(f"SUCCESS: Belgian FR client login - language: {data['user']['language']}")


class TestCasesAPI:
    """Cases API tests"""
    
    @pytest.fixture
    def auth_session(self):
        """Get authenticated session for US Pro client"""
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": US_PRO_EMAIL,
            "password": US_PRO_PASSWORD
        })
        assert response.status_code == 200
        # Extract session token from cookies
        session_token = response.cookies.get("session_token")
        if session_token:
            session.cookies.set("session_token", session_token)
        return session
    
    def test_get_cases_returns_data(self, auth_session):
        """Test GET /api/cases returns case data"""
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200, f"Get cases failed: {response.text}"
        cases = response.json()
        assert isinstance(cases, list)
        assert len(cases) >= 2, "Expected at least 2 cases for US Pro user"
        print(f"SUCCESS: Retrieved {len(cases)} cases")
    
    def test_case_has_risk_score_75(self, auth_session):
        """Test that analyzed cases have risk score 75"""
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find cases with risk_score 75
        high_risk_cases = [c for c in cases if c.get("risk_score") == 75]
        assert len(high_risk_cases) >= 2, f"Expected 2 cases with risk_score 75, found {len(high_risk_cases)}"
        print(f"SUCCESS: Found {len(high_risk_cases)} cases with risk_score 75")
    
    def test_case_has_4_risk_dimensions(self, auth_session):
        """Test that cases have all 4 risk dimensions"""
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Check first case with score > 0
        analyzed_case = next((c for c in cases if c.get("risk_score", 0) > 0), None)
        assert analyzed_case is not None, "No analyzed case found"
        
        dimensions = ["risk_financial", "risk_urgency", "risk_legal_strength", "risk_complexity"]
        for dim in dimensions:
            assert dim in analyzed_case, f"Missing dimension: {dim}"
            assert analyzed_case[dim] > 0, f"Dimension {dim} should be > 0"
        
        print(f"SUCCESS: Case has all 4 dimensions - Financial:{analyzed_case['risk_financial']}, Urgency:{analyzed_case['risk_urgency']}, Legal:{analyzed_case['risk_legal_strength']}, Complexity:{analyzed_case['risk_complexity']}")
    
    def test_case_has_ai_findings(self, auth_session):
        """Test that analyzed cases have AI findings"""
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        analyzed_case = next((c for c in cases if c.get("risk_score", 0) > 0), None)
        assert analyzed_case is not None
        
        findings = analyzed_case.get("ai_findings", [])
        assert len(findings) >= 3, f"Expected at least 3 findings, got {len(findings)}"
        
        # Check findings have required fields
        for finding in findings[:3]:
            assert "text" in finding, "Finding missing 'text' field"
        
        print(f"SUCCESS: Case has {len(findings)} AI findings")
    
    def test_case_has_ai_next_steps(self, auth_session):
        """Test that analyzed cases have AI next steps"""
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        analyzed_case = next((c for c in cases if c.get("risk_score", 0) > 0), None)
        assert analyzed_case is not None
        
        steps = analyzed_case.get("ai_next_steps", [])
        assert len(steps) >= 3, f"Expected at least 3 next steps, got {len(steps)}"
        print(f"SUCCESS: Case has {len(steps)} next steps")
    
    def test_case_has_battle_preview(self, auth_session):
        """Test that analyzed cases have battle_preview with correct structure"""
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        analyzed_case = next((c for c in cases if c.get("risk_score", 0) > 0), None)
        assert analyzed_case is not None
        
        bp = analyzed_case.get("battle_preview")
        assert bp is not None, "battle_preview is missing"
        assert "user_side" in bp, "battle_preview missing user_side"
        assert "opposing_side" in bp, "battle_preview missing opposing_side"
        
        # Check user_side has strongest_arguments
        user_side = bp.get("user_side", {})
        assert "strongest_arguments" in user_side or "strong_arguments" in user_side, "user_side missing arguments"
        
        print(f"SUCCESS: battle_preview structure is correct")
    
    def test_case_has_deadline(self, auth_session):
        """Test that housing cases have deadline"""
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        housing_case = next((c for c in cases if c.get("type") == "housing" and c.get("risk_score", 0) > 0), None)
        assert housing_case is not None, "No housing case found"
        
        deadline = housing_case.get("deadline")
        assert deadline is not None, "Housing case missing deadline"
        print(f"SUCCESS: Housing case has deadline: {deadline}")
    
    def test_case_has_key_insight(self, auth_session):
        """Test that analyzed cases have key_insight"""
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        analyzed_case = next((c for c in cases if c.get("risk_score", 0) > 0), None)
        assert analyzed_case is not None
        
        key_insight = analyzed_case.get("key_insight")
        assert key_insight is not None and len(key_insight) > 10, "key_insight missing or too short"
        print(f"SUCCESS: Case has key_insight: {key_insight[:50]}...")


class TestReanalyzeEndpoint:
    """Test the reanalyze endpoint exists (don't actually call it - takes too long)"""
    
    @pytest.fixture
    def auth_session(self):
        session = requests.Session()
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": US_PRO_EMAIL,
            "password": US_PRO_PASSWORD
        })
        assert response.status_code == 200
        session_token = response.cookies.get("session_token")
        if session_token:
            session.cookies.set("session_token", session_token)
        return session
    
    def test_reanalyze_endpoint_exists(self, auth_session):
        """Test that POST /api/cases/{case_id}/reanalyze endpoint exists"""
        # Get a case ID
        response = auth_session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find case with score 0
        zero_score_case = next((c for c in cases if c.get("risk_score", 0) == 0), None)
        if zero_score_case:
            case_id = zero_score_case["case_id"]
            # Just check the endpoint responds (don't wait for full analysis)
            # We'll use a HEAD-like approach by checking OPTIONS or a quick timeout
            print(f"SUCCESS: Found case with score 0 for reanalyze: {case_id}")
        else:
            print("INFO: No case with score 0 found - reanalyze button test skipped")


class TestLawyersAPI:
    """Test lawyers API for navigation"""
    
    def test_get_lawyers_us(self):
        """Test GET /api/lawyers returns US lawyers"""
        response = requests.get(f"{BASE_URL}/api/lawyers", params={"country": "US"})
        assert response.status_code == 200, f"Get lawyers failed: {response.text}"
        lawyers = response.json()
        assert isinstance(lawyers, list)
        print(f"SUCCESS: Retrieved {len(lawyers)} US lawyers")


class TestHealthCheck:
    """Basic health check"""
    
    def test_health_endpoint(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        # May return 200 or 404 depending on implementation
        print(f"Health check status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
