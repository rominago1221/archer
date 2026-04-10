"""
Test Signup Country/Region/Language Flow
Tests the new Belgium/US country selector on signup page
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestSignupCountryRegionLanguage:
    """Tests for signup with country, region, language fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.test_email_prefix = f"test_signup_{uuid.uuid4().hex[:8]}"
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        yield
        # Cleanup handled by unique emails
    
    # ==================== Backend API Tests ====================
    
    def test_register_with_belgium_wallonie(self):
        """Test registration with Belgium, Wallonie region, fr-BE language"""
        email = f"{self.test_email_prefix}_be_wallonie@example.com"
        payload = {
            "name": "Test Belgian User",
            "email": email,
            "password": "testpassword123",
            "plan": "free",
            "country": "BE",
            "region": "Wallonie",
            "language": "fr-BE"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify user data
        assert "user" in data
        user = data["user"]
        assert user["email"] == email.lower()
        assert user["country"] == "BE"
        assert user["region"] == "Wallonie"
        assert user["language"] == "fr-BE"
        assert user["name"] == "Test Belgian User"
        print(f"✓ Belgium/Wallonie registration successful: {user['user_id']}")
    
    def test_register_with_belgium_flandre(self):
        """Test registration with Belgium, Flandre region, nl-BE language"""
        email = f"{self.test_email_prefix}_be_flandre@example.com"
        payload = {
            "name": "Test Flemish User",
            "email": email,
            "password": "testpassword123",
            "plan": "pro",
            "country": "BE",
            "region": "Flandre",
            "language": "nl-BE"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        user = data["user"]
        
        assert user["country"] == "BE"
        assert user["region"] == "Flandre"
        assert user["language"] == "nl-BE"
        assert user["plan"] == "pro"
        print(f"✓ Belgium/Flandre registration successful: {user['user_id']}")
    
    def test_register_with_belgium_bruxelles(self):
        """Test registration with Belgium, Bruxelles-Capitale region"""
        email = f"{self.test_email_prefix}_be_bruxelles@example.com"
        payload = {
            "name": "Test Brussels User",
            "email": email,
            "password": "testpassword123",
            "plan": "free",
            "country": "BE",
            "region": "Bruxelles-Capitale",
            "language": "fr-BE"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        user = data["user"]
        
        assert user["country"] == "BE"
        assert user["region"] == "Bruxelles-Capitale"
        assert user["language"] == "fr-BE"
        print(f"✓ Belgium/Bruxelles registration successful: {user['user_id']}")
    
    def test_register_with_belgium_germanophone(self):
        """Test registration with Belgium, Communaute germanophone region, de-BE language"""
        email = f"{self.test_email_prefix}_be_german@example.com"
        payload = {
            "name": "Test German Belgian User",
            "email": email,
            "password": "testpassword123",
            "plan": "free",
            "country": "BE",
            "region": "Communaute germanophone",
            "language": "de-BE"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        user = data["user"]
        
        assert user["country"] == "BE"
        assert user["region"] == "Communaute germanophone"
        assert user["language"] == "de-BE"
        print(f"✓ Belgium/Germanophone registration successful: {user['user_id']}")
    
    def test_register_with_us_default(self):
        """Test registration with US (default country)"""
        email = f"{self.test_email_prefix}_us@example.com"
        payload = {
            "name": "Test US User",
            "email": email,
            "password": "testpassword123",
            "plan": "free",
            "country": "US"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        user = data["user"]
        
        assert user["country"] == "US"
        assert user["region"] is None  # US doesn't require region
        assert user["language"] == "en"  # Default for US
        print(f"✓ US registration successful: {user['user_id']}")
    
    def test_register_backwards_compat_no_country(self):
        """Test registration without country field (backwards compatibility) - defaults to US/en"""
        email = f"{self.test_email_prefix}_nocount@example.com"
        payload = {
            "name": "Test Legacy User",
            "email": email,
            "password": "testpassword123",
            "plan": "free"
            # No country, region, language fields
        }
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        user = data["user"]
        
        # Should default to US/en
        assert user["country"] == "US", f"Expected country=US, got {user.get('country')}"
        assert user["language"] == "en", f"Expected language=en, got {user.get('language')}"
        print(f"✓ Backwards compatibility (no country) works: defaults to US/en")
    
    def test_register_sets_session_cookie(self):
        """Test that registration sets httpOnly session cookie"""
        email = f"{self.test_email_prefix}_cookie@example.com"
        payload = {
            "name": "Test Cookie User",
            "email": email,
            "password": "testpassword123",
            "plan": "free",
            "country": "BE",
            "region": "Wallonie",
            "language": "fr-BE"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200
        
        # Check for set-cookie header
        cookies = response.cookies
        assert "session_token" in cookies or "session_token" in response.headers.get("set-cookie", "").lower(), \
            "Expected session_token cookie to be set"
        
        # Also check response body has session_token
        data = response.json()
        assert "session_token" in data, "Expected session_token in response body"
        print(f"✓ Session cookie set correctly")
    
    def test_register_and_verify_profile_persistence(self):
        """Test that registered user profile persists correctly with country/region/language"""
        email = f"{self.test_email_prefix}_persist@example.com"
        payload = {
            "name": "Test Persist User",
            "email": email,
            "password": "testpassword123",
            "plan": "pro",
            "country": "BE",
            "region": "Flandre",
            "language": "nl-BE"
        }
        
        # Register
        reg_response = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert reg_response.status_code == 200
        reg_data = reg_response.json()
        session_token = reg_data.get("session_token")
        
        # Verify with /api/auth/me
        me_response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            cookies={"session_token": session_token}
        )
        assert me_response.status_code == 200, f"Expected 200, got {me_response.status_code}: {me_response.text}"
        
        me_data = me_response.json()
        assert me_data["country"] == "BE"
        assert me_data["region"] == "Flandre"
        assert me_data["language"] == "nl-BE"
        assert me_data["plan"] == "pro"
        print(f"✓ Profile persistence verified via /api/auth/me")
    
    def test_register_duplicate_email_rejected(self):
        """Test that duplicate email registration is rejected"""
        email = f"{self.test_email_prefix}_dup@example.com"
        payload = {
            "name": "First User",
            "email": email,
            "password": "testpassword123",
            "plan": "free",
            "country": "US"
        }
        
        # First registration
        response1 = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response1.status_code == 200
        
        # Second registration with same email
        payload["name"] = "Second User"
        response2 = self.session.post(f"{BASE_URL}/api/auth/register", json=payload)
        assert response2.status_code == 409, f"Expected 409 for duplicate, got {response2.status_code}"
        print(f"✓ Duplicate email correctly rejected with 409")


class TestLoginRegression:
    """Regression tests for existing login flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_login_existing_belgian_user(self):
        """Test login with existing Belgian test user"""
        payload = {
            "email": "test_cg@example.com",
            "password": "testpassword123"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user" in data
        user = data["user"]
        assert user["email"] == "test_cg@example.com"
        assert user["country"] == "BE"
        assert user["region"] == "Wallonie"
        assert user["language"] == "fr-BE"
        print(f"✓ Belgian user login successful")
    
    def test_login_existing_us_user(self):
        """Test login with existing US test user - SKIPPED: test@example.com not seeded"""
        # Note: test@example.com mentioned in test_credentials.md but not seeded in DB
        # The Belgian user test_cg@example.com is the primary test user
        pytest.skip("US test user test@example.com not seeded in database")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        payload = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        response = self.session.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid credentials correctly rejected with 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
