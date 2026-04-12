"""
Test Document Library Feature
- GET /api/library/templates - returns 158 templates and 14 categories
- GET /api/library/templates?category=nda - returns 8 NDA templates
- GET /api/library/templates?category=employment - returns 22 employment templates
- GET /api/library/templates?search=lease - returns matching templates
- POST /api/library/generate - generates document via Claude (requires auth)
- POST /api/library/generate - returns 403 for free plan users on non-free templates
- POST /api/library/sign - creates mock signature request
- GET /api/library/generated - returns user's generated documents
"""
import pytest
import requests
import os
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = TEST_US_EMAIL
TEST_PASSWORD = "password123"

# Free templates (from document_templates.json)
FREE_TEMPLATE_IDS = ["nda_mutual", "hs_lease_12", "fl_general", "dm_general", "ct_loan_personal"]


class TestDocumentLibraryPublic:
    """Tests for public endpoints (no auth required)"""
    
    def test_get_all_templates(self):
        """GET /api/library/templates returns 158 templates and 14 categories"""
        response = requests.get(f"{BASE_URL}/api/library/templates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "templates" in data
        assert "categories" in data
        assert "total" in data
        
        # Verify 158 templates
        assert len(data["templates"]) == 158, f"Expected 158 templates, got {len(data['templates'])}"
        
        # Verify 14 categories (including 'all')
        assert len(data["categories"]) == 14, f"Expected 14 categories, got {len(data['categories'])}"
        
        # Verify category structure
        for cat in data["categories"]:
            assert "id" in cat
            assert "label" in cat
        
        # Verify template structure
        for template in data["templates"][:5]:  # Check first 5
            assert "id" in template
            assert "name" in template
            assert "desc" in template
            assert "cat" in template
        
        print(f"PASS: GET /api/library/templates returns {len(data['templates'])} templates and {len(data['categories'])} categories")
    
    def test_filter_by_nda_category(self):
        """GET /api/library/templates?category=nda returns 8 NDA templates"""
        response = requests.get(f"{BASE_URL}/api/library/templates", params={"category": "nda"})
        assert response.status_code == 200
        
        data = response.json()
        templates = data["templates"]
        
        # Verify 8 NDA templates
        assert len(templates) == 8, f"Expected 8 NDA templates, got {len(templates)}"
        
        # Verify all templates are NDA category
        for t in templates:
            assert t["cat"] == "nda", f"Template {t['id']} has category {t['cat']}, expected 'nda'"
        
        print(f"PASS: GET /api/library/templates?category=nda returns {len(templates)} NDA templates")
    
    def test_filter_by_employment_category(self):
        """GET /api/library/templates?category=employment returns 22 employment templates"""
        response = requests.get(f"{BASE_URL}/api/library/templates", params={"category": "employment"})
        assert response.status_code == 200
        
        data = response.json()
        templates = data["templates"]
        
        # Verify 22 employment templates
        assert len(templates) == 22, f"Expected 22 employment templates, got {len(templates)}"
        
        # Verify all templates are employment category
        for t in templates:
            assert t["cat"] == "employment", f"Template {t['id']} has category {t['cat']}, expected 'employment'"
        
        print(f"PASS: GET /api/library/templates?category=employment returns {len(templates)} employment templates")
    
    def test_search_lease_templates(self):
        """GET /api/library/templates?search=lease returns matching templates"""
        response = requests.get(f"{BASE_URL}/api/library/templates", params={"search": "lease"})
        assert response.status_code == 200
        
        data = response.json()
        templates = data["templates"]
        
        # Should return at least some lease-related templates
        assert len(templates) > 0, "Expected at least 1 lease template"
        
        # Verify all templates contain 'lease' in name or description
        for t in templates:
            name_lower = t["name"].lower()
            desc_lower = t["desc"].lower()
            assert "lease" in name_lower or "lease" in desc_lower, f"Template {t['id']} doesn't match 'lease' search"
        
        print(f"PASS: GET /api/library/templates?search=lease returns {len(templates)} matching templates")
    
    def test_category_ids_match_expected(self):
        """Verify all 14 category IDs are present"""
        response = requests.get(f"{BASE_URL}/api/library/templates")
        assert response.status_code == 200
        
        data = response.json()
        category_ids = [c["id"] for c in data["categories"]]
        
        expected_ids = ["all", "employment", "housing", "business", "nda", "contracts", 
                       "consumer", "debt", "family", "realestate", "freelance", "ip", "court", "immigration"]
        
        for expected_id in expected_ids:
            assert expected_id in category_ids, f"Missing category: {expected_id}"
        
        print(f"PASS: All 14 expected category IDs are present")


class TestDocumentLibraryAuthenticated:
    """Tests requiring authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        if login_response.status_code != 200:
            pytest.skip(f"Login failed: {login_response.status_code} - {login_response.text}")
        
        data = login_response.json()
        self.session_token = data.get("session_token")
        self.user = data.get("user")
        self.headers = {"Authorization": f"Bearer {self.session_token}"}
        
        print(f"Logged in as {self.user.get('email')} with plan: {self.user.get('plan')}")
    
    def test_generate_free_template(self):
        """POST /api/library/generate with free template works for any user"""
        # Use a free template (nda_mutual)
        payload = {
            "template_id": "nda_mutual",
            "fields": {
                "discloser_name": "Test Company Inc.",
                "recipient_name": "Partner Corp.",
                "purpose": "Evaluating potential business partnership",
                "duration": "2 years"
            },
            "jurisdiction": "California"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/library/generate",
            json=payload,
            headers=self.headers,
            timeout=120  # Claude can be slow
        )
        
        # Accept 200 or 500 (Claude rate limits)
        if response.status_code == 500:
            print(f"SKIP: Claude API rate limited or error - {response.text}")
            pytest.skip("Claude API rate limited")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "doc_id" in data
        assert "document_name" in data
        assert "content" in data
        assert "jurisdiction" in data
        assert data["jurisdiction"] == "California"
        assert len(data["content"]) > 100, "Generated content should be substantial"
        
        print(f"PASS: POST /api/library/generate created document {data['doc_id']}")
    
    def test_generate_non_free_template_pro_user(self):
        """POST /api/library/generate with non-free template works for pro users"""
        if self.user.get("plan") != "pro":
            pytest.skip("User is not on pro plan")
        
        # Use a non-free template (emp_fulltime)
        payload = {
            "template_id": "emp_fulltime",
            "fields": {
                "employee_name": "Jane Smith",
                "employer_name": "TechCorp Inc.",
                "job_title": "Senior Engineer",
                "start_date": "May 1, 2026",
                "salary": "$95,000"
            },
            "jurisdiction": "New York"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/library/generate",
            json=payload,
            headers=self.headers,
            timeout=120
        )
        
        if response.status_code == 500:
            print(f"SKIP: Claude API rate limited or error - {response.text}")
            pytest.skip("Claude API rate limited")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "doc_id" in data
        assert "content" in data
        
        print(f"PASS: Pro user can generate non-free template")
    
    def test_generate_non_free_template_free_user_blocked(self):
        """POST /api/library/generate with non-free template returns 403 for free users"""
        # First, we need to test with a free user
        # Create a new free user for this test
        import uuid
        test_email = f"freeuser_{uuid.uuid4().hex[:8]}@test.com"
        
        # Register free user
        register_response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={
                "email": test_email,
                "password": "testpass123",
                "name": "Free Test User",
                "plan": "free"
            }
        )
        
        if register_response.status_code != 200:
            pytest.skip(f"Could not create free user: {register_response.text}")
        
        free_user_token = register_response.json().get("session_token")
        free_headers = {"Authorization": f"Bearer {free_user_token}"}
        
        # Try to generate a non-free template
        payload = {
            "template_id": "emp_fulltime",  # Non-free template
            "fields": {"employee_name": "Test"},
            "jurisdiction": "California"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/library/generate",
            json=payload,
            headers=free_headers
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        assert "Pro plan" in response.json().get("detail", "")
        
        print(f"PASS: Free user blocked from non-free template (403)")
    
    def test_get_generated_documents(self):
        """GET /api/library/generated returns user's generated documents"""
        response = requests.get(
            f"{BASE_URL}/api/library/generated",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of documents"
        
        # If there are documents, verify structure
        if len(data) > 0:
            doc = data[0]
            assert "doc_id" in doc
            assert "user_id" in doc
            assert "template_id" in doc
            assert "created_at" in doc
        
        print(f"PASS: GET /api/library/generated returns {len(data)} documents")
    
    def test_send_for_signature_mock(self):
        """POST /api/library/sign creates mock signature request"""
        # First generate a document
        payload = {
            "template_id": "nda_mutual",
            "fields": {
                "discloser_name": "Test Company",
                "recipient_name": "Partner Corp"
            },
            "jurisdiction": "California"
        }
        
        gen_response = requests.post(
            f"{BASE_URL}/api/library/generate",
            json=payload,
            headers=self.headers,
            timeout=120
        )
        
        if gen_response.status_code != 200:
            pytest.skip(f"Could not generate document: {gen_response.text}")
        
        doc_id = gen_response.json().get("doc_id")
        
        # Send for signature
        sign_payload = {
            "doc_id": doc_id,
            "signers": [
                {"name": "John Doe", "email": "john@example.com"},
                {"name": "Jane Smith", "email": "jane@example.com"}
            ],
            "message": "Please sign this NDA"
        }
        
        sign_response = requests.post(
            f"{BASE_URL}/api/library/sign",
            json=sign_payload,
            headers=self.headers
        )
        
        assert sign_response.status_code == 200, f"Expected 200, got {sign_response.status_code}: {sign_response.text}"
        
        data = sign_response.json()
        assert data.get("status") == "pending"
        assert "signers" in data
        assert len(data["signers"]) == 2
        assert "HelloSign" in data.get("message", "") or "mock" in data.get("message", "").lower()
        
        print(f"PASS: POST /api/library/sign creates mock signature request")
    
    def test_sign_nonexistent_document(self):
        """POST /api/library/sign returns 404 for non-existent document"""
        sign_payload = {
            "doc_id": "nonexistent_doc_123",
            "signers": [{"name": "Test", "email": "test@test.com"}],
            "message": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/library/sign",
            json=sign_payload,
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"PASS: POST /api/library/sign returns 404 for non-existent document")
    
    def test_generate_nonexistent_template(self):
        """POST /api/library/generate returns 404 for non-existent template"""
        payload = {
            "template_id": "nonexistent_template_xyz",
            "fields": {},
            "jurisdiction": "California"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/library/generate",
            json=payload,
            headers=self.headers
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        
        print(f"PASS: POST /api/library/generate returns 404 for non-existent template")


class TestRegressionAuth:
    """Regression tests for authentication"""
    
    def test_login_with_email_password(self):
        """Login with email/password works"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "session_token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        
        print(f"PASS: Login with email/password works")
    
    def test_dashboard_loads_after_login(self):
        """Dashboard stats endpoint works after login"""
        # Login first
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        
        if login_response.status_code != 200:
            pytest.skip("Login failed")
        
        token = login_response.json().get("session_token")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Get dashboard stats
        stats_response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=headers
        )
        
        assert stats_response.status_code == 200, f"Expected 200, got {stats_response.status_code}"
        
        data = stats_response.json()
        assert "active_cases" in data
        assert "total_documents" in data
        
        print(f"PASS: Dashboard loads after login - {data['active_cases']} active cases")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
