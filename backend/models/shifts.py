from core.database import Base
from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String


class Shifts(Base):
    __tablename__ = "shifts"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    user_name = Column(String, nullable=True)
    user_role = Column(String, nullable=True)
    cash_id = Column(Integer, nullable=False)
    cash_name = Column(String, nullable=True)
    opened_at = Column(DateTime(timezone=True), nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)
    saldo_teorico_apertura = Column(Float, nullable=True)
    saldo_fisico_apertura = Column(Float, nullable=True)
    discrepanza_apertura = Column(Float, nullable=True)
    note_apertura = Column(String, nullable=True)
    saldo_teorico_chiusura = Column(Float, nullable=True)
    saldo_fisico_chiusura = Column(Float, nullable=True)
    discrepanza_chiusura = Column(Float, nullable=True)
    note_chiusura = Column(String, nullable=True)
    status = Column(String, nullable=False)
    totale_incassi = Column(Float, nullable=True)
    totale_pagamenti = Column(Float, nullable=True)
    totale_sovvenzioni = Column(Float, nullable=True)
    totale_restituzioni = Column(Float, nullable=True)
    totale_svuotamenti = Column(Float, nullable=True)
    receipt_photo_key = Column(String, nullable=True)
    pos_photo_key = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.now)
    updated_at = Column(DateTime(timezone=True), default=datetime.now, onupdate=datetime.now)