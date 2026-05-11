from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Discrepancies(Base):
    __tablename__ = "discrepancies"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    shift_id = Column(Integer, nullable=False)
    cash_id = Column(Integer, nullable=False)
    cash_name = Column(String, nullable=True)
    tipo = Column(String, nullable=False)
    saldo_teorico = Column(Float, nullable=False)
    saldo_fisico = Column(Float, nullable=False)
    differenza = Column(Float, nullable=False)
    notes = Column(String, nullable=True)
    status = Column(String, nullable=True)
    verificato_da = Column(String, nullable=True)
    verificato_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)