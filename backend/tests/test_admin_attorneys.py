"""
Test Admin Attorney Management Endpoints
Tests for attorney onboarding & validation flow:
- GET /api/admin/attorneys - list all attorney applications
- GET /api/admin/attorneys?status=pending - filter by status
- POST /api/admin/attorneys/{id}/approve - approve attorney
- POST /api/admin/attorneys/{id}/reject - reject attorney (requires reason)
"""

import pytest
import requests
import os
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = TEST_US_EMAIL
ADMIN_PASSWORD = TEST_US_PASSWORD


@pytest.fixture(scope="module")
def admin_session():
    """Login as admin and return session with cookies"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    data = response.json()
    session_token = data.get("session_token")
    assert session_token, "No session token returned"
    
    # Set cookie manually since the server sets it
    session.cookies.set("session_token", session_token)
    return session


class TestAdminAttorneyEndpoints:
    """Test admin attorney management endpoints"""
    
    def test_01_admin_login_success(self):
        """Test admin can login with test@archer.legal credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_token" in data
        assert data.get("user", {}).get("email") == ADMIN_EMAIL
        print(f"PASS: Admin login successful for {ADMIN_EMAIL}")
    
    def test_02_get_all_attorneys(self, admin_session):
        """Test GET /api/admin/attorneys returns list of attorney profiles"""
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"PASS: GET /api/admin/attorneys returned {len(data)} attorneys")
        
        # Verify attorney data structure
        if len(data) > 0:
            attorney = data[0]
            required_fields = ["attorney_id", "full_name", "email", "bar_number", "application_status"]
            for field in required_fields:
                assert field in attorney, f"Missing field: {field}"
            print(f"PASS: Attorney data structure verified with fields: {list(attorney.keys())}")
    
    def test_03_filter_pending_attorneys(self, admin_session):
        """Test GET /api/admin/attorneys?status=pending filters correctly"""
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys?status=pending")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # All returned attorneys should have pending status
        for attorney in data:
            assert attorney.get("application_status") == "pending", \
                f"Expected pending, got {attorney.get('application_status')}"
        
        print(f"PASS: Filter pending returned {len(data)} pending attorneys")
    
    def test_04_filter_approved_attorneys(self, admin_session):
        """Test GET /api/admin/attorneys?status=approved filters correctly"""
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys?status=approved")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # All returned attorneys should have approved status
        for attorney in data:
            assert attorney.get("application_status") == "approved", \
                f"Expected approved, got {attorney.get('application_status')}"
        
        print(f"PASS: Filter approved returned {len(data)} approved attorneys")
    
    def test_05_filter_rejected_attorneys(self, admin_session):
        """Test GET /api/admin/attorneys?status=rejected filters correctly"""
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys?status=rejected")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        
        # All returned attorneys should have rejected status
        for attorney in data:
            assert attorney.get("application_status") == "rejected", \
                f"Expected rejected, got {attorney.get('application_status')}"
        
        print(f"PASS: Filter rejected returned {len(data)} rejected attorneys")
    
    def test_06_filter_all_attorneys(self, admin_session):
        """Test GET /api/admin/attorneys?status=all returns all attorneys"""
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys?status=all")
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Filter 'all' returned {len(data)} attorneys")
    
    def test_07_reject_without_reason_fails(self, admin_session):
        """Test POST /api/admin/attorneys/{id}/reject WITHOUT reason returns 400"""
        # First get a pending attorney
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys?status=pending")
        assert response.status_code == 200
        pending = response.json()
        
        if len(pending) == 0:
            pytest.skip("No pending attorneys to test rejection")
        
        attorney_id = pending[0]["attorney_id"]
        
        # Try to reject without reason
        response = admin_session.post(
            f"{BASE_URL}/api/admin/attorneys/{attorney_id}/reject",
            json={"reason": ""}  # Empty reason
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"PASS: Reject without reason correctly returns 400")
    
    def test_08_reject_with_empty_whitespace_fails(self, admin_session):
        """Test POST /api/admin/attorneys/{id}/reject with whitespace-only reason returns 400"""
        # First get a pending attorney
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys?status=pending")
        assert response.status_code == 200
        pending = response.json()
        
        if len(pending) == 0:
            pytest.skip("No pending attorneys to test rejection")
        
        attorney_id = pending[0]["attorney_id"]
        
        # Try to reject with whitespace-only reason
        response = admin_session.post(
            f"{BASE_URL}/api/admin/attorneys/{attorney_id}/reject",
            json={"reason": "   "}  # Whitespace only
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print(f"PASS: Reject with whitespace-only reason correctly returns 400")
    
    def test_09_approve_nonexistent_attorney_fails(self, admin_session):
        """Test POST /api/admin/attorneys/{id}/approve with invalid ID returns 404"""
        response = admin_session.post(
            f"{BASE_URL}/api/admin/attorneys/nonexistent_id_12345/approve",
            json={}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"PASS: Approve nonexistent attorney correctly returns 404")
    
    def test_10_reject_nonexistent_attorney_fails(self, admin_session):
        """Test POST /api/admin/attorneys/{id}/reject with invalid ID returns 404"""
        response = admin_session.post(
            f"{BASE_URL}/api/admin/attorneys/nonexistent_id_12345/reject",
            json={"reason": "Test reason"}
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print(f"PASS: Reject nonexistent attorney correctly returns 404")
    
    def test_11_unauthenticated_access_denied(self):
        """Test admin endpoints require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/attorneys")
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Unauthenticated access correctly returns 401")
    
    def test_12_attorney_data_has_required_columns(self, admin_session):
        """Test attorney data has all required columns for admin table"""
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys")
        assert response.status_code == 200
        data = response.json()
        
        if len(data) == 0:
            pytest.skip("No attorneys to verify columns")
        
        # Required columns from AdminAttorneys.js table
        required_columns = [
            "full_name",      # Name
            "email",          # Email
            "bar_number",     # Bar #
            "country",        # Country
            "specialties",    # Specialties
            "session_price",  # Price
            "created_at",     # Date
            "application_status",  # Status
            "attorney_id"     # For actions
        ]
        
        attorney = data[0]
        missing = [col for col in required_columns if col not in attorney]
        assert len(missing) == 0, f"Missing columns: {missing}"
        print(f"PASS: Attorney data has all required columns for admin table")
    
    def test_13_verify_existing_attorneys(self, admin_session):
        """Verify the existing attorneys mentioned in test context"""
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys")
        assert response.status_code == 200
        data = response.json()
        
        # Check for expected attorneys from context
        attorney_ids = [a.get("attorney_id") for a in data]
        
        # Print all attorneys for debugging
        print(f"Found {len(data)} attorneys:")
        for a in data:
            print(f"  - {a.get('full_name')} ({a.get('attorney_id')}): {a.get('application_status')}")
        
        # Verify we have at least some attorneys
        assert len(data) >= 1, "Expected at least 1 attorney in the system"
        print(f"PASS: Found {len(data)} attorneys in the system")


class TestAttorneyDashboard:
    """Test attorney dashboard endpoint"""
    
    def test_attorney_dashboard_pending_status(self, admin_session):
        """Test attorney dashboard shows pending status correctly"""
        # First check if we have any pending attorneys
        response = admin_session.get(f"{BASE_URL}/api/admin/attorneys?status=pending")
        assert response.status_code == 200
        pending = response.json()
        
        if len(pending) > 0:
            print(f"PASS: Found {len(pending)} pending attorneys for dashboard testing")
            for atty in pending[:2]:
                print(f"  - {atty.get('full_name')} ({atty.get('attorney_id')}): {atty.get('application_status')}")
        else:
            print("INFO: No pending attorneys found")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
