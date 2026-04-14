"""
Test Case Detail Page 12-Point Redesign Features
Tests for: archer-answer, generate-action-letter, share endpoints
"""
import pytest
import requests
import os
import time
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = TEST_US_EMAIL
TEST_PASSWORD = TEST_US_PASSWORD
CASE_ID = "case_ed35bd476d0a"


class TestCaseDetailFeatures:
    """Test Case Detail page features including archer-answer, generate-action-letter, share"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        
        # Extract session token from cookies
        self.session_token = login_response.cookies.get("session_token")
        if self.session_token:
            self.session.cookies.set("session_token", self.session_token)
        
        yield
        
        # Cleanup
        self.session.close()
    
    # ============ Case Data Tests ============
    
    def test_get_case_detail(self):
        """Test GET /api/cases/{case_id} returns full case data"""
        response = self.session.get(f"{BASE_URL}/api/cases/{CASE_ID}")
        assert response.status_code == 200, f"Get case failed: {response.text}"
        
        data = response.json()
        
        # Verify case exists and has expected fields
        assert data.get("case_id") == CASE_ID
        assert "title" in data
        assert "risk_score" in data
        
        # Verify battle_preview structure
        assert "battle_preview" in data
        bp = data["battle_preview"]
        assert bp is not None, "battle_preview should not be None"
        assert "user_side" in bp, "battle_preview should have user_side"
        assert "opposing_side" in bp, "battle_preview should have opposing_side"
        
        # Verify user_side has strongest_arguments
        user_side = bp.get("user_side", {})
        assert "strongest_arguments" in user_side, "user_side should have strongest_arguments"
        assert len(user_side["strongest_arguments"]) > 0, "Should have at least one user argument"
        
        # Verify opposing_side has opposing_arguments
        opposing_side = bp.get("opposing_side", {})
        assert "opposing_arguments" in opposing_side, "opposing_side should have opposing_arguments"
        assert len(opposing_side["opposing_arguments"]) > 0, "Should have at least one opposing argument"
        
        print(f"PASS: Case {CASE_ID} has battle_preview with {len(user_side['strongest_arguments'])} user args and {len(opposing_side['opposing_arguments'])} opposing args")
    
    def test_case_has_success_probability(self):
        """Test case has success_probability with correct keys"""
        response = self.session.get(f"{BASE_URL}/api/cases/{CASE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        prob = data.get("success_probability")
        
        assert prob is not None, "success_probability should not be None"
        
        # Verify expected keys (85%, 10%, 4%, 1% for this case)
        assert "full_resolution_in_favor" in prob, "Should have full_resolution_in_favor"
        assert "negotiated_settlement" in prob, "Should have negotiated_settlement"
        assert "partial_loss" in prob, "Should have partial_loss"
        assert "full_loss" in prob, "Should have full_loss"
        
        # Verify values match expected (85, 10, 4, 1)
        assert prob["full_resolution_in_favor"] == 85, f"Expected 85, got {prob['full_resolution_in_favor']}"
        assert prob["negotiated_settlement"] == 10, f"Expected 10, got {prob['negotiated_settlement']}"
        assert prob["partial_loss"] == 4, f"Expected 4, got {prob['partial_loss']}"
        assert prob["full_loss"] == 1, f"Expected 1, got {prob['full_loss']}"
        
        print(f"PASS: success_probability has correct values: {prob}")
    
    def test_case_has_risk_score_history(self):
        """Test case has risk_score_history with data points"""
        response = self.session.get(f"{BASE_URL}/api/cases/{CASE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        history = data.get("risk_score_history", [])
        
        assert len(history) >= 1, "Should have at least 1 risk score history entry"
        
        # Verify history entry structure
        entry = history[0]
        assert "score" in entry, "History entry should have score"
        assert "date" in entry, "History entry should have date"
        
        print(f"PASS: risk_score_history has {len(history)} entries, first score: {entry['score']}")
    
    def test_case_has_recent_case_law(self):
        """Test case has recent_case_law (jurisprudence) entries"""
        response = self.session.get(f"{BASE_URL}/api/cases/{CASE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        case_law = data.get("recent_case_law", [])
        
        assert len(case_law) >= 1, "Should have at least 1 case law entry"
        
        # Verify case law entry structure
        entry = case_law[0]
        assert "case_name" in entry, "Case law entry should have case_name"
        assert "court" in entry, "Case law entry should have court"
        
        print(f"PASS: recent_case_law has {len(case_law)} entries, first: {entry['case_name']}")
    
    def test_case_has_ai_next_steps(self):
        """Test case has ai_next_steps for Next Actions section"""
        response = self.session.get(f"{BASE_URL}/api/cases/{CASE_ID}")
        assert response.status_code == 200
        
        data = response.json()
        steps = data.get("ai_next_steps", [])
        
        assert len(steps) >= 1, "Should have at least 1 next step"
        
        # Verify step structure
        step = steps[0]
        assert "title" in step, "Step should have title"
        assert "description" in step, "Step should have description"
        
        print(f"PASS: ai_next_steps has {len(steps)} items, first: {step['title']}")
    
    # ============ Archer Answer Endpoint Tests ============
    
    def test_archer_answer_endpoint(self):
        """Test POST /api/cases/{case_id}/archer-answer"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/{CASE_ID}/archer-answer",
            json={
                "question": "Did you receive the eviction notice in writing?",
                "answer": "Yes"
            }
        )
        
        assert response.status_code == 200, f"archer-answer failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "impact_summary" in data, "Response should have impact_summary"
        assert "risk_adjustment" in data, "Response should have risk_adjustment"
        assert "new_risk_score" in data, "Response should have new_risk_score"
        assert "old_risk_score" in data, "Response should have old_risk_score"
        
        print(f"PASS: archer-answer returned impact: {data.get('impact_summary', '')[:100]}...")
    
    def test_archer_answer_requires_answer(self):
        """Test archer-answer requires answer field"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/{CASE_ID}/archer-answer",
            json={
                "question": "Test question",
                "answer": ""  # Empty answer
            }
        )
        
        assert response.status_code == 400, "Should return 400 for empty answer"
        print("PASS: archer-answer correctly rejects empty answer")
    
    def test_archer_answer_invalid_case(self):
        """Test archer-answer returns 404 for invalid case"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/invalid_case_id/archer-answer",
            json={
                "question": "Test",
                "answer": "Yes"
            }
        )
        
        assert response.status_code == 404, "Should return 404 for invalid case"
        print("PASS: archer-answer correctly returns 404 for invalid case")
    
    # ============ Generate Action Letter Endpoint Tests ============
    
    def test_generate_action_letter_endpoint(self):
        """Test POST /api/cases/{case_id}/generate-action-letter"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/{CASE_ID}/generate-action-letter",
            json={
                "action_title": "File Motion to Dismiss",
                "action_description": "Prepare motion to dismiss based on defective eviction notice"
            }
        )
        
        assert response.status_code == 200, f"generate-action-letter failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "subject" in data, "Response should have subject"
        assert "body" in data, "Response should have body"
        assert len(data["body"]) > 100, "Letter body should be substantial"
        
        # Optional fields
        if "legal_citations" in data:
            assert isinstance(data["legal_citations"], list), "legal_citations should be a list"
        
        print(f"PASS: generate-action-letter returned letter with subject: {data.get('subject', '')[:50]}...")
    
    def test_generate_action_letter_invalid_case(self):
        """Test generate-action-letter returns 404 for invalid case"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/invalid_case_id/generate-action-letter",
            json={
                "action_title": "Test",
                "action_description": "Test"
            }
        )
        
        assert response.status_code == 404, "Should return 404 for invalid case"
        print("PASS: generate-action-letter correctly returns 404 for invalid case")
    
    # ============ Share Endpoint Tests ============
    
    def test_share_case_endpoint(self):
        """Test POST /api/cases/{case_id}/share"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/{CASE_ID}/share",
            json={
                "expires_in_hours": 168  # 7 days
            }
        )
        
        assert response.status_code == 200, f"share failed: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "share_id" in data, "Response should have share_id"
        assert "token" in data or "share_id" in data, "Response should have token or share_id"
        assert "expires_at" in data, "Response should have expires_at"
        
        # Verify share_id format
        share_id = data.get("share_id", "")
        assert share_id.startswith("share_"), f"share_id should start with 'share_', got: {share_id}"
        
        print(f"PASS: share endpoint returned share_id: {share_id}")
        
        # Store for cleanup
        self.share_id = share_id
        self.share_token = data.get("token", "")
    
    def test_share_case_invalid_case(self):
        """Test share returns 404 for invalid case"""
        response = self.session.post(
            f"{BASE_URL}/api/cases/invalid_case_id/share",
            json={
                "expires_in_hours": 168
            }
        )
        
        assert response.status_code == 404, "Should return 404 for invalid case"
        print("PASS: share correctly returns 404 for invalid case")
    
    def test_list_case_shares(self):
        """Test GET /api/cases/{case_id}/shares"""
        # First create a share
        self.session.post(
            f"{BASE_URL}/api/cases/{CASE_ID}/share",
            json={"expires_in_hours": 168}
        )
        
        # Then list shares
        response = self.session.get(f"{BASE_URL}/api/cases/{CASE_ID}/shares")
        
        assert response.status_code == 200, f"list shares failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"PASS: list shares returned {len(data)} shares")
    
    # ============ Authentication Tests ============
    
    def test_endpoints_require_auth(self):
        """Test that endpoints require authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        # Test archer-answer
        response = unauth_session.post(
            f"{BASE_URL}/api/cases/{CASE_ID}/archer-answer",
            json={"question": "test", "answer": "Yes"}
        )
        assert response.status_code == 401, "archer-answer should require auth"
        
        # Test generate-action-letter
        response = unauth_session.post(
            f"{BASE_URL}/api/cases/{CASE_ID}/generate-action-letter",
            json={"action_title": "Test", "action_description": "Test"}
        )
        assert response.status_code == 401, "generate-action-letter should require auth"
        
        # Test share
        response = unauth_session.post(
            f"{BASE_URL}/api/cases/{CASE_ID}/share",
            json={"expires_in_hours": 168}
        )
        assert response.status_code == 401, "share should require auth"
        
        unauth_session.close()
        print("PASS: All endpoints correctly require authentication")


class TestLoginFlow:
    """Test login flow for Case Detail page access"""
    
    def test_login_with_test_credentials(self):
        """Test login with test@archer.legal / ArcherPro2026!"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "user" in data, "Response should have user"
        assert data["user"]["email"] == TEST_EMAIL
        
        # Verify session cookie is set
        assert "session_token" in response.cookies, "Session cookie should be set"
        
        session.close()
        print(f"PASS: Login successful for {TEST_EMAIL}")
    
    def test_access_case_after_login(self):
        """Test accessing case detail after login"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        
        # Access case
        case_response = session.get(f"{BASE_URL}/api/cases/{CASE_ID}")
        assert case_response.status_code == 200, f"Case access failed: {case_response.text}"
        
        data = case_response.json()
        assert data["case_id"] == CASE_ID
        
        session.close()
        print(f"PASS: Successfully accessed case {CASE_ID} after login")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
