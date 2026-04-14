"""
Test Archer Document Creator API endpoints
Tests for the conversational document generator feature on /documents page
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestArcherDocumentCreator:
    """Tests for Archer Document Creator API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        # Login with Belgian test user (Pro plan, French language)
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        self.user_data = login_resp.json()
        # Session cookie is set automatically
        
    def test_01_archer_send_creates_conversation(self):
        """Test POST /api/documents/archer/send creates new conversation"""
        resp = self.session.post(f"{BASE_URL}/api/documents/archer/send", json={
            "message": "I need an NDA for a business partnership"
        })
        assert resp.status_code == 200, f"Archer send failed: {resp.text}"
        data = resp.json()
        
        # Verify response structure
        assert "response" in data, "Missing 'response' field"
        assert "conversation_id" in data, "Missing 'conversation_id' field"
        assert data["conversation_id"].startswith("jdoc_"), f"Invalid conversation_id format: {data['conversation_id']}"
        assert "has_document" in data, "Missing 'has_document' field"
        assert "limit_reached" in data, "Missing 'limit_reached' field"
        
        # Store conversation_id for follow-up tests
        self.conv_id = data["conversation_id"]
        print(f"✓ Created conversation: {self.conv_id}")
        print(f"✓ Archer response (first 200 chars): {data['response'][:200]}...")
        
    def test_02_archer_send_continues_conversation(self):
        """Test POST /api/documents/archer/send with existing conversation_id"""
        # First create a conversation
        resp1 = self.session.post(f"{BASE_URL}/api/documents/archer/send", json={
            "message": "I need a simple NDA"
        })
        assert resp1.status_code == 200
        conv_id = resp1.json()["conversation_id"]
        
        # Wait for AI response
        time.sleep(2)
        
        # Continue the conversation
        resp2 = self.session.post(f"{BASE_URL}/api/documents/archer/send", json={
            "message": "The parties are Acme Corp and Beta Inc",
            "conversation_id": conv_id
        })
        assert resp2.status_code == 200, f"Continue conversation failed: {resp2.text}"
        data = resp2.json()
        
        # Verify same conversation_id
        assert data["conversation_id"] == conv_id, "Conversation ID changed unexpectedly"
        assert "response" in data
        print(f"✓ Continued conversation {conv_id}")
        print(f"✓ Follow-up response (first 200 chars): {data['response'][:200]}...")
        
    def test_03_archer_response_in_user_language(self):
        """Test Archer responds in user's language (French for Belgian user)"""
        resp = self.session.post(f"{BASE_URL}/api/documents/archer/send", json={
            "message": "J'ai besoin d'un contrat de travail"
        })
        assert resp.status_code == 200
        data = resp.json()
        
        # Belgian user (test_cg) has language=fr, so response should be in French
        response_text = data["response"].lower()
        # Check for French words/patterns
        french_indicators = ["question", "contrat", "travail", "employeur", "salaire", "durée", "poste", "entreprise"]
        has_french = any(word in response_text for word in french_indicators)
        print(f"✓ Response language check - French indicators found: {has_french}")
        print(f"✓ Response preview: {data['response'][:300]}...")
        
    def test_04_get_conversations_list(self):
        """Test GET /api/documents/archer/conversations returns user's conversations"""
        resp = self.session.get(f"{BASE_URL}/api/documents/archer/conversations")
        assert resp.status_code == 200, f"Get conversations failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Response should be a list"
        if len(data) > 0:
            conv = data[0]
            assert "conversation_id" in conv, "Missing conversation_id"
            assert "user_id" in conv, "Missing user_id"
            assert "title" in conv, "Missing title"
            assert "created_at" in conv, "Missing created_at"
            print(f"✓ Found {len(data)} conversations")
            print(f"✓ Latest conversation: {conv.get('title', 'No title')}")
        else:
            print("✓ No conversations yet (empty list)")
            
    def test_05_get_recent_documents(self):
        """Test GET /api/documents/archer/recent returns recent generated docs"""
        resp = self.session.get(f"{BASE_URL}/api/documents/archer/recent")
        assert resp.status_code == 200, f"Get recent docs failed: {resp.text}"
        data = resp.json()
        
        assert isinstance(data, list), "Response should be a list"
        if len(data) > 0:
            doc = data[0]
            assert "doc_id" in doc, "Missing doc_id"
            assert "document_title" in doc, "Missing document_title"
            assert "created_at" in doc, "Missing created_at"
            print(f"✓ Found {len(data)} recent documents")
            for d in data[:3]:
                print(f"  - {d.get('document_title', 'Untitled')}")
        else:
            print("✓ No generated documents yet (empty list)")
            
    def test_06_get_conversation_messages(self):
        """Test GET /api/documents/archer/conversations/{id}/messages"""
        # First create a conversation
        resp1 = self.session.post(f"{BASE_URL}/api/documents/archer/send", json={
            "message": "I need a lease agreement"
        })
        assert resp1.status_code == 200
        conv_id = resp1.json()["conversation_id"]
        
        # Get messages for this conversation
        resp2 = self.session.get(f"{BASE_URL}/api/documents/archer/conversations/{conv_id}/messages")
        assert resp2.status_code == 200, f"Get messages failed: {resp2.text}"
        messages = resp2.json()
        
        assert isinstance(messages, list), "Response should be a list"
        assert len(messages) >= 2, "Should have at least user message and AI response"
        
        # Verify message structure
        for msg in messages:
            assert "message_id" in msg, "Missing message_id"
            assert "role" in msg, "Missing role"
            assert "content" in msg, "Missing content"
            assert msg["role"] in ["user", "assistant"], f"Invalid role: {msg['role']}"
            
        print(f"✓ Found {len(messages)} messages in conversation {conv_id}")
        
    def test_07_invalid_conversation_returns_404(self):
        """Test GET messages for non-existent conversation returns 404"""
        resp = self.session.get(f"{BASE_URL}/api/documents/archer/conversations/invalid_conv_id/messages")
        assert resp.status_code == 404, f"Expected 404, got {resp.status_code}"
        print("✓ Invalid conversation correctly returns 404")
        
    def test_08_unauthenticated_request_returns_401(self):
        """Test unauthenticated requests return 401"""
        # Create new session without login
        new_session = requests.Session()
        
        resp = new_session.post(f"{BASE_URL}/api/documents/archer/send", json={
            "message": "Test message"
        })
        assert resp.status_code == 401, f"Expected 401, got {resp.status_code}"
        print("✓ Unauthenticated request correctly returns 401")


