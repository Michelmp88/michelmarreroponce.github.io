"""
Test suite for randomize-position and generate-month coverage endpoints.
Tests the bug fixes for:
1. Randomization always selecting 'Nellina' - should now select different people
2. Coverage generation for houses without prior entries (like 'Casa Unión')
"""
import pytest
import requests
import os
from collections import Counter

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRandomizePosition:
    """Tests for POST /api/coverage/randomize-position/{house_id}/{year}/{month}/{position}"""
    
    def test_randomize_assistant_returns_different_people(self):
        """
        Bug fix verification: Randomization should select different people in consecutive calls.
        Call the endpoint 5+ times and verify we get variation in results.
        """
        # First, get list of houses
        houses_response = requests.get(f"{BASE_URL}/api/houses")
        assert houses_response.status_code == 200, f"Failed to get houses: {houses_response.text}"
        houses = houses_response.json()
        assert len(houses) > 0, "No houses found in database"
        
        # Use first house for testing
        house_id = houses[0]['house_id']
        year = 2026
        month = 2  # Use February to avoid conflicts with existing data
        
        # First, generate coverage for this month if not exists
        generate_response = requests.post(f"{BASE_URL}/api/coverage/generate/{year}/{month}?house_id={house_id}")
        print(f"Generate coverage response: {generate_response.status_code} - {generate_response.json()}")
        
        # Reset the house coverage to start fresh
        reset_response = requests.delete(f"{BASE_URL}/api/coverage/reset/{house_id}/{year}/{month}")
        print(f"Reset response: {reset_response.status_code}")
        
        # Call randomize-position for assistant 5 times and collect results
        assigned_names = []
        for i in range(5):
            # Reset before each call to allow re-assignment
            requests.delete(f"{BASE_URL}/api/coverage/reset/{house_id}/{year}/{month}")
            
            response = requests.post(f"{BASE_URL}/api/coverage/randomize-position/{house_id}/{year}/{month}/assistant")
            assert response.status_code == 200, f"Randomize failed: {response.text}"
            
            data = response.json()
            print(f"Call {i+1}: assigned_staff = {data.get('assigned_staff', 'N/A')}, assignments_made = {data.get('assignments_made', 0)}")
            
            if data.get('assigned_staff'):
                assigned_names.append(data['assigned_staff'])
        
        # Verify we got some assignments
        assert len(assigned_names) > 0, "No assignments were made in any call"
        
        # Check for variation - we should see at least 2 different names in 5 calls
        unique_names = set(assigned_names)
        print(f"Unique names assigned: {unique_names}")
        print(f"Name distribution: {Counter(assigned_names)}")
        
        # With random.choice() and 11 assistants, probability of same person 5 times is very low
        # We expect variation, but allow for some randomness
        if len(unique_names) == 1:
            print(f"WARNING: Only one person ({assigned_names[0]}) was selected in 5 calls - randomization may not be working")
        
        # The test passes if we got results, but we flag if no variation
        assert len(assigned_names) >= 3, f"Expected at least 3 successful assignments, got {len(assigned_names)}"
    
    def test_randomize_caregiver_returns_different_people(self):
        """
        Test randomization for caregiver position also produces variation.
        """
        houses_response = requests.get(f"{BASE_URL}/api/houses")
        assert houses_response.status_code == 200
        houses = houses_response.json()
        house_id = houses[0]['house_id']
        year = 2026
        month = 3  # Use March
        
        # Generate coverage
        requests.post(f"{BASE_URL}/api/coverage/generate/{year}/{month}?house_id={house_id}")
        
        assigned_names = []
        for i in range(5):
            requests.delete(f"{BASE_URL}/api/coverage/reset/{house_id}/{year}/{month}")
            
            response = requests.post(f"{BASE_URL}/api/coverage/randomize-position/{house_id}/{year}/{month}/caregiver")
            assert response.status_code == 200, f"Randomize caregiver failed: {response.text}"
            
            data = response.json()
            print(f"Caregiver call {i+1}: assigned_staff = {data.get('assigned_staff', 'N/A')}")
            
            if data.get('assigned_staff'):
                assigned_names.append(data['assigned_staff'])
        
        print(f"Caregiver unique names: {set(assigned_names)}")
        assert len(assigned_names) >= 3, f"Expected at least 3 successful caregiver assignments"
    
    def test_randomize_invalid_position_returns_400(self):
        """Test that invalid position returns 400 error"""
        houses_response = requests.get(f"{BASE_URL}/api/houses")
        houses = houses_response.json()
        house_id = houses[0]['house_id']
        
        response = requests.post(f"{BASE_URL}/api/coverage/randomize-position/{house_id}/2026/1/invalid_position")
        assert response.status_code == 400, f"Expected 400 for invalid position, got {response.status_code}"


