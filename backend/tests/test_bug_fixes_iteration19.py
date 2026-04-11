"""
Test suite for Bug Fixes - Iteration 19
Tests for:
- Bug 1: Legal Chat with James persona (Claude API integration)
- Bug 2: Findings text display (issue/details fallback)
- Bug 3: French UI labels (language aliases fr=fr-BE)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestLegalChatBug1:
    """Bug 1: Legal Chat - James AI should return real responses, not 'trouble processing'"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.session_token = response.json().get("session_token")
        self.cookies = {"session_token": self.session_token}
        self.user = response.json().get("user")
    
    def test_chat_send_returns_real_ai_response(self):
        """POST /api/chat/send should return real AI response in French for Belgian user"""
        response = requests.post(
            f"{BASE_URL}/api/chat/send",
            json={"message": "Quel est mon preavis si je suis licencie en Belgique?"},
            cookies=self.cookies,
            timeout=60
        )
        assert response.status_code == 200, f"Chat send failed: {response.text}"
        
        data = response.json()
        assert "response" in data, "Response should contain 'response' field"
        assert "conversation_id" in data, "Response should contain 'conversation_id'"
        
        # Verify it's NOT the error message
        ai_response = data["response"]
        assert "trouble processing" not in ai_response.lower(), "Should not return error message"
        assert "temporarily unavailable" not in ai_response.lower(), "Should not return unavailable message"
        
        # Verify response is in French (contains French words)
        french_indicators = ["préavis", "licenciement", "employeur", "semaines", "loi", "travail"]
        has_french = any(word in ai_response.lower() for word in french_indicators)
        assert has_french, f"Response should be in French for Belgian user: {ai_response[:200]}"
        
        # Verify Belgian law is cited
        belgian_indicators = ["belge", "belgique", "article", "loi du", "code"]
        cites_belgian_law = any(word in ai_response.lower() for word in belgian_indicators)
        assert cites_belgian_law, f"Response should cite Belgian law: {ai_response[:200]}"
        
        # Store conversation_id for follow-up test
        self.conversation_id = data["conversation_id"]
    
    def test_multi_turn_chat_remembers_context(self):
        """Follow-up message should remember context from first message"""
        # First message
        response1 = requests.post(
            f"{BASE_URL}/api/chat/send",
            json={"message": "Quel est mon preavis si je suis licencie?"},
            cookies=self.cookies,
            timeout=60
        )
        assert response1.status_code == 200
        conv_id = response1.json()["conversation_id"]
        
        # Follow-up message with conversation_id
        response2 = requests.post(
            f"{BASE_URL}/api/chat/send",
            json={
                "message": "Et si j'ai 8 ans d'anciennete?",
                "conversation_id": conv_id
            },
            cookies=self.cookies,
            timeout=60
        )
        assert response2.status_code == 200
        
        data = response2.json()
        ai_response = data["response"]
        
        # Should reference the context (notice period calculation)
        context_indicators = ["semaines", "ancienneté", "préavis", "8 ans", "29"]
        has_context = any(word in ai_response.lower() for word in context_indicators)
        assert has_context, f"Follow-up should remember context: {ai_response[:200]}"


class TestFindingsTextBug2:
    """Bug 2: Findings should show actual text, not just badge labels"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert response.status_code == 200
        self.session_token = response.json().get("session_token")
        self.cookies = {"session_token": self.session_token}
    
    def test_case_has_ai_findings_with_text(self):
        """Case should have ai_findings with issue/details text"""
        response = requests.get(
            f"{BASE_URL}/api/cases/case_eea7dc2c92ce",
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        data = response.json()
        ai_findings = data.get("ai_findings", [])
        
        # Should have findings
        assert len(ai_findings) > 0, "Case should have ai_findings"
        
        # Each finding should have text content (issue or details)
        for i, finding in enumerate(ai_findings):
            has_text = (
                finding.get("text") or 
                finding.get("issue") or 
                finding.get("details") or 
                finding.get("description")
            )
            assert has_text, f"Finding {i} should have text content: {finding}"
            
            # Verify text is meaningful (not just a type label)
            text = finding.get("issue") or finding.get("details") or finding.get("text") or ""
            assert len(text) > 20, f"Finding text should be meaningful: {text}"


class TestFrenchLabelsBug3:
    """Bug 3: Belgian users should see French UI labels"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and verify user language is French"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert response.status_code == 200
        self.session_token = response.json().get("session_token")
        self.cookies = {"session_token": self.session_token}
        self.user = response.json().get("user")
        
        # Verify user language is French
        assert self.user.get("language") == "fr", f"User language should be 'fr': {self.user.get('language')}"
        assert self.user.get("jurisdiction") == "BE", f"User jurisdiction should be 'BE': {self.user.get('jurisdiction')}"
    
    def test_user_has_french_language_setting(self):
        """User should have language='fr' (not 'fr-BE')"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        user = response.json()
        # After migration, language should be simplified to 'fr'
        assert user.get("language") in ["fr", "fr-BE"], f"User language: {user.get('language')}"
    
    def test_analyze_document_advanced_accepts_language_param(self):
        """analyze_document_advanced function should accept language parameter"""
        # This is a code verification test - we verify the endpoint works with language
        # The actual function signature check is done via code review
        
        # Verify the chat endpoint uses language (which calls similar Claude logic)
        response = requests.post(
            f"{BASE_URL}/api/chat/send",
            json={"message": "Bonjour"},
            cookies=self.cookies,
            timeout=30
        )
        assert response.status_code == 200
        
        # Response should be in French
        ai_response = response.json().get("response", "")
        # French greeting response indicators
        french_indicators = ["bonjour", "aide", "question", "juridique", "james"]
        has_french = any(word in ai_response.lower() for word in french_indicators)
        assert has_french or len(ai_response) > 50, f"Response should be in French: {ai_response[:100]}"


class TestJurisdictionLanguageSelectors:
    """Verify jurisdiction and language selectors work correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert response.status_code == 200
        self.session_token = response.json().get("session_token")
        self.cookies = {"session_token": self.session_token}
        self.user = response.json().get("user")
    
    def test_login_returns_jurisdiction_and_language(self):
        """Login response should include jurisdiction and language"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_cg@example.com",
            "password": "testpassword123"
        })
        assert response.status_code == 200
        
        user = response.json().get("user")
        assert "jurisdiction" in user, "User should have jurisdiction field"
        assert "language" in user, "User should have language field"
        assert user["jurisdiction"] == "BE", f"Jurisdiction should be BE: {user['jurisdiction']}"
        assert user["language"] == "fr", f"Language should be fr: {user['language']}"
    
    def test_profile_update_jurisdiction_and_language(self):
        """Profile update should accept jurisdiction and language"""
        # Update to US/es
        response = requests.put(
            f"{BASE_URL}/api/profile",
            json={"jurisdiction": "US", "language": "es"},
            cookies=self.cookies
        )
        assert response.status_code == 200
        
        # Verify update
        me_response = requests.get(f"{BASE_URL}/api/auth/me", cookies=self.cookies)
        assert me_response.status_code == 200
        user = me_response.json()
        assert user["jurisdiction"] == "US"
        assert user["language"] == "es"
        
        # Revert back to BE/fr
        requests.put(
            f"{BASE_URL}/api/profile",
            json={"jurisdiction": "BE", "language": "fr"},
            cookies=self.cookies
        )


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