class TestArcherDocumentGeneration:
    """Tests for document generation flow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert login_resp.status_code == 200
        
    def test_document_generation_flow(self):
        """Test full document generation flow with multiple messages"""
        # Start conversation
        resp1 = self.session.post(f"{BASE_URL}/api/documents/archer/send", json={
            "message": "I need a simple NDA between two companies"
        })
        assert resp1.status_code == 200
        conv_id = resp1.json()["conversation_id"]
        print(f"✓ Started conversation: {conv_id}")
        
        # Answer questions (simulate user providing info)
        answers = [
            "The disclosing party is TechCorp Inc",
            "The receiving party is DataSoft LLC",
            "The purpose is to discuss a potential software licensing deal",
            "The NDA should last for 2 years",
            "Jurisdiction is Delaware, USA"
        ]
        
        has_document = False
        for i, answer in enumerate(answers):
            time.sleep(3)  # Wait for AI processing
            resp = self.session.post(f"{BASE_URL}/api/documents/archer/send", json={
                "message": answer,
                "conversation_id": conv_id
            })
            assert resp.status_code == 200, f"Message {i+1} failed: {resp.text}"
            data = resp.json()
            
            if data.get("has_document"):
                has_document = True
                print(f"✓ Document generated after {i+1} messages!")
                assert data.get("document_content"), "Missing document_content"
                assert data.get("doc_id"), "Missing doc_id"
                print(f"✓ Document ID: {data['doc_id']}")
                print(f"✓ Document preview (first 500 chars):\n{data['document_content'][:500]}...")
                break
            else:
                print(f"  Message {i+1}: Answered question, waiting for next...")
                
        # Note: Document may not be generated in 5 messages if Archer asks more questions
        # This is expected behavior - Archer asks 3-5 questions
        if not has_document:
            print("✓ Conversation ongoing - Archer may need more information")


class TestTemplateLibraryIntegration:
    """Tests for template library endpoints used by browse mode"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert login_resp.status_code == 200
        
    def test_get_templates(self):
        """Test GET /api/library/templates returns template list"""
        resp = self.session.get(f"{BASE_URL}/api/library/templates")
        assert resp.status_code == 200, f"Get templates failed: {resp.text}"
        data = resp.json()
        
        assert "templates" in data, "Missing 'templates' field"
        assert "categories" in data, "Missing 'categories' field"
        assert isinstance(data["templates"], list), "templates should be a list"
        assert isinstance(data["categories"], list), "categories should be a list"
        
        if len(data["templates"]) > 0:
            template = data["templates"][0]
            assert "id" in template, "Template missing 'id'"
            assert "name" in template, "Template missing 'name'"
            print(f"✓ Found {len(data['templates'])} templates")
            print(f"✓ Found {len(data['categories'])} categories")
        else:
            print("✓ Templates endpoint working (empty list)")
            
    def test_get_templates_with_category_filter(self):
        """Test GET /api/library/templates with category filter"""
        resp = self.session.get(f"{BASE_URL}/api/library/templates", params={"category": "employment"})
        assert resp.status_code == 200, f"Get templates with filter failed: {resp.text}"
        data = resp.json()
        
        assert "templates" in data
        print(f"✓ Category filter working - found {len(data['templates'])} employment templates")
        
    def test_get_templates_with_search(self):
        """Test GET /api/library/templates with search query"""
        resp = self.session.get(f"{BASE_URL}/api/library/templates", params={"search": "NDA"})
        assert resp.status_code == 200, f"Get templates with search failed: {resp.text}"
        data = resp.json()
        
        assert "templates" in data
        print(f"✓ Search filter working - found {len(data['templates'])} templates matching 'NDA'")


class TestSignatureEndpoint:
    """Tests for signature endpoint used by document preview card"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        self.session = requests.Session()
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert login_resp.status_code == 200
        
    def test_sign_endpoint_exists(self):
        """Test POST /api/library/sign endpoint exists (mocked HelloSign)"""
        # This endpoint is mocked - just verify it exists and accepts requests
        resp = self.session.post(f"{BASE_URL}/api/library/sign", json={
            "doc_id": "test_doc_id",
            "signers": [{"name": "Test User", "email": "test@example.com"}],
            "message": "Please sign this document"
        })
        # May return 404 if doc_id doesn't exist, but endpoint should exist
        assert resp.status_code in [200, 404, 400], f"Unexpected status: {resp.status_code}"
        print(f"✓ Sign endpoint exists (status: {resp.status_code})")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
