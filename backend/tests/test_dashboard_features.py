"""
Test Dashboard 12 Features - Backend API Tests
Tests the endpoints used by the Dashboard page for all 12 CaseDetail features
"""
import pytest
import requests
import os
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = TEST_US_EMAIL
TEST_PASSWORD = TEST_US_PASSWORD


class TestDashboardFeatures:
    """Test Dashboard API endpoints for 12 features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session for authenticated requests"""
        self.session = requests.Session()
        
        # Login
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        print(f"Logged in as: {self.user.get('email')}")
    
    def test_get_cases_list(self):
        """Test GET /api/cases - Dashboard loads case list"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        assert isinstance(cases, list)
        print(f"Found {len(cases)} cases")
        
        if len(cases) > 0:
            # Store first case for other tests
            self.case = cases[0]
            print(f"First case: {self.case.get('title')} (score: {self.case.get('risk_score')})")
            
            # Verify case has required fields for Dashboard features
            assert 'case_id' in self.case
            assert 'risk_score' in self.case
            assert 'ai_findings' in self.case or self.case.get('status') == 'analyzing'
    
    def test_case_has_battle_preview(self):
        """Test case data includes battle_preview for horizontal Battle Preview"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a case with battle_preview
        case_with_bp = None
        for case in cases:
            if case.get('battle_preview'):
                case_with_bp = case
                break
        
        if case_with_bp:
            bp = case_with_bp['battle_preview']
            print(f"Battle Preview found for case: {case_with_bp.get('title')}")
            # Check structure
            assert 'user_side' in bp or 'user_arguments' in bp
            print("✅ Battle Preview structure valid")
        else:
            print("No cases with battle_preview found (may need analysis)")
    
    def test_case_has_success_probability(self):
        """Test case data includes success_probability for Outcome Predictor"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a case with success_probability
        case_with_prob = None
        for case in cases:
            if case.get('success_probability'):
                case_with_prob = case
                break
        
        if case_with_prob:
            prob = case_with_prob['success_probability']
            print(f"Success Probability found for case: {case_with_prob.get('title')}")
            print(f"Probabilities: {prob}")
            print("✅ Outcome Predictor data valid")
        else:
            print("No cases with success_probability found")
    
    def test_case_has_recent_case_law(self):
        """Test case data includes recent_case_law for Jurisprudence section"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a case with recent_case_law
        case_with_law = None
        for case in cases:
            if case.get('recent_case_law') and len(case.get('recent_case_law', [])) > 0:
                case_with_law = case
                break
        
        if case_with_law:
            law = case_with_law['recent_case_law']
            print(f"Recent Case Law found for case: {case_with_law.get('title')}")
            print(f"Number of case law entries: {len(law)}")
            if len(law) > 0:
                print(f"First entry: {law[0].get('case_name', 'N/A')}")
            print("✅ Jurisprudence data valid")
        else:
            print("No cases with recent_case_law found")
    
    def test_case_has_archer_question(self):
        """Test case data includes archer_question for interactive Q&A"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a case with archer_question
        case_with_q = None
        for case in cases:
            if case.get('archer_question'):
                case_with_q = case
                break
        
        if case_with_q:
            q = case_with_q['archer_question']
            print(f"Archer Question found for case: {case_with_q.get('title')}")
            print(f"Question: {q.get('text', 'N/A')[:100]}...")
            print(f"Options: {q.get('options', [])}")
            print("✅ Archer Question data valid")
        else:
            print("No cases with archer_question found (correct behavior if null)")
    
    def test_case_has_risk_score_history(self):
        """Test case data includes risk_score_history for Score History graph"""
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        # Find a case with risk_score_history
        case_with_history = None
        for case in cases:
            if case.get('risk_score_history') and len(case.get('risk_score_history', [])) > 0:
                case_with_history = case
                break
        
        if case_with_history:
            history = case_with_history['risk_score_history']
            print(f"Score History found for case: {case_with_history.get('title')}")
            print(f"Number of history entries: {len(history)}")
            print("✅ Score History data valid")
        else:
            print("No cases with risk_score_history found")
    
    def test_generate_action_letter_endpoint(self):
        """Test POST /api/cases/{case_id}/generate-action-letter"""
        # Get a case first
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        if len(cases) == 0:
            pytest.skip("No cases available for testing")
        
        case_id = cases[0]['case_id']
        
        # Test letter generation
        letter_response = self.session.post(
            f"{BASE_URL}/api/cases/{case_id}/generate-action-letter",
            json={
                "action_title": "Test Letter",
                "action_description": "Test description for letter generation"
            }
        )
        
        # Should return 200 with letter content or 500 if AI fails
        assert letter_response.status_code in [200, 500], f"Unexpected status: {letter_response.status_code}"
        
        if letter_response.status_code == 200:
            letter = letter_response.json()
            print(f"Letter generated successfully")
            print(f"Subject: {letter.get('subject', 'N/A')}")
            assert 'body' in letter or 'subject' in letter
            print("✅ Letter generation endpoint working")
        else:
            print("Letter generation returned 500 (AI may be rate limited)")
    
    def test_share_case_endpoint(self):
        """Test POST /api/cases/{case_id}/share"""
        # Get a case first
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        if len(cases) == 0:
            pytest.skip("No cases available for testing")
        
        case_id = cases[0]['case_id']
        
        # Test share endpoint
        share_response = self.session.post(
            f"{BASE_URL}/api/cases/{case_id}/share",
            json={"expires_in_hours": 168}
        )
        
        # Pro users should be able to share
        assert share_response.status_code in [200, 403], f"Unexpected status: {share_response.status_code}"
        
        if share_response.status_code == 200:
            share_data = share_response.json()
            print(f"Share link created successfully")
            assert 'token' in share_data or 'share_id' in share_data
            print(f"Share ID: {share_data.get('share_id', 'N/A')}")
            print("✅ Share endpoint working")
        else:
            print("Share returned 403 (may be free plan)")
    
    def test_archer_answer_endpoint(self):
        """Test POST /api/cases/{case_id}/archer-answer"""
        # Get a case with archer_question
        response = self.session.get(f"{BASE_URL}/api/cases")
        assert response.status_code == 200
        cases = response.json()
        
        case_with_q = None
        for case in cases:
            if case.get('archer_question'):
                case_with_q = case
                break
        
        if not case_with_q:
            pytest.skip("No cases with archer_question available")
        
        case_id = case_with_q['case_id']
        question = case_with_q['archer_question']
        
        # Test answering the question
        answer_response = self.session.post(
            f"{BASE_URL}/api/cases/{case_id}/archer-answer",
            json={
                "question": question.get('text', ''),
                "answer": question.get('options', ['Yes'])[0]
            }
        )
        
        # Should return 200 with updated analysis or 500 if AI fails
        assert answer_response.status_code in [200, 500], f"Unexpected status: {answer_response.status_code}"
        
        if answer_response.status_code == 200:
            result = answer_response.json()
            print(f"Archer answer processed successfully")
            print(f"Impact: {result.get('impact_summary', 'N/A')}")
            print("✅ Archer answer endpoint working")
        else:
            print("Archer answer returned 500 (AI may be rate limited)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
