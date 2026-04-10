"""
Test Contract Guard and Risk Monitor Features
- Contract Guard: "Before I Sign" mode toggle and analysis
- Risk Monitor: Email surveillance (MOCKED) - connect, status, disconnect, alerts
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test_cg@example.com"
TEST_PASSWORD = "testpassword123"
ALT_EMAIL = "test@example.com"

class TestAuth:
    """Authentication for testing"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create authenticated session"""
        s = requests.Session()
        s.headers.update({"Content-Type": "application/json"})
        return s
    
    @pytest.fixture(scope="class")
    def auth_token(self, session):
        """Get auth token via login"""
        # Try primary test user
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("session_token") or data.get("token")
        
        # Try alternative user
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ALT_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            data = response.json()
            return data.get("session_token") or data.get("token")
        
        pytest.skip("Could not authenticate - skipping tests")
    
    @pytest.fixture(scope="class")
    def auth_session(self, session, auth_token):
        """Session with auth cookie"""
        session.cookies.set("session_token", auth_token)
        return session


class TestRiskMonitorEndpoints(TestAuth):
    """Test Risk Monitor API endpoints (MOCKED)"""
    
    def test_risk_monitor_status_initial(self, auth_session):
        """GET /api/risk-monitor/status - Get initial status"""
        response = auth_session.get(f"{BASE_URL}/api/risk-monitor/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Should have these fields
        assert "connected" in data
        assert "provider" in data
        assert "emails_scanned" in data
        assert "threats_detected" in data
        assert "alerts" in data
        print(f"✓ Risk Monitor status: connected={data['connected']}, provider={data.get('provider')}")
    
    def test_risk_monitor_connect_gmail(self, auth_session):
        """POST /api/risk-monitor/connect - Connect Gmail (MOCKED)"""
        response = auth_session.post(f"{BASE_URL}/api/risk-monitor/connect", json={
            "provider": "gmail"
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("status") == "connected"
        assert data.get("provider") == "gmail"
        assert "message" in data
        print(f"✓ Gmail connected: {data.get('message')}")
    
    def test_risk_monitor_status_after_connect(self, auth_session):
        """GET /api/risk-monitor/status - Verify connected state"""
        response = auth_session.get(f"{BASE_URL}/api/risk-monitor/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("connected") == True, "Expected connected=True after connect"
        assert data.get("provider") == "gmail"
        assert data.get("emails_scanned", 0) > 0, "Expected emails_scanned > 0 after mock scan"
        assert data.get("threats_detected", 0) > 0, "Expected threats_detected > 0 (mock alerts)"
        assert len(data.get("alerts", [])) > 0, "Expected mock alerts after connect"
        
        # Verify alert structure
        alert = data["alerts"][0]
        assert "alert_id" in alert
        assert "severity" in alert
        assert "subject" in alert
        assert "sender" in alert
        assert "status" in alert
        print(f"✓ Status after connect: {data['emails_scanned']} emails, {data['threats_detected']} threats, {len(data['alerts'])} alerts")
    
    def test_risk_monitor_connect_outlook(self, auth_session):
        """POST /api/risk-monitor/connect - Connect Outlook (MOCKED)"""
        response = auth_session.post(f"{BASE_URL}/api/risk-monitor/connect", json={
            "provider": "outlook"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "connected"
        assert data.get("provider") == "outlook"
        print(f"✓ Outlook connected: {data.get('message')}")
    
    def test_risk_monitor_connect_invalid_provider(self, auth_session):
        """POST /api/risk-monitor/connect - Invalid provider should fail"""
        response = auth_session.post(f"{BASE_URL}/api/risk-monitor/connect", json={
            "provider": "yahoo"
        })
        assert response.status_code == 400, f"Expected 400 for invalid provider, got {response.status_code}"
        print("✓ Invalid provider correctly rejected")
    
    def test_risk_monitor_dismiss_alert(self, auth_session):
        """PUT /api/risk-monitor/alerts/{id}/dismiss - Dismiss an alert"""
        # First get alerts
        status_response = auth_session.get(f"{BASE_URL}/api/risk-monitor/status")
        assert status_response.status_code == 200
        
        alerts = status_response.json().get("alerts", [])
        if not alerts:
            pytest.skip("No alerts to dismiss")
        
        alert_id = alerts[0]["alert_id"]
        
        # Dismiss the alert
        response = auth_session.put(f"{BASE_URL}/api/risk-monitor/alerts/{alert_id}/dismiss")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "dismissed"
        print(f"✓ Alert {alert_id} dismissed")
    
    def test_risk_monitor_disconnect(self, auth_session):
        """POST /api/risk-monitor/disconnect - Disconnect monitoring"""
        response = auth_session.post(f"{BASE_URL}/api/risk-monitor/disconnect")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "disconnected"
        print("✓ Risk Monitor disconnected")
    
    def test_risk_monitor_status_after_disconnect(self, auth_session):
        """GET /api/risk-monitor/status - Verify disconnected state"""
        response = auth_session.get(f"{BASE_URL}/api/risk-monitor/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("connected") == False, "Expected connected=False after disconnect"
        print("✓ Status shows disconnected")


class TestContractGuardEndpoints(TestAuth):
    """Test Contract Guard API endpoints"""
    
    def test_contract_guard_reviews_empty(self, auth_session):
        """GET /api/contract-guard/reviews - Get reviews list"""
        response = auth_session.get(f"{BASE_URL}/api/contract-guard/reviews")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of reviews"
        print(f"✓ Contract Guard reviews: {len(data)} reviews found")


class TestHealthAndBasics:
    """Basic health checks"""
    
    def test_api_health(self):
        """GET /api/health - API is running"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✓ API health check passed")
    
    def test_api_root(self):
        """GET /api/ - API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API root: {data.get('message')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
