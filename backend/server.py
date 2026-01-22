from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
from datetime import datetime, timezone, date, timedelta
from enum import Enum
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

class StaffType(str, Enum):
    TIA = "tia"
    CAREGIVER = "caregiver"  # Keep for backwards compatibility with existing data
    ASSISTANT = "assistant"

class TiaSubtype(str, Enum):
    ROTATIVA = "rotativa"
    ROTATIVA_MENSUAL = "rotativa_mensual"  # Keep for backwards compatibility
    ENCARGADA = "encargada"
    JORNALERA = "jornalera"
    EDUCADORA = "educadora"

class AssistantSubtype(str, Enum):
    MENSUAL = "mensual"
    JORNALERA = "jornalera"

class CoverageType(str, Enum):
    CAREGIVER_24H = "caregiver_24h"
    ASSISTANT_8H = "assistant_8h"

class CoverageStatus(str, Enum):
    COMPLETE = "complete"
    PARTIAL = "partial"
    INCOMPLETE = "incomplete"

class AbsenceType(str, Enum):
    LICENCIA = "licencia"
    ENFERMEDAD = "enfermedad"
    VACACIONES = "vacaciones"
    PERMISO = "permiso"
    OTRO = "otro"

class House(BaseModel):
    model_config = ConfigDict(extra="ignore")
    house_id: str
    name: str
    caregivers_required: int
    assistant_required: bool
    encargada_staff_id: Optional[str] = None
    # Shifts define the time slots for coverage (e.g., ["06:00-14:00", "14:00-22:00", "22:00-06:00"])
    shifts: Optional[List[str]] = None  # If None, uses single 24h coverage
    notes: Optional[str] = None

class HouseCreate(BaseModel):
    house_id: str
    name: str
    caregivers_required: int
    assistant_required: bool
    encargada_staff_id: Optional[str] = None
    shifts: Optional[List[str]] = None
    notes: Optional[str] = None

class Staff(BaseModel):
    model_config = ConfigDict(extra="ignore")
    staff_id: str
    name: str
    staff_type: StaffType
    subtype: str
    work_days: Optional[int] = None
    rest_days: Optional[int] = None
    weekly_hours: Optional[int] = None
    max_hours_daily: Optional[int] = None
    max_hours_monthly: Optional[int] = None
    hours_per_shift: Optional[int] = None
    priority: Optional[int] = None
    fixed_house_id: Optional[str] = None
    # New fields for house preferences
    excluded_houses: Optional[List[str]] = None  # Houses this person cannot cover
    preferred_house_1: Optional[str] = None  # First priority house preference
    preferred_house_2: Optional[str] = None  # Second priority house preference
    preferred_house_3: Optional[str] = None  # Third priority house preference
    # Specific work schedule (time format HH:MM-HH:MM)
    specific_schedule: Optional[str] = None  # e.g., "08:00-16:00"
    work_schedule: Optional[str] = None
    # Specific work days (list of day names in Spanish)
    specific_work_days: Optional[List[str]] = None  # e.g., ["lunes", "martes", "miercoles", "jueves", "viernes"]
    notes: Optional[str] = None

class StaffCreate(BaseModel):
    staff_id: str
    name: str
    staff_type: StaffType
    subtype: str
    work_days: Optional[int] = None
    rest_days: Optional[int] = None
    weekly_hours: Optional[int] = None
    max_hours_daily: Optional[int] = None
    max_hours_monthly: Optional[int] = None
    hours_per_shift: Optional[int] = None
    priority: Optional[int] = None
    fixed_house_id: Optional[str] = None
    excluded_houses: Optional[List[str]] = None
    preferred_house_1: Optional[str] = None
    preferred_house_2: Optional[str] = None
    preferred_house_3: Optional[str] = None
    specific_schedule: Optional[str] = None
    work_schedule: Optional[str] = None
    specific_work_days: Optional[List[str]] = None  # e.g., ["lunes", "martes", "miercoles"]
    notes: Optional[str] = None

class CoverageEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coverage_id: str
    date: str
    house_id: str
    coverage_type: CoverageType
    shift_time: Optional[str] = None  # e.g., "06:00-14:00" - specific shift for this coverage
    assigned_staff_id: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    status: CoverageStatus
    notes: Optional[str] = None

class CoverageEntryCreate(BaseModel):
    date: str
    house_id: str
    coverage_type: CoverageType
    shift_time: Optional[str] = None
    assigned_staff_id: Optional[str] = None
    notes: Optional[str] = None

class CoverageEntryUpdate(BaseModel):
    assigned_staff_id: Optional[str] = None
    shift_time: Optional[str] = None
    notes: Optional[str] = None

class Absence(BaseModel):
    model_config = ConfigDict(extra="ignore")
    absence_id: str
    staff_id: str
    staff_name: Optional[str] = None
    start_date: str
    end_date: str
    absence_type: AbsenceType
    notes: Optional[str] = None

class AbsenceCreate(BaseModel):
    staff_id: str
    start_date: str
    end_date: str
    absence_type: AbsenceType
    notes: Optional[str] = None

class AutoAssignResult(BaseModel):
    house_id: str
    total_assignments: int
    assignments_made: int
    assignments_details: List[Dict]

@api_router.get("/")
async def root():
    return {"message": "Sistema de Gestión de Coberturas"}

@api_router.get("/houses", response_model=List[House])
async def get_houses():
    houses = await db.houses.find({}, {"_id": 0}).to_list(100)
    return houses

@api_router.post("/houses", response_model=House)
async def create_house(house: HouseCreate):
    house_dict = house.model_dump()
    await db.houses.insert_one(house_dict)
    return House(**house_dict)

