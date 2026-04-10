"""
Test Email/Password Authentication for Jasper Legal App
Tests: Register, Login, /auth/me, Logout endpoints
"""
import pytest
import requests
import os
import uuid

# Get backend URL from environment
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # Fallback for local testing
    BASE_URL = "https://predict-outcome.preview.emergentagent.com"

API_URL = f"{BASE_URL}/api"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_AUTH_"

class TestEmailRegistration:
    """Test POST /api/auth/register endpoint"""
    
    def test_register_success(self):
        """Register a new user with valid data"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"{TEST_PREFIX}user_{unique_id}@example.com",
            "password": "securepass123",
            "name": f"{TEST_PREFIX}User {unique_id}",
            "plan": "free"
        }
        
        response = requests.post(f"{API_URL}/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "session_token" in data, "Response should contain 'session_token'"
        
        user = data["user"]
        assert user["email"] == payload["email"].lower(), "Email should match"
        assert user["name"] == payload["name"], "Name should match"
        assert user["plan"] == "free", "Plan should be free"
        assert "password_hash" not in user, "password_hash should NOT be in response"
        assert "user_id" in user, "user_id should be present"
        
        # Verify cookie is set
        assert "session_token" in response.cookies or "set-cookie" in response.headers, "Session cookie should be set"
        
        print(f"✓ Registration successful for {payload['email']}")
        
        # Store for cleanup
        self.test_session_token = data["session_token"]
        self.test_user_id = user["user_id"]
        self.test_email = payload["email"]
    
    def test_register_duplicate_email(self):
        """Duplicate email should return 409"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"{TEST_PREFIX}dup_{unique_id}@example.com",
            "password": "securepass123",
            "name": f"{TEST_PREFIX}Dup User",
            "plan": "free"
        }
        
        # First registration
        response1 = requests.post(f"{API_URL}/auth/register", json=payload)
        assert response1.status_code == 200, f"First registration failed: {response1.text}"
        
        # Second registration with same email
        response2 = requests.post(f"{API_URL}/auth/register", json=payload)
        assert response2.status_code == 409, f"Expected 409 for duplicate, got {response2.status_code}: {response2.text}"
        
        data = response2.json()
        assert "detail" in data, "Error response should have 'detail'"
        assert "already exists" in data["detail"].lower(), f"Error message should mention 'already exists': {data['detail']}"
        
        print(f"✓ Duplicate email correctly rejected with 409")
    
    def test_register_short_password(self):
        """Short password (<8 chars) should return 400"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"{TEST_PREFIX}short_{unique_id}@example.com",
            "password": "short",  # Only 5 chars
            "name": f"{TEST_PREFIX}Short Pass User",
            "plan": "free"
        }
        
        response = requests.post(f"{API_URL}/auth/register", json=payload)
        assert response.status_code == 400, f"Expected 400 for short password, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have 'detail'"
        assert "8 characters" in data["detail"].lower(), f"Error should mention 8 characters: {data['detail']}"
        
        print(f"✓ Short password correctly rejected with 400")
    
    def test_register_with_pro_plan(self):
        """Register with pro plan"""
        unique_id = uuid.uuid4().hex[:8]
        payload = {
            "email": f"{TEST_PREFIX}pro_{unique_id}@example.com",
            "password": "securepass123",
            "name": f"{TEST_PREFIX}Pro User",
            "plan": "pro"
        }
        
        response = requests.post(f"{API_URL}/auth/register", json=payload)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["user"]["plan"] == "pro", "Plan should be pro"
        
        print(f"✓ Pro plan registration successful")


class TestEmailLogin:
    """Test POST /api/auth/login endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_test_user(self):
        """Create a test user for login tests"""
        self.unique_id = uuid.uuid4().hex[:8]
        self.test_email = f"{TEST_PREFIX}login_{self.unique_id}@example.com"
        self.test_password = "testpassword123"
        self.test_name = f"{TEST_PREFIX}Login User"
        
        # Register the user first
        payload = {
            "email": self.test_email,
            "password": self.test_password,
            "name": self.test_name,
            "plan": "free"
        }
        response = requests.post(f"{API_URL}/auth/register", json=payload)
        if response.status_code == 200:
            self.test_user_id = response.json()["user"]["user_id"]
        yield
    
    def test_login_success(self):
        """Login with correct credentials"""
        payload = {
            "email": self.test_email,
            "password": self.test_password
        }
        
        response = requests.post(f"{API_URL}/auth/login", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should contain 'user'"
        assert "session_token" in data, "Response should contain 'session_token'"
        
        user = data["user"]
        assert user["email"] == self.test_email.lower(), "Email should match"
        assert "password_hash" not in user, "password_hash should NOT be in response"
        
        print(f"✓ Login successful for {self.test_email}")
    
    def test_login_wrong_password(self):
        """Wrong password should return 401"""
        payload = {
            "email": self.test_email,
            "password": "wrongpassword123"
        }
        
        response = requests.post(f"{API_URL}/auth/login", json=payload)
        
        assert response.status_code == 401, f"Expected 401 for wrong password, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have 'detail'"
        
        print(f"✓ Wrong password correctly rejected with 401")
    
    def test_login_nonexistent_email(self):
        """Non-existent email should return 401"""
        payload = {
            "email": f"nonexistent_{uuid.uuid4().hex[:8]}@example.com",
            "password": "anypassword123"
        }
        
        response = requests.post(f"{API_URL}/auth/login", json=payload)
        
        assert response.status_code == 401, f"Expected 401 for non-existent email, got {response.status_code}: {response.text}"
        
        print(f"✓ Non-existent email correctly rejected with 401")
    
    def test_login_case_insensitive_email(self):
        """Email should be case-insensitive"""
        payload = {
            "email": self.test_email.upper(),  # Use uppercase
            "password": self.test_password
        }
        
        response = requests.post(f"{API_URL}/auth/login", json=payload)
        
        assert response.status_code == 200, f"Expected 200 for case-insensitive email, got {response.status_code}: {response.text}"
        
        print(f"✓ Case-insensitive email login works")


class TestAuthMe:
    """Test GET /api/auth/me endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_authenticated_user(self):
        """Create and login a test user"""
        self.unique_id = uuid.uuid4().hex[:8]
        self.test_email = f"{TEST_PREFIX}me_{self.unique_id}@example.com"
        self.test_password = "testpassword123"
        
        # Register
        payload = {
            "email": self.test_email,
            "password": self.test_password,
            "name": f"{TEST_PREFIX}Me User",
            "plan": "free"
        }
        response = requests.post(f"{API_URL}/auth/register", json=payload)
        if response.status_code == 200:
            data = response.json()
            self.session_token = data["session_token"]
            self.user_id = data["user"]["user_id"]
        yield
    
    def test_auth_me_with_bearer_token(self):
        """GET /auth/me with valid Bearer token returns user data"""
        headers = {"Authorization": f"Bearer {self.session_token}"}
        
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["email"] == self.test_email.lower(), "Email should match"
        assert data["user_id"] == self.user_id, "user_id should match"
        assert "password_hash" not in data, "password_hash should NOT be in response"
        
        print(f"✓ /auth/me returns user data correctly")
    
    def test_auth_me_without_token(self):
        """GET /auth/me without token returns 401"""
        response = requests.get(f"{API_URL}/auth/me")
        
        assert response.status_code == 401, f"Expected 401 without token, got {response.status_code}: {response.text}"
        
        print(f"✓ /auth/me without token returns 401")
    
    def test_auth_me_with_invalid_token(self):
        """GET /auth/me with invalid token returns 401"""
        headers = {"Authorization": "Bearer invalid_token_12345"}
        
        response = requests.get(f"{API_URL}/auth/me", headers=headers)
        
        assert response.status_code == 401, f"Expected 401 with invalid token, got {response.status_code}: {response.text}"
        
        print(f"✓ /auth/me with invalid token returns 401")


class TestLogout:
    """Test POST /api/auth/logout endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup_authenticated_user(self):
        """Create and login a test user"""
        self.unique_id = uuid.uuid4().hex[:8]
        self.test_email = f"{TEST_PREFIX}logout_{self.unique_id}@example.com"
        self.test_password = "testpassword123"
        
        # Register
        payload = {
            "email": self.test_email,
            "password": self.test_password,
            "name": f"{TEST_PREFIX}Logout User",
            "plan": "free"
        }
        response = requests.post(f"{API_URL}/auth/register", json=payload)
        if response.status_code == 200:
            data = response.json()
            self.session_token = data["session_token"]
        yield
    
    def test_logout_clears_session(self):
        """POST /auth/logout clears session"""
        # Create a session with cookies
        session = requests.Session()
        session.cookies.set("session_token", self.session_token)
        
        response = session.post(f"{API_URL}/auth/logout")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should have 'message'"
        
        # Verify session is invalidated - /auth/me should fail
        headers = {"Authorization": f"Bearer {self.session_token}"}
        me_response = requests.get(f"{API_URL}/auth/me", headers=headers)
        
        assert me_response.status_code == 401, f"Session should be invalidated after logout, got {me_response.status_code}"
        
        print(f"✓ Logout clears session correctly")


class TestExistingGoogleOAuthRegression:
    """Regression test: Existing Google OAuth flow should still work"""
    
    def test_auth_session_endpoint_exists(self):
        """POST /api/auth/session endpoint should exist"""
        # We can't fully test Google OAuth without a real session_id,
        # but we can verify the endpoint exists and returns proper error
        response = requests.post(f"{API_URL}/auth/session", json={})
        
        # Should return 400 (missing session_id), not 404
        assert response.status_code == 400, f"Expected 400 for missing session_id, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_id" in data.get("detail", "").lower(), f"Error should mention session_id: {data}"
        
        print(f"✓ /auth/session endpoint exists (Google OAuth regression)")


class TestBcryptHashFormat:
    """Verify bcrypt hash format is correct"""
    
    def test_password_hash_format(self):
        """Verify password is hashed with bcrypt ($2b$ prefix)"""
        import subprocess
        
        unique_id = uuid.uuid4().hex[:8]
        test_email = f"{TEST_PREFIX}bcrypt_{unique_id}@example.com"
        
        # Register user
        payload = {
            "email": test_email,
            "password": "testpassword123",
            "name": f"{TEST_PREFIX}Bcrypt User",
            "plan": "free"
        }
        response = requests.post(f"{API_URL}/auth/register", json=payload)
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        # Check hash in database
        result = subprocess.run(
            ["mongosh", "--quiet", "--eval", f'''
                use("test_database");
                const user = db.users.findOne({{email: "{test_email.lower()}"}});
                if (user && user.password_hash) {{
                    print(user.password_hash.substring(0, 4));
                }} else {{
                    print("NO_HASH");
                }}
            '''],
            capture_output=True,
            text=True
        )
        
        hash_prefix = result.stdout.strip()
        assert hash_prefix == "$2b$", f"Expected bcrypt hash prefix '$2b$', got '{hash_prefix}'"
        
        print(f"✓ Password hash uses bcrypt format ($2b$)")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_users(self):
        """Clean up all TEST_AUTH_ prefixed users"""
        import subprocess
        
        result = subprocess.run(
            ["mongosh", "--quiet", "--eval", f'''
                use("test_database");
                const deleteResult = db.users.deleteMany({{email: /^{TEST_PREFIX.lower()}/i}});
                const sessionResult = db.user_sessions.deleteMany({{user_id: /^user_/}});
                print("Deleted " + deleteResult.deletedCount + " test users");
            '''],
            capture_output=True,
            text=True
        )
        
        print(f"✓ Cleanup: {result.stdout.strip()}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
