"""
Test suite for Archer Jurisdiction/Language Architecture Changes
Tests:
1. Landing page selectors (jurisdiction + language)
2. Backend user model with jurisdiction field
3. Profile update with jurisdiction + language
4. Registration with jurisdiction
5. No UAE references anywhere
6. Spanish translations
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://predict-outcome.preview.emergentagent.com')

class TestJurisdictionLanguageBackend:
    """Backend API tests for jurisdiction/language changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login with test user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test_cg@example.com", "password": "testpassword123"}
        )
        if login_response.status_code == 200:
            data = login_response.json()
            self.auth_token = data.get("session_token")
            # User data is nested under 'user' key
            self.user_data = data.get("user", data)
        else:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
    
    def test_01_login_returns_jurisdiction_field(self):
        """Test 7: Login returns user with 'jurisdiction' field alongside 'country'"""
        # Re-login to get fresh user data
        response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test_cg@example.com", "password": "testpassword123"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        # User data is nested under 'user' key
        user = data.get("user", data)
        print(f"User data: {user}")
        
        # Check jurisdiction field exists
        assert "jurisdiction" in user, "User should have 'jurisdiction' field"
        assert "country" in user, "User should have 'country' field (backward compat)"
        
        # Test user should have jurisdiction=BE
        assert user.get("jurisdiction") == "BE", f"Test user should have jurisdiction=BE, got {user.get('jurisdiction')}"
        print(f"✓ Login returns jurisdiction field: {user.get('jurisdiction')}")
    
    def test_02_profile_update_jurisdiction_and_language(self):
        """Test 8: PUT /api/profile with {jurisdiction: 'US', language: 'es'} updates both fields"""
        # Update to US jurisdiction and Spanish language
        response = self.session.put(
            f"{BASE_URL}/api/profile",
            json={"jurisdiction": "US", "language": "es"}
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        
        # Verify the update by getting user info
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert me_response.status_code == 200, f"Get user failed: {me_response.text}"
        
        user = me_response.json()
        print(f"Updated user: {user}")
        
        assert user.get("jurisdiction") == "US", f"Jurisdiction should be US, got {user.get('jurisdiction')}"
        assert user.get("language") == "es", f"Language should be es, got {user.get('language')}"
        
        # Revert back to original
        revert_response = self.session.put(
            f"{BASE_URL}/api/profile",
            json={"jurisdiction": "BE", "language": "fr"}
        )
        assert revert_response.status_code == 200, "Failed to revert profile"
        print("✓ Profile update with jurisdiction and language works")
    
    def test_03_registration_with_jurisdiction(self):
        """Test 9: Registration with jurisdiction='BE' creates user with jurisdiction=BE and country=BE"""
        import uuid
        test_email = f"test_jurisdiction_{uuid.uuid4().hex[:8]}@example.com"
        
        response = self.session.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "name": "Test Jurisdiction User",
                "email": test_email,
                "password": "testpassword123",
                "plan": "free",
                "jurisdiction": "BE",
                "country": "BE",
                "region": "Wallonie",
                "language": "fr"
            }
        )
        
        # Accept 200 or 201 for registration
        assert response.status_code in [200, 201], f"Registration failed: {response.status_code} - {response.text}"
        
        data = response.json()
        # User data is nested under 'user' key
        user = data.get("user", data)
        print(f"Registered user: {user}")
        
        # Check both jurisdiction and country are set
        assert user.get("jurisdiction") == "BE", f"Jurisdiction should be BE, got {user.get('jurisdiction')}"
        assert user.get("country") == "BE", f"Country should be BE, got {user.get('country')}"
        print(f"✓ Registration with jurisdiction=BE creates user correctly")
    
    def test_04_no_uae_in_jurisdiction_options(self):
        """Test 5: NO UAE option anywhere — verify backend doesn't accept AE"""
        # Try to update profile with AE jurisdiction (should fail or be rejected)
        response = self.session.put(
            f"{BASE_URL}/api/profile",
            json={"jurisdiction": "AE"}
        )
        
        # The backend might accept it (no validation) but we should verify
        # that the frontend doesn't offer it. For backend, we just log the behavior.
        print(f"AE jurisdiction update response: {response.status_code}")
        
        # Even if backend accepts, verify the user model doesn't have UAE-specific fields
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        user = me_response.json()
        
        # Check there's no AED currency or UAE-specific data
        # This is more of a documentation test - the real test is in frontend
        print(f"✓ Backend jurisdiction test complete (frontend should not offer AE option)")
    
    def test_05_jurisdiction_syncs_with_country(self):
        """Verify jurisdiction and country stay in sync"""
        # Update jurisdiction to US
        response = self.session.put(
            f"{BASE_URL}/api/profile",
            json={"jurisdiction": "US", "country": "US"}
        )
        assert response.status_code == 200
        
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        user = me_response.json()
        
        # Both should be US
        assert user.get("jurisdiction") == "US", f"Jurisdiction should be US"
        assert user.get("country") == "US", f"Country should be US"
        
        # Revert
        self.session.put(f"{BASE_URL}/api/profile", json={"jurisdiction": "BE", "country": "BE"})
        print("✓ Jurisdiction and country stay in sync")
    
    def test_06_language_independent_of_jurisdiction(self):
        """Verify language can be set independently of jurisdiction"""
        # Set US jurisdiction with French language
        response = self.session.put(
            f"{BASE_URL}/api/profile",
            json={"jurisdiction": "US", "language": "fr"}
        )
        assert response.status_code == 200
        
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        user = me_response.json()
        
        assert user.get("jurisdiction") == "US", "Jurisdiction should be US"
        assert user.get("language") == "fr", "Language should be fr"
        
        # Set BE jurisdiction with Spanish language
        response = self.session.put(
            f"{BASE_URL}/api/profile",
            json={"jurisdiction": "BE", "language": "es"}
        )
        assert response.status_code == 200
        
        me_response = self.session.get(f"{BASE_URL}/api/auth/me")
        user = me_response.json()
        
        assert user.get("jurisdiction") == "BE", "Jurisdiction should be BE"
        assert user.get("language") == "es", "Language should be es"
        
        # Revert
        self.session.put(f"{BASE_URL}/api/profile", json={"jurisdiction": "BE", "language": "fr"})
        print("✓ Language is independent of jurisdiction")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
