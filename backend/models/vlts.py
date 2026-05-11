from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String


class Vlts(Base):
    __tablename__ = "vlts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    codice = Column(String, nullable=False)
    name = Column(String, nullable=False)
    status = Column(String, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)