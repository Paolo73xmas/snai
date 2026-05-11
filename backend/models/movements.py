from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Movements(Base):
    __tablename__ = "movements"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    tipo_movimento = Column(String, nullable=False)
    importo = Column(Float, nullable=False)
    cassa_origine_id = Column(Integer, nullable=True)
    cassa_destinazione_id = Column(Integer, nullable=True)
    saldo_origine_prima = Column(Float, nullable=True)
    saldo_origine_dopo = Column(Float, nullable=True)
    saldo_destinazione_prima = Column(Float, nullable=True)
    saldo_destinazione_dopo = Column(Float, nullable=True)
    shift_id = Column(Integer, nullable=True)
    vlt_id = Column(Integer, nullable=True)
    betsmart_id = Column(Integer, nullable=True)
    causale = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    status = Column(String, nullable=True)
    riferimento_movimento_id = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)