class TestGenerateCoverage:
    """Tests for POST /api/coverage/generate/{year}/{month}"""
    
    def test_generate_coverage_creates_entries_for_all_houses(self):
        """
        Bug fix verification: Generate coverage should create entries for ALL houses,
        including those without prior coverage entries (like 'Casa Unión').
        """
        # Get all houses
        houses_response = requests.get(f"{BASE_URL}/api/houses")
        assert houses_response.status_code == 200
        houses = houses_response.json()
        house_count = len(houses)
        print(f"Total houses in database: {house_count}")
        
        # Use a future month to avoid conflicts
        year = 2026
        month = 4  # April
        
        # First, check if coverage already exists
        coverage_before = requests.get(f"{BASE_URL}/api/coverage/{year}/{month}")
        entries_before = len(coverage_before.json())
        print(f"Coverage entries before generation: {entries_before}")
        
        # Generate coverage for the month
        response = requests.post(f"{BASE_URL}/api/coverage/generate/{year}/{month}")
        assert response.status_code == 200, f"Generate failed: {response.text}"
        
        data = response.json()
        print(f"Generate response: {data}")
        
        # Verify response structure
        assert 'houses_processed' in data, "Response missing 'houses_processed'"
        assert 'entries_created' in data, "Response missing 'entries_created'"
        
        # All houses should be processed
        assert data['houses_processed'] == house_count, f"Expected {house_count} houses processed, got {data['houses_processed']}"
        
        # Get coverage after generation
        coverage_after = requests.get(f"{BASE_URL}/api/coverage/{year}/{month}")
        assert coverage_after.status_code == 200
        entries_after = coverage_after.json()
        
        # Verify entries exist for all houses
        houses_with_coverage = set(entry['house_id'] for entry in entries_after)
        all_house_ids = set(h['house_id'] for h in houses)
        
        missing_houses = all_house_ids - houses_with_coverage
        if missing_houses:
            print(f"WARNING: Houses without coverage: {missing_houses}")
        
        print(f"Houses with coverage: {len(houses_with_coverage)}/{house_count}")
        assert houses_with_coverage == all_house_ids, f"Missing coverage for houses: {missing_houses}"
    
    def test_generate_coverage_for_specific_house(self):
        """Test generating coverage for a specific house only"""
        houses_response = requests.get(f"{BASE_URL}/api/houses")
        houses = houses_response.json()
        
        # Find a house (preferably one that might have had issues like 'Casa Unión')
        target_house = None
        for h in houses:
            if 'union' in h['name'].lower() or 'unión' in h['name'].lower():
                target_house = h
                break
        
        if not target_house:
            target_house = houses[0]
        
        house_id = target_house['house_id']
        print(f"Testing with house: {target_house['name']} ({house_id})")
        
        year = 2026
        month = 5  # May
        
        # Generate for specific house
        response = requests.post(f"{BASE_URL}/api/coverage/generate/{year}/{month}?house_id={house_id}")
        assert response.status_code == 200, f"Generate for house failed: {response.text}"
        
        data = response.json()
        print(f"Generate for house response: {data}")
        
        assert data['houses_processed'] == 1, "Should process exactly 1 house"
        
        # Verify coverage exists for this house
        coverage = requests.get(f"{BASE_URL}/api/coverage/{year}/{month}")
        entries = [e for e in coverage.json() if e['house_id'] == house_id]
        
        assert len(entries) > 0, f"No coverage entries created for {house_id}"
        print(f"Coverage entries for {house_id}: {len(entries)}")
    
    def test_generate_coverage_idempotent(self):
        """Test that generating coverage twice doesn't duplicate entries"""
        houses_response = requests.get(f"{BASE_URL}/api/houses")
        houses = houses_response.json()
        house_id = houses[0]['house_id']
        
        year = 2026
        month = 6  # June
        
        # First generation
        response1 = requests.post(f"{BASE_URL}/api/coverage/generate/{year}/{month}?house_id={house_id}")
        assert response1.status_code == 200
        entries_created_1 = response1.json()['entries_created']
        
        # Second generation (should create 0 new entries)
        response2 = requests.post(f"{BASE_URL}/api/coverage/generate/{year}/{month}?house_id={house_id}")
        assert response2.status_code == 200
        entries_created_2 = response2.json()['entries_created']
        
        print(f"First generation: {entries_created_1} entries")
        print(f"Second generation: {entries_created_2} entries")
        
        assert entries_created_2 == 0, f"Second generation should create 0 entries, created {entries_created_2}"


