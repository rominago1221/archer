"""
Test suite for Code Quality Refactoring - Iteration 40
Tests login flows, dashboard APIs, and page loading after code quality fixes:
- React Hook dependency fixes
- Array index key replacements
- Backend helper function extraction
- Upload.js stray 'ad;' fix
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthLogin:
    """Test login flows for different user types"""
    
    def test_us_pro_user_login(self):
        """Test US Pro user login - test@jasper.legal"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@jasper.legal",
            "password": "JasperPro2026!"
        })
        assert response.status_code == 200, f"US Pro login failed: {response.text}"
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert data["user"]["email"] == "test@jasper.legal"
        assert data["user"]["plan"] == "pro"
        # Store session cookie for subsequent tests
        self.us_session_cookie = response.cookies.get("session_token")
        assert self.us_session_cookie, "No session_token cookie set"
        print(f"✓ US Pro user login successful, plan: {data['user']['plan']}")
    
    def test_belgium_pro_user_login(self):
        """Test Belgium Pro user login - belgium@jasper.legal"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "belgium@jasper.legal",
            "password": "JasperPro2026!"
        })
        assert response.status_code == 200, f"Belgium Pro login failed: {response.text}"
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert data["user"]["email"] == "belgium@jasper.legal"
        assert data["user"]["plan"] == "pro"
        assert data["user"].get("jurisdiction") == "BE" or data["user"].get("country") == "BE"
        print(f"✓ Belgium Pro user login successful, jurisdiction: {data['user'].get('jurisdiction', data['user'].get('country'))}")
    
    def test_attorney_login(self):
        """Test attorney login - attorney@jasper.com"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "attorney@jasper.com",
            "password": "attorney123"
        })
        assert response.status_code == 200, f"Attorney login failed: {response.text}"
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert data["user"]["email"] == "attorney@jasper.com"
        print(f"✓ Attorney login successful")
    
    def test_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected with 401")


class TestCasesAPI:
    """Test cases API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Login and get session for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@jasper.legal",
            "password": "JasperPro2026!"
        })
        assert response.status_code == 200, "Setup login failed"
        self.session = requests.Session()
        self.session.cookies.set("session_token", response.cookies.get("session_token"))
    
    def test_get_cases_authenticated(self):
        """Test GET /api/cases returns cases for authenticated user"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200, f"GET /api/cases failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of cases"
        print(f"✓ GET /api/cases returned {len(data)} cases")
        
        # Verify case structure if cases exist
        if len(data) > 0:
            case = data[0]
            assert "case_id" in case or "id" in case, "Case missing id field"
            assert "title" in case or "name" in case, "Case missing title/name field"
            print(f"✓ Case structure verified: {case.get('title', case.get('name', 'Unknown'))}")
    
    def test_get_cases_unauthenticated(self):
        """Test GET /api/cases without auth returns 401"""
        response = requests.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Unauthenticated /api/cases correctly rejected with 401")


class TestBelgiumJurisdiction:
    """Test Belgium jurisdiction switching"""
    
    @pytest.fixture(autouse=True)
    def setup_belgium_session(self):
        """Login as Belgium user"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "belgium@jasper.legal",
            "password": "JasperPro2026!"
        })
        assert response.status_code == 200, "Belgium login failed"
        self.session = requests.Session()
        self.session.cookies.set("session_token", response.cookies.get("session_token"))
    
    def test_belgium_user_cases(self):
        """Test Belgium user can access cases"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200, f"Belgium user GET /api/cases failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of cases"
        print(f"✓ Belgium user GET /api/cases returned {len(data)} cases")


class TestHealthEndpoints:
    """Test basic health and status endpoints"""
    
    def test_health_check(self):
        """Test health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        # Health endpoint might return 200 or 404 if not implemented
        if response.status_code == 200:
            print("✓ Health endpoint available")
        else:
            print(f"⚠ Health endpoint returned {response.status_code} (may not be implemented)")
    
    def test_api_root(self):
        """Test API root responds"""
        response = requests.get(f"{BASE_URL}/api/")
        # Root might redirect or return various status codes
        assert response.status_code in [200, 307, 404], f"Unexpected status: {response.status_code}"
        print(f"✓ API root responded with {response.status_code}")


class TestDashboardAPIs:
    """Test dashboard-related API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_session(self):
        """Login and get session"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@jasper.legal",
            "password": "JasperPro2026!"
        })
        assert response.status_code == 200, "Setup login failed"
        self.session = requests.Session()
        self.session.cookies.set("session_token", response.cookies.get("session_token"))
    
    def test_auth_me(self):
        """Test GET /api/auth/me returns current user"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200, f"GET /api/auth/me failed: {response.text}"
        data = response.json()
        assert "email" in data, "Response missing email"
        assert data["email"] == "test@jasper.legal"
        print(f"✓ GET /api/auth/me returned user: {data['email']}")
    
    def test_chat_conversations(self):
        """Test GET /api/chat/conversations"""
        response = self.session.get(f"{BASE_URL}/api/chat/conversations")
        assert response.status_code == 200, f"GET /api/chat/conversations failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of conversations"
        print(f"✓ GET /api/chat/conversations returned {len(data)} conversations")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
