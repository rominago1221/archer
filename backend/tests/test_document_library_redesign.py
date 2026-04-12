"""
Test Document Library Redesign - James Document Creator API
Tests for /api/documents/james/* endpoints
"""
import pytest
import requests
import os
import time
from tests.conftest import TEST_US_EMAIL, TEST_US_PASSWORD, TEST_BE_EMAIL, TEST_BE_PASSWORD, TEST_ATTORNEY_EMAIL, TEST_ATTORNEY_PASSWORD, US_PRO_USER, BELGIUM_PRO_USER, ATTORNEY_USER

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestJamesDocumentCreator:
    """Tests for James Document Creator API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get session cookie
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_US_EMAIL, "password": TEST_US_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json().get("user", {})
        print(f"Logged in as: {self.user.get('email')}")
    
    def test_james_send_message_creates_conversation(self):
        """Test POST /api/documents/james/send creates new conversation"""
        response = self.session.post(
            f"{BASE_URL}/api/documents/james/send",
            json={"message": "I need a simple NDA for a business partnership"}
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "response" in data, "Missing 'response' field"
        assert "conversation_id" in data, "Missing 'conversation_id' field"
        assert data["conversation_id"].startswith("jdoc_"), f"Invalid conversation_id format: {data['conversation_id']}"
        assert "limit_reached" in data, "Missing 'limit_reached' field"
        assert data["limit_reached"] == False, "Limit should not be reached for pro user"
        
        # Verify James responded with something meaningful
        assert len(data["response"]) > 50, "James response too short"
        print(f"Conversation ID: {data['conversation_id']}")
        print(f"James response preview: {data['response'][:200]}...")
    
    def test_james_send_message_continues_conversation(self):
        """Test POST /api/documents/james/send continues existing conversation"""
        # First message to create conversation
        response1 = self.session.post(
            f"{BASE_URL}/api/documents/james/send",
            json={"message": "I need an employment contract"}
        )
        assert response1.status_code == 200
        conv_id = response1.json()["conversation_id"]
        
        # Wait a bit for AI processing
        time.sleep(2)
        
        # Second message in same conversation
        response2 = self.session.post(
            f"{BASE_URL}/api/documents/james/send",
            json={
                "message": "The employee name is John Smith and the company is Acme Corp",
                "conversation_id": conv_id
            }
        )
        
        assert response2.status_code == 200, f"Failed: {response2.text}"
        data = response2.json()
        
        # Verify same conversation
        assert data["conversation_id"] == conv_id, "Conversation ID should match"
        assert len(data["response"]) > 20, "James should respond"
        print(f"Continued conversation: {conv_id}")
    
    def test_james_recent_documents(self):
        """Test GET /api/documents/james/recent returns recent documents"""
        response = self.session.get(f"{BASE_URL}/api/documents/james/recent")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Should return a list"
        
        # If there are documents, verify structure
        if len(data) > 0:
            doc = data[0]
            assert "doc_id" in doc, "Missing doc_id"
            assert "document_title" in doc, "Missing document_title"
            assert "created_at" in doc, "Missing created_at"
            print(f"Found {len(data)} recent documents")
            for d in data[:3]:
                print(f"  - {d.get('document_title', 'Untitled')}")
        else:
            print("No recent documents found (expected for new user)")
    
    def test_james_conversations_list(self):
        """Test GET /api/documents/james/conversations returns conversation list"""
        response = self.session.get(f"{BASE_URL}/api/documents/james/conversations")
        
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list), "Should return a list"
        
        if len(data) > 0:
            conv = data[0]
            assert "conversation_id" in conv, "Missing conversation_id"
            assert "user_id" in conv, "Missing user_id"
            assert "created_at" in conv, "Missing created_at"
            print(f"Found {len(data)} conversations")
        else:
            print("No conversations found")
    
    def test_james_conversation_messages(self):
        """Test GET /api/documents/james/conversations/{id}/messages returns messages"""
        # First create a conversation
        create_response = self.session.post(
            f"{BASE_URL}/api/documents/james/send",
            json={"message": "I need a lease agreement for a residential property"}
        )
        assert create_response.status_code == 200
        conv_id = create_response.json()["conversation_id"]
        
        # Wait for processing
        time.sleep(1)
        
        # Get messages for this conversation
        response = self.session.get(
            f"{BASE_URL}/api/documents/james/conversations/{conv_id}/messages"
        )
        
        assert response.status_code == 200, f"Failed: {response.text}"
        messages = response.json()
        
        # Should have at least 2 messages (user + assistant)
        assert isinstance(messages, list), "Should return a list"
        assert len(messages) >= 2, f"Should have at least 2 messages, got {len(messages)}"
        
        # Verify message structure
        user_msg = next((m for m in messages if m.get("role") == "user"), None)
        assistant_msg = next((m for m in messages if m.get("role") == "assistant"), None)
        
        assert user_msg is not None, "Should have user message"
        assert assistant_msg is not None, "Should have assistant message"
        assert "content" in user_msg, "User message should have content"
        assert "content" in assistant_msg, "Assistant message should have content"
        
        print(f"Conversation {conv_id} has {len(messages)} messages")
    
    def test_james_conversation_not_found(self):
        """Test GET /api/documents/james/conversations/{id}/messages returns 404 for invalid ID"""
        response = self.session.get(
            f"{BASE_URL}/api/documents/james/conversations/invalid_conv_id_12345/messages"
        )
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
    
    def test_james_send_requires_auth(self):
        """Test POST /api/documents/james/send requires authentication"""
        # Create new session without auth
        unauth_session = requests.Session()
        unauth_session.headers.update({"Content-Type": "application/json"})
        
        response = unauth_session.post(
            f"{BASE_URL}/api/documents/james/send",
            json={"message": "Test message"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
    
    def test_james_recent_requires_auth(self):
        """Test GET /api/documents/james/recent requires authentication"""
        unauth_session = requests.Session()
        
        response = unauth_session.get(f"{BASE_URL}/api/documents/james/recent")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test /api/health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