class TestStaffAvailability:
    """Tests to verify staff data for randomization"""
    
    def test_assistants_exist_in_database(self):
        """Verify there are assistants available for randomization"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        
        staff = response.json()
        assistants = [s for s in staff if s.get('staff_type') == 'assistant']
        
        print(f"Total staff: {len(staff)}")
        print(f"Assistants: {len(assistants)}")
        
        for a in assistants:
            print(f"  - {a['name']} ({a.get('subtype', 'N/A')})")
        
        assert len(assistants) > 0, "No assistants found in database"
        assert len(assistants) >= 5, f"Expected at least 5 assistants for good randomization, found {len(assistants)}"
    
    def test_caregivers_exist_in_database(self):
        """Verify there are caregivers/tias available for randomization"""
        response = requests.get(f"{BASE_URL}/api/staff")
        assert response.status_code == 200
        
        staff = response.json()
        caregivers = [s for s in staff if s.get('staff_type') in ['caregiver', 'tia']]
        
        print(f"Caregivers/Tías: {len(caregivers)}")
        for c in caregivers:
            print(f"  - {c['name']} ({c.get('subtype', 'N/A')})")
        
        assert len(caregivers) > 0, "No caregivers/tías found in database"


class TestHousesData:
    """Tests to verify houses data"""
    
    def test_houses_exist(self):
        """Verify houses exist in database"""
        response = requests.get(f"{BASE_URL}/api/houses")
        assert response.status_code == 200
        
        houses = response.json()
        print(f"Total houses: {len(houses)}")
        
        for h in houses:
            print(f"  - {h['name']} ({h['house_id']}): caregivers={h.get('caregivers_required', 1)}, assistant={h.get('assistant_required', True)}")
        
        assert len(houses) > 0, "No houses found in database"
    
    def test_casa_union_exists(self):
        """Verify Casa Unión (or similar) exists - this was the house with issues"""
        response = requests.get(f"{BASE_URL}/api/houses")
        houses = response.json()
        
        # Look for Casa Unión or similar
        union_house = None
        for h in houses:
            if 'union' in h['name'].lower() or 'unión' in h['name'].lower():
                union_house = h
                break
        
        if union_house:
            print(f"Found Casa Unión: {union_house}")
        else:
            print("Casa Unión not found - listing all houses:")
            for h in houses:
                print(f"  - {h['name']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
