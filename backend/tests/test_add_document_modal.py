"""
Test AddDocumentModal Backend Integration
Tests the POST /api/documents/upload endpoint with case_id and user_context fields
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAddDocumentUploadEndpoint:
    """Tests for POST /api/documents/upload with case_id and user_context"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        # Login to get session
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@jasper.legal", "password": "JasperPro2026!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user_data = login_response.json()
        print(f"Logged in as: {self.user_data.get('email')}")
        
        # Get existing cases to find a case_id
        cases_response = self.session.get(f"{BASE_URL}/api/cases")
        assert cases_response.status_code == 200, f"Failed to get cases: {cases_response.text}"
        self.cases = cases_response.json()
        print(f"Found {len(self.cases)} cases")
        
        # Get a completed case (not analyzing)
        self.test_case = None
        for case in self.cases:
            if case.get('status') != 'analyzing':
                self.test_case = case
                break
        
        if self.test_case:
            print(f"Using case: {self.test_case.get('case_id')} - {self.test_case.get('title')}")
    
    def test_upload_endpoint_accepts_case_id_form_field(self):
        """Test that /api/documents/upload accepts case_id as Form field"""
        if not self.test_case:
            pytest.skip("No completed case available for testing")
        
        # Create a simple test file
        test_content = b"This is a test document for AddDocumentModal testing."
        files = {'file': ('test_document.txt', test_content, 'text/plain')}
        data = {
            'case_id': self.test_case['case_id'],
            'user_context': 'This is a test context for James analysis.'
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data
        )
        
        print(f"Upload response status: {response.status_code}")
        print(f"Upload response: {response.text[:500] if response.text else 'No response body'}")
        
        # Should return 200 or 201 for successful upload
        assert response.status_code in [200, 201], f"Upload failed: {response.status_code} - {response.text}"
        
        result = response.json()
        # Verify the document was linked to the existing case
        assert 'document_id' in result or 'case_id' in result, "Response should contain document_id or case_id"
        print(f"SUCCESS: Document uploaded and linked to case {self.test_case['case_id']}")
    
    def test_upload_endpoint_accepts_user_context_form_field(self):
        """Test that /api/documents/upload accepts user_context as Form field"""
        if not self.test_case:
            pytest.skip("No completed case available for testing")
        
        # Create a simple test file
        test_content = b"This is another test document with user context."
        files = {'file': ('test_with_context.txt', test_content, 'text/plain')}
        
        # Test with user_context (500 chars max)
        user_context = "This is the landlord's response to my dispute letter. They added new claims about an unauthorized pet that I never had."
        
        data = {
            'case_id': self.test_case['case_id'],
            'user_context': user_context
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data
        )
        
        print(f"Upload with context response status: {response.status_code}")
        
        # Should return 200 or 201 for successful upload
        assert response.status_code in [200, 201], f"Upload with context failed: {response.status_code} - {response.text}"
        print("SUCCESS: Document uploaded with user_context field")
    
    def test_upload_endpoint_multipart_form_data(self):
        """Test that /api/documents/upload accepts multipart/form-data"""
        if not self.test_case:
            pytest.skip("No completed case available for testing")
        
        # Create a simple PDF-like test file
        test_content = b"%PDF-1.4 test content for multipart form data testing"
        files = {'file': ('test_multipart.pdf', test_content, 'application/pdf')}
        data = {
            'case_id': self.test_case['case_id']
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data
        )
        
        print(f"Multipart upload response status: {response.status_code}")
        
        # Should return 200 or 201 for successful upload
        assert response.status_code in [200, 201], f"Multipart upload failed: {response.status_code} - {response.text}"
        print("SUCCESS: Multipart form data upload works")
    
    def test_upload_without_case_id_creates_new_case(self):
        """Test that uploading without case_id creates a new case"""
        # Create a simple test file
        test_content = b"This is a test document that should create a new case."
        files = {'file': ('new_case_test.txt', test_content, 'text/plain')}
        
        # No case_id - should create new case
        response = self.session.post(
            f"{BASE_URL}/api/documents/upload",
            files=files
        )
        
        print(f"Upload without case_id response status: {response.status_code}")
        
        # Should return 200 or 201 for successful upload
        assert response.status_code in [200, 201], f"Upload without case_id failed: {response.status_code} - {response.text}"
        
        result = response.json()
        # Should have created a new case
        assert 'case_id' in result, "Response should contain new case_id"
        print(f"SUCCESS: New case created: {result.get('case_id')}")


class TestUploadEndpointValidation:
    """Tests for upload endpoint validation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "test@jasper.legal", "password": "JasperPro2026!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
    
    def test_upload_requires_authentication(self):
        """Test that upload endpoint requires authentication"""
        # Create new session without login
        new_session = requests.Session()
        
        test_content = b"Test content"
        files = {'file': ('test.txt', test_content, 'text/plain')}
        
        response = new_session.post(
            f"{BASE_URL}/api/documents/upload",
            files=files
        )
        
        # Should return 401 Unauthorized
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("SUCCESS: Upload endpoint requires authentication")
    
    def test_upload_requires_file(self):
        """Test that upload endpoint requires a file"""
        response = self.session.post(
            f"{BASE_URL}/api/documents/upload",
            data={'case_id': 'test_case_id'}
        )
        
        # Should return 422 (validation error) or 400 (bad request)
        assert response.status_code in [400, 422], f"Expected 400/422, got {response.status_code}"
        print("SUCCESS: Upload endpoint requires file")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
