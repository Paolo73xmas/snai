import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from dependencies.auth import get_current_user
from schemas.auth import UserResponse
from services.cash_ops_service import CashOpsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/cash-ops", tags=["cash-ops"])


# ── Request / Response schemas ──────────────────────────────────
class OpenShiftReq(BaseModel):
    cash_id: int
    saldo_fisico: float
    note: str = ""

class CloseShiftReq(BaseModel):
    saldo_fisico: float
    note: str = ""
    receipt_photo_key: str = ""
    pos_photo_key: str = ""

class RecordIncomeReq(BaseModel):
    categoria: str
    importo: float
    note: str = ""

class RecordPaymentReq(BaseModel):
    categoria: str
    importo: float
    note: str = ""

class BatchOperationItem(BaseModel):
    tipo: str  # "incasso" or "pagamento"
    categoria: str
    importo: float

class RecordBatchReq(BaseModel):
    operazioni: list[BatchOperationItem]
    note: str = ""

class SovvenzioneReq(BaseModel):
    target_cash_id: int
    importo: float
    note: str = ""

class RestituzioneReq(BaseModel):
    source_cash_id: int
    importo: float
    note: str = ""

class SvuotamentoVltReq(BaseModel):
    vlt_id: int
    importo: float
    dest_cash_id: int
    note: str = ""

class SvuotamentoBetsmartReq(BaseModel):
    betsmart_id: int
    importo: float
    dest_cash_id: int
    note: str = ""

class BankOpReq(BaseModel):
    importo: float
    note: str = ""

class AdminWithdrawalReq(BaseModel):
    source_cash_id: int
    importo: float
    note: str = ""

class RettificaReq(BaseModel):
    rif_movimento_id: int
    importo: float
    causale: str
    cash_id: int
    note: str = ""

class SetRoleReq(BaseModel):
    target_user_id: str
    role: str

class ToggleSuspensionReq(BaseModel):
    target_user_id: str

class VerifyDiscrepancyReq(BaseModel):
    disc_id: int
    new_status: str
    note: str = ""

class UpdateProfileReq(BaseModel):
    nome: Optional[str] = None
    cognome: Optional[str] = None
    telefono: Optional[str] = None
    username: Optional[str] = None

class CreateUserReq(BaseModel):
    nome: str = ""
    cognome: str = ""
    email: str = ""
    telefono: str = ""
    username: str = ""
    ruolo: str = "operator"
    password: str = ""

class UploadReceiptUrlReq(BaseModel):
    bucket_name: str
    object_key: str


