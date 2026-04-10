"""
Test Country/Locale Selector Feature
Tests for the new country/language selector on landing page and signup page.
Verifies backend accepts country=AE (UAE) in registration.
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestCountryLocaleBackend:
    """Backend tests for country/locale feature"""
    
    # Test UAE registration
    def test_register_uae_user(self):
        """Test registration with country=AE (UAE)"""
        unique_email = f"test_uae_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "UAE Test User",
            "email": unique_email,
            "password": "testpassword123",
            "plan": "free",
            "country": "AE",
            "language": "en"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["country"] == "AE"
        assert data["user"]["language"] == "en"
        print(f"SUCCESS: UAE user registered with country=AE")
    
    def test_register_us_user(self):
        """Test registration with country=US"""
        unique_email = f"test_us_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "US Test User",
            "email": unique_email,
            "password": "testpassword123",
            "plan": "free",
            "country": "US",
            "language": "en"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["country"] == "US"
        assert data["user"]["language"] == "en"
        print(f"SUCCESS: US user registered with country=US")
    
    def test_register_belgium_french_user(self):
        """Test registration with country=BE, region=Wallonie, language=fr-BE"""
        unique_email = f"test_be_fr_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Belgian French User",
            "email": unique_email,
            "password": "testpassword123",
            "plan": "pro",
            "country": "BE",
            "region": "Wallonie",
            "language": "fr-BE"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["country"] == "BE"
        assert data["user"]["region"] == "Wallonie"
        assert data["user"]["language"] == "fr-BE"
        print(f"SUCCESS: Belgian French user registered")
    
    def test_register_belgium_dutch_user(self):
        """Test registration with country=BE, region=Flandre, language=nl-BE"""
        unique_email = f"test_be_nl_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Belgian Dutch User",
            "email": unique_email,
            "password": "testpassword123",
            "plan": "free",
            "country": "BE",
            "region": "Flandre",
            "language": "nl-BE"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["country"] == "BE"
        assert data["user"]["region"] == "Flandre"
        assert data["user"]["language"] == "nl-BE"
        print(f"SUCCESS: Belgian Dutch user registered")
    
    def test_register_belgium_german_user(self):
        """Test registration with country=BE, region=Communaute germanophone, language=de-BE"""
        unique_email = f"test_be_de_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Belgian German User",
            "email": unique_email,
            "password": "testpassword123",
            "plan": "free",
            "country": "BE",
            "region": "Communaute germanophone",
            "language": "de-BE"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["country"] == "BE"
        assert data["user"]["region"] == "Communaute germanophone"
        assert data["user"]["language"] == "de-BE"
        print(f"SUCCESS: Belgian German user registered")
    
    def test_invalid_country_defaults_to_us(self):
        """Test that invalid country defaults to US"""
        unique_email = f"test_invalid_{uuid.uuid4().hex[:8]}@example.com"
        payload = {
            "name": "Invalid Country User",
            "email": unique_email,
            "password": "testpassword123",
            "plan": "free",
            "country": "INVALID"
        }
        response = requests.post(f"{BASE_URL}/api/auth/register", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["country"] == "US", f"Expected US, got {data['user']['country']}"
        print(f"SUCCESS: Invalid country defaults to US")


class TestLoginRegression:
    """Regression tests for existing login flow"""
    
    def test_login_existing_belgian_user(self):
        """Test login with existing Belgian test user"""
        payload = {
            "email": "test_cg@example.com",
            "password": "testpassword123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == "test_cg@example.com"
        print(f"SUCCESS: Login with existing Belgian user works")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        payload = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        response = requests.post(f"{BASE_URL}/api/auth/login", json=payload)
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"SUCCESS: Invalid credentials rejected with 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
