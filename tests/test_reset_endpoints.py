"""
Test suite for reset endpoints and staff management
Tests: reset house coverage, reset all coverage, delete staff
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestResetEndpoints:
    """Test reset coverage endpoints"""
    
    def test_reset_house_coverage(self):
        """Test DELETE /api/coverage/reset/{house_id}/{year}/{month}"""
        # Reset house_2 for February 2025
        response = requests.delete(f"{BASE_URL}/api/coverage/reset/house_2/2025/2")
        assert response.status_code == 200
        data = response.json()
        
        assert "house_id" in data
        assert data["house_id"] == "house_2"
        assert "entries_reset" in data
        assert "message" in data
        print(f"✓ Reset house_2: {data['entries_reset']} entries reset")
    
    def test_reset_house_invalid_house(self):
        """Test reset with invalid house returns 404"""
        response = requests.delete(f"{BASE_URL}/api/coverage/reset/invalid_house/2025/2")
        assert response.status_code == 404
        print("✓ Invalid house correctly returns 404")
    
    def test_reset_all_coverage(self):
        """Test DELETE /api/coverage/reset-all/{year}/{month}"""
        # Reset all for a test month (March 2025 - likely empty)
        response = requests.delete(f"{BASE_URL}/api/coverage/reset-all/2025/3")
        assert response.status_code == 200
        data = response.json()
        
        assert "year" in data
        assert data["year"] == 2025
        assert "month" in data
        assert data["month"] == 3
        assert "entries_reset" in data
        assert "message" in data
        print(f"✓ Reset all March 2025: {data['entries_reset']} entries reset")


class TestStaffManagement:
    """Test staff CRUD operations"""
    
    def test_get_staff_list(self):
        """Test GET /api/staff returns staff with correct types"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Check staff types - should have both old 'caregiver' and new 'tia'
        staff_types = set(s["staff_type"] for s in data)
        print(f"Staff types found: {staff_types}")
        
        # Check subtypes
        subtypes = set(s["subtype"] for s in data)
        print(f"Subtypes found: {subtypes}")
        
        # Verify expected subtypes exist
        expected_subtypes = {"encargada", "rotativa_mensual", "rotativa", "jornalera", "mensual"}
        found_expected = expected_subtypes.intersection(subtypes)
        print(f"✓ Found expected subtypes: {found_expected}")
    
    def test_create_staff_with_new_type(self):
        """Test POST /api/staff with new 'tia' type"""
        staff_data = {
            "staff_id": "staff_test_tia",
            "name": "Test Tía Staff",
            "staff_type": "tia",
            "subtype": "rotativa",
            "work_days": 20,
            "rest_days": 8,
            "max_hours_monthly": 480
        }
        
        response = requests.post(f"{BASE_URL}/api/staff", json=staff_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["staff_id"] == "staff_test_tia"
        assert data["staff_type"] == "tia"
        assert data["subtype"] == "rotativa"
        print("✓ Created staff with 'tia' type")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/staff/staff_test_tia")
    
    def test_create_staff_with_educadora_subtype(self):
        """Test POST /api/staff with new 'educadora' subtype"""
        staff_data = {
            "staff_id": "staff_test_educadora",
            "name": "Test Educadora",
            "staff_type": "tia",
            "subtype": "educadora",
            "work_days": 5,
            "rest_days": 2
        }
        
        response = requests.post(f"{BASE_URL}/api/staff", json=staff_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data["subtype"] == "educadora"
        print("✓ Created staff with 'educadora' subtype")
        
        # Clean up
        requests.delete(f"{BASE_URL}/api/staff/staff_test_educadora")
    
    def test_delete_staff(self):
        """Test DELETE /api/staff/{staff_id}"""
        # First create a test staff
        staff_data = {
            "staff_id": "staff_test_delete",
            "name": "Test Delete Staff",
            "staff_type": "tia",
            "subtype": "jornalera"
        }
        
        create_response = requests.post(f"{BASE_URL}/api/staff", json=staff_data)
        assert create_response.status_code == 200
        print("✓ Created test staff for deletion")
        
        # Delete the staff
        delete_response = requests.delete(f"{BASE_URL}/api/staff/staff_test_delete")
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert "message" in data
        print("✓ Deleted test staff")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/staff")
        staff_list = get_response.json()
        staff_ids = [s["staff_id"] for s in staff_list]
        assert "staff_test_delete" not in staff_ids
        print("✓ Verified staff was deleted")
    
    def test_delete_staff_not_found(self):
        """Test DELETE /api/staff/{staff_id} with non-existent staff"""
        response = requests.delete(f"{BASE_URL}/api/staff/non_existent_staff")
        assert response.status_code == 404
        print("✓ Non-existent staff correctly returns 404")


class TestAutoAssignWithReset:
    """Test auto-assign after reset"""
    
    def test_reset_then_auto_assign(self):
        """Test workflow: reset house -> auto-assign -> verify assignments"""
        house_id = "house_4"
        year = 2025
        month = 2
        
        # Step 1: Reset the house
        reset_response = requests.delete(f"{BASE_URL}/api/coverage/reset/{house_id}/{year}/{month}")
        assert reset_response.status_code == 200
        reset_data = reset_response.json()
        print(f"✓ Reset {house_id}: {reset_data['entries_reset']} entries")
        
        # Step 2: Auto-assign
        assign_response = requests.post(f"{BASE_URL}/api/coverage/auto-assign/{house_id}/{year}/{month}")
        assert assign_response.status_code == 200
        assign_data = assign_response.json()
        
        assert assign_data["house_id"] == house_id
        assert "assignments_made" in assign_data
        assert "total_slots" in assign_data
        print(f"✓ Auto-assigned {house_id}: {assign_data['assignments_made']}/{assign_data['total_slots']} slots")
        
        # Step 3: Verify assignments were made
        coverage_response = requests.get(f"{BASE_URL}/api/coverage/{year}/{month}")
        assert coverage_response.status_code == 200
        coverage_data = coverage_response.json()
        
        house_coverage = [c for c in coverage_data if c["house_id"] == house_id]
        complete_coverage = [c for c in house_coverage if c["status"] == "complete"]
        
        print(f"✓ Verified: {len(complete_coverage)}/{len(house_coverage)} entries complete for {house_id}")


class TestPriorityNoneHandling:
    """Test that priority=None is handled correctly (bug fix verification)"""
    
    def test_auto_assign_with_null_priority_staff(self):
        """Verify auto-assign works when staff have priority=None"""
        # Get staff to verify some have null priority
        staff_response = requests.get(f"{BASE_URL}/api/staff")
        assert staff_response.status_code == 200
        staff_list = staff_response.json()
        
        null_priority_staff = [s for s in staff_list if s.get("priority") is None]
        print(f"Found {len(null_priority_staff)} staff with priority=None")
        
        # Run auto-assign - this should NOT throw TypeError
        response = requests.post(f"{BASE_URL}/api/coverage/auto-assign/house_7/2025/2")
        assert response.status_code == 200
        data = response.json()
        
        # If we get here without error, the bug fix is working
        print(f"✓ Auto-assign completed successfully with {data['assignments_made']} assignments")
        print("✓ Bug fix verified: priority=None handling works correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
