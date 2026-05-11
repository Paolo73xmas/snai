import json
import logging
from typing import List, Optional

from datetime import datetime, date

from fastapi import APIRouter, Body, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.vlts import VltsService

# Set up logging
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/entities/vlts", tags=["vlts"])


# ---------- Pydantic Schemas ----------
class VltsData(BaseModel):
    """Entity data schema (for create/update)"""
    codice: str
    name: str
    status: str
    notes: str = None


class VltsUpdateData(BaseModel):
    """Update entity data (partial updates allowed)"""
    codice: Optional[str] = None
    name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class VltsResponse(BaseModel):
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


class VltsListResponse(BaseModel):
    """List response schema"""
    items: List[VltsResponse]
    total: int
    skip: int
    limit: int


class VltsBatchCreateRequest(BaseModel):
    """Batch create request"""
    items: List[VltsData]


class VltsBatchUpdateItem(BaseModel):
    """Batch update item"""
    id: int
    updates: VltsUpdateData


class VltsBatchUpdateRequest(BaseModel):
    """Batch update request"""
    items: List[VltsBatchUpdateItem]


class VltsBatchDeleteRequest(BaseModel):
    """Batch delete request"""
    ids: List[int]


# ---------- Routes ----------
@router.get("", response_model=VltsListResponse)
async def query_vltss(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Query vltss with filtering, sorting, and pagination"""
    logger.debug(f"Querying vltss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")
    
    service = VltsService(db)
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
        logger.debug(f"Found {result['total']} vltss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying vltss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/all", response_model=VltsListResponse)
async def query_vltss_all(
    query: str = Query(None, description="Query conditions (JSON string)"),
    sort: str = Query(None, description="Sort field (prefix with '-' for descending)"),
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=2000, description="Max number of records to return"),
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    # Query vltss with filtering, sorting, and pagination without user limitation
    logger.debug(f"Querying vltss: query={query}, sort={sort}, skip={skip}, limit={limit}, fields={fields}")

    service = VltsService(db)
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
        logger.debug(f"Found {result['total']} vltss")
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying vltss: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/{id}", response_model=VltsResponse)
async def get_vlts(
    id: int,
    fields: str = Query(None, description="Comma-separated list of fields to return"),
    db: AsyncSession = Depends(get_db),
):
    """Get a single vlts by ID"""
    logger.debug(f"Fetching vlts with id: {id}, fields={fields}")
    
    service = VltsService(db)
    try:
        result = await service.get_by_id(id)
        if not result:
            logger.warning(f"Vlts with id {id} not found")
            raise HTTPException(status_code=404, detail="Vlts not found")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching vlts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("", response_model=VltsResponse, status_code=201)
async def create_vlts(
    data: VltsData,
    db: AsyncSession = Depends(get_db),
):
    """Create a new vlts"""
    logger.debug(f"Creating new vlts with data: {data}")
    
    service = VltsService(db)
    try:
        result = await service.create(data.model_dump())
        if not result:
            raise HTTPException(status_code=400, detail="Failed to create vlts")
        
        logger.info(f"Vlts created successfully with id: {result.id}")
        return result
    except ValueError as e:
        logger.error(f"Validation error creating vlts: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating vlts: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/batch", response_model=List[VltsResponse], status_code=201)
async def create_vltss_batch(
    request: VltsBatchCreateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Create multiple vltss in a single request"""
    logger.debug(f"Batch creating {len(request.items)} vltss")
    
    service = VltsService(db)
    results = []
    
    try:
        for item_data in request.items:
            result = await service.create(item_data.model_dump())
            if result:
                results.append(result)
        
        logger.info(f"Batch created {len(results)} vltss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch create: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch create failed: {str(e)}")


@router.put("/batch", response_model=List[VltsResponse])
async def update_vltss_batch(
    request: VltsBatchUpdateRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update multiple vltss in a single request"""
    logger.debug(f"Batch updating {len(request.items)} vltss")
    
    service = VltsService(db)
    results = []
    
    try:
        for item in request.items:
            # Only include non-None values for partial updates
            update_dict = {k: v for k, v in item.updates.model_dump().items() if v is not None}
            result = await service.update(item.id, update_dict)
            if result:
                results.append(result)
        
        logger.info(f"Batch updated {len(results)} vltss successfully")
        return results
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch update: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch update failed: {str(e)}")


@router.put("/{id}", response_model=VltsResponse)
async def update_vlts(
    id: int,
    data: VltsUpdateData,
    db: AsyncSession = Depends(get_db),
):
    """Update an existing vlts"""
    logger.debug(f"Updating vlts {id} with data: {data}")

    service = VltsService(db)
    try:
        # Only include non-None values for partial updates
        update_dict = {k: v for k, v in data.model_dump().items() if v is not None}
        result = await service.update(id, update_dict)
        if not result:
            logger.warning(f"Vlts with id {id} not found for update")
            raise HTTPException(status_code=404, detail="Vlts not found")
        
        logger.info(f"Vlts {id} updated successfully")
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error updating vlts {id}: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating vlts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/batch")
async def delete_vltss_batch(
    request: VltsBatchDeleteRequest,
    db: AsyncSession = Depends(get_db),
):
    """Delete multiple vltss by their IDs"""
    logger.debug(f"Batch deleting {len(request.ids)} vltss")
    
    service = VltsService(db)
    deleted_count = 0
    
    try:
        for item_id in request.ids:
            success = await service.delete(item_id)
            if success:
                deleted_count += 1
        
        logger.info(f"Batch deleted {deleted_count} vltss successfully")
        return {"message": f"Successfully deleted {deleted_count} vltss", "deleted_count": deleted_count}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error in batch delete: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Batch delete failed: {str(e)}")


@router.delete("/{id}")
async def delete_vlts(
    id: int,
    db: AsyncSession = Depends(get_db),
):
    """Delete a single vlts by ID"""
    logger.debug(f"Deleting vlts with id: {id}")
    
    service = VltsService(db)
    try:
        success = await service.delete(id)
        if not success:
            logger.warning(f"Vlts with id {id} not found for deletion")
            raise HTTPException(status_code=404, detail="Vlts not found")
        
        logger.info(f"Vlts {id} deleted successfully")
        return {"message": "Vlts deleted successfully", "id": id}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting vlts {id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")