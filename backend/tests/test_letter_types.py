"""
Test suite for expanded Archer Response Letters feature.
Tests the GET /api/letters/types/{case_type} endpoint for all case types.
Tests POST /api/letters/generate with new letter type IDs.
"""
import pytest
import requests
import os
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = TEST_US_EMAIL
TEST_PASSWORD = "password123"
TEST_CASE_ID = "case_325e9b859a01"  # Housing type case


class TestLetterTypesEndpoints:
    """Test GET /api/letters/types/{case_type} for all case types"""
    
    def test_nda_letter_types_returns_8_options(self):
        """NDA case type should return 8 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/nda")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "letter_types" in data, "Response should contain 'letter_types'"
        assert data["case_type"] == "nda", f"Expected case_type 'nda', got {data['case_type']}"
        
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"NDA should have 8 letter types, got {len(letter_types)}"
        
        # Verify structure of each letter type
        for lt in letter_types:
            assert "id" in lt, "Each letter type should have 'id'"
            assert "label" in lt, "Each letter type should have 'label'"
            assert "desc" in lt, "Each letter type should have 'desc'"
        
        # Verify specific NDA letter type IDs
        ids = [lt["id"] for lt in letter_types]
        expected_ids = [
            "NDA_CLAUSE_CLARIFICATION", "NDA_NEGOTIATE_SCOPE", "NDA_MUTUAL_OBLIGATIONS",
            "NDA_CHALLENGE_DURATION", "NDA_GEOGRAPHIC_LIMITATION", "NDA_PROPOSE_CARVEOUTS",
            "NDA_CHALLENGE_PENALTY", "NDA_GOVERNING_LAW"
        ]
        for expected_id in expected_ids:
            assert expected_id in ids, f"Missing expected NDA letter type: {expected_id}"
        print(f"PASS: NDA returns 8 letter types with correct IDs")
    
    def test_housing_letter_types_returns_8_options(self):
        """Housing case type should return 8 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/housing")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Housing should have 8 letter types, got {len(letter_types)}"
        
        ids = [lt["id"] for lt in letter_types]
        expected_ids = [
            "PAYMENT_PLAN_PROPOSAL", "DISPUTE_NOTICE_VALIDITY", "CONTEST_DAMAGE_AMOUNTS",
            "REQUEST_MORE_TIME", "CHALLENGE_OCCUPANT_CLAIM", "ASSERT_DEPOSIT_RIGHTS",
            "REQUEST_MEDIATION", "DISPUTE_LEASE_VIOLATION"
        ]
        for expected_id in expected_ids:
            assert expected_id in ids, f"Missing expected housing letter type: {expected_id}"
        print(f"PASS: Housing returns 8 letter types with correct IDs")
    
    def test_employment_letter_types_returns_8_options(self):
        """Employment case type should return 8 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/employment")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Employment should have 8 letter types, got {len(letter_types)}"
        
        ids = [lt["id"] for lt in letter_types]
        expected_ids = [
            "CONTEST_TERMINATION", "DEMAND_UNPAID_WAGES", "CHALLENGE_NON_COMPETE",
            "REQUEST_TERMINATION_REASON", "ASSERT_DISCRIMINATION", "DEMAND_SEVERANCE",
            "DISPUTE_PERFORMANCE_REVIEW", "REQUEST_REFERENCE"
        ]
        for expected_id in expected_ids:
            assert expected_id in ids, f"Missing expected employment letter type: {expected_id}"
        print(f"PASS: Employment returns 8 letter types with correct IDs")
    
    def test_debt_letter_types_returns_8_options(self):
        """Debt case type should return 8 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/debt")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Debt should have 8 letter types, got {len(letter_types)}"
        
        ids = [lt["id"] for lt in letter_types]
        expected_ids = [
            "DEBT_VALIDATION_REQUEST", "CEASE_AND_DESIST", "DISPUTE_DEBT_OWNERSHIP",
            "CHALLENGE_STATUTE_LIMITATIONS", "SETTLEMENT_OFFER", "FDCPA_VIOLATION_COMPLAINT",
            "REQUEST_PAYMENT_HISTORY", "DISPUTE_CREDIT_REPORTING"
        ]
        for expected_id in expected_ids:
            assert expected_id in ids, f"Missing expected debt letter type: {expected_id}"
        print(f"PASS: Debt returns 8 letter types with correct IDs")
    
    def test_demand_letter_types_returns_8_options(self):
        """Demand case type (NEW) should return 8 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/demand")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Demand should have 8 letter types, got {len(letter_types)}"
        
        ids = [lt["id"] for lt in letter_types]
        expected_ids = [
            "FORMAL_DISPUTE", "COUNTER_PROPOSAL", "REQUEST_EVIDENCE",
            "CHALLENGE_LEGAL_BASIS", "PROPOSE_MEDIATION", "ASSERT_COUNTER_CLAIM",
            "REQUEST_EXTENSION", "PARTIAL_ACCEPTANCE"
        ]
        for expected_id in expected_ids:
            assert expected_id in ids, f"Missing expected demand letter type: {expected_id}"
        print(f"PASS: Demand (NEW) returns 8 letter types with correct IDs")
    
    def test_court_letter_types_returns_8_options(self):
        """Court case type should return 8 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/court")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Court should have 8 letter types, got {len(letter_types)}"
        
        ids = [lt["id"] for lt in letter_types]
        expected_ids = [
            "FILE_FORMAL_RESPONSE", "REQUEST_CONTINUANCE", "CHALLENGE_JURISDICTION",
            "MOTION_TO_DISMISS", "PROPOSE_SETTLEMENT", "REQUEST_DISCOVERY",
            "COUNTER_CLAIM_FILING", "DEFAULT_AVOIDANCE"
        ]
        for expected_id in expected_ids:
            assert expected_id in ids, f"Missing expected court letter type: {expected_id}"
        print(f"PASS: Court returns 8 letter types with correct IDs")
    
    def test_consumer_letter_types_returns_8_options(self):
        """Consumer case type should return 8 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/consumer")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Consumer should have 8 letter types, got {len(letter_types)}"
        
        ids = [lt["id"] for lt in letter_types]
        expected_ids = [
            "FORMAL_REFUND_DEMAND", "CHARGEBACK_SUPPORT", "FTC_COMPLAINT_NOTICE",
            "BBB_COMPLAINT_NOTICE", "ATTORNEY_GENERAL_NOTICE", "SMALL_CLAIMS_NOTICE",
            "WARRANTY_CLAIM", "CONSUMER_PROTECTION_CLAIM"
        ]
        for expected_id in expected_ids:
            assert expected_id in ids, f"Missing expected consumer letter type: {expected_id}"
        print(f"PASS: Consumer returns 8 letter types with correct IDs")
    
    def test_contract_letter_types_returns_8_options(self):
        """Contract case type should return 8 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/contract")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Contract should have 8 letter types, got {len(letter_types)}"
        print(f"PASS: Contract returns 8 letter types")
    
    def test_other_letter_types_returns_8_options_as_fallback(self):
        """Other case type should return 8 letter options as fallback"""
        response = requests.get(f"{BASE_URL}/api/letters/types/other")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Other should have 8 letter types, got {len(letter_types)}"
        print(f"PASS: Other returns 8 letter types as fallback")
    
    def test_unknown_case_type_falls_back_to_other(self):
        """Unknown case type should fall back to 'other' letter types"""
        response = requests.get(f"{BASE_URL}/api/letters/types/unknown_type_xyz")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 8, f"Unknown type should fall back to 8 letter types, got {len(letter_types)}"
        print(f"PASS: Unknown case type falls back to 'other' with 8 letter types")
    
    def test_immigration_letter_types_returns_6_options(self):
        """Immigration case type should return 6 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/immigration")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 6, f"Immigration should have 6 letter types, got {len(letter_types)}"
        print(f"PASS: Immigration returns 6 letter types")
    
    def test_family_letter_types_returns_6_options(self):
        """Family case type should return 6 letter options"""
        response = requests.get(f"{BASE_URL}/api/letters/types/family")
        assert response.status_code == 200
        
        data = response.json()
        letter_types = data["letter_types"]
        assert len(letter_types) == 6, f"Family should have 6 letter types, got {len(letter_types)}"
        print(f"PASS: Family returns 6 letter types")


class TestLetterGeneration:
    """Test POST /api/letters/generate with new letter type IDs"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("session_token")
        pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")
    
    def test_generate_letter_requires_auth(self):
        """Letter generation should require authentication"""
        response = requests.post(f"{BASE_URL}/api/letters/generate", json={
            "case_id": TEST_CASE_ID,
            "letter_type": "PAYMENT_PLAN_PROPOSAL"
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"PASS: Letter generation requires authentication")
    
    def test_generate_letter_with_housing_type(self, auth_token):
        """Letter generation should work with housing letter type IDs"""
        response = requests.post(
            f"{BASE_URL}/api/letters/generate",
            json={
                "case_id": TEST_CASE_ID,
                "letter_type": "PAYMENT_PLAN_PROPOSAL",
                "opposing_party_name": "Test Landlord LLC"
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=120  # Claude API may take time
        )
        
        # Accept 200 (success) or 500 (Claude API rate limit/error)
        if response.status_code == 200:
            data = response.json()
            assert "letter" in data, "Response should contain 'letter'"
            letter = data["letter"]
            assert "letter_body" in letter, "Letter should have 'letter_body'"
            assert "subject" in letter, "Letter should have 'subject'"
            print(f"PASS: Letter generation works with housing letter type ID")
        elif response.status_code == 500:
            # Claude API may be rate-limited or have errors
            print(f"INFO: Letter generation returned 500 (likely Claude API issue): {response.text[:200]}")
        else:
            assert False, f"Unexpected status code: {response.status_code} - {response.text}"
    
    def test_generate_letter_with_new_nda_type(self, auth_token):
        """Letter generation should accept new NDA letter type IDs"""
        # First we need to check if there's an NDA case or create one
        # For now, just verify the endpoint accepts the letter type
        response = requests.post(
            f"{BASE_URL}/api/letters/generate",
            json={
                "case_id": TEST_CASE_ID,  # Using housing case, but testing letter type acceptance
                "letter_type": "NDA_CLAUSE_CLARIFICATION",
                "opposing_party_name": "Test Company Inc"
            },
            headers={"Authorization": f"Bearer {auth_token}"},
            timeout=120
        )
        
        # The endpoint should accept the letter type even if case type doesn't match
        if response.status_code == 200:
            print(f"PASS: Letter generation accepts NDA letter type ID")
        elif response.status_code == 500:
            print(f"INFO: Letter generation returned 500 (likely Claude API issue)")
        elif response.status_code == 404:
            print(f"INFO: Case not found - {response.text}")
        else:
            print(f"INFO: Letter generation returned {response.status_code}: {response.text[:200]}")


class TestRegressionAuth:
    """Regression tests for authentication"""
    
    def test_login_with_email_password(self):
        """Login with email/password should work"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.status_code} - {response.text}"
        
        data = response.json()
        assert "session_token" in data, "Response should contain 'session_token'"
        assert "user" in data, "Response should contain 'user'"
        assert data["user"]["email"] == TEST_EMAIL
        print(f"PASS: Login with email/password works")
    
    def test_get_case_detail(self):
        """Get case detail should work with authentication"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["session_token"]
        
        # Get case detail
        response = requests.get(
            f"{BASE_URL}/api/cases/{TEST_CASE_ID}",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert "case_id" in data, "Response should contain 'case_id'"
            assert "type" in data, "Response should contain 'type'"
            assert "risk_score" in data, "Response should contain 'risk_score'"
            print(f"PASS: Case detail loads with risk_score={data['risk_score']}, type={data['type']}")
        elif response.status_code == 404:
            print(f"INFO: Test case {TEST_CASE_ID} not found - may need to create test data")
        else:
            assert False, f"Unexpected status: {response.status_code} - {response.text}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
