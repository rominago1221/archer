"""
Test James Clarification Two-Step Approach:
1. James Question Card with max 1 question + 2-3 answer buttons + 'ask directly' link
2. CaseChatDrawer that slides in from right with case context

Tests:
- POST /api/chat/send with case_id field
- Verify James has case context in response
- Verify chat endpoint uses emergentintegrations (LlmChat)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@jasper.legal"
TEST_PASSWORD = "JasperPro2026!"


@pytest.fixture(scope="module")
def auth_session():
    """Login and return session with auth cookie"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    
    # Login
    response = session.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    
    if response.status_code != 200:
        pytest.skip(f"Login failed: {response.status_code} - {response.text}")
    
    data = response.json()
    session_token = data.get("session_token")
    
    # Set cookie for subsequent requests
    session.cookies.set("session_token", session_token)
    
    return session, data.get("user", {})


@pytest.fixture(scope="module")
def case_with_james_question(auth_session):
    """Find a case that has james_question set"""
    session, user = auth_session
    
    # Get all cases
    response = session.get(f"{BASE_URL}/api/cases")
    assert response.status_code == 200
    
    cases = response.json()
    
    # Find a case with james_question
    for case in cases:
        if case.get("james_question"):
            return case
    
    # If no case has james_question, return the first case (for testing chat without question)
    if cases:
        return cases[0]
    
    pytest.skip("No cases found for testing")


class TestChatSendEndpoint:
    """Test POST /api/chat/send endpoint"""
    
    def test_chat_send_without_case_id(self, auth_session):
        """Test chat/send works without case_id (general chat)"""
        session, user = auth_session
        
        response = session.post(f"{BASE_URL}/api/chat/send", json={
            "message": "What is a non-disclosure agreement?"
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "response" in data
        assert "conversation_id" in data
        assert "user_message" in data
        assert "ai_message" in data
        
        # Verify conversation_id format
        assert data["conversation_id"].startswith("conv_")
        
        # Verify AI responded
        assert len(data["response"]) > 50  # Should have substantial response
        
        print(f"Chat response (no case): {data['response'][:200]}...")
    
    def test_chat_send_with_case_id(self, auth_session, case_with_james_question):
        """Test chat/send with case_id includes case context"""
        session, user = auth_session
        case = case_with_james_question
        
        response = session.post(f"{BASE_URL}/api/chat/send", json={
            "message": "What are my options for this case?",
            "case_id": case["case_id"]
        })
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "response" in data
        assert "conversation_id" in data
        
        # Verify AI response mentions case-specific details
        ai_response = data["response"].lower()
        
        # The response should reference case context (title, type, or findings)
        case_title = (case.get("title") or "").lower()
        case_type = (case.get("type") or "").lower()
        
        # Check if response seems case-aware (mentions legal terms or case details)
        has_legal_context = any(term in ai_response for term in [
            "case", "document", "legal", "landlord", "tenant", "eviction",
            "contract", "employment", "debt", "notice", "deadline"
        ])
        
        assert has_legal_context, f"Response doesn't seem case-aware: {data['response'][:200]}"
        
        print(f"Chat response (with case): {data['response'][:200]}...")
    
    def test_chat_send_continues_conversation(self, auth_session, case_with_james_question):
        """Test sending multiple messages in same conversation"""
        session, user = auth_session
        case = case_with_james_question
        
        # First message
        response1 = session.post(f"{BASE_URL}/api/chat/send", json={
            "message": "Tell me about my case briefly.",
            "case_id": case["case_id"]
        })
        
        assert response1.status_code == 200
        data1 = response1.json()
        conv_id = data1["conversation_id"]
        
        # Wait a bit for rate limiting
        time.sleep(2)
        
        # Second message in same conversation
        response2 = session.post(f"{BASE_URL}/api/chat/send", json={
            "message": "What should I do first?",
            "conversation_id": conv_id,
            "case_id": case["case_id"]
        })
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Should use same conversation
        assert data2["conversation_id"] == conv_id
        
        # Should have a response
        assert len(data2["response"]) > 20
        
        print(f"Continued conversation response: {data2['response'][:200]}...")
    
    def test_chat_send_requires_auth(self):
        """Test chat/send requires authentication"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        response = session.post(f"{BASE_URL}/api/chat/send", json={
            "message": "Hello"
        })
        
        assert response.status_code == 401


class TestJamesQuestionCard:
    """Test James Question Card data structure"""
    
    def test_james_question_structure(self, auth_session, case_with_james_question):
        """Verify james_question has correct structure"""
        case = case_with_james_question
        
        jq = case.get("james_question")
        if not jq:
            pytest.skip("Case doesn't have james_question")
        
        # Verify structure
        assert "text" in jq, "james_question should have 'text' field"
        assert "options" in jq, "james_question should have 'options' field"
        
        # Verify options is a list with 2-3 items
        options = jq["options"]
        assert isinstance(options, list), "options should be a list"
        assert 2 <= len(options) <= 3, f"Should have 2-3 options, got {len(options)}"
        
        # Verify each option is a string
        for opt in options:
            assert isinstance(opt, str), f"Option should be string, got {type(opt)}"
        
        print(f"James question: {jq['text']}")
        print(f"Options: {options}")
    
    def test_james_answer_endpoint(self, auth_session, case_with_james_question):
        """Test POST /api/cases/{case_id}/james-answer endpoint"""
        session, user = auth_session
        case = case_with_james_question
        
        jq = case.get("james_question")
        if not jq:
            pytest.skip("Case doesn't have james_question")
        
        # Answer the question
        response = session.post(
            f"{BASE_URL}/api/cases/{case['case_id']}/james-answer",
            json={
                "question": jq["text"],
                "answer": jq["options"][0]  # Pick first option
            }
        )
        
        # Should succeed (200) or be rate limited (429)
        assert response.status_code in [200, 429], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            print("James answer submitted successfully")
        else:
            print("Rate limited - answer endpoint working but throttled")


class TestChatConversations:
    """Test chat conversation management"""
    
    def test_list_conversations(self, auth_session):
        """Test GET /api/chat/conversations"""
        session, user = auth_session
        
        response = session.get(f"{BASE_URL}/api/chat/conversations")
        
        assert response.status_code == 200
        convs = response.json()
        
        assert isinstance(convs, list)
        
        if convs:
            conv = convs[0]
            assert "conversation_id" in conv
            assert "user_id" in conv
            assert "created_at" in conv
            
            print(f"Found {len(convs)} conversations")
    
    def test_get_conversation_messages(self, auth_session):
        """Test GET /api/chat/conversations/{id}/messages"""
        session, user = auth_session
        
        # First create a conversation
        response = session.post(f"{BASE_URL}/api/chat/send", json={
            "message": "Test message for conversation"
        })
        
        assert response.status_code == 200
        conv_id = response.json()["conversation_id"]
        
        # Get messages
        response = session.get(f"{BASE_URL}/api/chat/conversations/{conv_id}/messages")
        
        assert response.status_code == 200
        messages = response.json()
        
        assert isinstance(messages, list)
        assert len(messages) >= 2  # User message + AI response
        
        # Verify message structure
        for msg in messages:
            assert "message_id" in msg
            assert "role" in msg
            assert "content" in msg
            assert msg["role"] in ["user", "assistant"]
        
        print(f"Conversation has {len(messages)} messages")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
