import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.betsmarts import BetsmartsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/betsmarts", tags=["betsmarts"])


# ---------- Pydantic Schemas ----------
class BetsmartsData(BaseModel):
    """Entity data schema (for create/update)"""
    codice: str
    name: str
    status: str
    notes: str = None


class BetsmartsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    codice: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class BetsmartsResponse(BaseModel):
    """Entity response schema"""
    id: int
    codice: str
    name: str
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class BetsmartsListResponse(BaseModel):
    """List response schema"""
    items: List[BetsmartsResponse]
    total: int
    skip: int
    limit: int


class BetsmartsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[BetsmartsData]


class BetsmartsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: BetsmartsUpdateData


class BetsmartsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[BetsmartsBatchUpdateItem]


class BetsmartsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=BetsmartsListResponse)
async def query_betsmartss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query betsmartss with filtering, sorting, and pagination"""
    logger.debug(f"Querying betsmartss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = BetsmartsService(db)
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
        logger.debug(f"Found {result['total']} betsmartss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying betsmartss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=BetsmartsListResponse)
async def query_betsmartss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query betsmartss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying betsmartss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = BetsmartsService(db)
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
        logger.debug(f"Found {result['total']} betsmartss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying betsmartss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=BetsmartsResponse)
async def get_betsmarts(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single betsmarts by ID"""
    logger.debug(f"Fetching betsmarts with id: {id}, fields={fields}")
    
    service = BetsmartsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Betsmarts with id {id} not found")
            raise HTTPException(status_code=404, detail="Betsmarts not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching betsmarts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=BetsmartsResponse, status_code=201)
async def create_betsmarts(
    data: BetsmartsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new betsmarts"""
    logger.debug(f"Creating new betsmarts with data: {data}")
    
    service = BetsmartsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create betsmarts")
        
        logger.info(f"Betsmarts created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating betsmarts: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating betsmarts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[BetsmartsResponse], status_code=201)
async def create_betsmartss_batch(
    request: BetsmartsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple betsmartss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} betsmartss")
    
    service = BetsmartsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} betsmartss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[BetsmartsResponse])
async def update_betsmartss_batch(
    request: BetsmartsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple betsmartss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} betsmartss")
    
    service = BetsmartsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} betsmartss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=BetsmartsResponse)
async def update_betsmarts(
    id: int,
    data: BetsmartsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing betsmarts"""
    logger.debug(f"Updating betsmarts {id} with data: {data}")

    service = BetsmartsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Betsmarts with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Betsmarts not found")
        
        logger.info(f"Betsmarts {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating betsmarts {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating betsmarts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_betsmartss_batch(
    request: BetsmartsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple betsmartss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} betsmartss")
    
    service = BetsmartsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} betsmartss successfully")
        return {"message": f"Successfully deleted {deleted_count} betsmartss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_betsmarts(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single betsmarts by ID"""
    logger.debug(f"Deleting betsmarts with id: {id}")
    
    service = BetsmartsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Betsmarts with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Betsmarts not found")
        
        logger.info(f"Betsmarts {id} deleted successfully")
        return {"message": "Betsmarts deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting betsmarts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")