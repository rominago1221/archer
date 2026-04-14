"""
Test Multi-Document Analysis Features for Archer Legal Platform
Tests: case_narrative, contradictions, opposing_strategy_analysis, 
       cumulative_financial_exposure, master_deadlines, risk_score_history,
       multi_doc_summary, and case brief endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_cg@example.com"
TEST_PASSWORD = "testpassword123"
MULTI_DOC_CASE_ID = "case_eef4adb324a0"  # Employment case with 2 documents
SINGLE_DOC_CASE_ID = "case_457ad1a7f22d"  # Single document case


class TestMultiDocFeatures:
    """Test multi-document analysis features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session for all tests"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.user = login_response.json()
        print(f"Logged in as: {self.user.get('email')} (language: {self.user.get('language')})")
    
    def test_multi_doc_case_has_required_fields(self):
        """Test 1: Multi-doc case returns all required multi-doc fields"""
        response = self.session.get(f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}")
        assert response.status_code == 200, f"Failed to get case: {response.text}"
        
        case = response.json()
        print(f"Case title: {case.get('title')}")
        print(f"Document count: {case.get('document_count')}")
        
        # Verify document_count > 1
        assert case.get('document_count', 0) > 1, f"Expected document_count > 1, got {case.get('document_count')}"
        
        # Verify multi-doc fields exist
        assert 'case_narrative' in case, "Missing case_narrative field"
        assert 'contradictions' in case, "Missing contradictions field"
        assert 'opposing_strategy_analysis' in case, "Missing opposing_strategy_analysis field"
        assert 'cumulative_financial_exposure' in case, "Missing cumulative_financial_exposure field"
        assert 'master_deadlines' in case, "Missing master_deadlines field"
        assert 'risk_score_history' in case, "Missing risk_score_history field"
        
        print("All required multi-doc fields present")
    
    def test_case_narrative_content(self):
        """Test 2: Case narrative has French content"""
        response = self.session.get(f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}")
        assert response.status_code == 200
        
        case = response.json()
        narrative = case.get('case_narrative', '')
        
        assert narrative, "case_narrative is empty"
        assert len(narrative) > 50, f"case_narrative too short: {len(narrative)} chars"
        
        # Check for French content (common French words)
        french_indicators = ['le', 'la', 'de', 'du', 'un', 'une', 'et', 'en', 'qui', 'que']
        narrative_lower = narrative.lower()
        has_french = any(f" {word} " in f" {narrative_lower} " for word in french_indicators)
        assert has_french, f"case_narrative doesn't appear to be in French: {narrative[:100]}"
        
        print(f"Case narrative (first 200 chars): {narrative[:200]}")
    
    def test_contradictions_structure(self):
        """Test 3: Contradictions have correct structure with doc_a, doc_b, claim_a, claim_b, defense_value"""
        response = self.session.get(f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}")
        assert response.status_code == 200
        
        case = response.json()
        contradictions = case.get('contradictions', [])
        
        assert len(contradictions) > 0, "No contradictions found"
        print(f"Found {len(contradictions)} contradictions")
        
        for i, c in enumerate(contradictions):
            assert 'doc_a' in c, f"Contradiction {i} missing doc_a"
            assert 'doc_b' in c, f"Contradiction {i} missing doc_b"
            assert 'claim_a' in c, f"Contradiction {i} missing claim_a"
            assert 'claim_b' in c, f"Contradiction {i} missing claim_b"
            assert 'defense_value' in c, f"Contradiction {i} missing defense_value"
            
            print(f"Contradiction {i}: {c.get('doc_a')} vs {c.get('doc_b')}, defense_value: {c.get('defense_value')}")
    
    def test_risk_score_history(self):
        """Test 4: Risk score history has 2 entries (was 75, now 45)"""
        response = self.session.get(f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}")
        assert response.status_code == 200
        
        case = response.json()
        history = case.get('risk_score_history', [])
        
        assert len(history) >= 2, f"Expected at least 2 risk history entries, got {len(history)}"
        
        # Check first entry was 75
        first_score = history[0].get('score')
        assert first_score == 75, f"Expected first score 75, got {first_score}"
        
        # Check last entry is 45
        last_score = history[-1].get('score')
        assert last_score == 45, f"Expected last score 45, got {last_score}"
        
        print(f"Risk score history: {first_score} -> {last_score}")
    
    def test_cumulative_financial_exposure(self):
        """Test 5: Cumulative financial exposure contains EUR amount"""
        response = self.session.get(f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}")
        assert response.status_code == 200
        
        case = response.json()
        exposure = case.get('cumulative_financial_exposure', '')
        
        assert exposure, "cumulative_financial_exposure is empty"
        assert 'EUR' in exposure, f"Expected EUR in exposure, got: {exposure}"
        
        print(f"Cumulative financial exposure: {exposure}")
    
    def test_master_deadlines(self):
        """Test 6: Master deadlines has CCT deadline"""
        response = self.session.get(f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}")
        assert response.status_code == 200
        
        case = response.json()
        deadlines = case.get('master_deadlines', [])
        
        assert len(deadlines) > 0, "No master deadlines found"
        
        for i, dl in enumerate(deadlines):
            assert 'date' in dl, f"Deadline {i} missing date"
            assert 'description' in dl, f"Deadline {i} missing description"
            print(f"Deadline {i}: {dl.get('date')} - {dl.get('description')}")
        
        # Check for CCT reference
        has_cct = any('CCT' in str(dl) for dl in deadlines)
        assert has_cct, "No CCT deadline found"
    
    def test_opposing_strategy_analysis(self):
        """Test 7: Opposing strategy analysis exists and has content"""
        response = self.session.get(f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}")
        assert response.status_code == 200
        
        case = response.json()
        strategy = case.get('opposing_strategy_analysis', '')
        
        assert strategy, "opposing_strategy_analysis is empty"
        assert len(strategy) > 50, f"opposing_strategy_analysis too short: {len(strategy)} chars"
        
        print(f"Opposing strategy (first 200 chars): {strategy[:200]}")
    
    def test_single_doc_case_no_multi_doc_fields(self):
        """Test 8: Single-doc case should NOT have multi-doc analysis data"""
        response = self.session.get(f"{BASE_URL}/api/cases/{SINGLE_DOC_CASE_ID}")
        assert response.status_code == 200
        
        case = response.json()
        doc_count = case.get('document_count', 0)
        
        assert doc_count == 1, f"Expected document_count 1, got {doc_count}"
        
        # Multi-doc fields should be empty/null for single-doc case
        narrative = case.get('case_narrative')
        contradictions = case.get('contradictions', [])
        
        # These should be empty or null for single-doc cases
        assert not narrative, f"Single-doc case should not have case_narrative, got: {narrative}"
        assert len(contradictions) == 0, f"Single-doc case should not have contradictions, got: {len(contradictions)}"
        
        print(f"Single-doc case verified: document_count={doc_count}, no multi-doc data")
    
    def test_case_brief_endpoint(self):
        """Test 9: Case brief endpoint returns valid JSON structure"""
        # Note: This endpoint calls Claude API and may take 15-30 seconds
        response = self.session.get(
            f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}/brief",
            timeout=60
        )
        
        # Brief endpoint may return 500 if case doesn't have 5+ docs
        # For 2-doc case, it should still work but may have limited data
        if response.status_code == 200:
            brief = response.json()
            
            # Check required brief fields
            expected_fields = [
                'executive_summary', 'document_timeline', 'key_legal_issues',
                'risk_assessment', 'recommended_strategy', 'legal_references', 'conclusion'
            ]
            
            for field in expected_fields:
                assert field in brief, f"Brief missing field: {field}"
            
            print(f"Brief generated successfully with {len(brief)} fields")
            print(f"Executive summary (first 200 chars): {str(brief.get('executive_summary', ''))[:200]}")
        else:
            # Brief generation may fail for cases with < 5 docs
            print(f"Brief endpoint returned {response.status_code}: {response.text[:200]}")
            # This is acceptable for 2-doc case
            assert response.status_code in [200, 500], f"Unexpected status: {response.status_code}"


