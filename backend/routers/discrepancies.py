import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.discrepancies import DiscrepanciesService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/discrepancies", tags=["discrepancies"])


# ---------- Pydantic Schemas ----------
class DiscrepanciesData(BaseModel):
    """Entity data schema (for create/update)"""
    user_name: str = None
    user_role: str = None
    shift_id: int
    cash_id: int
    cash_name: str = None
    tipo: str
    saldo_teorico: float
    saldo_fisico: float
    differenza: float
    notes: str = None
    status: str = None
    verificato_da: str = None
    verificato_at: Optional[datetime] = None


class DiscrepanciesUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    shift_id: Optional[int] = None
    cash_id: Optional[int] = None
    cash_name: Optional[str] = None
    tipo: Optional[str] = None
    saldo_teorico: Optional[float] = None
    saldo_fisico: Optional[float] = None
    differenza: Optional[float] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    verificato_da: Optional[str] = None
    verificato_at: Optional[datetime] = None


class DiscrepanciesResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    shift_id: int
    cash_id: int
    cash_name: Optional[str] = None
    tipo: str
    saldo_teorico: float
    saldo_fisico: float
    differenza: float
    notes: Optional[str] = None
    status: Optional[str] = None
    verificato_da: Optional[str] = None
    verificato_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DiscrepanciesListResponse(BaseModel):
    """List response schema"""
    items: List[DiscrepanciesResponse]
    total: int
    skip: int
    limit: int


class DiscrepanciesBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[DiscrepanciesData]


class DiscrepanciesBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: DiscrepanciesUpdateData


class DiscrepanciesBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[DiscrepanciesBatchUpdateItem]


class DiscrepanciesBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=DiscrepanciesListResponse)
async def query_discrepanciess(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query discrepanciess with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying discrepanciess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = DiscrepanciesService(db)
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
        logger.debug(f"Found {result['total']} discrepanciess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying discrepanciess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=DiscrepanciesListResponse)
async def query_discrepanciess_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query discrepanciess with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying discrepanciess: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = DiscrepanciesService(db)
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
        logger.debug(f"Found {result['total']} discrepanciess")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying discrepanciess: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=DiscrepanciesResponse)
async def get_discrepancies(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single discrepancies by ID (user can only see their own records)"""
    logger.debug(f"Fetching discrepancies with id: {id}, fields={fields}")
    
    service = DiscrepanciesService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Discrepancies with id {id} not found")
            raise HTTPException(status_code=404, detail="Discrepancies not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching discrepancies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=DiscrepanciesResponse, status_code=201)
async def create_discrepancies(
    data: DiscrepanciesData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new discrepancies"""
    logger.debug(f"Creating new discrepancies with data: {data}")
    
    service = DiscrepanciesService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create discrepancies")
        
        logger.info(f"Discrepancies created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating discrepancies: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating discrepancies: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[DiscrepanciesResponse], status_code=201)
async def create_discrepanciess_batch(
    request: DiscrepanciesBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple discrepanciess in a single request"""
    logger.debug(f"Batch creating {len(request.items)} discrepanciess")
    
    service = DiscrepanciesService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} discrepanciess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[DiscrepanciesResponse])
async def update_discrepanciess_batch(
    request: DiscrepanciesBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple discrepanciess in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} discrepanciess")
    
    service = DiscrepanciesService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} discrepanciess successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=DiscrepanciesResponse)
async def update_discrepancies(
    id: int,
    data: DiscrepanciesUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing discrepancies (requires ownership)"""
    logger.debug(f"Updating discrepancies {id} with data: {data}")

    service = DiscrepanciesService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Discrepancies with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Discrepancies not found")
        
        logger.info(f"Discrepancies {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating discrepancies {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating discrepancies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_discrepanciess_batch(
    request: DiscrepanciesBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple discrepanciess by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} discrepanciess")
    
    service = DiscrepanciesService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} discrepanciess successfully")
        return {"message": f"Successfully deleted {deleted_count} discrepanciess", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_discrepancies(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single discrepancies by ID (requires ownership)"""
    logger.debug(f"Deleting discrepancies with id: {id}")
    
    service = DiscrepanciesService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Discrepancies with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Discrepancies not found")
        
        logger.info(f"Discrepancies {id} deleted successfully")
        return {"message": "Discrepancies deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting discrepancies {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")