@api_router.put("/houses/{house_id}", response_model=House)
async def update_house(house_id: str, house: HouseCreate):
    existing = await db.houses.find_one({"house_id": house_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="House not found")
    
    house_dict = house.model_dump()
    await db.houses.update_one({"house_id": house_id}, {"$set": house_dict})
    
    updated = await db.houses.find_one({"house_id": house_id}, {"_id": 0})
    return House(**updated)

@api_router.delete("/houses/{house_id}")
async def delete_house(house_id: str):
    result = await db.houses.delete_one({"house_id": house_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="House not found")
    return {"message": "House deleted successfully"}

@api_router.get("/staff", response_model=List[Staff])
async def get_staff():
    staff_list = await db.staff.find({}, {"_id": 0}).to_list(100)
    return staff_list

@api_router.post("/staff", response_model=Staff)
async def create_staff(staff: StaffCreate):
    staff_dict = staff.model_dump()
    await db.staff.insert_one(staff_dict)
    return Staff(**staff_dict)

@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str):
    result = await db.staff.delete_one({"staff_id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staff not found")
    return {"message": "Staff deleted successfully"}

@api_router.put("/staff/{staff_id}", response_model=Staff)
async def update_staff(staff_id: str, staff: StaffCreate):
    existing = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    staff_dict = staff.model_dump()
    staff_dict["staff_id"] = staff_id
    await db.staff.update_one({"staff_id": staff_id}, {"$set": staff_dict})
    
    updated = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    return Staff(**updated)

@api_router.get("/coverage/{year}/{month}", response_model=List[CoverageEntry])
async def get_coverage_by_month(year: int, month: int):
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    coverage_entries = await db.coverage.find(
        {"date": {"$gte": start_date, "$lt": end_date}},
        {"_id": 0}
    ).to_list(1000)
    
    return coverage_entries

@api_router.post("/coverage/generate/{year}/{month}")
async def generate_month_coverage(year: int, month: int, house_id: str = None):
    """
    Generate empty coverage entries for a month.
    If house_id is provided, generates only for that house.
    Otherwise, generates for all houses.
    
    Now supports shifts: if a house has shifts defined, creates one entry per shift per day.
    """
    import uuid
    from calendar import monthrange
    
    # Get number of days in the month
    _, days_in_month = monthrange(year, month)
    
    # Get houses
    if house_id:
        houses = await db.houses.find({"house_id": house_id}, {"_id": 0}).to_list(1)
        if not houses:
            raise HTTPException(status_code=404, detail="House not found")
    else:
        houses = await db.houses.find({}, {"_id": 0}).to_list(100)
    
    entries_created = 0
    
    for house in houses:
        h_id = house["house_id"]
        assistant_required = house.get("assistant_required", True)
        shifts = house.get("shifts") or []  # List of shifts like ["06:00-14:00", "14:00-22:00", "22:00-06:00"]
        
        for day in range(1, days_in_month + 1):
            date_str = f"{year}-{month:02d}-{day:02d}"
            
            if shifts:
                # House has defined shifts - create one entry per shift
                for shift in shifts:
                    existing = await db.coverage.find_one({
                        "house_id": h_id,
                        "date": date_str,
                        "coverage_type": "caregiver_24h",
                        "shift_time": shift
                    })
                    if not existing:
                        coverage_id = f"cov_{h_id}_{date_str}_shift_{shift.replace(':', '')}_{uuid.uuid4().hex[:8]}"
                        await db.coverage.insert_one({
                            "coverage_id": coverage_id,
                            "house_id": h_id,
                            "date": date_str,
                            "coverage_type": "caregiver_24h",
                            "shift_time": shift,
                            "assigned_staff_id": None,
                            "assigned_staff_name": None,
                            "status": "incomplete"
                        })
                        entries_created += 1
            else:
                # No shifts defined - use old behavior with caregivers_required
                caregivers_required = house.get("caregivers_required", 1)
                existing_caregiver_count = await db.coverage.count_documents({
                    "house_id": h_id,
                    "date": date_str,
                    "coverage_type": "caregiver_24h"
                })
                
                for i in range(existing_caregiver_count, caregivers_required):
                    coverage_id = f"cov_{h_id}_{date_str}_caregiver_{i}_{uuid.uuid4().hex[:8]}"
                    await db.coverage.insert_one({
                        "coverage_id": coverage_id,
                        "house_id": h_id,
                        "date": date_str,
                        "coverage_type": "caregiver_24h",
                        "shift_time": None,
                        "assigned_staff_id": None,
                        "assigned_staff_name": None,
                        "status": "incomplete"
                    })
                    entries_created += 1
            
            # Create assistant entry if required and doesn't exist
            if assistant_required:
                existing_assistant = await db.coverage.find_one({
                    "house_id": h_id,
                    "date": date_str,
                    "coverage_type": "assistant_8h"
                })
                if not existing_assistant:
                    coverage_id = f"cov_{h_id}_{date_str}_assistant_{uuid.uuid4().hex[:8]}"
                    await db.coverage.insert_one({
                        "coverage_id": coverage_id,
                        "house_id": h_id,
                        "date": date_str,
                        "coverage_type": "assistant_8h",
                        "shift_time": None,
                        "assigned_staff_id": None,
                        "assigned_staff_name": None,
                        "status": "incomplete"
                    })
                    entries_created += 1
    
    return {
        "year": year,
        "month": month,
        "houses_processed": len(houses),
        "entries_created": entries_created,
        "message": f"Se generaron {entries_created} entradas de cobertura para {len(houses)} casa(s)"
    }

@api_router.post("/coverage", response_model=CoverageEntry)
async def create_coverage(coverage: CoverageEntryCreate):
    import uuid
    coverage_id = str(uuid.uuid4())
    
    assigned_staff_name = None
    if coverage.assigned_staff_id:
        staff = await db.staff.find_one({"staff_id": coverage.assigned_staff_id}, {"_id": 0})
        if staff:
            assigned_staff_name = staff.get("name")
    
    status = CoverageStatus.COMPLETE if coverage.assigned_staff_id else CoverageStatus.INCOMPLETE
    
    coverage_dict = coverage.model_dump()
    coverage_dict["coverage_id"] = coverage_id
    coverage_dict["assigned_staff_name"] = assigned_staff_name
    coverage_dict["status"] = status
    
    await db.coverage.insert_one(coverage_dict)
    return CoverageEntry(**coverage_dict)

@api_router.put("/coverage/{coverage_id}", response_model=CoverageEntry)
async def update_coverage(coverage_id: str, update: CoverageEntryUpdate):
    existing = await db.coverage.find_one({"coverage_id": coverage_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Coverage entry not found")
    
    update_dict = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if "assigned_staff_id" in update_dict:
        if update_dict["assigned_staff_id"]:
            staff = await db.staff.find_one({"staff_id": update_dict["assigned_staff_id"]}, {"_id": 0})
            if staff:
                update_dict["assigned_staff_name"] = staff.get("name")
            update_dict["status"] = CoverageStatus.COMPLETE
        else:
            update_dict["assigned_staff_name"] = None
            update_dict["status"] = CoverageStatus.INCOMPLETE
    
    await db.coverage.update_one({"coverage_id": coverage_id}, {"$set": update_dict})
    
    updated = await db.coverage.find_one({"coverage_id": coverage_id}, {"_id": 0})
    return CoverageEntry(**updated)

@api_router.delete("/coverage/{coverage_id}")
async def delete_coverage(coverage_id: str):
    result = await db.coverage.delete_one({"coverage_id": coverage_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Coverage entry not found")
    return {"message": "Coverage deleted successfully"}

class BulkAssignRequest(BaseModel):
    staff_id: str
    dates: List[str]  # List of dates in YYYY-MM-DD format
    coverage_type: str  # "caregiver_24h" or "assistant_8h"

@api_router.post("/coverage/bulk-assign/{house_id}")
async def bulk_assign_coverage(house_id: str, request: BulkAssignRequest):
    """
    Assign a staff member to multiple days at once.
    Useful for assigning consecutive or alternate days without going day by day.
    """
    house = await db.houses.find_one({"house_id": house_id}, {"_id": 0})
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    staff = await db.staff.find_one({"staff_id": request.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    assignments_made = 0
    assignments_failed = 0
    
    for date_str in request.dates:
        # Find the coverage entry for this date and house
        entry = await db.coverage.find_one({
            "house_id": house_id,
            "date": date_str,
            "coverage_type": request.coverage_type
        }, {"_id": 0})
        
        if entry:
            await db.coverage.update_one(
                {"coverage_id": entry["coverage_id"]},
                {
                    "$set": {
                        "assigned_staff_id": staff["staff_id"],
                        "assigned_staff_name": staff["name"],
                        "status": "complete"
                    }
                }
            )
            assignments_made += 1
        else:
            assignments_failed += 1
    
    return {
        "house_id": house_id,
        "staff_name": staff["name"],
        "dates_requested": len(request.dates),
        "assignments_made": assignments_made,
        "assignments_failed": assignments_failed,
        "message": f"Se asignó a {staff['name']} en {assignments_made} días"
    }

@api_router.post("/coverage/randomize-position/{house_id}/{year}/{month}/{position}")
async def randomize_position_coverage(house_id: str, year: int, month: int, position: str):
    """
    Assign ONE staff member to ALL days of the month for a specific position.
    Selects randomly among available staff, with preference for compatible staff.
    Position can be: 'caregiver' or 'assistant'
    """
    import random
    
    house = await db.houses.find_one({"house_id": house_id}, {"_id": 0})
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    # Determine coverage type based on position
    if position == "caregiver":
        coverage_type = "caregiver_24h"
        staff_filter = {"staff_type": {"$in": ["caregiver", "tia"]}}
    elif position == "assistant":
        coverage_type = "assistant_8h"
        staff_filter = {"staff_type": "assistant"}
    else:
        raise HTTPException(status_code=400, detail="Position must be 'caregiver' or 'assistant'")
    
    # Get all coverage entries for this position
    entries = await db.coverage.find(
        {
            "house_id": house_id,
            "date": {"$gte": start_date, "$lt": end_date},
            "coverage_type": coverage_type
        },
        {"_id": 0}
    ).to_list(1000)
    
    if not entries:
        return {
            "house_id": house_id,
            "position": position,
            "message": "No hay entradas de cobertura para este mes. Primero genera la cobertura del mes.",
            "assignments_made": 0
        }
    
    # Get available staff for this position
    all_staff = await db.staff.find(staff_filter, {"_id": 0}).to_list(100)
    
    if not all_staff:
        return {
            "house_id": house_id,
            "position": position,
            "message": "No hay personal disponible para esta posición",
            "assignments_made": 0
        }
    
    # Filter staff that are not excluded from this house
    available_staff = []
    for staff in all_staff:
        excluded = staff.get("excluded_houses") or []
        if house_id not in excluded:
            available_staff.append(staff)
    
    if not available_staff:
        return {
            "house_id": house_id,
            "position": position,
            "message": "No hay personal compatible con esta casa (todos excluidos)",
            "assignments_made": 0
        }
    
    # Randomly select ONE person from available staff
    selected_staff = random.choice(available_staff)
    
    # Assign this ONE person to ALL days
    assignments_made = 0
    skipped_absence = 0
    skipped_other = 0
    
    for entry in entries:
        check_date = entry["date"]
        
        # Check if staff has absence on this day
        absence = await db.absences.find_one({
            "staff_id": selected_staff["staff_id"],
            "start_date": {"$lte": check_date},
            "end_date": {"$gte": check_date}
        })
        
        if absence:
            skipped_absence += 1
            continue
        
        # Check if already assigned to another house on this day
        other_assignment = await db.coverage.find_one({
            "assigned_staff_id": selected_staff["staff_id"],
            "date": check_date,
            "house_id": {"$ne": house_id},
            "status": "complete"
        })
        
        if other_assignment:
            skipped_other += 1
            continue
        
        await db.coverage.update_one(
            {"coverage_id": entry["coverage_id"]},
            {
                "$set": {
                    "assigned_staff_id": selected_staff["staff_id"],
                    "assigned_staff_name": selected_staff["name"],
                    "status": "complete"
                }
            }
        )
        assignments_made += 1
    
    message = f"Se asignó a {selected_staff['name']} en {assignments_made} días"
    if skipped_absence > 0:
        message += f" ({skipped_absence} días omitidos por ausencia)"
    if skipped_other > 0:
        message += f" ({skipped_other} días omitidos por asignación en otra casa)"
    
    return {
        "house_id": house_id,
        "position": position,
        "total_entries": len(entries),
        "assignments_made": assignments_made,
        "assigned_staff": selected_staff["name"],
        "message": message
    }

@api_router.get("/coverage/gaps/{year}/{month}")
async def get_coverage_gaps(year: int, month: int):
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    gaps = await db.coverage.find(
        {
            "date": {"$gte": start_date, "$lt": end_date},
            "status": {"$in": [CoverageStatus.INCOMPLETE, CoverageStatus.PARTIAL]}
        },
        {"_id": 0}
    ).to_list(1000)
    
    return gaps

@api_router.get("/staff/{staff_id}/hours/{year}/{month}")
async def get_staff_hours(staff_id: str, year: int, month: int):
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    staff = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    assignments = await db.coverage.find(
        {
            "assigned_staff_id": staff_id,
            "date": {"$gte": start_date, "$lt": end_date}
        },
        {"_id": 0}
    ).to_list(1000)
    
    hours_per_shift = staff.get("hours_per_shift", 24 if staff["staff_type"] == "caregiver" else 8)
    total_hours = len(assignments) * hours_per_shift
    days_worked = len(set([a["date"] for a in assignments]))
    
    max_daily = staff.get("max_hours_daily", 24 if staff["staff_type"] == "caregiver" else 12)
    max_monthly = staff.get("max_hours_monthly", 480)
    
    return {
        "staff_id": staff_id,
        "staff_name": staff["name"],
        "period": f"{year}-{month:02d}",
        "total_hours": total_hours,
        "days_worked": days_worked,
        "max_hours_daily": max_daily,
        "max_hours_monthly": max_monthly,
        "remaining_hours": max_monthly - total_hours,
        "is_over_limit": total_hours > max_monthly,
        "assignments": len(assignments)
    }

@api_router.get("/stats/{year}/{month}")
async def get_monthly_stats(year: int, month: int):
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    total = await db.coverage.count_documents({"date": {"$gte": start_date, "$lt": end_date}})
    complete = await db.coverage.count_documents({
        "date": {"$gte": start_date, "$lt": end_date},
        "status": CoverageStatus.COMPLETE
    })
    incomplete = await db.coverage.count_documents({
        "date": {"$gte": start_date, "$lt": end_date},
        "status": CoverageStatus.INCOMPLETE
    })
    
    return {
        "total": total,
        "complete": complete,
        "incomplete": incomplete,
        "completion_rate": round((complete / total * 100) if total > 0 else 0, 1)
    }

@api_router.get("/absences", response_model=List[Absence])
async def get_absences():
    absences = await db.absences.find({}, {"_id": 0}).to_list(1000)
    return absences

@api_router.post("/absences", response_model=Absence)
async def create_absence(absence: AbsenceCreate):
    import uuid
    absence_id = str(uuid.uuid4())
    
    staff = await db.staff.find_one({"staff_id": absence.staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    absence_dict = absence.model_dump()
    absence_dict["absence_id"] = absence_id
    absence_dict["staff_name"] = staff.get("name")
    
    await db.absences.insert_one(absence_dict)
    return Absence(**absence_dict)

@api_router.delete("/absences/{absence_id}")
async def delete_absence(absence_id: str):
    result = await db.absences.delete_one({"absence_id": absence_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Absence not found")
    return {"message": "Absence deleted successfully"}

@api_router.get("/absences/staff/{staff_id}")
async def get_staff_absences(staff_id: str):
    absences = await db.absences.find({"staff_id": staff_id}, {"_id": 0}).to_list(1000)
    return absences

async def is_staff_on_absence(staff_id: str, check_date: str) -> bool:
    """Check if staff has an absence on the given date"""
    absences = await db.absences.find(
        {
            "staff_id": staff_id,
            "start_date": {"$lte": check_date},
            "end_date": {"$gte": check_date}
        },
        {"_id": 0}
    ).to_list(100)
    return len(absences) > 0

async def is_staff_already_assigned(staff_id: str, check_date: str, exclude_house_id: str = None) -> bool:
    """Check if staff is already assigned to ANY house on the given date"""
    query = {
        "assigned_staff_id": staff_id,
        "date": check_date,
        "status": "complete"
    }
    if exclude_house_id:
        query["house_id"] = {"$ne": exclude_house_id}
    
    existing = await db.coverage.find(query, {"_id": 0}).to_list(10)
    return len(existing) > 0

async def get_staff_hours_for_month(staff_id: str, year: int, month: int) -> int:
    """Calculate total hours worked by staff in a month"""
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    assignments = await db.coverage.find(
        {
            "assigned_staff_id": staff_id,
            "date": {"$gte": start_date, "$lt": end_date},
            "status": "complete"
        },
        {"_id": 0}
    ).to_list(1000)
    
    staff = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    if not staff:
        return 0
    
    hours_per_shift = staff.get("hours_per_shift", 24 if staff["staff_type"] == "caregiver" else 8)
    return len(assignments) * hours_per_shift

async def get_staff_hours_for_day(staff_id: str, check_date: str) -> int:
    """Calculate total hours worked by staff on a specific day"""
    assignments = await db.coverage.find(
        {
            "assigned_staff_id": staff_id,
            "date": check_date,
            "status": "complete"
        },
        {"_id": 0}
    ).to_list(10)
    
    staff = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    if not staff:
        return 0
    
    hours_per_shift = staff.get("hours_per_shift", 24 if staff["staff_type"] == "caregiver" else 8)
    return len(assignments) * hours_per_shift

def parse_staff_preferences(notes: str, house_id: str) -> dict:
    """Parse staff notes to extract preferences"""
    if not notes:
        return {"prefers_house": False, "avoids_house": False, "no_weekends": False}
    
    notes_lower = notes.lower()
    house_num = house_id.replace("house_", "").replace("casa_", "")
    
    prefers_house = any([
        f"prefiere casa {house_num}" in notes_lower,
        f"prefer casa {house_num}" in notes_lower,
        f"casa {house_num} preferida" in notes_lower,
        f"prefers house {house_num}" in notes_lower
    ])
    
    avoids_house = any([
        f"evitar casa {house_num}" in notes_lower,
        f"no casa {house_num}" in notes_lower,
        f"avoid house {house_num}" in notes_lower
    ])
    
    no_weekends = any([
        "no fines de semana" in notes_lower,
        "sin fines de semana" in notes_lower,
        "no weekends" in notes_lower,
        "evitar sabado" in notes_lower,
        "evitar domingo" in notes_lower
    ])
    
    return {
        "prefers_house": prefers_house,
        "avoids_house": avoids_house,
        "no_weekends": no_weekends
    }

def is_weekend(date_str: str) -> bool:
    """Check if a date is Saturday or Sunday"""
    d = datetime.fromisoformat(date_str)
    return d.weekday() >= 5  # 5=Saturday, 6=Sunday

def schedules_overlap(staff_schedule: str, shift_time: str) -> bool:
    """
    Check if staff's schedule overlaps with the coverage shift.
    Both are in format "HH:MM-HH:MM"
    Returns True if they match or overlap significantly.
    """
    if not staff_schedule or not shift_time:
        return True  # If no schedule defined, assume they can work any shift
    
    try:
        # Parse staff schedule
        staff_start, staff_end = staff_schedule.split('-')
        staff_start_h, staff_start_m = map(int, staff_start.split(':'))
        staff_end_h, staff_end_m = map(int, staff_end.split(':'))
        staff_start_mins = staff_start_h * 60 + staff_start_m
        staff_end_mins = staff_end_h * 60 + staff_end_m
        
        # Parse shift time
        shift_start, shift_end = shift_time.split('-')
        shift_start_h, shift_start_m = map(int, shift_start.split(':'))
        shift_end_h, shift_end_m = map(int, shift_end.split(':'))
        shift_start_mins = shift_start_h * 60 + shift_start_m
        shift_end_mins = shift_end_h * 60 + shift_end_m
        
        # Handle overnight shifts (end time < start time)
        if staff_end_mins < staff_start_mins:
            staff_end_mins += 24 * 60
        if shift_end_mins < shift_start_mins:
            shift_end_mins += 24 * 60
        
        # Check if staff schedule covers at least 80% of the shift
        # or if the shift is within the staff's schedule
        overlap_start = max(staff_start_mins, shift_start_mins)
        overlap_end = min(staff_end_mins, shift_end_mins)
        
        if overlap_end <= overlap_start:
            return False
        
        overlap_duration = overlap_end - overlap_start
        shift_duration = shift_end_mins - shift_start_mins
        
        # Match if overlap is at least 70% of shift duration
        return overlap_duration >= (shift_duration * 0.7)
    except:
        return True  # If parsing fails, assume compatible

async def can_staff_work(staff: dict, check_date: str, house_id: str, year: int, month: int, shift_hours: int, shift_time: str = None) -> tuple:
    """
    Comprehensive check if staff can work on a given date for a specific house and shift.
    Returns (can_work: bool, reason: str, score: int)
    Score is used for ranking candidates (higher is better)
    
    shift_time: Optional string like "06:00-14:00" for specific shift matching
    """
    staff_id = staff["staff_id"]
    score = 100  # Base score
    
    # Check 1: Is staff on absence?
    if await is_staff_on_absence(staff_id, check_date):
        return (False, "en ausencia", 0)
    
    # Check 2: Is staff already assigned to this specific shift on this day?
    existing_query = {
        "assigned_staff_id": staff_id,
        "date": check_date
    }
    if shift_time:
        existing_query["shift_time"] = shift_time
    existing_assignment = await db.coverage.find_one(existing_query)
    if existing_assignment:
        return (False, "ya asignado a este turno", 0)
    
    # Check 3: Is this house excluded for this staff?
    excluded_houses = staff.get("excluded_houses") or []
    if house_id in excluded_houses:
        return (False, "casa excluida para este personal", 0)
    
    # Check 4: Specific work days (days of the week)
    specific_work_days = staff.get("specific_work_days") or []
    if specific_work_days:
        # Get day of week in Spanish
        d = datetime.fromisoformat(check_date)
        day_names_es = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]
        day_name = day_names_es[d.weekday()]
        # Normalize: remove accents for comparison
        normalized_work_days = [day.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u") for day in specific_work_days]
        if day_name not in normalized_work_days:
            return (False, f"no trabaja los {day_name}", 0)
    
    # Check 5: Shift time compatibility
    staff_schedule = staff.get("specific_schedule")
    if shift_time and staff_schedule:
        if not schedules_overlap(staff_schedule, shift_time):
            return (False, f"horario no compatible ({staff_schedule} vs {shift_time})", 0)
        else:
            # BONUS: Staff schedule matches the shift - give high priority
            score += 100
    
    # Check 6: Daily hour limit
    max_daily = staff.get("max_hours_daily")
    if max_daily is None:
        max_daily = 24 if staff.get("staff_type") in ["caregiver", "tia"] else 12
    current_daily_hours = await get_staff_hours_for_day(staff_id, check_date)
    if current_daily_hours + shift_hours > max_daily:
        return (False, f"excede limite diario ({current_daily_hours + shift_hours}/{max_daily}h)", 0)
    
    # Check 7: Monthly hour limit
    max_monthly = staff.get("max_hours_monthly") or 480
    current_monthly_hours = await get_staff_hours_for_month(staff_id, year, month)
    if current_monthly_hours + shift_hours > max_monthly:
        return (False, f"excede limite mensual ({current_monthly_hours + shift_hours}/{max_monthly}h)", 0)
    
    # Parse preferences from notes
    preferences = parse_staff_preferences(staff.get("notes", ""), house_id)
    
    # Check 8: Weekend preference
    if preferences["no_weekends"] and is_weekend(check_date):
        score -= 50  # Penalize but don't exclude
    
    # Check 8: House preference from notes
    if preferences["avoids_house"]:
        score -= 30  # Penalize avoiding this house
    if preferences["prefers_house"]:
        score += 30  # Bonus for preferring this house
    
    # Check 9: New preferred houses (structured fields)
    if staff.get("preferred_house_1") == house_id:
        score += 60  # Big bonus for first choice house
    elif staff.get("preferred_house_2") == house_id:
        score += 40  # Medium bonus for second choice
    elif staff.get("preferred_house_3") == house_id:
        score += 20  # Small bonus for third choice
    
    # Check 10: Fixed house assignment - THIS IS CRITICAL
    if staff.get("fixed_house_id"):
        if staff["fixed_house_id"] == house_id:
            score += 200  # HUGE bonus for being assigned to this house
        else:
            return (False, "tiene casa fija asignada diferente", 0)  # Cannot work at other houses
    
    # Check 11: Priority (lower priority number = higher priority = higher score)
    priority = staff.get("priority")
    if priority is None:
        priority = 50
    score += (100 - priority)  # Convert priority to score bonus
    
    # Check 12: Work/rest day pattern (simplified check) - only if no specific days set
    if not specific_work_days:
        work_days = staff.get("work_days")
        rest_days = staff.get("rest_days")
        if work_days and rest_days:
            # This is a simplified check - could be more sophisticated
            cycle = work_days + rest_days
            day_of_month = int(check_date.split("-")[2])
            if (day_of_month % cycle) >= work_days:
                score -= 20  # Might be a rest day
    
    return (True, "disponible", score)

@api_router.post("/coverage/auto-assign/{house_id}/{year}/{month}")
async def auto_assign_coverage(house_id: str, year: int, month: int):
    """
    Intelligent auto-assignment algorithm that:
    1. Prevents double-booking staff on the same day
    2. Respects hour limits (daily and monthly)
    3. Uses priorities (staff and house)
    4. Parses preferences from notes
    5. Respects absences
    6. Follows the hierarchy: Encargada -> Rotativa -> Jornalera
    """
    house = await db.houses.find_one({"house_id": house_id}, {"_id": 0})
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    start_date_str = start_date.isoformat()
    end_date_str = end_date.isoformat()
    
    # Get all coverage entries for this house this month
    coverage_entries = await db.coverage.find(
        {
            "house_id": house_id,
            "date": {"$gte": start_date_str, "$lt": end_date_str}
        },
        {"_id": 0}
    ).to_list(1000)
    
    # Get all staff
    all_staff = await db.staff.find({}, {"_id": 0}).to_list(100)
    
    # Helper function to get priority with default value (handles None)
    def get_priority(staff):
        priority = staff.get("priority")
        if priority is None:
            return 50  # Default priority
        return priority
    
    # Separate and sort by priority - support both old "caregiver" and new "tia" types
    tias = sorted(
        [s for s in all_staff if s.get("staff_type") in ["caregiver", "tia"]],
        key=get_priority
    )
    assistants = sorted(
        [s for s in all_staff if s.get("staff_type") == "assistant"],
        key=get_priority
    )
    
    # Further categorize tias by subtype for hierarchy (support old and new subtypes)
    encargadas = [s for s in tias if s.get("subtype") == "encargada"]
    rotativas = [s for s in tias if s.get("subtype") in ["rotativa_mensual", "rotativa"]]
    jornaleras_tia = [s for s in tias if s.get("subtype") == "jornalera"]
    educadoras = [s for s in tias if s.get("subtype") == "educadora"]
    
    mensuales = [s for s in assistants if s.get("subtype") == "mensual"]
    jornaleras_asist = [s for s in assistants if s.get("subtype") == "jornalera"]
    
    assignments_made = 0
    assignments_details = []
    skipped_details = []
    
    # IMPORTANT: Get staff with fixed_house_id for this house (highest priority)
    staff_with_fixed_house = [s for s in all_staff if s.get("fixed_house_id") == house_id]
    
    # Sort entries by date to process in order
    incomplete_entries = sorted(
        [e for e in coverage_entries if e.get("status") != "complete"],
        key=lambda x: x.get("date", "")
    )
    
    for entry in incomplete_entries:
        check_date = entry["date"]
        coverage_type = entry["coverage_type"]
        
        selected_staff = None
        best_score = -1
        skip_reason = None
        
        if coverage_type == "caregiver_24h":
            shift_hours = 24
            
            # PRIORITY 0 (HIGHEST): Staff with fixed_house_id for this house
            if not selected_staff and staff_with_fixed_house:
                candidates = []
                for staff in staff_with_fixed_house:
                    # Only consider tias/caregivers for caregiver positions
                    if staff.get("staff_type") not in ["caregiver", "tia"]:
                        continue
                    can_work, reason, score = await can_staff_work(
                        staff, check_date, house_id, year, month, shift_hours
                    )
                    if can_work:
                        candidates.append((staff, score))
                
                if candidates:
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    selected_staff = candidates[0][0]
                    best_score = candidates[0][1]
            
            # Priority 1: House's assigned encargada
            if not selected_staff and house.get("encargada_staff_id"):
                encargada = next(
                    (s for s in encargadas if s["staff_id"] == house["encargada_staff_id"]), 
                    None
                )
                if encargada:
                    can_work, reason, score = await can_staff_work(
                        encargada, check_date, house_id, year, month, shift_hours
                    )
                    if can_work and score > best_score:
                        selected_staff = encargada
                        best_score = score
            
            # Priority 2: Rotativas (monthly rotating tias)
            if not selected_staff:
                candidates = []
                for staff in rotativas:
                    can_work, reason, score = await can_staff_work(
                        staff, check_date, house_id, year, month, shift_hours
                    )
                    if can_work:
                        candidates.append((staff, score))
                
                if candidates:
                    # Sort by score (highest first) and select best
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    selected_staff = candidates[0][0]
                    best_score = candidates[0][1]
            
            # Priority 3: Jornaleras (day workers)
            if not selected_staff:
                candidates = []
                for staff in jornaleras_tia:
                    can_work, reason, score = await can_staff_work(
                        staff, check_date, house_id, year, month, shift_hours
                    )
                    if can_work:
                        candidates.append((staff, score))
                
                if candidates:
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    selected_staff = candidates[0][0]
                    best_score = candidates[0][1]
            
            # Priority 4: Educadoras
            if not selected_staff:
                candidates = []
                for staff in educadoras:
                    can_work, reason, score = await can_staff_work(
                        staff, check_date, house_id, year, month, shift_hours
                    )
                    if can_work:
                        candidates.append((staff, score))
                
                if candidates:
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    selected_staff = candidates[0][0]
                    best_score = candidates[0][1]
            
            if not selected_staff:
                skip_reason = "No hay tías disponibles"
        
        elif coverage_type == "assistant_8h":
            shift_hours = 8
            
            # PRIORITY 0 (HIGHEST): Staff with fixed_house_id for this house
            if staff_with_fixed_house:
                candidates = []
                for staff in staff_with_fixed_house:
                    # Only consider assistants for assistant positions
                    if staff.get("staff_type") != "assistant":
                        continue
                    can_work, reason, score = await can_staff_work(
                        staff, check_date, house_id, year, month, shift_hours
                    )
                    if can_work:
                        candidates.append((staff, score))
                
                if candidates:
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    selected_staff = candidates[0][0]
                    best_score = candidates[0][1]
            
            # Priority 1: Mensuales (monthly assistants)
            if not selected_staff:
                candidates = []
                for staff in mensuales:
                    can_work, reason, score = await can_staff_work(
                        staff, check_date, house_id, year, month, shift_hours
                    )
                    if can_work:
                        candidates.append((staff, score))
                
                if candidates:
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    selected_staff = candidates[0][0]
                    best_score = candidates[0][1]
            
            # Priority 2: Jornaleras asistentes
            if not selected_staff:
                candidates = []
                for staff in jornaleras_asist:
                    can_work, reason, score = await can_staff_work(
                        staff, check_date, house_id, year, month, shift_hours
                    )
                    if can_work:
                        candidates.append((staff, score))
                
                if candidates:
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    selected_staff = candidates[0][0]
                    best_score = candidates[0][1]
            
            # Priority 3: Any assistant available
            if not selected_staff:
                candidates = []
                for staff in assistants:
                    can_work, reason, score = await can_staff_work(
                        staff, check_date, house_id, year, month, shift_hours
                    )
                    if can_work:
                        candidates.append((staff, score))
                
                if candidates:
                    candidates.sort(key=lambda x: x[1], reverse=True)
                    selected_staff = candidates[0][0]
                    best_score = candidates[0][1]
            
            if not selected_staff:
                skip_reason = "No hay asistentes disponibles"
        
        # Make the assignment if we found someone
        if selected_staff:
            await db.coverage.update_one(
                {"coverage_id": entry["coverage_id"]},
                {
                    "$set": {
                        "assigned_staff_id": selected_staff["staff_id"],
                        "assigned_staff_name": selected_staff["name"],
                        "status": "complete"
                    }
                }
            )
            assignments_made += 1
            assignments_details.append({
                "date": check_date,
                "coverage_type": coverage_type,
                "assigned_staff": selected_staff["name"],
                "score": best_score
            })
        else:
            skipped_details.append({
                "date": check_date,
                "coverage_type": coverage_type,
                "reason": skip_reason or "Sin personal disponible"
            })
    
    return {
        "house_id": house_id,
        "total_slots": len(incomplete_entries),
        "assignments_made": assignments_made,
        "assignments_skipped": len(skipped_details),
        "assignments_details": assignments_details[:30],
        "skipped_details": skipped_details[:10]
    }

@api_router.delete("/coverage/reset/{house_id}/{year}/{month}")
async def reset_house_coverage(house_id: str, year: int, month: int):
    """
    Reset all assignments for a specific house in a given month.
    Sets assigned_staff_id to null and status to incomplete.
    """
    house = await db.houses.find_one({"house_id": house_id}, {"_id": 0})
    if not house:
        raise HTTPException(status_code=404, detail="House not found")
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    result = await db.coverage.update_many(
        {
            "house_id": house_id,
            "date": {"$gte": start_date, "$lt": end_date}
        },
        {
            "$set": {
                "assigned_staff_id": None,
                "assigned_staff_name": None,
                "status": "incomplete"
            }
        }
    )
    
    return {
        "house_id": house_id,
        "year": year,
        "month": month,
        "entries_reset": result.modified_count,
        "message": f"Se limpiaron {result.modified_count} asignaciones de {house['name']}"
    }

@api_router.delete("/coverage/reset-all/{year}/{month}")
async def reset_all_coverage(year: int, month: int):
    """
    Reset ALL assignments for a given month across all houses.
    Sets assigned_staff_id to null and status to incomplete.
    """
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    result = await db.coverage.update_many(
        {
            "date": {"$gte": start_date, "$lt": end_date}
        },
        {
            "$set": {
                "assigned_staff_id": None,
                "assigned_staff_name": None,
                "status": "incomplete"
            }
        }
    )
    
    return {
        "year": year,
        "month": month,
        "entries_reset": result.modified_count,
        "message": f"Se limpiaron {result.modified_count} asignaciones del mes {month}/{year}"
    }

@api_router.delete("/coverage/reset-staff/{staff_id}/{year}/{month}")
async def reset_staff_coverage(staff_id: str, year: int, month: int):
    """
    Reset all assignments for a specific staff member in a given month.
    Useful for removing double-bookings or reassigning a person.
    """
    staff = await db.staff.find_one({"staff_id": staff_id}, {"_id": 0})
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    result = await db.coverage.update_many(
        {
            "assigned_staff_id": staff_id,
            "date": {"$gte": start_date, "$lt": end_date}
        },
        {
            "$set": {
                "assigned_staff_id": None,
                "assigned_staff_name": None,
                "status": "incomplete"
            }
        }
    )
    
    return {
        "staff_id": staff_id,
        "staff_name": staff["name"],
        "year": year,
        "month": month,
        "entries_reset": result.modified_count,
        "message": f"Se limpiaron {result.modified_count} asignaciones de {staff['name']}"
    }

@api_router.get("/coverage/export/{year}/{month}")
async def export_coverage(year: int, month: int, format: str = "excel"):
    if format not in ["excel", "pdf"]:
        raise HTTPException(status_code=400, detail="Format must be 'excel' or 'pdf'")
    
    start_date = f"{year}-{month:02d}-01"
    if month == 12:
        end_date = f"{year + 1}-01-01"
    else:
        end_date = f"{year}-{month + 1:02d}-01"
    
    coverage_entries = await db.coverage.find(
        {"date": {"$gte": start_date, "$lt": end_date}},
        {"_id": 0}
    ).sort("date", 1).to_list(1000)
    
    houses = await db.houses.find({}, {"_id": 0}).to_list(100)
    
    if format == "excel":
        import pandas as pd
        from datetime import datetime as dt
        
        data = []
        for entry in coverage_entries:
            data.append({
                "Fecha": entry["date"],
                "Casa": entry["house_id"].replace("house_", "Casa ").replace("_", " "),
                "Tipo": "Cuidadora 24h" if entry["coverage_type"] == "caregiver_24h" else "Asistente 8h",
                "Personal Asignado": entry.get("assigned_staff_name", "Sin asignar"),
                "Estado": "Completo" if entry["status"] == "complete" else "Incompleto"
            })
        
        df = pd.DataFrame(data)
        
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Coberturas')
        output.seek(0)
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename=coberturas_{year}_{month:02d}.xlsx"}
        )
    
    else:
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=landscape(A4))
        elements = []
        
        styles = getSampleStyleSheet()
        title = Paragraph(f"<b>Coberturas - {year}/{month:02d}</b>", styles['Title'])
        elements.append(title)
        elements.append(Spacer(1, 0.3*inch))
        
        import calendar
        days_in_month = calendar.monthrange(year, month)[1]
        
        for house in houses[:3]:
            house_name = house["name"]
            elements.append(Paragraph(f"<b>{house_name}</b>", styles['Heading2']))
            
            table_data = [["Día", "Tipo", "Personal"]]
            
            house_entries = [e for e in coverage_entries if e["house_id"] == house["house_id"]][:10]
            
            for entry in house_entries:
                day = entry["date"].split("-")[2]
                tipo = "Cuidadora" if entry["coverage_type"] == "caregiver_24h" else "Asistente"
                personal = entry.get("assigned_staff_name", "Sin asignar")
                table_data.append([day, tipo, personal])
            
            t = Table(table_data)
            t.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(t)
            elements.append(Spacer(1, 0.3*inch))
        
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=coberturas_{year}_{month:02d}.pdf"}
        )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()