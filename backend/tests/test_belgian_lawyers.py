"""
Test Belgian Lawyers Feature - Iteration 12
Tests:
- GET /api/lawyers returns all 17 lawyers (6 US + 11 Belgian)
- GET /api/lawyers?country=BE returns 11 Belgian lawyers
- GET /api/lawyers?country=US returns 6 US lawyers
- Belgian lawyers have correct fields (country=BE, language, specialty in French/Dutch/German)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_cg@example.com"
TEST_PASSWORD = "testpassword123"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for Belgian test user"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("session_token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def session(auth_token):
    """Create authenticated session"""
    s = requests.Session()
    s.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return s


class TestLawyersAPI:
    """Test lawyers API endpoints"""
    
    def test_get_all_lawyers_returns_17(self, session):
        """GET /api/lawyers returns all 17 lawyers (6 US + 11 Belgian)"""
        response = session.get(f"{BASE_URL}/api/lawyers")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        lawyers = response.json()
        assert isinstance(lawyers, list), "Response should be a list"
        assert len(lawyers) == 17, f"Expected 17 lawyers, got {len(lawyers)}"
        
        # Count by country
        us_count = sum(1 for l in lawyers if l.get("country") == "US")
        be_count = sum(1 for l in lawyers if l.get("country") == "BE")
        
        assert us_count == 6, f"Expected 6 US lawyers, got {us_count}"
        assert be_count == 11, f"Expected 11 Belgian lawyers, got {be_count}"
    
    def test_get_belgian_lawyers_only(self, session):
        """GET /api/lawyers?country=BE returns 11 Belgian lawyers"""
        response = session.get(f"{BASE_URL}/api/lawyers", params={"country": "BE"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        lawyers = response.json()
        assert isinstance(lawyers, list), "Response should be a list"
        assert len(lawyers) == 11, f"Expected 11 Belgian lawyers, got {len(lawyers)}"
        
        # All should have country=BE
        for lawyer in lawyers:
            assert lawyer.get("country") == "BE", f"Lawyer {lawyer.get('name')} has country={lawyer.get('country')}, expected BE"
    
    def test_get_us_lawyers_only(self, session):
        """GET /api/lawyers?country=US returns 6 US lawyers"""
        response = session.get(f"{BASE_URL}/api/lawyers", params={"country": "US"})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        lawyers = response.json()
        assert isinstance(lawyers, list), "Response should be a list"
        assert len(lawyers) == 6, f"Expected 6 US lawyers, got {len(lawyers)}"
        
        # All should have country=US
        for lawyer in lawyers:
            assert lawyer.get("country") == "US", f"Lawyer {lawyer.get('name')} has country={lawyer.get('country')}, expected US"
    
    def test_belgian_lawyers_have_correct_fields(self, session):
        """Belgian lawyers have correct fields (country=BE, language, specialty)"""
        response = session.get(f"{BASE_URL}/api/lawyers", params={"country": "BE"})
        assert response.status_code == 200
        
        lawyers = response.json()
        
        # Check required fields for each Belgian lawyer
        for lawyer in lawyers:
            assert "lawyer_id" in lawyer, f"Missing lawyer_id for {lawyer.get('name')}"
            assert "name" in lawyer, "Missing name"
            assert "specialty" in lawyer, f"Missing specialty for {lawyer.get('name')}"
            assert "bar_state" in lawyer, f"Missing bar_state for {lawyer.get('name')}"
            assert "country" in lawyer, f"Missing country for {lawyer.get('name')}"
            assert "language" in lawyer, f"Missing language for {lawyer.get('name')}"
            
            # Country must be BE
            assert lawyer["country"] == "BE", f"Expected country=BE for {lawyer.get('name')}"
            
            # Language must be fr, nl, de, or combinations
            valid_languages = ["fr", "nl", "de", "fr/nl", "nl/fr", "de/fr"]
            assert lawyer["language"] in valid_languages, f"Invalid language '{lawyer['language']}' for {lawyer.get('name')}"
    
    def test_belgian_francophone_lawyers(self, session):
        """5 Belgian francophone lawyers exist with French specialties"""
        response = session.get(f"{BASE_URL}/api/lawyers", params={"country": "BE"})
        assert response.status_code == 200
        
        lawyers = response.json()
        
        # Count francophone lawyers (language starts with 'fr' or is 'fr/nl')
        fr_lawyers = [l for l in lawyers if l.get("language") in ["fr", "fr/nl"]]
        assert len(fr_lawyers) >= 5, f"Expected at least 5 francophone lawyers, got {len(fr_lawyers)}"
        
        # Check French specialties exist
        french_specialties = ["Droit du travail", "Droit du bail", "Droit de la consommation", "Droit des contrats", "Droit de la famille"]
        found_specialties = [l.get("specialty") for l in fr_lawyers]
        
        for spec in french_specialties:
            # Check if any specialty contains the French term
            found = any(spec.lower() in s.lower() for s in found_specialties if s)
            assert found, f"Missing French specialty: {spec}"
    
    def test_belgian_dutch_lawyers(self, session):
        """4 Belgian Dutch-speaking lawyers exist with Dutch specialties"""
        response = session.get(f"{BASE_URL}/api/lawyers", params={"country": "BE"})
        assert response.status_code == 200
        
        lawyers = response.json()
        
        # Count Dutch-speaking lawyers (language starts with 'nl' or is 'nl/fr')
        nl_lawyers = [l for l in lawyers if l.get("language") in ["nl", "nl/fr"]]
        assert len(nl_lawyers) >= 4, f"Expected at least 4 Dutch-speaking lawyers, got {len(nl_lawyers)}"
        
        # Check Dutch specialties exist
        dutch_specialties = ["Arbeidsrecht", "Huurrecht", "Consumentenrecht", "Contractenrecht"]
        found_specialties = [l.get("specialty") for l in nl_lawyers]
        
        for spec in dutch_specialties:
            found = any(spec.lower() in s.lower() for s in found_specialties if s)
            assert found, f"Missing Dutch specialty: {spec}"
    
    def test_belgian_german_lawyers(self, session):
        """2 Belgian German-speaking lawyers exist"""
        response = session.get(f"{BASE_URL}/api/lawyers", params={"country": "BE"})
        assert response.status_code == 200
        
        lawyers = response.json()
        
        # Count German-speaking lawyers (language contains 'de')
        de_lawyers = [l for l in lawyers if "de" in l.get("language", "")]
        assert len(de_lawyers) >= 2, f"Expected at least 2 German-speaking lawyers, got {len(de_lawyers)}"
        
        # Check German specialties exist
        german_specialties = ["Arbeitsrecht", "Mietrecht"]
        found_specialties = [l.get("specialty") for l in de_lawyers]
        
        for spec in german_specialties:
            found = any(spec.lower() in s.lower() for s in found_specialties if s)
            assert found, f"Missing German specialty: {spec}"
    
    def test_belgian_lawyers_have_belgian_bar_states(self, session):
        """Belgian lawyers have Belgian bar associations"""
        response = session.get(f"{BASE_URL}/api/lawyers", params={"country": "BE"})
        assert response.status_code == 200
        
        lawyers = response.json()
        
        # Belgian bar associations
        belgian_bars = ["Barreau", "Balie", "Kammer"]
        
        for lawyer in lawyers:
            bar_state = lawyer.get("bar_state", "")
            has_belgian_bar = any(bar in bar_state for bar in belgian_bars)
            assert has_belgian_bar, f"Lawyer {lawyer.get('name')} has non-Belgian bar: {bar_state}"
    
    def test_us_lawyers_have_us_bar_states(self, session):
        """US lawyers have US state bar associations"""
        response = session.get(f"{BASE_URL}/api/lawyers", params={"country": "US"})
        assert response.status_code == 200
        
        lawyers = response.json()
        
        # US states
        us_states = ["New York", "California", "Texas", "Washington DC", "Florida", "Illinois"]
        
        for lawyer in lawyers:
            bar_state = lawyer.get("bar_state", "")
            has_us_bar = any(state in bar_state for state in us_states)
            assert has_us_bar, f"Lawyer {lawyer.get('name')} has non-US bar: {bar_state}"
    
    def test_lawyers_have_required_fields(self, session):
        """All lawyers have required fields"""
        response = session.get(f"{BASE_URL}/api/lawyers")
        assert response.status_code == 200
        
        lawyers = response.json()
        required_fields = ["lawyer_id", "name", "specialty", "bar_state", "years_experience", "rating", "sessions_count", "tags", "availability_status", "country", "language"]
        
        for lawyer in lawyers:
            for field in required_fields:
                assert field in lawyer, f"Missing field '{field}' for lawyer {lawyer.get('name')}"


class TestUserProfile:
    """Test user profile for Belgian user"""
    
    def test_belgian_user_profile(self):
        """Belgian test user has correct country/region/language"""
        # Login fresh to get valid session
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        token = login_response.json().get("session_token")
        
        # Get user profile
        response = requests.get(f"{BASE_URL}/api/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        user = response.json()
        assert user.get("country") == "BE", f"Expected country=BE, got {user.get('country')}"
        assert user.get("region") == "Wallonie", f"Expected region=Wallonie, got {user.get('region')}"
        assert user.get("language") == "fr-BE", f"Expected language=fr-BE, got {user.get('language')}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
