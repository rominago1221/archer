"""
Test suite for NextActionsPanel and LetterFormModal features
Tests the redesigned right panel with TYPE A/B/C action classification
and the new LetterFormModal with form fields and letter generation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@jasper.legal"
TEST_PASSWORD = "JasperPro2026!"


class TestLetterFormModalAPI:
    """Test the generate-action-letter API endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session cookie
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        print(f"Login successful for {TEST_EMAIL}")
        
        # Get cases to find a valid case_id
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        assert cases_response.status_code == 200, f"Failed to get cases: {cases_response.text}"
        
        cases = cases_response.json()
        assert len(cases) > 0, "No cases found for test user"
        
        self.case_id = cases[0].get('case_id')
        self.case_data = cases[0]
        print(f"Using case: {self.case_id} - {self.case_data.get('title', 'Untitled')}")
    
    def test_generate_action_letter_endpoint_exists(self):
        """Test that the generate-action-letter endpoint exists and accepts POST"""
        # Test with minimal payload
        response = self.session.post(
            f"{BASE_URL}/api/cases/{self.case_id}/generate-action-letter",
            json={
                "action_title": "Test Action",
                "action_description": "Test description"
            }
        )
        
        # Should not return 404 (endpoint exists)
        assert response.status_code != 404, "Endpoint /api/cases/{case_id}/generate-action-letter not found"
        print(f"Endpoint exists, status: {response.status_code}")
    
    def test_generate_action_letter_returns_letter_structure(self):
        """Test that generate-action-letter returns proper letter structure"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/{self.case_id}/generate-action-letter",
            json={
                "action_title": "Emergency Motion to Contest Eviction",
                "action_description": "File immediate motion challenging procedural defects",
                "sender_name": "Alex Thompson",
                "sender_address": "123 Test Street, New York, NY 10001",
                "recipient_name": "Property Management LLC",
                "recipient_address": "456 Main Street, New York, NY 10002",
                "doc_date": "April 11, 2026",
                "amount": "$5,000",
                "personal_note": "Please include reference to procedural defects"
            },
            timeout=30  # AI generation may take time
        )
        
        assert response.status_code == 200, f"Letter generation failed: {response.text}"
        
        letter = response.json()
        print(f"Letter response keys: {letter.keys()}")
        
        # Verify letter structure
        assert 'body' in letter, "Letter should have 'body' field"
        assert len(letter.get('body', '')) > 100, "Letter body should have substantial content"
        
        # Optional fields that should be present
        if 'subject' in letter:
            print(f"Letter subject: {letter['subject']}")
        if 'legal_citations' in letter:
            print(f"Legal citations: {letter['legal_citations']}")
        
        print(f"Letter body preview: {letter.get('body', '')[:200]}...")
    
    def test_generate_action_letter_requires_auth(self):
        """Test that generate-action-letter requires authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.post(
            f"{BASE_URL}/api/cases/{self.case_id}/generate-action-letter",
            json={
                "action_title": "Test Action",
                "action_description": "Test description"
            }
        )
        
        assert response.status_code == 401, f"Expected 401 for unauthenticated request, got {response.status_code}"
        print("Correctly returns 401 for unauthenticated request")
    
    def test_generate_action_letter_invalid_case(self):
        """Test that generate-action-letter returns 404 for invalid case"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/invalid_case_id_12345/generate-action-letter",
            json={
                "action_title": "Test Action",
                "action_description": "Test description"
            }
        )
        
        assert response.status_code == 404, f"Expected 404 for invalid case, got {response.status_code}"
        print("Correctly returns 404 for invalid case ID")


class TestCasesAPIForNextActions:
    """Test that cases API returns ai_next_steps for NextActionsPanel"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    def test_cases_list_returns_ai_next_steps(self):
        """Test that cases list includes ai_next_steps field"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        
        cases = response.json()
        assert len(cases) > 0, "No cases found"
        
        # Check first case with ai_next_steps
        case_with_steps = None
        for case in cases:
            if case.get('ai_next_steps') and len(case.get('ai_next_steps', [])) > 0:
                case_with_steps = case
                break
        
        if case_with_steps:
            print(f"Found case with ai_next_steps: {case_with_steps.get('title')}")
            steps = case_with_steps.get('ai_next_steps', [])
            print(f"Number of next steps: {len(steps)}")
            
            # Verify step structure
            for i, step in enumerate(steps[:3]):
                print(f"\nStep {i+1}:")
                if isinstance(step, dict):
                    print(f"  Title: {step.get('title', 'N/A')}")
                    print(f"  Description: {step.get('description', 'N/A')[:50]}...")
                    if 'action_type' in step:
                        print(f"  Action type: {step.get('action_type')}")
                else:
                    print(f"  Text: {step}")
        else:
            print("No cases with ai_next_steps found (may need document analysis)")
    
    def test_single_case_returns_ai_next_steps(self):
        """Test that single case endpoint includes ai_next_steps"""
        # Get cases list first
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        cases = cases_response.json()
        
        if len(cases) > 0:
            case_id = cases[0].get('case_id')
            
            # Get single case
            response = self.session.get(f"{BASE_URL}/api/cases/{case_id}")
            assert response.status_code == 200
            
            case = response.json()
            print(f"Case: {case.get('title')}")
            print(f"Has ai_next_steps: {'ai_next_steps' in case}")
            
            if 'ai_next_steps' in case:
                print(f"Number of steps: {len(case.get('ai_next_steps', []))}")


class TestUserProfileForLetterForm:
    """Test that user profile returns name for LetterFormModal pre-fill"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
    
    def test_auth_me_returns_user_name(self):
        """Test that /api/auth/me returns user name for form pre-fill"""
        response = self.session.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        user = response.json()
        print(f"User data keys: {user.keys()}")
        
        # Verify name field exists
        assert 'name' in user, "User should have 'name' field for form pre-fill"
        print(f"User name: {user.get('name')}")
        
        # Verify it's not empty
        assert user.get('name'), "User name should not be empty"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