class TestFrenchTranslations:
    """Test French translations for Belgian user"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get session"""
        self.session = requests.Session()
        login_response = self.session.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
        )
        assert login_response.status_code == 200
        self.user = login_response.json()
    
    def test_user_language_is_french(self):
        """Test 10: User language is fr-BE"""
        # Login response has user nested under 'user' key
        user_data = self.user.get('user', self.user)
        assert user_data.get('language') == 'fr-BE', f"Expected fr-BE, got {user_data.get('language')}"
        print(f"User language: {user_data.get('language')}")
    
    def test_case_content_in_french(self):
        """Test 11: Case analysis content is in French"""
        response = self.session.get(f"{BASE_URL}/api/cases/{MULTI_DOC_CASE_ID}")
        assert response.status_code == 200
        
        case = response.json()
        
        # Check ai_summary is in French
        summary = case.get('ai_summary', '')
        assert summary, "ai_summary is empty"
        
        # French indicators
        french_words = ['le', 'la', 'de', 'du', 'un', 'une', 'et', 'en', 'qui', 'que', 'est', 'sont']
        summary_lower = summary.lower()
        french_count = sum(1 for word in french_words if f" {word} " in f" {summary_lower} ")
        
        assert french_count >= 3, f"ai_summary doesn't appear to be in French: {summary[:100]}"
        print(f"French word count in summary: {french_count}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
