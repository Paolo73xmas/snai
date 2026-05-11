import logging
from typing import Optional, Dict, Any, List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models.cashes import Cashes

logger = logging.getLogger(__name__)


# ------------------ Service Layer ------------------
class CashesService:
    """Service layer for Cashes operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, data: Dict[str, Any]) -> Optional[Cashes]:
        """Create a new cashes"""
        try:
            obj = Cashes(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Created cashes with id: {obj.id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error creating cashes: {str(e)}")
            raise

    async def get_by_id(self, obj_id: int) -> Optional[Cashes]:
        """Get cashes by ID"""
        try:
            query = select(Cashes).where(Cashes.id == obj_id)
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching cashes {obj_id}: {str(e)}")
            raise

    async def get_list(
        self, 
        skip: int = 0, 
        limit: int = 20, 
        query_dict: Optional[Dict[str, Any]] = None,
        sort: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Get paginated list of cashess"""
        try:
            query = select(Cashes)
            count_query = select(func.count(Cashes.id))
            
            if query_dict:
                for field, value in query_dict.items():
                    if hasattr(Cashes, field):
                        query = query.where(getattr(Cashes, field) == value)
                        count_query = count_query.where(getattr(Cashes, field) == value)
            
            count_result = await self.db.execute(count_query)
            total = count_result.scalar()

            if sort:
                if sort.startswith('-'):
                    field_name = sort[1:]
                    if hasattr(Cashes, field_name):
                        query = query.order_by(getattr(Cashes, field_name).desc())
                else:
                    if hasattr(Cashes, sort):
                        query = query.order_by(getattr(Cashes, sort))
            else:
                query = query.order_by(Cashes.id.desc())

            result = await self.db.execute(query.offset(skip).limit(limit))
            items = result.scalars().all()

            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
            }
        except Exception as e:
            logger.error(f"Error fetching cashes list: {str(e)}")
            raise

    async def update(self, obj_id: int, update_data: Dict[str, Any]) -> Optional[Cashes]:
        """Update cashes"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Cashes {obj_id} not found for update")
                return None
            for key, value in update_data.items():
                if hasattr(obj, key):
                    setattr(obj, key, value)

            await self.db.commit()
            await self.db.refresh(obj)
            logger.info(f"Updated cashes {obj_id}")
            return obj
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error updating cashes {obj_id}: {str(e)}")
            raise

    async def delete(self, obj_id: int) -> bool:
        """Delete cashes"""
        try:
            obj = await self.get_by_id(obj_id)
            if not obj:
                logger.warning(f"Cashes {obj_id} not found for deletion")
                return False
            await self.db.delete(obj)
            await self.db.commit()
            logger.info(f"Deleted cashes {obj_id}")
            return True
        except Exception as e:
            await self.db.rollback()
            logger.error(f"Error deleting cashes {obj_id}: {str(e)}")
            raise

    async def get_by_field(self, field_name: str, field_value: Any) -> Optional[Cashes]:
        """Get cashes by any field"""
        try:
            if not hasattr(Cashes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Cashes")
            result = await self.db.execute(
                select(Cashes).where(getattr(Cashes, field_name) == field_value)
            )
            return result.scalar_one_or_none()
        except Exception as e:
            logger.error(f"Error fetching cashes by {field_name}: {str(e)}")
            raise

    async def list_by_field(
        self, field_name: str, field_value: Any, skip: int = 0, limit: int = 20
    ) -> List[Cashes]:
        """Get list of cashess filtered by field"""
        try:
            if not hasattr(Cashes, field_name):
                raise ValueError(f"Field {field_name} does not exist on Cashes")
            result = await self.db.execute(
                select(Cashes)
                .where(getattr(Cashes, field_name) == field_value)
                .offset(skip)
                .limit(limit)
                .order_by(Cashes.id.desc())
            )
            return result.scalars().all()
        except Exception as e:
            logger.error(f"Error fetching cashess by {field_name}: {str(e)}")
            raise