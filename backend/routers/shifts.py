import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.shifts import ShiftsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/shifts", tags=["shifts"])


# ---------- Pydantic Schemas ----------
class ShiftsData(BaseModel):
    """Entity data schema (for create/update)"""
    user_name: str = None
    user_role: str = None
    cash_id: int
    cash_name: str = None
    opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    saldo_teorico_apertura: float = None
    saldo_fisico_apertura: float = None
    discrepanza_apertura: float = None
    note_apertura: str = None
    saldo_teorico_chiusura: float = None
    saldo_fisico_chiusura: float = None
    discrepanza_chiusura: float = None
    note_chiusura: str = None
    status: str
    totale_incassi: float = None
    totale_pagamenti: float = None
    totale_sovvenzioni: float = None
    totale_restituzioni: float = None
    totale_svuotamenti: float = None


class ShiftsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    cash_id: Optional[int] = None
    cash_name: Optional[str] = None
    opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    saldo_teorico_apertura: Optional[float] = None
    saldo_fisico_apertura: Optional[float] = None
    discrepanza_apertura: Optional[float] = None
    note_apertura: Optional[str] = None
    saldo_teorico_chiusura: Optional[float] = None
    saldo_fisico_chiusura: Optional[float] = None
    discrepanza_chiusura: Optional[float] = None
    note_chiusura: Optional[str] = None
    status: Optional[str] = None
    totale_incassi: Optional[float] = None
    totale_pagamenti: Optional[float] = None
    totale_sovvenzioni: Optional[float] = None
    totale_restituzioni: Optional[float] = None
    totale_svuotamenti: Optional[float] = None


class ShiftsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    cash_id: int
    cash_name: Optional[str] = None
    opened_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    saldo_teorico_apertura: Optional[float] = None
    saldo_fisico_apertura: Optional[float] = None
    discrepanza_apertura: Optional[float] = None
    note_apertura: Optional[str] = None
    saldo_teorico_chiusura: Optional[float] = None
    saldo_fisico_chiusura: Optional[float] = None
    discrepanza_chiusura: Optional[float] = None
    note_chiusura: Optional[str] = None
    status: str
    totale_incassi: Optional[float] = None
    totale_pagamenti: Optional[float] = None
    totale_sovvenzioni: Optional[float] = None
    totale_restituzioni: Optional[float] = None
    totale_svuotamenti: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ShiftsListResponse(BaseModel):
    """List response schema"""
    items: List[ShiftsResponse]
    total: int
    skip: int
    limit: int


class ShiftsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[ShiftsData]


class ShiftsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: ShiftsUpdateData


class ShiftsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[ShiftsBatchUpdateItem]


class ShiftsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=ShiftsListResponse)
async def query_shiftss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query shiftss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying shiftss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = ShiftsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")
        
        result = await service.get_list(
            skip=skip, 
            limit=limit,
            query_dict=query_dict,
            sort=sort,
            user_id=str(current_user.id),
        )
        logger.debug(f"Found {result['total']} shiftss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shiftss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=ShiftsListResponse)
async def query_shiftss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query shiftss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying shiftss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = ShiftsService(db)
    try:
        # Parse query JSON if provided
        query_dict = None
        if query:
            try:
                query_dict = json.loads(query)
            except json.JSONDecodeError:
                raise HTTPException(status_code=400, detail="Invalid query JSON format")

        result = await service.get_list(
            skip=skip,
            limit=limit,
            query_dict=query_dict,
            sort=sort
        )
        logger.debug(f"Found {result['total']} shiftss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying shiftss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=ShiftsResponse)
async def get_shifts(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single shifts by ID (user can only see their own records)"""
    logger.debug(f"Fetching shifts with id: {id}, fields={fields}")
    
    service = ShiftsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Shifts with id {id} not found")
            raise HTTPException(status_code=404, detail="Shifts not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching shifts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=ShiftsResponse, status_code=201)
async def create_shifts(
    data: ShiftsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new shifts"""
    logger.debug(f"Creating new shifts with data: {data}")
    
    service = ShiftsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create shifts")
        
        logger.info(f"Shifts created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating shifts: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating shifts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[ShiftsResponse], status_code=201)
async def create_shiftss_batch(
    request: ShiftsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple shiftss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} shiftss")
    
    service = ShiftsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} shiftss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[ShiftsResponse])
async def update_shiftss_batch(
    request: ShiftsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple shiftss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} shiftss")
    
    service = ShiftsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} shiftss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=ShiftsResponse)
async def update_shifts(
    id: int,
    data: ShiftsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing shifts (requires ownership)"""
    logger.debug(f"Updating shifts {id} with data: {data}")

    service = ShiftsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Shifts with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Shifts not found")
        
        logger.info(f"Shifts {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating shifts {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating shifts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_shiftss_batch(
    request: ShiftsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple shiftss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} shiftss")
    
    service = ShiftsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} shiftss successfully")
        return {"message": f"Successfully deleted {deleted_count} shiftss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_shifts(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single shifts by ID (requires ownership)"""
    logger.debug(f"Deleting shifts with id: {id}")
    
    service = ShiftsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Shifts with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Shifts not found")
        
        logger.info(f"Shifts {id} deleted successfully")
        return {"message": "Shifts deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting shifts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")