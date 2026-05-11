import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.movements import MovementsService
from dependencies.auth import get_current_user
from schemas.auth import UserResponse

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/movements", tags=["movements"])


# ---------- Pydantic Schemas ----------
class MovementsData(BaseModel):
    """Entity data schema (for create/update)"""
    user_name: str = None
    user_role: str = None
    tipo_movimento: str
    importo: float
    cassa_origine_id: int = None
    cassa_destinazione_id: int = None
    saldo_origine_prima: float = None
    saldo_origine_dopo: float = None
    saldo_destinazione_prima: float = None
    saldo_destinazione_dopo: float = None
    shift_id: int = None
    vlt_id: int = None
    betsmart_id: int = None
    causale: str = None
    notes: str = None
    status: str = None
    riferimento_movimento_id: int = None


class MovementsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    tipo_movimento: Optional[str] = None
    importo: Optional[float] = None
    cassa_origine_id: Optional[int] = None
    cassa_destinazione_id: Optional[int] = None
    saldo_origine_prima: Optional[float] = None
    saldo_origine_dopo: Optional[float] = None
    saldo_destinazione_prima: Optional[float] = None
    saldo_destinazione_dopo: Optional[float] = None
    shift_id: Optional[int] = None
    vlt_id: Optional[int] = None
    betsmart_id: Optional[int] = None
    causale: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    riferimento_movimento_id: Optional[int] = None


class MovementsResponse(BaseModel):
    """Entity response schema"""
    id: int
    user_id: str
    user_name: Optional[str] = None
    user_role: Optional[str] = None
    tipo_movimento: str
    importo: float
    cassa_origine_id: Optional[int] = None
    cassa_destinazione_id: Optional[int] = None
    saldo_origine_prima: Optional[float] = None
    saldo_origine_dopo: Optional[float] = None
    saldo_destinazione_prima: Optional[float] = None
    saldo_destinazione_dopo: Optional[float] = None
    shift_id: Optional[int] = None
    vlt_id: Optional[int] = None
    betsmart_id: Optional[int] = None
    causale: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None
    riferimento_movimento_id: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class MovementsListResponse(BaseModel):
    """List response schema"""
    items: List[MovementsResponse]
    total: int
    skip: int
    limit: int


class MovementsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[MovementsData]


class MovementsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: MovementsUpdateData


class MovementsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[MovementsBatchUpdateItem]


class MovementsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=MovementsListResponse)
async def query_movementss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Query movementss with filtering, sorting, and pagination (user can only see their own records)"""
    logger.debug(f"Querying movementss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = MovementsService(db)
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
        logger.debug(f"Found {result['total']} movementss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying movementss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=MovementsListResponse)
async def query_movementss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query movementss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying movementss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = MovementsService(db)
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
        logger.debug(f"Found {result['total']} movementss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying movementss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=MovementsResponse)
async def get_movements(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a single movements by ID (user can only see their own records)"""
    logger.debug(f"Fetching movements with id: {id}, fields={fields}")
    
    service = MovementsService(db)
    try:
        result = await service.get_by_id(id, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Movements with id {id} not found")
            raise HTTPException(status_code=404, detail="Movements not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching movements {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=MovementsResponse, status_code=201)
async def create_movements(
    data: MovementsData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new movements"""
    logger.debug(f"Creating new movements with data: {data}")
    
    service = MovementsService(db)
    try:
        result = await service.create(data.model_dump(), user_id=str(current_user.id))
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create movements")
        
        logger.info(f"Movements created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating movements: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating movements: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[MovementsResponse], status_code=201)
async def create_movementss_batch(
    request: MovementsBatchCreateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple movementss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} movementss")
    
    service = MovementsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump(), user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} movementss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[MovementsResponse])
async def update_movementss_batch(
    request: MovementsBatchUpdateRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update multiple movementss in a single request (requires ownership)"""
    logger.debug(f"Batch updating {len(request.items)} movementss")
    
    service = MovementsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict, user_id=str(current_user.id))
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} movementss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=MovementsResponse)
async def update_movements(
    id: int,
    data: MovementsUpdateData,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update an existing movements (requires ownership)"""
    logger.debug(f"Updating movements {id} with data: {data}")

    service = MovementsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict, user_id=str(current_user.id))
        if not result:
            logger.warning(f"Movements with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Movements not found")
        
        logger.info(f"Movements {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating movements {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating movements {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_movementss_batch(
    request: MovementsBatchDeleteRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple movementss by their IDs (requires ownership)"""
    logger.debug(f"Batch deleting {len(request.ids)} movementss")
    
    service = MovementsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id, user_id=str(current_user.id))
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} movementss successfully")
        return {"message": f"Successfully deleted {deleted_count} movementss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_movements(
    id: int,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a single movements by ID (requires ownership)"""
    logger.debug(f"Deleting movements with id: {id}")
    
    service = MovementsService(db)
    try:
        success = await service.delete(id, user_id=str(current_user.id))
        if not success:
            logger.warning(f"Movements with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Movements not found")
        
        logger.info(f"Movements {id} deleted successfully")
        return {"message": "Movements deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting movements {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")