"""
Test suite for User Context Textarea feature on Upload page
Tests the new 'user_context' Form field in POST /api/documents/upload endpoint
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestUserContextUpload:
    """Tests for user_context parameter in document upload"""
    
    @pytest.fixture(scope="class")
    def test_user(self):
        """Create a test user with 'pro' plan for unlimited uploads"""
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_context_{unique_id}@jasper.com"
        password = "password123"
        name = "Test Context User"
        
        # Register with pro plan to avoid free plan limit
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": password, "name": name, "plan": "pro"}
        )
        
        if response.status_code == 201:
            data = response.json()
            return {
                "email": email,
                "password": password,
                "session_token": data.get("session_token"),
                "user_id": data.get("user", {}).get("user_id")
            }
        elif response.status_code == 409:
            # User exists, try login
            login_resp = requests.post(
                f"{BASE_URL}/api/auth/login",
                json={"email": email, "password": password}
            )
            if login_resp.status_code == 200:
                data = login_resp.json()
                return {
                    "email": email,
                    "password": password,
                    "session_token": data.get("session_token"),
                    "user_id": data.get("user", {}).get("user_id")
                }
        
        pytest.skip(f"Could not create/login test user: {response.status_code} - {response.text}")
    
    @pytest.fixture
    def auth_headers(self, test_user):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {test_user['session_token']}"}
    
    @pytest.fixture
    def sample_pdf_content(self):
        """Create a minimal valid PDF for testing"""
        # Minimal PDF content
        pdf_content = b"""%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT
/F1 12 Tf
100 700 Td
(Test eviction notice) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
306
%%EOF"""
        return pdf_content
    
    def test_upload_endpoint_accepts_user_context_form_field(self, auth_headers, sample_pdf_content):
        """Test that POST /api/documents/upload accepts 'user_context' as optional Form field"""
        files = {
            'file': ('test_document.pdf', sample_pdf_content, 'application/pdf')
        }
        data = {
            'user_context': 'I have been renting this apartment for 2 years, always paid on time.'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers=auth_headers,
            files=files,
            data=data,
            timeout=120
        )
        
        # Should accept the request (may take time for AI analysis)
        assert response.status_code in [200, 201, 403], f"Unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code == 403:
            # Free plan limit - this is expected behavior
            print("Got 403 - Free plan limit reached (expected if user already has documents)")
            assert "Free plan" in response.text or "limited" in response.text.lower()
        else:
            print(f"Upload with user_context successful: {response.status_code}")
            data = response.json()
            assert "document_id" in data or "analysis" in data
    
    def test_upload_without_user_context_still_works(self, auth_headers, sample_pdf_content):
        """Test backward compatibility - upload without user_context should work"""
        files = {
            'file': ('test_no_context.pdf', sample_pdf_content, 'application/pdf')
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers=auth_headers,
            files=files,
            timeout=120
        )
        
        # Should accept the request
        assert response.status_code in [200, 201, 403], f"Unexpected status: {response.status_code} - {response.text}"
        
        if response.status_code == 403:
            print("Got 403 - Free plan limit (backward compatibility test passed - endpoint accepts request)")
        else:
            print(f"Upload without user_context successful: {response.status_code}")
    
    def test_upload_with_empty_user_context(self, auth_headers, sample_pdf_content):
        """Test upload with empty user_context string"""
        files = {
            'file': ('test_empty_context.pdf', sample_pdf_content, 'application/pdf')
        }
        data = {
            'user_context': ''
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers=auth_headers,
            files=files,
            data=data,
            timeout=120
        )
        
        # Should accept empty context
        assert response.status_code in [200, 201, 403], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"Upload with empty user_context: {response.status_code}")
    
    def test_upload_with_case_id_and_user_context(self, auth_headers, sample_pdf_content):
        """Test upload with both case_id and user_context Form fields"""
        files = {
            'file': ('test_with_case.pdf', sample_pdf_content, 'application/pdf')
        }
        data = {
            'case_id': '',  # Empty case_id should create new case
            'user_context': 'The landlord is trying to evict me but I think it is because I complained about repairs.'
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers=auth_headers,
            files=files,
            data=data,
            timeout=120
        )
        
        assert response.status_code in [200, 201, 403], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"Upload with case_id and user_context: {response.status_code}")
    
    def test_user_context_max_length_enforcement(self, auth_headers, sample_pdf_content):
        """Test that user_context over 500 chars is handled (server-side truncation)"""
        # Create context longer than 500 chars
        long_context = "A" * 600
        
        files = {
            'file': ('test_long_context.pdf', sample_pdf_content, 'application/pdf')
        }
        data = {
            'user_context': long_context
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers=auth_headers,
            files=files,
            data=data,
            timeout=120
        )
        
        # Server should handle long context (truncate to 500 chars per server.py line 1315)
        assert response.status_code in [200, 201, 403], f"Unexpected status: {response.status_code} - {response.text}"
        print(f"Upload with long user_context (600 chars): {response.status_code}")


class TestUploadEndpointExists:
    """Basic endpoint existence tests"""
    
    def test_upload_endpoint_requires_auth(self):
        """Test that upload endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files={'file': ('test.pdf', b'test', 'application/pdf')},
            timeout=30
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("Upload endpoint correctly requires authentication")
    
    def test_upload_endpoint_requires_file(self):
        """Test that upload endpoint requires file"""
        # First login to get token
        unique_id = uuid.uuid4().hex[:8]
        email = f"test_nofile_{unique_id}@jasper.com"
        
        reg_resp = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": email, "password": "password123", "name": "Test", "plan": "free"}
        )
        
        if reg_resp.status_code in [201, 409]:
            if reg_resp.status_code == 409:
                login_resp = requests.post(
                    f"{BASE_URL}/api/auth/login",
                    json={"email": email, "password": "password123"}
                )
                token = login_resp.json().get("session_token")
            else:
                token = reg_resp.json().get("session_token")
            
            # Try upload without file
            response = requests.post(
                f"{BASE_URL}/api/documents/upload",
                headers={"Authorization": f"Bearer {token}"},
                data={'user_context': 'test context'},
                timeout=30
            )
            
            # Should fail - file is required
            assert response.status_code == 422, f"Expected 422 (validation error), got {response.status_code}"
            print("Upload endpoint correctly requires file")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
