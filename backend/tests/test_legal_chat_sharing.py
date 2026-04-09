"""
Test suite for Legal Chat and Case Sharing features
- Legal Chat: Conversations CRUD, messages, question count, AI responses
- Case Sharing: Share links, revoke, public access, comments
"""
import pytest
import requests
import os
import time
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test data storage
test_data = {
    "session_token": None,
    "user_id": None,
    "case_id": None,
    "conversation_id": None,
    "share_token": None,
    "share_id": None
}


@pytest.fixture(scope="module")
def setup_test_user():
    """Create test user and session via MongoDB"""
    import subprocess
    timestamp = int(time.time() * 1000)
    user_id = f"test-user-chat-{timestamp}"
    session_token = f"test_session_chat_{timestamp}"
    
    # Create user with pro plan for full feature access
    mongo_cmd = f'''
    use('test_database');
    db.users.insertOne({{
      user_id: "{user_id}",
      email: "test.chat.{timestamp}@example.com",
      name: "Test Chat User",
      picture: "https://via.placeholder.com/150",
      plan: "pro",
      state_of_residence: "New York",
      created_at: new Date().toISOString()
    }});
    db.user_sessions.insertOne({{
      user_id: "{user_id}",
      session_token: "{session_token}",
      expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
      created_at: new Date().toISOString()
    }});
    '''
    result = subprocess.run(['mongosh', '--eval', mongo_cmd], capture_output=True, text=True)
    
    test_data["session_token"] = session_token
    test_data["user_id"] = user_id
    
    yield session_token, user_id
    
    # Cleanup
    cleanup_cmd = f'''
    use('test_database');
    db.users.deleteMany({{user_id: "{user_id}"}});
    db.user_sessions.deleteMany({{session_token: "{session_token}"}});
    db.chat_conversations.deleteMany({{user_id: "{user_id}"}});
    db.chat_messages.deleteMany({{}});
    db.shared_cases.deleteMany({{user_id: "{user_id}"}});
    db.shared_case_comments.deleteMany({{}});
    db.cases.deleteMany({{user_id: "{user_id}"}});
    '''
    subprocess.run(['mongosh', '--eval', cleanup_cmd], capture_output=True, text=True)


@pytest.fixture(scope="module")
def api_client(setup_test_user):
    """Create authenticated API client"""
    session_token, user_id = setup_test_user
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    session.cookies.set("session_token", session_token)
    return session


@pytest.fixture(scope="module")
def test_case(api_client, setup_test_user):
    """Create a test case for sharing tests"""
    import subprocess
    session_token, user_id = setup_test_user
    timestamp = int(time.time() * 1000)
    case_id = f"case_test_share_{timestamp}"
    
    mongo_cmd = f'''
    use('test_database');
    db.cases.insertOne({{
      case_id: "{case_id}",
      user_id: "{user_id}",
      title: "Test Case for Sharing",
      type: "employment",
      status: "active",
      risk_score: 65,
      risk_financial: 70,
      risk_urgency: 60,
      risk_legal_strength: 55,
      risk_complexity: 50,
      ai_summary: "This is a test case for sharing functionality.",
      ai_findings: [{{"text": "Test finding", "impact": "high", "type": "risk"}}],
      ai_next_steps: [{{"title": "Test step", "description": "Test description"}}],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }});
    '''
    subprocess.run(['mongosh', '--eval', mongo_cmd], capture_output=True, text=True)
    
    test_data["case_id"] = case_id
    return case_id


