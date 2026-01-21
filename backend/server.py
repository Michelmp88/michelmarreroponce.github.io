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
    CAREGIVER = "caregiver"
    ASSISTANT = "assistant"

class CaregiverSubtype(str, Enum):
    ENCARGADA = "encargada"
    ROTATIVA_MENSUAL = "rotativa_mensual"
    JORNALERA = "jornalera"

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
    notes: Optional[str] = None

class HouseCreate(BaseModel):
    house_id: str
    name: str
    caregivers_required: int
    assistant_required: bool
    encargada_staff_id: Optional[str] = None
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
    fixed_house_id: Optional[str] = None
    work_schedule: Optional[str] = None
    notes: Optional[str] = None

class StaffCreate(BaseModel):
    staff_id: str
    name: str
    staff_type: StaffType
    subtype: str
    work_days: Optional[int] = None
    rest_days: Optional[int] = None
    weekly_hours: Optional[int] = None
    fixed_house_id: Optional[str] = None
    work_schedule: Optional[str] = None
    notes: Optional[str] = None

class CoverageEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    coverage_id: str
    date: str
    house_id: str
    coverage_type: CoverageType
    assigned_staff_id: Optional[str] = None
    assigned_staff_name: Optional[str] = None
    status: CoverageStatus
    notes: Optional[str] = None

class CoverageEntryCreate(BaseModel):
    date: str
    house_id: str
    coverage_type: CoverageType
    assigned_staff_id: Optional[str] = None
    notes: Optional[str] = None

class CoverageEntryUpdate(BaseModel):
    assigned_staff_id: Optional[str] = None
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

async def is_staff_available(staff_id: str, check_date: str) -> bool:
    absences = await db.absences.find(
        {
            "staff_id": staff_id,
            "start_date": {"$lte": check_date},
            "end_date": {"$gte": check_date}
        },
        {"_id": 0}
    ).to_list(100)
    return len(absences) == 0

@api_router.post("/coverage/auto-assign/{house_id}/{year}/{month}")
async def auto_assign_coverage(house_id: str, year: int, month: int):
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
    
    coverage_entries = await db.coverage.find(
        {
            "house_id": house_id,
            "date": {"$gte": start_date_str, "$lt": end_date_str}
        },
        {"_id": 0}
    ).to_list(1000)
    
    all_staff = await db.staff.find({}, {"_id": 0}).to_list(100)
    
    caregivers = [s for s in all_staff if s["staff_type"] == "caregiver"]
    assistants = [s for s in all_staff if s["staff_type"] == "assistant"]
    
    encargadas = [s for s in caregivers if s["subtype"] == "encargada"]
    rotativas = [s for s in caregivers if s["subtype"] == "rotativa_mensual"]
    jornaleras = [s for s in caregivers if s["subtype"] == "jornalera"]
    
    mensuales = [s for s in assistants if s["subtype"] == "mensual"]
    jornaleras_asist = [s for s in assistants if s["subtype"] == "jornalera"]
    
    assignments_made = 0
    assignments_details = []
    
    for entry in coverage_entries:
        if entry["status"] == "complete":
            continue
        
        check_date = entry["date"]
        coverage_type = entry["coverage_type"]
        
        selected_staff = None
        
        if coverage_type == "caregiver_24h":
            if house.get("encargada_staff_id"):
                encargada = next((s for s in encargadas if s["staff_id"] == house["encargada_staff_id"]), None)
                if encargada and await is_staff_available(encargada["staff_id"], check_date):
                    selected_staff = encargada
            
            if not selected_staff:
                for staff in rotativas:
                    if await is_staff_available(staff["staff_id"], check_date):
                        selected_staff = staff
                        break
            
            if not selected_staff:
                for staff in jornaleras:
                    if await is_staff_available(staff["staff_id"], check_date):
                        selected_staff = staff
                        break
        
        elif coverage_type == "assistant_8h":
            for staff in mensuales:
                if await is_staff_available(staff["staff_id"], check_date):
                    selected_staff = staff
                    break
            
            if not selected_staff:
                for staff in jornaleras_asist:
                    if await is_staff_available(staff["staff_id"], check_date):
                        selected_staff = staff
                        break
        
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
                "assigned_staff": selected_staff["name"]
            })
    
    return {
        "house_id": house_id,
        "total_assignments": len([e for e in coverage_entries if e["status"] == "incomplete"]),
        "assignments_made": assignments_made,
        "assignments_details": assignments_details[:20]
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