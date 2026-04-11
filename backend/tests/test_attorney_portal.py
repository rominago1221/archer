"""
Attorney Portal Backend Tests - Iteration 22
Tests for the new attorney portal features:
- Dual login system (client vs attorney)
- Attorney application flow
- Attorney dashboard, calls, cases, earnings
- Public attorney profiles
- Attorney research mode
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
CLIENT_EMAIL = "test_cg@example.com"
CLIENT_PASSWORD = "testpassword123"
ATTORNEY_EMAIL = "attorney@jasper.com"
ATTORNEY_PASSWORD = "attorney123"


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_health_endpoint(self):
        """API health check"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        print("✓ Health endpoint working")


class TestDualLoginSystem:
    """Test dual login system - client vs attorney"""
    
    def test_client_login_success(self):
        """Client can login and gets redirected to /dashboard"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200, f"Client login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == CLIENT_EMAIL
        # Client should NOT have attorney account_type
        assert data["user"].get("account_type") != "attorney"
        print(f"✓ Client login successful: {data['user']['email']}")
    
    def test_attorney_login_success(self):
        """Attorney can login and gets account_type=attorney"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATTORNEY_EMAIL,
            "password": ATTORNEY_PASSWORD
        })
        assert response.status_code == 200, f"Attorney login failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert data["user"]["email"] == ATTORNEY_EMAIL
        assert data["user"]["account_type"] == "attorney"
        print(f"✓ Attorney login successful: {data['user']['email']}, account_type={data['user']['account_type']}")
    
    def test_invalid_login_rejected(self):
        """Invalid credentials are rejected"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 404], f"Expected 401/404, got {response.status_code}"
        print("✓ Invalid login correctly rejected")


class TestAttorneyApplication:
    """Test attorney application endpoint POST /api/attorney/apply"""
    
    def test_attorney_apply_creates_user_and_profile(self):
        """POST /api/attorney/apply creates both user and attorney_profile"""
        unique_email = f"test_attorney_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/attorney/apply", json={
            "full_name": "Test Attorney",
            "email": unique_email,
            "phone": "+1-555-0100",
            "password": "testpassword123",
            "bar_number": "TEST-12345",
            "states_licensed": ["New York", "California"],
            "country": "US",
            "years_experience": 5,
            "law_school": "Test Law School",
            "graduation_year": 2019,
            "specialties": ["Employment law", "Contract law"],
            "bio": "Test attorney bio for testing purposes.",
            "languages": ["en"],
            "session_price": 199
        })
        assert response.status_code == 200, f"Attorney apply failed: {response.text}"
        data = response.json()
        assert "user" in data
        assert "session_token" in data
        assert "attorney_id" in data
        assert data["user"]["email"] == unique_email
        assert data["user"]["account_type"] == "attorney"
        print(f"✓ Attorney application created: {data['attorney_id']}")
    
    def test_attorney_apply_validates_price_range(self):
        """Session price must be between $149 and $500"""
        unique_email = f"test_price_{uuid.uuid4().hex[:8]}@example.com"
        # Test price too low
        response = requests.post(f"{BASE_URL}/api/attorney/apply", json={
            "full_name": "Test Attorney",
            "email": unique_email,
            "phone": "+1-555-0100",
            "password": "testpassword123",
            "bar_number": "TEST-99999",
            "states_licensed": ["New York"],
            "country": "US",
            "years_experience": 5,
            "specialties": ["Employment law"],
            "bio": "Test bio",
            "session_price": 100  # Too low
        })
        assert response.status_code == 400, f"Expected 400 for low price, got {response.status_code}"
        print("✓ Price validation working (rejects $100)")
    
    def test_attorney_apply_validates_specialties_max(self):
        """Maximum 5 specialties allowed"""
        unique_email = f"test_spec_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/attorney/apply", json={
            "full_name": "Test Attorney",
            "email": unique_email,
            "phone": "+1-555-0100",
            "password": "testpassword123",
            "bar_number": "TEST-88888",
            "states_licensed": ["New York"],
            "country": "US",
            "years_experience": 5,
            "specialties": ["A", "B", "C", "D", "E", "F"],  # 6 specialties
            "bio": "Test bio",
            "session_price": 199
        })
        assert response.status_code == 400, f"Expected 400 for >5 specialties, got {response.status_code}"
        print("✓ Specialties validation working (rejects >5)")
    
    def test_attorney_apply_rejects_duplicate_email(self):
        """Cannot apply with existing email"""
        response = requests.post(f"{BASE_URL}/api/attorney/apply", json={
            "full_name": "Duplicate Attorney",
            "email": ATTORNEY_EMAIL,  # Already exists
            "phone": "+1-555-0100",
            "password": "testpassword123",
            "bar_number": "TEST-77777",
            "states_licensed": ["New York"],
            "country": "US",
            "years_experience": 5,
            "specialties": ["Employment law"],
            "bio": "Test bio",
            "session_price": 199
        })
        assert response.status_code == 409, f"Expected 409 for duplicate email, got {response.status_code}"
        print("✓ Duplicate email correctly rejected")


class TestAttorneyProtectedEndpoints:
    """Test attorney-only endpoints require attorney account"""
    
    @pytest.fixture
    def attorney_session(self):
        """Get attorney session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATTORNEY_EMAIL,
            "password": ATTORNEY_PASSWORD
        })
        assert response.status_code == 200
        cookies = response.cookies
        return cookies
    
    @pytest.fixture
    def client_session(self):
        """Get client session token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        assert response.status_code == 200
        return response.cookies
    
    def test_attorney_me_returns_profile(self, attorney_session):
        """GET /api/attorney/me returns attorney profile"""
        response = requests.get(f"{BASE_URL}/api/attorney/me", cookies=attorney_session)
        assert response.status_code == 200, f"Attorney /me failed: {response.text}"
        data = response.json()
        assert "attorney_id" in data
        assert "full_name" in data
        assert "email" in data
        assert data["email"] == ATTORNEY_EMAIL
        assert "session_price" in data
        assert "specialties" in data
        assert "is_available" in data
        print(f"✓ Attorney profile retrieved: {data['full_name']}")
    
    def test_attorney_me_rejects_client(self, client_session):
        """GET /api/attorney/me rejects client accounts"""
        response = requests.get(f"{BASE_URL}/api/attorney/me", cookies=client_session)
        assert response.status_code == 403, f"Expected 403 for client, got {response.status_code}"
        print("✓ Attorney /me correctly rejects client accounts")
    
    def test_attorney_dashboard_returns_metrics(self, attorney_session):
        """GET /api/attorney/dashboard returns metrics + calls + activity"""
        response = requests.get(f"{BASE_URL}/api/attorney/dashboard", cookies=attorney_session)
        assert response.status_code == 200, f"Dashboard failed: {response.text}"
        data = response.json()
        assert "profile" in data
        assert "metrics" in data
        assert "today_calls" in data["metrics"]
        assert "month_earnings" in data["metrics"]
        assert "rating" in data["metrics"]
        assert "total_sessions" in data["metrics"]
        assert "upcoming_calls" in data
        assert "recent_activity" in data
        print(f"✓ Attorney dashboard: {data['metrics']}")
    
    def test_attorney_calls_returns_list(self, attorney_session):
        """GET /api/attorney/calls returns call list"""
        response = requests.get(f"{BASE_URL}/api/attorney/calls", cookies=attorney_session)
        assert response.status_code == 200, f"Calls failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Attorney calls: {len(data)} calls")
    
    def test_attorney_calls_filter_by_status(self, attorney_session):
        """GET /api/attorney/calls?status=scheduled filters correctly"""
        response = requests.get(f"{BASE_URL}/api/attorney/calls?status=scheduled", cookies=attorney_session)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned calls should be scheduled
        for call in data:
            assert call.get("status") == "scheduled", f"Expected scheduled, got {call.get('status')}"
        print(f"✓ Attorney calls filter working: {len(data)} scheduled calls")
    
    def test_attorney_cases_returns_list(self, attorney_session):
        """GET /api/attorney/cases returns cases shared with attorney"""
        response = requests.get(f"{BASE_URL}/api/attorney/cases", cookies=attorney_session)
        assert response.status_code == 200, f"Cases failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Attorney cases: {len(data)} cases")
    
    def test_attorney_earnings_returns_data(self, attorney_session):
        """GET /api/attorney/earnings returns earnings data"""
        response = requests.get(f"{BASE_URL}/api/attorney/earnings", cookies=attorney_session)
        assert response.status_code == 200, f"Earnings failed: {response.text}"
        data = response.json()
        assert "total_earned" in data
        assert "this_month" in data
        assert "last_month" in data
        assert "pending_payout" in data
        assert "sessions" in data
        assert "stripe_connect_status" in data
        print(f"✓ Attorney earnings: total=${data['total_earned']}, this_month=${data['this_month']}")
    
    def test_attorney_toggle_availability(self, attorney_session):
        """POST /api/attorney/toggle-availability toggles online/offline"""
        # Get current status
        response = requests.get(f"{BASE_URL}/api/attorney/me", cookies=attorney_session)
        initial_status = response.json().get("is_available")
        
        # Toggle
        response = requests.post(f"{BASE_URL}/api/attorney/toggle-availability", cookies=attorney_session)
        assert response.status_code == 200, f"Toggle failed: {response.text}"
        data = response.json()
        assert "is_available" in data
        assert data["is_available"] != initial_status
        print(f"✓ Availability toggled: {initial_status} -> {data['is_available']}")
        
        # Toggle back
        response = requests.post(f"{BASE_URL}/api/attorney/toggle-availability", cookies=attorney_session)
        assert response.status_code == 200
        assert response.json()["is_available"] == initial_status
        print(f"✓ Availability restored: {initial_status}")
    
    def test_attorney_profile_update(self, attorney_session):
        """PUT /api/attorney/profile updates profile fields"""
        response = requests.put(f"{BASE_URL}/api/attorney/profile", json={
            "bio": "Updated bio for testing"
        }, cookies=attorney_session)
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        data = response.json()
        assert data["bio"] == "Updated bio for testing"
        print("✓ Attorney profile update working")
        
        # Restore original bio
        requests.put(f"{BASE_URL}/api/attorney/profile", json={
            "bio": "Former BigLaw attorney turned consumer advocate. 12 years fighting for individuals against corporations. Specialized in employment disputes and tenant protection."
        }, cookies=attorney_session)


class TestAttorneyResearch:
    """Test attorney legal research mode"""
    
    @pytest.fixture
    def attorney_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ATTORNEY_EMAIL,
            "password": ATTORNEY_PASSWORD
        })
        return response.cookies
    
    def test_attorney_research_conversations(self, attorney_session):
        """GET /api/attorney/research/conversations returns list"""
        response = requests.get(f"{BASE_URL}/api/attorney/research/conversations", cookies=attorney_session)
        assert response.status_code == 200, f"Research conversations failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Attorney research conversations: {len(data)} conversations")
    
    def test_attorney_research_send_creates_conversation(self, attorney_session):
        """POST /api/attorney/research/send creates new conversation"""
        response = requests.post(f"{BASE_URL}/api/attorney/research/send", json={
            "message": "What are the key elements of a breach of contract claim?"
        }, cookies=attorney_session, timeout=120)
        assert response.status_code == 200, f"Research send failed: {response.text}"
        data = response.json()
        assert "response" in data
        assert "conversation_id" in data
        assert len(data["response"]) > 0
        print(f"✓ Attorney research response received (conv_id: {data['conversation_id']})")


class TestPublicAttorneyDirectory:
    """Test public attorney directory and profiles"""
    
    def test_attorneys_directory_returns_approved(self):
        """GET /api/attorneys-directory returns approved attorneys"""
        response = requests.get(f"{BASE_URL}/api/attorneys-directory")
        assert response.status_code == 200, f"Directory failed: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0, "Expected at least one approved attorney"
        
        # Check first attorney has required fields
        attorney = data[0]
        assert "attorney_id" in attorney
        assert "slug" in attorney
        assert "full_name" in attorney
        assert "specialties" in attorney
        assert "session_price" in attorney
        assert "rating" in attorney
        assert "is_available" in attorney
        print(f"✓ Attorneys directory: {len(data)} approved attorneys")
        return data[0]["slug"]  # Return slug for next test
    
    def test_public_attorney_profile_by_slug(self):
        """GET /api/attorneys/:slug returns public profile"""
        # First get the slug from directory
        dir_response = requests.get(f"{BASE_URL}/api/attorneys-directory")
        attorneys = dir_response.json()
        assert len(attorneys) > 0, "No attorneys in directory"
        slug = attorneys[0]["slug"]
        
        # Now get public profile
        response = requests.get(f"{BASE_URL}/api/attorneys/{slug}")
        assert response.status_code == 200, f"Public profile failed: {response.text}"
        data = response.json()
        assert data["slug"] == slug
        assert "attorney_id" in data
        assert "full_name" in data
        assert "bar_number" in data
        assert "states_licensed" in data
        assert "specialties" in data
        assert "bio" in data
        assert "session_price" in data
        assert "rating" in data
        assert "reviews" in data
        print(f"✓ Public attorney profile: {data['full_name']} (${data['session_price']}/session)")
    
    def test_public_profile_404_for_invalid_slug(self):
        """GET /api/attorneys/:slug returns 404 for invalid slug"""
        response = requests.get(f"{BASE_URL}/api/attorneys/invalid-slug-12345")
        assert response.status_code == 404
        print("✓ Invalid slug correctly returns 404")
    
    def test_attorneys_directory_filter_by_country(self):
        """GET /api/attorneys-directory?country=US filters by country"""
        response = requests.get(f"{BASE_URL}/api/attorneys-directory?country=US")
        assert response.status_code == 200
        data = response.json()
        for attorney in data:
            assert attorney["country"] == "US", f"Expected US, got {attorney['country']}"
        print(f"✓ Directory country filter working: {len(data)} US attorneys")


class TestAttorneyBooking:
    """Test attorney booking flow"""
    
    @pytest.fixture
    def client_session(self):
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        })
        return response.cookies
    
    def test_book_attorney_call(self, client_session):
        """POST /api/attorney/book-call creates a call booking"""
        # Get attorney ID from directory
        dir_response = requests.get(f"{BASE_URL}/api/attorneys-directory")
        attorneys = dir_response.json()
        assert len(attorneys) > 0
        attorney_id = attorneys[0]["attorney_id"]
        
        response = requests.post(f"{BASE_URL}/api/attorney/book-call", json={
            "attorney_id": attorney_id,
            "date": "2026-02-15",
            "time": "14:00",
            "origin_url": "https://predict-outcome.preview.emergentagent.com"
        }, cookies=client_session)
        assert response.status_code == 200, f"Booking failed: {response.text}"
        data = response.json()
        assert "call_id" in data
        assert "price" in data
        assert "payout" in data
        # checkout_url may be None if Stripe not configured
        print(f"✓ Call booked: {data['call_id']}, price=${data['price']}, payout=${data['payout']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