# ── Endpoints ───────────────────────────────────────────────────
@router.get("/user-profile")
async def get_user_profile(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    return await svc.get_user_profile(current_user.id, current_user.email, current_user.name or "")


@router.post("/update-profile")
async def update_profile(
    data: UpdateProfileReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    return await svc.update_profile(current_user.id, data.model_dump(exclude_none=True))


@router.post("/set-user-role")
async def set_user_role(
    data: SetRoleReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        profile = await svc._get_or_create_profile(current_user.id, current_user.email, current_user.name or "")
        if profile.ruolo != "admin":
            raise HTTPException(status_code=403, detail="Solo Admin può cambiare ruoli")
        return await svc.set_user_role(data.target_user_id, data.role, profile)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/toggle-suspension")
async def toggle_suspension(
    data: ToggleSuspensionReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.toggle_user_suspension(data.target_user_id, current_user.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-user")
async def create_user(
    data: CreateUserReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.create_user_profile(current_user.id, data.model_dump())
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/all-profiles")
async def get_all_profiles(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    profile = await svc._get_or_create_profile(current_user.id, current_user.email, current_user.name or "")
    if profile.ruolo != "admin":
        raise HTTPException(status_code=403, detail="Solo Admin")
    return await svc.get_all_profiles()


@router.post("/open-shift")
async def open_shift(
    data: OpenShiftReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.open_shift(current_user.id, data.cash_id, data.saldo_fisico, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/close-shift")
async def close_shift(
    data: CloseShiftReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.close_shift(
            current_user.id,
            data.saldo_fisico,
            data.note,
            receipt_photo_key=data.receipt_photo_key,
            pos_photo_key=data.pos_photo_key,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/record-income")
async def record_income(
    data: RecordIncomeReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.record_income(current_user.id, data.categoria, data.importo, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/record-payment")
async def record_payment(
    data: RecordPaymentReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.record_payment(current_user.id, data.categoria, data.importo, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/record-batch")
async def record_batch(
    data: RecordBatchReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Record multiple income/payment operations in a single batch."""
    svc = CashOpsService(db)
    results = []
    errors = []
    for op in data.operazioni:
        try:
            if op.tipo == "incasso":
                res = await svc.record_income(current_user.id, op.categoria, op.importo, data.note)
            elif op.tipo == "pagamento":
                res = await svc.record_payment(current_user.id, op.categoria, op.importo, data.note)
            else:
                errors.append({"categoria": op.categoria, "error": f"Tipo non valido: {op.tipo}"})
                continue
            results.append({"tipo": op.tipo, "categoria": op.categoria, "success": True})
        except ValueError as e:
            errors.append({"tipo": op.tipo, "categoria": op.categoria, "error": str(e)})
    return {"success": len(errors) == 0, "recorded": len(results), "errors": errors}


@router.post("/sovvenzione")
async def sovvenzione(
    data: SovvenzioneReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.sovvenzione(current_user.id, data.target_cash_id, data.importo, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/restituzione")
async def restituzione(
    data: RestituzioneReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.restituzione(current_user.id, data.source_cash_id, data.importo, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/svuotamento-vlt")
async def svuotamento_vlt(
    data: SvuotamentoVltReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.svuotamento_vlt(current_user.id, data.vlt_id, data.importo, data.dest_cash_id, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/svuotamento-betsmart")
async def svuotamento_betsmart(
    data: SvuotamentoBetsmartReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.svuotamento_betsmart(current_user.id, data.betsmart_id, data.importo, data.dest_cash_id, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bank-deposit")
async def bank_deposit(
    data: BankOpReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.bank_deposit(current_user.id, data.importo, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/bank-withdrawal")
async def bank_withdrawal(
    data: BankOpReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.bank_withdrawal(current_user.id, data.importo, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/admin-withdrawal")
async def admin_withdrawal(
    data: AdminWithdrawalReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.admin_withdrawal(current_user.id, data.source_cash_id, data.importo, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/rettifica")
async def rettifica(
    data: RettificaReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.rettifica(current_user.id, data.rif_movimento_id, data.importo, data.causale, data.cash_id, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/dashboard")
async def get_dashboard(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    profile = await svc._get_or_create_profile(current_user.id, current_user.email, current_user.name or "")
    if profile.ruolo != "admin":
        raise HTTPException(status_code=403, detail="Solo Admin può accedere alla dashboard")
    return await svc.get_dashboard()


@router.get("/my-shift")
async def get_my_shift(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    result = await svc.get_my_shift(current_user.id)
    return result or {"active": False}


@router.get("/available-cashes")
async def get_available_cashes(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    return await svc.get_available_cashes()


@router.get("/all-movements")
async def get_all_movements(
    skip: int = 0,
    limit: int = 50,
    tipo: str = "",
    date_from: str = "",
    date_to: str = "",
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    profile = await svc._get_or_create_profile(current_user.id, current_user.email, current_user.name or "")
    return await svc.get_all_movements(current_user.id, profile.ruolo, skip, limit, tipo, date_from, date_to)


@router.get("/all-discrepancies")
async def get_all_discrepancies(
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    profile = await svc._get_or_create_profile(current_user.id, current_user.email, current_user.name or "")
    return await svc.get_all_discrepancies(current_user.id, profile.ruolo, skip, limit)


@router.post("/verify-discrepancy")
async def verify_discrepancy(
    data: VerifyDiscrepancyReq,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CashOpsService(db)
    try:
        return await svc.verify_discrepancy(current_user.id, data.disc_id, data.new_status, data.note)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/all-vlts")
async def get_all_vlts(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from models.vlts import Vlts
    from sqlalchemy import select
    result = await db.execute(select(Vlts).where(Vlts.status == "attiva").order_by(Vlts.id))
    vlts = result.scalars().all()
    return [{"id": v.id, "codice": v.codice, "name": v.name} for v in vlts]


@router.get("/all-betsmarts")
async def get_all_betsmarts(
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from models.betsmarts import Betsmarts
    from sqlalchemy import select
    result = await db.execute(select(Betsmarts).where(Betsmarts.status == "attiva").order_by(Betsmarts.id))
    bss = result.scalars().all()
    return [{"id": b.id, "codice": b.codice, "name": b.name} for b in bss]


@router.post("/upload-receipt-url")
async def upload_receipt_url(
    data: UploadReceiptUrlReq,
    current_user: UserResponse = Depends(get_current_user),
):
    """Get a presigned upload URL for receipt photos."""
    from services.storage import StorageService
    from schemas.storage import FileUpDownRequest

    try:
        service = StorageService()
        request = FileUpDownRequest(bucket_name=data.bucket_name, object_key=data.object_key)
        result = await service.create_upload_url(request)
        return {"upload_url": result.upload_url}
    except Exception as e:
        logger.error(f"Failed to generate receipt upload URL: {e}")
        raise HTTPException(status_code=500, detail=f"Errore generazione URL upload: {e}")


@router.get("/closed-shifts")
async def get_closed_shifts(
    skip: int = 0,
    limit: int = 50,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get closed shifts with photo download URLs for admin view."""
    from models.shifts import Shifts
    from sqlalchemy import select, or_

    # Only admin can view all closed shifts
    result = await db.execute(
        select(Shifts)
        .where(or_(Shifts.status == "chiuso", Shifts.status == "chiuso_con_discrepanza"))
        .order_by(Shifts.closed_at.desc())
        .offset(skip)
        .limit(limit)
    )
    shifts = result.scalars().all()

    # Generate download URLs for photos
    from services.storage import StorageService
    from schemas.storage import FileUpDownRequest

    items = []
    for s in shifts:
        item = {
            "id": s.id,
            "user_name": s.user_name,
            "user_role": s.user_role,
            "cash_name": s.cash_name,
            "cash_id": s.cash_id,
            "opened_at": s.opened_at.isoformat() if s.opened_at else None,
            "closed_at": s.closed_at.isoformat() if s.closed_at else None,
            "saldo_teorico_apertura": s.saldo_teorico_apertura,
            "saldo_fisico_apertura": s.saldo_fisico_apertura,
            "discrepanza_apertura": s.discrepanza_apertura,
            "note_apertura": s.note_apertura,
            "saldo_teorico_chiusura": s.saldo_teorico_chiusura,
            "saldo_fisico_chiusura": s.saldo_fisico_chiusura,
            "discrepanza_chiusura": s.discrepanza_chiusura,
            "note_chiusura": s.note_chiusura,
            "status": s.status,
            "totale_incassi": s.totale_incassi,
            "totale_pagamenti": s.totale_pagamenti,
            "totale_sovvenzioni": s.totale_sovvenzioni,
            "totale_restituzioni": s.totale_restituzioni,
            "totale_svuotamenti": s.totale_svuotamenti,
            "receipt_photo_url": None,
            "pos_photo_url": None,
        }

        # Generate download URLs for photos if keys exist
        try:
            storage = StorageService()
            if s.receipt_photo_key:
                req = FileUpDownRequest(bucket_name="shift-receipts", object_key=s.receipt_photo_key)
                resp = await storage.create_download_url(req)
                item["receipt_photo_url"] = resp.download_url
            if s.pos_photo_key:
                req = FileUpDownRequest(bucket_name="shift-receipts", object_key=s.pos_photo_key)
                resp = await storage.create_download_url(req)
                item["pos_photo_url"] = resp.download_url
        except Exception as e:
            logger.warning(f"Failed to get photo URLs for shift {s.id}: {e}")

        items.append(item)

    return {"items": items, "total": len(items)}