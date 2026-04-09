#!/usr/bin/env python3
"""
Jasper Legal Tech Platform - Backend API Testing
Tests all backend endpoints including auth-gated APIs
"""

import requests
import sys
import json
from datetime import datetime
import subprocess
import os

class JasperAPITester:
    def __init__(self):
        # Get backend URL from frontend .env
        self.base_url = "https://jasper-doc-analysis.preview.emergentagent.com/api"
        self.session_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if headers:
            test_headers.update(headers)
        
        if self.session_token and 'Authorization' not in test_headers:
            test_headers['Authorization'] = f'Bearer {self.session_token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f" (expected {expected_status})"
                try:
                    error_data = response.json()
                    if 'detail' in error_data:
                        details += f" - {error_data['detail']}"
                except:
                    details += f" - {response.text[:100]}"
            
            self.log_test(name, success, details)
            
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def create_test_session(self):
        """Create test user and session using MongoDB"""
        print("\n🔧 Creating test session...")
        
        try:
            # Generate unique identifiers
            timestamp = int(datetime.now().timestamp())
            user_id = f"test-user-{timestamp}"
            session_token = f"test_session_{timestamp}"
            email = f"test.user.{timestamp}@example.com"
            
            # MongoDB commands to create test user and session
            mongo_cmd = f"""
mongosh --eval "
use('test_database');
db.users.insertOne({{
  user_id: '{user_id}',
  email: '{email}',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  plan: 'pro',
  state_of_residence: 'New York',
  phone: '+1234567890',
  notif_risk_score: true,
  notif_deadlines: true,
  notif_calls: true,
  notif_lawyers: false,
  notif_promo: false,
  data_sharing: true,
  improve_ai: true,
  created_at: new Date().toISOString()
}});
db.user_sessions.insertOne({{
  user_id: '{user_id}',
  session_token: '{session_token}',
  expires_at: new Date(Date.now() + 7*24*60*60*1000).toISOString(),
  created_at: new Date().toISOString()
}});
print('SUCCESS: Test session created');
"
"""
            
            result = subprocess.run(mongo_cmd, shell=True, capture_output=True, text=True)
            
            if "SUCCESS: Test session created" in result.stdout:
                self.session_token = session_token
                self.user_id = user_id
                print(f"✅ Test session created - User: {user_id}")
                return True
            else:
                print(f"❌ Failed to create test session: {result.stderr}")
                return False
                
        except Exception as e:
            print(f"❌ Session creation error: {e}")
            return False

    def cleanup_test_data(self):
        """Clean up test data from MongoDB"""
        print("\n🧹 Cleaning up test data...")
        try:
            mongo_cmd = """
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\\.user\\./});
db.user_sessions.deleteMany({session_token: /test_session/});
print('Test data cleaned');
"
"""
            subprocess.run(mongo_cmd, shell=True, capture_output=True, text=True)
            print("✅ Test data cleaned")
        except Exception as e:
            print(f"❌ Cleanup error: {e}")

    def test_health_endpoints(self):
        """Test basic health check endpoints"""
        print("\n📊 Testing Health Endpoints...")
        
        # Test root endpoint
        self.run_test("Health Check - Root", "GET", "", 200)
        
        # Test health endpoint
        self.run_test("Health Check - Health", "GET", "health", 200)

    def test_public_endpoints(self):
        """Test public endpoints that don't require auth"""
        print("\n🌐 Testing Public Endpoints...")
        
        # Test lawyers endpoint (public)
        success, data = self.run_test("Get Lawyers", "GET", "lawyers", 200)
        if success and isinstance(data, list):
            print(f"   Found {len(data)} lawyers")
            if len(data) > 0:
                print(f"   Sample lawyer: {data[0].get('name', 'Unknown')}")
        
        # Test specific lawyer
        if success and len(data) > 0:
            lawyer_id = data[0].get('lawyer_id')
            if lawyer_id:
                self.run_test("Get Specific Lawyer", "GET", f"lawyers/{lawyer_id}", 200)

    def test_auth_endpoints(self):
        """Test authentication endpoints"""
        print("\n🔐 Testing Auth Endpoints...")
        
        if not self.session_token:
            print("❌ No session token available for auth tests")
            return
        
        # Test auth/me endpoint
        success, user_data = self.run_test("Get Current User", "GET", "auth/me", 200)
        if success:
            print(f"   User: {user_data.get('name', 'Unknown')} ({user_data.get('email', 'No email')})")
            print(f"   Plan: {user_data.get('plan', 'Unknown')}")

    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n📈 Testing Dashboard Endpoints...")
        
        if not self.session_token:
            print("❌ No session token available for dashboard tests")
            return
        
        # Test dashboard stats
        success, stats = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        if success:
            print(f"   Active cases: {stats.get('active_cases', 0)}")
            print(f"   Highest risk: {stats.get('highest_risk_score', 0)}")
            print(f"   Total documents: {stats.get('total_documents', 0)}")

    def test_case_endpoints(self):
        """Test case management endpoints"""
        print("\n📁 Testing Case Endpoints...")
        
        if not self.session_token:
            print("❌ No session token available for case tests")
            return
        
        # Test get cases
        success, cases = self.run_test("Get Cases", "GET", "cases", 200)
        if success:
            print(f"   Found {len(cases)} cases")
        
        # Test create case
        case_data = {
            "title": "Test Legal Case",
            "type": "contract"
        }
        success, new_case = self.run_test("Create Case", "POST", "cases", 201, case_data)
        if success:
            case_id = new_case.get('case_id')
            print(f"   Created case: {case_id}")
            
            # Test get specific case
            if case_id:
                self.run_test("Get Specific Case", "GET", f"cases/{case_id}", 200)
                
                # Test case events
                self.run_test("Get Case Events", "GET", f"cases/{case_id}/events", 200)
                
                # Test case documents
                self.run_test("Get Case Documents", "GET", f"cases/{case_id}/documents", 200)

    def test_lawyer_call_endpoints(self):
        """Test lawyer call booking endpoints"""
        print("\n📞 Testing Lawyer Call Endpoints...")
        
        if not self.session_token:
            print("❌ No session token available for lawyer call tests")
            return
        
        # Test get lawyer calls
        self.run_test("Get Lawyer Calls", "GET", "lawyer-calls", 200)
        
        # Test get next call
        self.run_test("Get Next Call", "GET", "lawyer-calls/next", 200)

    def test_profile_endpoints(self):
        """Test profile management endpoints"""
        print("\n👤 Testing Profile Endpoints...")
        
        if not self.session_token:
            print("❌ No session token available for profile tests")
            return
        
        # Test profile update
        profile_data = {
            "phone": "+1-555-0123",
            "state_of_residence": "California"
        }
        self.run_test("Update Profile", "PUT", "profile", 200, profile_data)

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Jasper Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        
        # Create test session for auth-gated endpoints
        session_created = self.create_test_session()
        
        # Run tests
        self.test_health_endpoints()
        self.test_public_endpoints()
        
        if session_created:
            self.test_auth_endpoints()
            self.test_dashboard_endpoints()
            self.test_case_endpoints()
            self.test_lawyer_call_endpoints()
            self.test_profile_endpoints()
        else:
            print("\n⚠️  Skipping auth-gated tests due to session creation failure")
        
        # Cleanup
        if session_created:
            self.cleanup_test_data()
        
        # Print summary
        print(f"\n📊 Test Summary: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed")
            return 1

def main():
    tester = JasperAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())