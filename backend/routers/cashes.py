import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.cashes import CashesService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/cashes", tags=["cashes"])


# ---------- Pydantic Schemas ----------
class CashesData(BaseModel):
    """Entity data schema (for create/update)"""
    name: str
    cash_type: str
    saldo_teorico: float
    status: str
    current_operator_id: str = None
    current_shift_id: int = None
    notes: str = None
    last_physical_balance: float = None
    last_operator_name: str = None


class CashesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    name: Optional[str] = None
    cash_type: Optional[str] = None
    saldo_teorico: Optional[float] = None
    status: Optional[str] = None
    current_operator_id: Optional[str] = None
    current_shift_id: Optional[int] = None
    notes: Optional[str] = None
    last_physical_balance: Optional[float] = None
    last_operator_name: Optional[str] = None


class CashesResponse(BaseModel):
    """Entity response schema"""
    id: int
    name: str
    cash_type: str
    saldo_teorico: float
    status: str
    current_operator_id: Optional[str] = None
    current_shift_id: Optional[int] = None
    notes: Optional[str] = None
    last_physical_balance: Optional[float] = None
    last_operator_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CashesListResponse(BaseModel):
    """List response schema"""
    items: List[CashesResponse]
    total: int
    skip: int
    limit: int


class CashesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[CashesData]


class CashesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: CashesUpdateData


class CashesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[CashesBatchUpdateItem]


class CashesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=CashesListResponse)
async def query_cashess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query cashess with filtering, sorting, and pagination"""
    logger.debug(f"Querying cashess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = CashesService(db)
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
        )
        logger.debug(f"Found {result['total']} cashess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying cashess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=CashesListResponse)
async def query_cashess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query cashess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying cashess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = CashesService(db)
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
        logger.debug(f"Found {result['total']} cashess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying cashess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=CashesResponse)
async def get_cashes(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single cashes by ID"""
    logger.debug(f"Fetching cashes with id: {id}, fields={fields}")
    
    service = CashesService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Cashes with id {id} not found")
            raise HTTPException(status_code=404, detail="Cashes not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching cashes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=CashesResponse, status_code=201)
async def create_cashes(
    data: CashesData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new cashes"""
    logger.debug(f"Creating new cashes with data: {data}")
    
    service = CashesService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create cashes")
        
        logger.info(f"Cashes created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating cashes: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating cashes: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[CashesResponse], status_code=201)
async def create_cashess_batch(
    request: CashesBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple cashess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} cashess")
    
    service = CashesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} cashess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[CashesResponse])
async def update_cashess_batch(
    request: CashesBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple cashess in a single request"""
    logger.debug(f"Batch updating {len(request.items)} cashess")
    
    service = CashesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} cashess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=CashesResponse)
async def update_cashes(
    id: int,
    data: CashesUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing cashes"""
    logger.debug(f"Updating cashes {id} with data: {data}")

    service = CashesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Cashes with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Cashes not found")
        
        logger.info(f"Cashes {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating cashes {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating cashes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_cashess_batch(
    request: CashesBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple cashess by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} cashess")
    
    service = CashesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} cashess successfully")
        return {"message": f"Successfully deleted {deleted_count} cashess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_cashes(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single cashes by ID"""
    logger.debug(f"Deleting cashes with id: {id}")
    
    service = CashesService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Cashes with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Cashes not found")
        
        logger.info(f"Cashes {id} deleted successfully")
        return {"message": "Cashes deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting cashes {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")