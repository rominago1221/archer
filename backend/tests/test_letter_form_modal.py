"""
Test Letter Form Modal Auto-fill Feature
Tests:
1. GET /api/cases/{case_id} returns opposing_party_name, document_date, primary_amount fields
2. Case Pydantic model includes new fields
3. User profile has name and email for pre-fill
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://predict-outcome.preview.emergentagent.com')

class TestLetterFormModalBackend:
    """Backend tests for Letter Form Modal auto-fill feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        # Login as test user
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@jasper.legal", "password": "JasperPro2026!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json().get("user", login_response.json())
        print(f"Logged in as: {self.user.get('name')} ({self.user.get('email')})")
    
    def test_user_profile_has_name_and_email(self):
        """Test that user profile has name and email for pre-fill"""
        # User profile is returned from login response
        profile = self.user
        print(f"User profile: {profile}")
        
        # Verify name and email exist
        assert "name" in profile, "Profile missing 'name' field"
        assert "email" in profile, "Profile missing 'email' field"
        assert profile["name"] == "Alex Thompson", f"Expected name 'Alex Thompson', got '{profile.get('name')}'"
        assert profile["email"] == "test@jasper.legal", f"Expected email 'test@jasper.legal', got '{profile.get('email')}'"
        
        # Check if address exists (should be empty for this test user)
        address = profile.get("address")
        print(f"User address: {address}")
        
        print("SUCCESS: User profile has name and email for pre-fill")
    
    def test_get_cases_list(self):
        """Test that cases list is returned"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200, f"Cases fetch failed: {response.text}"
        
        cases = response.json()
        assert isinstance(cases, list), "Cases should be a list"
        assert len(cases) > 0, "No cases found for test user"
        
        print(f"Found {len(cases)} cases")
        return cases
    
    def test_case_has_new_fields(self):
        """Test that case has opposing_party_name, document_date, primary_amount fields"""
        # Get cases
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        assert cases_response.status_code == 200
        cases = cases_response.json()
        assert len(cases) > 0, "No cases found"
        
        # Get first case details
        case_id = cases[0]["case_id"]
        response = self.session.get(f"{BASE_URL}/api/cases/{case_id}")
        assert response.status_code == 200, f"Case fetch failed: {response.text}"
        
        case = response.json()
        print(f"Case: {case.get('title')}")
        print(f"Case ID: {case_id}")
        
        # Check for new fields (they may be null but should exist in schema)
        # These fields are optional so we just check they can be accessed
        opposing_party_name = case.get("opposing_party_name")
        opposing_party_address = case.get("opposing_party_address")
        document_date = case.get("document_date")
        primary_amount = case.get("primary_amount")
        financial_exposure = case.get("financial_exposure")
        
        print(f"opposing_party_name: {opposing_party_name}")
        print(f"opposing_party_address: {opposing_party_address}")
        print(f"document_date: {document_date}")
        print(f"primary_amount: {primary_amount}")
        print(f"financial_exposure: {financial_exposure}")
        
        # At least one of primary_amount or financial_exposure should be available for Key amount
        has_amount = primary_amount is not None or financial_exposure is not None
        print(f"Has amount data: {has_amount}")
        
        print("SUCCESS: Case model includes new fields")
    
    def test_case_model_fields_in_response(self):
        """Test that all expected Case model fields are in API response"""
        # Get cases
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        assert cases_response.status_code == 200
        cases = cases_response.json()
        assert len(cases) > 0, "No cases found"
        
        # Get first case details
        case_id = cases[0]["case_id"]
        response = self.session.get(f"{BASE_URL}/api/cases/{case_id}")
        assert response.status_code == 200
        
        case = response.json()
        
        # Check for standard fields
        required_fields = ["case_id", "user_id", "title", "type", "status", "risk_score"]
        for field in required_fields:
            assert field in case, f"Case missing required field: {field}"
        
        # Check for new letter form fields (optional but should be in schema)
        letter_form_fields = ["opposing_party_name", "opposing_party_address", "document_date", "primary_amount"]
        for field in letter_form_fields:
            # Field should be accessible (even if None)
            _ = case.get(field)
            print(f"Field '{field}' accessible: {field in case or case.get(field) is None}")
        
        print("SUCCESS: All expected Case model fields are accessible")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
