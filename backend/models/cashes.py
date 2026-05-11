from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Cashes(Base):
    __tablename__ = "cashes"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    name = Column(String, nullable=False)
    cash_type = Column(String, nullable=False)
    saldo_teorico = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    current_operator_id = Column(String, nullable=True)
    current_shift_id = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    last_physical_balance = Column(Float, nullable=True)
    last_operator_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)