class TestHealthCheck:
    """Basic health check tests"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ API health check passed")


class TestLegalChatConversations:
    """Legal Chat conversation CRUD tests"""
    
    def test_create_conversation(self, api_client):
        """POST /api/chat/conversations - Create new conversation"""
        response = api_client.post(f"{BASE_URL}/api/chat/conversations", json={})
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "conversation_id" in data
        assert data["conversation_id"].startswith("conv_")
        assert "title" in data
        assert "created_at" in data
        assert "updated_at" in data
        
        test_data["conversation_id"] = data["conversation_id"]
        print(f"✓ Created conversation: {data['conversation_id']}")
    
    def test_create_conversation_with_case_id(self, api_client, test_case):
        """POST /api/chat/conversations - Create conversation linked to case"""
        response = api_client.post(f"{BASE_URL}/api/chat/conversations", json={
            "case_id": test_case
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["case_id"] == test_case
        print(f"✓ Created conversation linked to case: {test_case}")
    
    def test_list_conversations(self, api_client):
        """GET /api/chat/conversations - List user conversations"""
        response = api_client.get(f"{BASE_URL}/api/chat/conversations")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least one conversation from previous test
        
        # Verify conversation structure
        conv = data[0]
        assert "conversation_id" in conv
        assert "title" in conv
        assert "created_at" in conv
        print(f"✓ Listed {len(data)} conversations")
    
    def test_delete_conversation(self, api_client):
        """DELETE /api/chat/conversations/{id} - Delete conversation"""
        # First create a conversation to delete
        create_resp = api_client.post(f"{BASE_URL}/api/chat/conversations", json={})
        conv_id = create_resp.json()["conversation_id"]
        
        # Delete it
        response = api_client.delete(f"{BASE_URL}/api/chat/conversations/{conv_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "deleted"
        
        # Verify it's gone
        list_resp = api_client.get(f"{BASE_URL}/api/chat/conversations")
        conv_ids = [c["conversation_id"] for c in list_resp.json()]
        assert conv_id not in conv_ids
        print(f"✓ Deleted conversation: {conv_id}")


class TestLegalChatMessages:
    """Legal Chat message tests"""
    
    def test_get_messages_empty(self, api_client):
        """GET /api/chat/conversations/{id}/messages - Get messages (empty)"""
        conv_id = test_data.get("conversation_id")
        if not conv_id:
            pytest.skip("No conversation ID available")
        
        response = api_client.get(f"{BASE_URL}/api/chat/conversations/{conv_id}/messages")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got messages for conversation (count: {len(data)})")
    
    def test_send_message_and_get_ai_response(self, api_client):
        """POST /api/chat/conversations/{id}/messages - Send message and get AI response"""
        conv_id = test_data.get("conversation_id")
        if not conv_id:
            pytest.skip("No conversation ID available")
        
        response = api_client.post(
            f"{BASE_URL}/api/chat/conversations/{conv_id}/messages",
            json={"content": "What are my rights as a tenant?"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "user_message" in data
        assert "ai_message" in data
        
        # Verify user message
        assert data["user_message"]["role"] == "user"
        assert data["user_message"]["content"] == "What are my rights as a tenant?"
        assert "message_id" in data["user_message"]
        
        # Verify AI response
        assert data["ai_message"]["role"] == "assistant"
        assert len(data["ai_message"]["content"]) > 0
        assert "message_id" in data["ai_message"]
        
        print(f"✓ Sent message and received AI response ({len(data['ai_message']['content'])} chars)")
    
    def test_get_messages_after_send(self, api_client):
        """GET /api/chat/conversations/{id}/messages - Verify messages persisted"""
        conv_id = test_data.get("conversation_id")
        if not conv_id:
            pytest.skip("No conversation ID available")
        
        response = api_client.get(f"{BASE_URL}/api/chat/conversations/{conv_id}/messages")
        assert response.status_code == 200
        
        data = response.json()
        assert len(data) >= 2  # At least user message + AI response
        
        # Verify message structure
        for msg in data:
            assert "message_id" in msg
            assert "role" in msg
            assert "content" in msg
            assert "created_at" in msg
        
        print(f"✓ Verified {len(data)} messages persisted")
    
    def test_conversation_not_found(self, api_client):
        """GET /api/chat/conversations/{id}/messages - 404 for non-existent conversation"""
        response = api_client.get(f"{BASE_URL}/api/chat/conversations/conv_nonexistent123/messages")
        assert response.status_code == 404
        print("✓ Correctly returned 404 for non-existent conversation")


class TestLegalChatQuestionCount:
    """Legal Chat question count tests"""
    
    def test_get_question_count(self, api_client):
        """GET /api/chat/question-count - Get question count"""
        response = api_client.get(f"{BASE_URL}/api/chat/question-count")
        assert response.status_code == 200
        
        data = response.json()
        assert "count" in data
        assert "limit" in data
        assert isinstance(data["count"], int)
        
        # Pro plan should have no limit
        assert data["limit"] is None  # Pro plan
        print(f"✓ Question count: {data['count']}, limit: {data['limit']}")


class TestCaseSharing:
    """Case Sharing feature tests"""
    
    def test_share_case(self, api_client, test_case):
        """POST /api/cases/{case_id}/share - Generate share link"""
        response = api_client.post(
            f"{BASE_URL}/api/cases/{test_case}/share",
            json={"expiry_hours": 48, "message": "Please review this case"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "share_id" in data
        assert "expires_at" in data
        assert data["share_id"].startswith("share_")
        
        test_data["share_token"] = data["token"]
        test_data["share_id"] = data["share_id"]
        print(f"✓ Generated share link with token: {data['token'][:20]}...")
    
    def test_list_case_shares(self, api_client, test_case):
        """GET /api/cases/{case_id}/shares - List active shares"""
        response = api_client.get(f"{BASE_URL}/api/cases/{test_case}/shares")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        
        # Verify share structure
        share = data[0]
        assert "share_id" in share
        assert "token" in share
        assert "expires_at" in share
        assert "views_count" in share
        assert "comment_count" in share
        print(f"✓ Listed {len(data)} active shares")
    
    def test_share_with_different_expiry(self, api_client, test_case):
        """POST /api/cases/{case_id}/share - Test different expiry options"""
        for expiry in [24, 168, 720]:
            response = api_client.post(
                f"{BASE_URL}/api/cases/{test_case}/share",
                json={"expiry_hours": expiry}
            )
            assert response.status_code == 200
            print(f"✓ Created share with {expiry}h expiry")


class TestPublicSharedCase:
    """Public shared case access tests (no auth required)"""
    
    def test_get_shared_case_public(self):
        """GET /api/shared/{token} - Get shared case (public, no auth)"""
        token = test_data.get("share_token")
        if not token:
            pytest.skip("No share token available")
        
        # Use unauthenticated request
        response = requests.get(f"{BASE_URL}/api/shared/{token}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "share" in data
        assert "case" in data
        assert "documents" in data
        assert "events" in data
        assert "comments" in data
        
        # Verify share info
        assert "user_name" in data["share"]
        assert "expires_at" in data["share"]
        assert "views_count" in data["share"]
        
        # Verify case data (filtered for privacy)
        case = data["case"]
        assert "title" in case
        assert "risk_score" in case
        assert "ai_summary" in case
        
        print(f"✓ Retrieved shared case publicly: {case['title']}")
    
    def test_add_comment_to_shared_case(self):
        """POST /api/shared/{token}/comments - Add comment (public, no auth)"""
        token = test_data.get("share_token")
        if not token:
            pytest.skip("No share token available")
        
        response = requests.post(
            f"{BASE_URL}/api/shared/{token}/comments",
            json={
                "commenter_name": "Test Reviewer",
                "comment": "This looks like a strong case. I recommend proceeding."
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "comment_id" in data
        assert data["status"] == "created"
        print(f"✓ Added comment to shared case: {data['comment_id']}")
    
    def test_verify_comment_persisted(self):
        """GET /api/shared/{token} - Verify comment appears in shared case"""
        token = test_data.get("share_token")
        if not token:
            pytest.skip("No share token available")
        
        response = requests.get(f"{BASE_URL}/api/shared/{token}")
        assert response.status_code == 200
        
        data = response.json()
        comments = data.get("comments", [])
        assert len(comments) >= 1
        
        # Find our comment
        found = any(c["commenter_name"] == "Test Reviewer" for c in comments)
        assert found, "Comment not found in shared case"
        print(f"✓ Verified comment persisted ({len(comments)} total comments)")
    
    def test_shared_case_not_found(self):
        """GET /api/shared/{token} - 404 for invalid token"""
        response = requests.get(f"{BASE_URL}/api/shared/invalid_token_12345")
        assert response.status_code == 404
        print("✓ Correctly returned 404 for invalid share token")


class TestShareRevocation:
    """Share link revocation tests"""
    
    def test_revoke_share(self, api_client):
        """POST /api/shares/{share_id}/revoke - Revoke share link"""
        share_id = test_data.get("share_id")
        if not share_id:
            pytest.skip("No share ID available")
        
        response = api_client.post(f"{BASE_URL}/api/shares/{share_id}/revoke")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "revoked"
        print(f"✓ Revoked share: {share_id}")
    
    def test_revoked_share_returns_410(self):
        """GET /api/shared/{token} - 410 for revoked link"""
        token = test_data.get("share_token")
        if not token:
            pytest.skip("No share token available")
        
        response = requests.get(f"{BASE_URL}/api/shared/{token}")
        assert response.status_code == 410, f"Expected 410, got {response.status_code}"
        
        data = response.json()
        assert "revoked" in data.get("detail", "").lower()
        print("✓ Correctly returned 410 for revoked share link")
    
    def test_comment_on_revoked_share_fails(self):
        """POST /api/shared/{token}/comments - 410 for revoked link"""
        token = test_data.get("share_token")
        if not token:
            pytest.skip("No share token available")
        
        response = requests.post(
            f"{BASE_URL}/api/shared/{token}/comments",
            json={"commenter_name": "Test", "comment": "Test comment"}
        )
        assert response.status_code == 410
        print("✓ Correctly returned 410 for comment on revoked share")


class TestFreePlanLimits:
    """Test free plan limitations"""
    
    def test_free_plan_share_restriction(self):
        """POST /api/cases/{case_id}/share - 403 for free plan users"""
        import subprocess
        timestamp = int(time.time() * 1000)
        user_id = f"test-free-user-{timestamp}"
        session_token = f"test_session_free_{timestamp}"
        case_id = f"case_free_test_{timestamp}"
        
        # Create free plan user with case
        mongo_cmd = f'''
        use('test_database');
        db.users.insertOne({{
          user_id: "{user_id}",
          email: "free.user.{timestamp}@example.com",
          name: "Free User",
          plan: "free",
          created_at: new Date().toISOString()
        }});
        db.user_sessions.insertOne({{
          user_id: "{user_id}",
          session_token: "{session_token}",
          expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
          created_at: new Date().toISOString()
        }});
        db.cases.insertOne({{
          case_id: "{case_id}",
          user_id: "{user_id}",
          title: "Free User Case",
          type: "employment",
          status: "active",
          risk_score: 50,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }});
        '''
        subprocess.run(['mongosh', '--eval', mongo_cmd], capture_output=True, text=True)
        
        try:
            # Try to share as free user
            session = requests.Session()
            session.cookies.set("session_token", session_token)
            response = session.post(
                f"{BASE_URL}/api/cases/{case_id}/share",
                json={"expiry_hours": 48}
            )
            assert response.status_code == 403, f"Expected 403, got {response.status_code}"
            assert "Pro plan" in response.json().get("detail", "")
            print("✓ Free plan correctly blocked from sharing")
        finally:
            # Cleanup
            cleanup_cmd = f'''
            use('test_database');
            db.users.deleteMany({{user_id: "{user_id}"}});
            db.user_sessions.deleteMany({{session_token: "{session_token}"}});
            db.cases.deleteMany({{case_id: "{case_id}"}});
            '''
            subprocess.run(['mongosh', '--eval', cleanup_cmd], capture_output=True, text=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
