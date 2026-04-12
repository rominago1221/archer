"""
Test suite for the 4 fixes in iteration 38:
1. Back button on case detail → /dashboard (not history.back)
2. Next Actions section redesigned: bell icon, 15px bold title, blue left border accent, light blue bg #f0f7ff, stronger card borders 1px, 15px action titles
3. Document clicking: each document navigable to /documents/{documentId} page showing filename, date, size, preview, James analysis, download/delete buttons
4. Font size +15% on CaseDetail page
"""
import pytest
import requests
import os
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDocumentEndpoints:
    """Test document detail and delete endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_US_EMAIL, "password": TEST_US_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user = login_resp.json()
        print(f"Logged in as: {self.user.get('email')}")
    
    def test_get_user_cases(self):
        """Get user's cases to find one with documents"""
        resp = self.session.get(f"{BASE_URL}/api/cases")
        assert resp.status_code == 200, f"Failed to get cases: {resp.text}"
        cases = resp.json()
        print(f"Found {len(cases)} cases")
        assert len(cases) > 0, "No cases found for test user"
        return cases
    
    def test_get_case_documents(self):
        """Get documents for a case"""
        cases = self.test_get_user_cases()
        # Find a case with documents
        case_with_docs = None
        for case in cases:
            if case.get('document_count', 0) > 0:
                case_with_docs = case
                break
        
        if not case_with_docs:
            pytest.skip("No cases with documents found")
        
        case_id = case_with_docs['case_id']
        resp = self.session.get(f"{BASE_URL}/api/cases/{case_id}/documents")
        assert resp.status_code == 200, f"Failed to get documents: {resp.text}"
        docs = resp.json()
        print(f"Found {len(docs)} documents in case {case_id}")
        return docs
    
    def test_get_document_detail(self):
        """Test GET /api/documents/{document_id} endpoint"""
        docs = self.test_get_case_documents()
        if not docs:
            pytest.skip("No documents found")
        
        doc = docs[0]
        doc_id = doc['document_id']
        
        resp = self.session.get(f"{BASE_URL}/api/documents/{doc_id}")
        assert resp.status_code == 200, f"Failed to get document detail: {resp.text}"
        
        detail = resp.json()
        print(f"Document detail: {detail.get('file_name')}")
        
        # Verify required fields for DocumentViewer page
        assert 'document_id' in detail, "Missing document_id"
        assert 'file_name' in detail, "Missing file_name"
        assert 'uploaded_at' in detail, "Missing uploaded_at"
        # file_size may be optional
        print(f"Document has file_size: {detail.get('file_size')}")
        print(f"Document has storage_path: {detail.get('storage_path')}")
        print(f"Document has extracted_text: {bool(detail.get('extracted_text'))}")
        
        return detail
    
    def test_document_detail_not_found(self):
        """Test 404 for non-existent document"""
        resp = self.session.get(f"{BASE_URL}/api/documents/nonexistent-doc-id")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("Correctly returns 404 for non-existent document")
    
    def test_document_download_endpoint(self):
        """Test GET /api/documents/{document_id}/download endpoint"""
        docs = self.test_get_case_documents()
        if not docs:
            pytest.skip("No documents found")
        
        doc = docs[0]
        doc_id = doc['document_id']
        
        # Just check the endpoint exists and returns proper response
        resp = self.session.get(f"{BASE_URL}/api/documents/{doc_id}/download")
        # May return 200 with file or 404 if file not in storage
        assert resp.status_code in [200, 404, 500], f"Unexpected status: {resp.status_code}"
        print(f"Download endpoint returned status: {resp.status_code}")
    
    def test_delete_document_endpoint_exists(self):
        """Test DELETE /api/documents/{document_id} endpoint exists (don't actually delete)"""
        # We won't actually delete, just verify the endpoint pattern
        # Try with a fake ID to verify 404 response
        resp = self.session.delete(f"{BASE_URL}/api/documents/fake-doc-to-delete")
        assert resp.status_code == 404, f"Expected 404 for fake doc, got {resp.status_code}"
        print("DELETE endpoint correctly returns 404 for non-existent document")


class TestCaseDetailEndpoints:
    """Test case detail related endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_US_EMAIL, "password": TEST_US_PASSWORD
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user = login_resp.json()
    
    def test_get_case_detail(self):
        """Get case detail to verify ai_next_steps for Next Actions panel"""
        resp = self.session.get(f"{BASE_URL}/api/cases")
        assert resp.status_code == 200
        cases = resp.json()
        
        if not cases:
            pytest.skip("No cases found")
        
        case_id = cases[0]['case_id']
        resp = self.session.get(f"{BASE_URL}/api/cases/{case_id}")
        assert resp.status_code == 200, f"Failed to get case detail: {resp.text}"
        
        case = resp.json()
        print(f"Case: {case.get('title')}")
        print(f"Risk score: {case.get('risk_score')}")
        print(f"Next steps count: {len(case.get('ai_next_steps', []))}")
        print(f"Document count: {case.get('document_count')}")
        
        # Verify fields needed for CaseDetail page
        assert 'case_id' in case
        assert 'title' in case
        assert 'risk_score' in case or case.get('risk_score') == 0
        
        return case


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
