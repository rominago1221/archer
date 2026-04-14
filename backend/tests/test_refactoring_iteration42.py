"""
Test suite for Archer Legal Tech - Iteration 42
Testing structural refactoring: server.py monolith broken into modular FastAPI structure
Extracted modules: db.py, models.py, auth.py, storage.py, routes/auth_routes.py, routes/attorney_routes.py
"""
import pytest
import requests
import os
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
US_PRO_USER = {"email": TEST_US_EMAIL, "password": TEST_US_PASSWORD}
BELGIUM_PRO_USER = {"email": TEST_BE_EMAIL, "password": TEST_BE_PASSWORD}
ATTORNEY_USER = {"email": TEST_ATTORNEY_EMAIL, "password": TEST_ATTORNEY_PASSWORD}


class TestHealthAndBasicEndpoints:
    """Test basic health and root endpoints"""
    
    def test_health_endpoint(self):
        """GET /api/health should return 200"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=10)
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print(f"✓ Health endpoint: {response.status_code}")
    
    def test_root_endpoint(self):
        """GET /api/ should return 200"""
        response = requests.get(f"{BASE_URL}/api/", timeout=10)
        assert response.status_code == 200, f"Root endpoint failed: {response.text}"
        print(f"✓ Root endpoint: {response.status_code}")


class TestAuthRoutes:
    """Test auth routes from routes/auth_routes.py"""
    
    def test_login_us_pro_user(self):
        """POST /api/auth/login - US Pro user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=US_PRO_USER,
            timeout=10
        )
        assert response.status_code == 200, f"US Pro login failed: {response.text}"
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert "session_token" in data, "Response missing 'session_token' field"
        assert data["user"]["email"] == US_PRO_USER["email"]
        print(f"✓ US Pro user login: {response.status_code}")
        return data["session_token"]
    
    def test_login_belgium_pro_user(self):
        """POST /api/auth/login - Belgium Pro user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=BELGIUM_PRO_USER,
            timeout=10
        )
        assert response.status_code == 200, f"Belgium Pro login failed: {response.text}"
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert "session_token" in data, "Response missing 'session_token' field"
        assert data["user"]["email"] == BELGIUM_PRO_USER["email"]
        print(f"✓ Belgium Pro user login: {response.status_code}")
        return data["session_token"]
    
    def test_login_attorney(self):
        """POST /api/auth/login - Attorney user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ATTORNEY_USER,
            timeout=10
        )
        assert response.status_code == 200, f"Attorney login failed: {response.text}"
        data = response.json()
        assert "user" in data, "Response missing 'user' field"
        assert "session_token" in data, "Response missing 'session_token' field"
        assert data["user"]["email"] == ATTORNEY_USER["email"]
        assert data["user"]["account_type"] == "attorney", "Attorney should have account_type='attorney'"
        print(f"✓ Attorney login: {response.status_code}")
        return data["session_token"]
    
    def test_login_invalid_credentials(self):
        """POST /api/auth/login - Invalid credentials should return 401"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "invalid@test.com", "password": "wrongpassword"},
            timeout=10
        )
        assert response.status_code == 401, f"Expected 401 for invalid credentials, got {response.status_code}"
        print(f"✓ Invalid credentials rejected: {response.status_code}")
    
    def test_auth_me_with_token(self):
        """GET /api/auth/me - Should return user data with valid token"""
        # First login to get token
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=US_PRO_USER,
            timeout=10
        )
        assert login_response.status_code == 200
        token = login_response.json()["session_token"]
        
        # Test /auth/me
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        data = response.json()
        assert data["email"] == US_PRO_USER["email"]
        print(f"✓ Auth me endpoint: {response.status_code}")
    
    def test_auth_me_without_token(self):
        """GET /api/auth/me - Should return 401 without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}"
        print(f"✓ Auth me rejects unauthenticated: {response.status_code}")
    
    def test_register_new_user(self):
        """POST /api/auth/register - Register new user"""
        import uuid
        test_email = f"test_reg_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "TestPassword123!",
                "name": "Test Registration User",
                "plan": "free",
                "country": "US"
            },
            timeout=10
        )
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert "session_token" in data
        assert data["user"]["email"] == test_email.lower()
        print(f"✓ User registration: {response.status_code}")


