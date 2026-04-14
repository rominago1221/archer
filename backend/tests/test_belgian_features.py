"""
Test Belgian Legal Analysis Features for Archer
- Settings page: Country/Region/Language selectors
- Profile API: PUT /api/profile with country, region, language
- Country config API: GET /api/user/country-config
- Letter types API: GET /api/letters/types/{case_type}?country=BE vs ?country=US
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
TEST_EMAIL = "test_cg@example.com"
TEST_PASSWORD = "testpassword123"


class TestBelgianFeatures:
    """Test Belgian legal analysis features"""
    
    session_token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        if TestBelgianFeatures.session_token is None:
            response = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
            )
            assert response.status_code == 200, f"Login failed: {response.text}"
            data = response.json()
            TestBelgianFeatures.session_token = data.get("session_token")
            assert TestBelgianFeatures.session_token, "No session token returned"
        
        self.headers = {
            "Authorization": f"Bearer {TestBelgianFeatures.session_token}",
            "Content-Type": "application/json"
        }
    
    # ==================== Profile API Tests ====================
    
    def test_profile_update_country_to_belgium(self):
        """PUT /api/profile accepts country=BE"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "BE", "region": "Wallonie", "language": "fr-BE"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert data.get("country") == "BE", f"Country not updated: {data}"
        assert data.get("region") == "Wallonie", f"Region not updated: {data}"
        assert data.get("language") == "fr-BE", f"Language not updated: {data}"
        print("PASS: Profile updated with country=BE, region=Wallonie, language=fr-BE")
    
    def test_profile_update_region_flandre(self):
        """PUT /api/profile accepts region=Flandre with nl-BE language"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "BE", "region": "Flandre", "language": "nl-BE"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert data.get("region") == "Flandre", f"Region not updated: {data}"
        assert data.get("language") == "nl-BE", f"Language not updated: {data}"
        print("PASS: Profile updated with region=Flandre, language=nl-BE")
    
    def test_profile_update_region_bruxelles(self):
        """PUT /api/profile accepts region=Bruxelles-Capitale"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "BE", "region": "Bruxelles-Capitale", "language": "fr-BE"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert data.get("region") == "Bruxelles-Capitale", f"Region not updated: {data}"
        print("PASS: Profile updated with region=Bruxelles-Capitale")
    
    def test_profile_update_region_germanophone(self):
        """PUT /api/profile accepts region=Communaute germanophone with de-BE language"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "BE", "region": "Communaute germanophone", "language": "de-BE"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert data.get("region") == "Communaute germanophone", f"Region not updated: {data}"
        assert data.get("language") == "de-BE", f"Language not updated: {data}"
        print("PASS: Profile updated with region=Communaute germanophone, language=de-BE")
    
    def test_profile_update_country_to_us(self):
        """PUT /api/profile accepts country=US"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "US", "region": "", "language": "en"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert data.get("country") == "US", f"Country not updated: {data}"
        print("PASS: Profile updated with country=US")
    
    # ==================== Country Config API Tests ====================
    
    def test_country_config_returns_belgian_config_when_user_is_be(self):
        """GET /api/user/country-config returns Belgian config when user has country=BE"""
        # First set user to Belgium
        requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "BE", "region": "Wallonie", "language": "fr-BE"},
            headers=self.headers
        )
        
        response = requests.get(
            f"{BASE_URL}/api/user/country-config",
            headers=self.headers
        )
        assert response.status_code == 200, f"Country config failed: {response.text}"
        data = response.json()
        
        # Verify Belgian config structure
        assert data.get("country") == "BE", f"Expected country=BE: {data}"
        assert data.get("country_name") == "Belgium", f"Expected country_name=Belgium: {data}"
        
        # Verify regions
        regions = data.get("regions", [])
        assert len(regions) == 4, f"Expected 4 Belgian regions: {regions}"
        region_ids = [r["id"] for r in regions]
        assert "Wallonie" in region_ids, f"Missing Wallonie: {region_ids}"
        assert "Bruxelles-Capitale" in region_ids, f"Missing Bruxelles-Capitale: {region_ids}"
        assert "Flandre" in region_ids, f"Missing Flandre: {region_ids}"
        assert "Communaute germanophone" in region_ids, f"Missing Communaute germanophone: {region_ids}"
        
        # Verify languages
        languages = data.get("languages", [])
        assert len(languages) == 3, f"Expected 3 Belgian languages: {languages}"
        lang_ids = [l["id"] for l in languages]
        assert "fr-BE" in lang_ids, f"Missing fr-BE: {lang_ids}"
        assert "nl-BE" in lang_ids, f"Missing nl-BE: {lang_ids}"
        assert "de-BE" in lang_ids, f"Missing de-BE: {lang_ids}"
        
        print("PASS: Country config returns correct Belgian structure with 4 regions and 3 languages")
    
    def test_country_config_returns_us_config_when_user_is_us(self):
        """GET /api/user/country-config returns US config when user has country=US"""
        # First set user to US
        requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "US", "region": "", "language": "en"},
            headers=self.headers
        )
        
        response = requests.get(
            f"{BASE_URL}/api/user/country-config",
            headers=self.headers
        )
        assert response.status_code == 200, f"Country config failed: {response.text}"
        data = response.json()
        
        assert data.get("country") == "US", f"Expected country=US: {data}"
        assert data.get("country_name") == "United States", f"Expected country_name=United States: {data}"
        print("PASS: Country config returns US structure when user is US")
    
    # ==================== Letter Types API Tests ====================
    
    def test_letter_types_employment_belgium(self):
        """GET /api/letters/types/employment?country=BE returns 8 Belgian letter types"""
        response = requests.get(
            f"{BASE_URL}/api/letters/types/employment?country=BE"
        )
        assert response.status_code == 200, f"Letter types failed: {response.text}"
        data = response.json()
        
        letter_types = data.get("letter_types", [])
        assert len(letter_types) == 8, f"Expected 8 Belgian employment letter types, got {len(letter_types)}: {letter_types}"
        
        # Verify Belgian-specific letter types
        letter_ids = [lt["id"] for lt in letter_types]
        assert "BE_DEMANDE_MOTIFS_CCT109" in letter_ids, f"Missing CCT109 letter type: {letter_ids}"
        assert "BE_CONTESTATION_PREAVIS" in letter_ids, f"Missing preavis letter type: {letter_ids}"
        assert "BE_DEMANDE_C4" in letter_ids, f"Missing C4 letter type: {letter_ids}"
        
        assert data.get("country") == "BE", f"Expected country=BE in response: {data}"
        print(f"PASS: Belgian employment letter types returned: {len(letter_types)} types including CCT109, preavis, C4")
    
    def test_letter_types_housing_belgium(self):
        """GET /api/letters/types/housing?country=BE returns Belgian housing letter types"""
        response = requests.get(
            f"{BASE_URL}/api/letters/types/housing?country=BE"
        )
        assert response.status_code == 200, f"Letter types failed: {response.text}"
        data = response.json()
        
        letter_types = data.get("letter_types", [])
        assert len(letter_types) >= 6, f"Expected at least 6 Belgian housing letter types, got {len(letter_types)}"
        
        # Verify Belgian-specific housing letter types
        letter_ids = [lt["id"] for lt in letter_types]
        assert "BE_CONTESTATION_GARANTIE" in letter_ids, f"Missing garantie letter type: {letter_ids}"
        assert "BE_DEMANDE_ENREGISTREMENT" in letter_ids, f"Missing enregistrement letter type: {letter_ids}"
        
        assert data.get("country") == "BE", f"Expected country=BE in response: {data}"
        print(f"PASS: Belgian housing letter types returned: {len(letter_types)} types")
    
    def test_letter_types_employment_us(self):
        """GET /api/letters/types/employment?country=US returns standard US letter types"""
        response = requests.get(
            f"{BASE_URL}/api/letters/types/employment?country=US"
        )
        assert response.status_code == 200, f"Letter types failed: {response.text}"
        data = response.json()
        
        letter_types = data.get("letter_types", [])
        assert len(letter_types) >= 1, f"Expected at least 1 US employment letter type, got {len(letter_types)}"
        
        # Verify US letter types (should NOT have Belgian prefixes)
        letter_ids = [lt["id"] for lt in letter_types]
        belgian_ids = [lid for lid in letter_ids if lid.startswith("BE_")]
        assert len(belgian_ids) == 0, f"US letter types should not have Belgian prefixes: {belgian_ids}"
        
        assert data.get("country") == "US", f"Expected country=US in response: {data}"
        print(f"PASS: US employment letter types returned: {len(letter_types)} types (no Belgian prefixes)")
    
    def test_letter_types_debt_belgium(self):
        """GET /api/letters/types/debt?country=BE returns Belgian debt letter types"""
        response = requests.get(
            f"{BASE_URL}/api/letters/types/debt?country=BE"
        )
        assert response.status_code == 200, f"Letter types failed: {response.text}"
        data = response.json()
        
        letter_types = data.get("letter_types", [])
        assert len(letter_types) >= 4, f"Expected at least 4 Belgian debt letter types, got {len(letter_types)}"
        
        # Verify Belgian-specific debt letter types
        letter_ids = [lt["id"] for lt in letter_types]
        assert "BE_CONTESTATION_MISE_DEMEURE" in letter_ids, f"Missing mise en demeure letter type: {letter_ids}"
        
        print(f"PASS: Belgian debt letter types returned: {len(letter_types)} types")
    
    def test_letter_types_nda_belgium(self):
        """GET /api/letters/types/nda?country=BE returns Belgian NDA letter types"""
        response = requests.get(
            f"{BASE_URL}/api/letters/types/nda?country=BE"
        )
        assert response.status_code == 200, f"Letter types failed: {response.text}"
        data = response.json()
        
        letter_types = data.get("letter_types", [])
        assert len(letter_types) >= 4, f"Expected at least 4 Belgian NDA letter types, got {len(letter_types)}"
        
        # Verify Belgian-specific NDA letter types
        letter_ids = [lt["id"] for lt in letter_types]
        assert "BE_NDA_CONTESTATION_PORTEE" in letter_ids, f"Missing NDA portee letter type: {letter_ids}"
        
        print(f"PASS: Belgian NDA letter types returned: {len(letter_types)} types")
    
    # ==================== Auth/Me Endpoint Test ====================
    
    def test_auth_me_returns_country_region_language(self):
        """GET /api/auth/me returns country, region, language fields"""
        # First set user to Belgium
        requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "BE", "region": "Wallonie", "language": "fr-BE"},
            headers=self.headers
        )
        
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers=self.headers
        )
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        
        assert "country" in data, f"Missing country field: {data}"
        assert "region" in data, f"Missing region field: {data}"
        assert "language" in data, f"Missing language field: {data}"
        
        assert data.get("country") == "BE", f"Expected country=BE: {data}"
        assert data.get("region") == "Wallonie", f"Expected region=Wallonie: {data}"
        assert data.get("language") == "fr-BE", f"Expected language=fr-BE: {data}"
        
        print("PASS: Auth/me returns country, region, language fields correctly")
    
    # ==================== Cleanup: Reset user to BE for frontend tests ====================
    
    def test_z_reset_user_to_belgium(self):
        """Reset test user to Belgium for frontend tests"""
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={"country": "BE", "region": "Wallonie", "language": "fr-BE"},
            headers=self.headers
        )
        assert response.status_code == 200, f"Profile reset failed: {response.text}"
        print("PASS: User reset to country=BE, region=Wallonie, language=fr-BE for frontend tests")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
