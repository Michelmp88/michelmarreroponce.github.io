import requests
import sys
from datetime import datetime
import json

class StaffCoverageAPITester:
    def __init__(self, base_url="https://careshift-11.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")

            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": response.status_code,
                "success": success,
                "response_size": len(response.text) if response.text else 0
            })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.test_results.append({
                "name": name,
                "method": method,
                "endpoint": endpoint,
                "expected_status": expected_status,
                "actual_status": "ERROR",
                "success": False,
                "error": str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        success, response = self.run_test(
            "Root API Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_get_houses(self):
        """Test getting all houses"""
        success, response = self.run_test(
            "Get All Houses",
            "GET",
            "houses",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} houses")
            if len(response) > 0:
                print(f"   Sample house: {response[0].get('name', 'N/A')}")
        return success, response

    def test_get_staff(self):
        """Test getting all staff"""
        success, response = self.run_test(
            "Get All Staff",
            "GET",
            "staff",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} staff members")
            caregivers = [s for s in response if s.get('staff_type') == 'caregiver']
            assistants = [s for s in response if s.get('staff_type') == 'assistant']
            print(f"   Caregivers: {len(caregivers)}, Assistants: {len(assistants)}")
        return success, response

    def test_get_coverage_january_2025(self):
        """Test getting coverage for January 2025"""
        success, response = self.run_test(
            "Get Coverage January 2025",
            "GET",
            "coverage/2025/1",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} coverage entries")
            complete = len([c for c in response if c.get('status') == 'complete'])
            incomplete = len([c for c in response if c.get('status') == 'incomplete'])
            print(f"   Complete: {complete}, Incomplete: {incomplete}")
        return success, response

    def test_get_coverage_gaps(self):
        """Test getting coverage gaps for January 2025"""
        success, response = self.run_test(
            "Get Coverage Gaps January 2025",
            "GET",
            "coverage/gaps/2025/1",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} gaps")
        return success, response

    def test_get_monthly_stats(self):
        """Test getting monthly statistics"""
        success, response = self.run_test(
            "Get Monthly Stats January 2025",
            "GET",
            "stats/2025/1",
            200
        )
        if success and isinstance(response, dict):
            print(f"   Stats: Total={response.get('total')}, Complete={response.get('complete')}, Incomplete={response.get('incomplete')}")
            print(f"   Completion Rate: {response.get('completion_rate')}%")
        return success, response

    def test_coverage_assignment_flow(self, coverage_entries, staff_list):
        """Test the complete assignment flow"""
        if not coverage_entries or not staff_list:
            print("❌ Cannot test assignment flow - missing data")
            return False

        # Find an incomplete coverage entry
        incomplete_entry = None
        for entry in coverage_entries:
            if entry.get('status') == 'incomplete':
                incomplete_entry = entry
                break

        if not incomplete_entry:
            print("❌ No incomplete coverage entries found for testing")
            return False

        # Find appropriate staff for assignment
        coverage_type = incomplete_entry.get('coverage_type')
        appropriate_staff = None
        
        for staff in staff_list:
            if coverage_type == 'caregiver_24h' and staff.get('staff_type') == 'caregiver':
                appropriate_staff = staff
                break
            elif coverage_type == 'assistant_8h' and staff.get('staff_type') == 'assistant':
                appropriate_staff = staff
                break

        if not appropriate_staff:
            print("❌ No appropriate staff found for testing")
            return False

        coverage_id = incomplete_entry.get('coverage_id')
        staff_id = appropriate_staff.get('staff_id')

        print(f"\n🔄 Testing assignment flow:")
        print(f"   Coverage ID: {coverage_id}")
        print(f"   Staff: {appropriate_staff.get('name')} ({staff_id})")

        # Test assignment
        success, response = self.run_test(
            "Assign Staff to Coverage",
            "PUT",
            f"coverage/{coverage_id}",
            200,
            data={"assigned_staff_id": staff_id}
        )

        if success:
            print(f"   ✅ Assignment successful")
            print(f"   Status: {response.get('status')}")
            print(f"   Assigned to: {response.get('assigned_staff_name')}")

            # Test unassignment
            success_unassign, response_unassign = self.run_test(
                "Unassign Staff from Coverage",
                "PUT",
                f"coverage/{coverage_id}",
                200,
                data={"assigned_staff_id": None}
            )

            if success_unassign:
                print(f"   ✅ Unassignment successful")
                print(f"   Status: {response_unassign.get('status')}")

            return success and success_unassign

        return False

def main():
    print("🚀 Starting Staff Coverage Management System API Tests")
    print("=" * 60)
    
    tester = StaffCoverageAPITester()
    
    # Test basic endpoints
    print("\n📋 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    
    # Test data retrieval
    print("\n📊 Testing Data Retrieval...")
    houses_success, houses = tester.test_get_houses()
    staff_success, staff = tester.test_get_staff()
    coverage_success, coverage = tester.test_get_coverage_january_2025()
    gaps_success, gaps = tester.test_get_coverage_gaps()
    stats_success, stats = tester.test_get_monthly_stats()
    
    # Test assignment flow if data is available
    if coverage_success and staff_success:
        print("\n🔄 Testing Assignment Flow...")
        tester.test_coverage_assignment_flow(coverage, staff)
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 Final Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        failed_tests = [t for t in tester.test_results if not t['success']]
        print(f"\nFailed tests:")
        for test in failed_tests:
            print(f"  - {test['name']}: Expected {test['expected_status']}, got {test['actual_status']}")
        return 1

if __name__ == "__main__":
    sys.exit(main())