class TestCasesEndpoints:
    """Test cases endpoints (still in server.py)"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for US Pro user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=US_PRO_USER,
            timeout=10
        )
        return response.json()["session_token"]
    
    def test_get_cases(self, auth_token):
        """GET /api/cases - Should return user's cases"""
        response = requests.get(
            f"{BASE_URL}/api/cases",
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Get cases failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Cases should be a list"
        print(f"✓ Get cases: {response.status_code}, found {len(data)} cases")
    
    def test_get_cases_without_auth(self):
        """GET /api/cases - Should return 401 without auth"""
        response = requests.get(f"{BASE_URL}/api/cases", timeout=10)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Get cases rejects unauthenticated: {response.status_code}")


class TestProfileEndpoints:
    """Test profile endpoints from routes/auth_routes.py"""
    
    @pytest.fixture
    def auth_token(self):
        """Get auth token for US Pro user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=US_PRO_USER,
            timeout=10
        )
        return response.json()["session_token"]
    
    def test_update_profile(self, auth_token):
        """PUT /api/profile - Should update user profile"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"name": "Test User Updated"},
            timeout=10
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert "email" in data
        print(f"✓ Profile update: {response.status_code}")
        
        # Restore original name
        requests.put(
            f"{BASE_URL}/api/profile",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={"name": "Test User"},
            timeout=10
        )


class TestAttorneyRoutes:
    """Test attorney routes from routes/attorney_routes.py"""
    
    @pytest.fixture
    def attorney_token(self):
        """Get auth token for attorney user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=ATTORNEY_USER,
            timeout=10
        )
        return response.json()["session_token"]
    
    @pytest.fixture
    def client_token(self):
        """Get auth token for client user"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=US_PRO_USER,
            timeout=10
        )
        return response.json()["session_token"]
    
    def test_attorney_me(self, attorney_token):
        """GET /api/attorney/me - Should return attorney profile"""
        response = requests.get(
            f"{BASE_URL}/api/attorney/me",
            headers={"Authorization": f"Bearer {attorney_token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Attorney me failed: {response.text}"
        data = response.json()
        assert "attorney_id" in data, "Response missing attorney_id"
        assert "full_name" in data, "Response missing full_name"
        assert "specialties" in data, "Response missing specialties"
        print(f"✓ Attorney me: {response.status_code}")
    
    def test_attorney_dashboard(self, attorney_token):
        """GET /api/attorney/dashboard - Should return dashboard data"""
        response = requests.get(
            f"{BASE_URL}/api/attorney/dashboard",
            headers={"Authorization": f"Bearer {attorney_token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Attorney dashboard failed: {response.text}"
        data = response.json()
        assert "profile" in data, "Response missing profile"
        assert "metrics" in data, "Response missing metrics"
        print(f"✓ Attorney dashboard: {response.status_code}")
    
    def test_attorney_me_as_client(self, client_token):
        """GET /api/attorney/me - Should return 403 for non-attorney"""
        response = requests.get(
            f"{BASE_URL}/api/attorney/me",
            headers={"Authorization": f"Bearer {client_token}"},
            timeout=10
        )
        assert response.status_code == 403, f"Expected 403 for non-attorney, got {response.status_code}"
        print(f"✓ Attorney me rejects non-attorney: {response.status_code}")
    
    def test_attorneys_directory(self):
        """GET /api/attorneys-directory - Public endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/attorneys-directory",
            timeout=10
        )
        assert response.status_code == 200, f"Attorneys directory failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Directory should be a list"
        print(f"✓ Attorneys directory: {response.status_code}, found {len(data)} attorneys")


class TestAdminEndpoints:
    """Test admin endpoints from routes/attorney_routes.py"""
    
    @pytest.fixture
    def admin_token(self):
        """Get auth token for admin user (test@archer.legal has admin access)"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=US_PRO_USER,  # test@archer.legal has admin access
            timeout=10
        )
        return response.json()["session_token"]
    
    def test_admin_attorneys_list(self, admin_token):
        """GET /api/admin/attorneys - Should return attorneys list for admin"""
        response = requests.get(
            f"{BASE_URL}/api/admin/attorneys",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=10
        )
        assert response.status_code == 200, f"Admin attorneys list failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Should return a list"
        print(f"✓ Admin attorneys list: {response.status_code}, found {len(data)} attorneys")


class TestModuleImports:
    """Test that modular imports are working correctly"""
    
    def test_auth_module_functions(self):
        """Verify auth module functions work via login endpoint"""
        # hash_password and verify_password are used internally
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=US_PRO_USER,
            timeout=10
        )
        assert response.status_code == 200, "Auth module functions not working"
        print("✓ Auth module (hash_password, verify_password) working")
    
    def test_db_module_connection(self):
        """Verify db module is connected via cases endpoint"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json=US_PRO_USER,
            timeout=10
        )
        token = login_response.json()["session_token"]
        
        response = requests.get(
            f"{BASE_URL}/api/cases",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10
        )
        assert response.status_code == 200, "DB module not working"
        print("✓ DB module connection working")
    
    def test_models_module(self):
        """Verify models module via registration endpoint"""
        import uuid
        test_email = f"test_model_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "TestPassword123!",
                "name": "Model Test User",
                "plan": "free",
                "country": "US"
            },
            timeout=10
        )
        assert response.status_code == 200, "Models module not working"
        print("✓ Models module (Pydantic models) working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
