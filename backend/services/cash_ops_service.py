import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from sqlalchemy import select, func, and_, or_, update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession

from models.cashes import Cashes
from models.shifts import Shifts
from models.movements import Movements
from models.discrepancies import Discrepancies
from models.vlts import Vlts
from models.betsmarts import Betsmarts
from models.user_profiles import User_profiles

logger = logging.getLogger(__name__)


class CashOpsService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ── helpers ──────────────────────────────────────────────────
    # Admin emails that should automatically get admin role on first login
    ADMIN_EMAILS = ["admin@trezzanosnai.it", "natale.paolo@gmail.com"]

    async def _get_or_create_profile(self, user_id: str, email: str = "", name: str = "") -> User_profiles:
        result = await self.db.execute(select(User_profiles).where(User_profiles.user_id == user_id))
        profile = result.scalars().first()
        if not profile:
            # Auto-assign admin role for known admin emails
            auto_role = "admin" if email.lower() in [e.lower() for e in self.ADMIN_EMAILS] else "operator"
            profile = User_profiles(
                user_id=user_id,
                nome=name or (email.split("@")[0] if email else "User"),
                cognome="",
                telefono="",
                ruolo=auto_role,
                status="attivo",
                username=email or user_id[:8],
            )
            self.db.add(profile)
            await self.db.flush()
            if auto_role == "admin":
                logger.info(f"Auto-assigned admin role to user {email} ({user_id})")
        else:
            # If profile exists but email is in admin list and role is not admin, upgrade it
            if email and email.lower() in [e.lower() for e in self.ADMIN_EMAILS] and profile.ruolo != "admin":
                profile.ruolo = "admin"
                await self.db.flush()
                logger.info(f"Upgraded existing user {email} ({user_id}) to admin role")
        return profile

    async def _get_cash(self, cash_id: int) -> Optional[Cashes]:
        result = await self.db.execute(select(Cashes).where(Cashes.id == cash_id))
        return result.scalars().first()

    async def _get_cassa_centrale(self) -> Optional[Cashes]:
        result = await self.db.execute(select(Cashes).where(Cashes.cash_type == "CASSA_CENTRALE"))
        return result.scalars().first()

    async def _get_banca(self) -> Optional[Cashes]:
        result = await self.db.execute(select(Cashes).where(Cashes.cash_type == "BANCA"))
        return result.scalars().first()

    async def _create_movement(self, **kwargs) -> Movements:
        mov = Movements(**kwargs)
        self.db.add(mov)
        await self.db.flush()
        return mov

    async def _create_discrepancy(self, **kwargs) -> Discrepancies:
        disc = Discrepancies(**kwargs)
        self.db.add(disc)
        await self.db.flush()
        return disc

    def _display_name(self, profile: User_profiles) -> str:
        parts = [profile.nome or "", profile.cognome or ""]
        name = " ".join(p for p in parts if p).strip()
        return name or profile.username or "User"

    # ── user profile ────────────────────────────────────────────
    async def get_user_profile(self, user_id: str, email: str = "", name: str = "") -> Dict[str, Any]:
        profile = await self._get_or_create_profile(user_id, email, name)
        await self.db.commit()
        return {
            "id": profile.id,
            "user_id": profile.user_id,
            "nome": profile.nome,
            "cognome": profile.cognome,
            "telefono": profile.telefono,
            "ruolo": profile.ruolo,
            "status": profile.status,
            "username": profile.username,
        }

    async def set_user_role(self, target_user_id: str, role: str, admin_profile: User_profiles) -> Dict[str, Any]:
        result = await self.db.execute(select(User_profiles).where(User_profiles.user_id == target_user_id))
        target = result.scalars().first()
        if not target:
            raise ValueError("User profile not found")
        target.ruolo = role
        await self.db.flush()
        await self._create_movement(
            user_id=admin_profile.user_id,
            user_name=self._display_name(admin_profile),
            user_role=admin_profile.ruolo,
            tipo_movimento="MODIFICA_UTENTE",
            importo=0,
            causale=f"Ruolo cambiato a {role} per {self._display_name(target)}",
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "message": f"Role updated to {role}"}

    async def get_all_profiles(self) -> List[Dict[str, Any]]:
        result = await self.db.execute(select(User_profiles).order_by(User_profiles.id))
        profiles = result.scalars().all()
        return [
            {
                "id": p.id,
                "user_id": p.user_id,
                "nome": p.nome,
                "cognome": p.cognome,
                "telefono": p.telefono,
                "ruolo": p.ruolo,
                "status": p.status,
                "username": p.username,
            }
            for p in profiles
        ]

    async def update_profile(self, user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        result = await self.db.execute(select(User_profiles).where(User_profiles.user_id == user_id))
        profile = result.scalars().first()
        if not profile:
            raise ValueError("Profile not found")
        for key in ["nome", "cognome", "telefono", "username"]:
            if key in data and data[key] is not None:
                setattr(profile, key, data[key])
        await self.db.commit()
        return {"success": True}

    async def create_user_profile(self, admin_user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Admin creates a new user profile (pre-registration)."""
        # Verify admin
        admin_result = await self.db.execute(select(User_profiles).where(User_profiles.user_id == admin_user_id))
        admin_profile = admin_result.scalars().first()
        if not admin_profile or admin_profile.ruolo != "admin":
            raise ValueError("Solo Admin può creare utenti")

        # Check if username/email already exists
        email = data.get("email", "").strip()
        username = data.get("username", "").strip() or email
        if username:
            existing = await self.db.execute(select(User_profiles).where(User_profiles.username == username))
            if existing.scalars().first():
                raise ValueError(f"Username '{username}' già esistente")

        # Validate password
        password = data.get("password", "").strip()
        if not password:
            raise ValueError("La password è obbligatoria")
        if len(password) < 4:
            raise ValueError("La password deve avere almeno 4 caratteri")

        import uuid
        import hashlib
        # Generate a placeholder user_id for pre-registered users
        placeholder_user_id = f"pre_{uuid.uuid4().hex[:16]}"

        # Hash the password
        password_hash = hashlib.sha256(password.encode()).hexdigest()

        ruolo = data.get("ruolo", "operator")
        if ruolo not in ("admin", "operator", "operator_plus"):
            raise ValueError("Ruolo non valido")

        profile = User_profiles(
            user_id=placeholder_user_id,
            nome=data.get("nome", "").strip(),
            cognome=data.get("cognome", "").strip(),
            telefono=data.get("telefono", "").strip(),
            ruolo=ruolo,
            status="attivo",
            username=username,
            password_hash=password_hash,
        )
        self.db.add(profile)
        await self.db.flush()

        # Log the creation
        await self._create_movement(
            user_id=admin_user_id,
            user_name=self._display_name(admin_profile),
            user_role=admin_profile.ruolo,
            tipo_movimento="CREAZIONE_UTENTE",
            importo=0,
            causale=f"Creato utente {data.get('nome', '')} {data.get('cognome', '')} ({username}) con ruolo {ruolo}",
            status="registrato",
        )
        await self.db.commit()
        logger.info(f"Admin {admin_user_id} created user profile: {username} with role {ruolo}")
        return {
            "success": True,
            "id": profile.id,
            "user_id": profile.user_id,
            "username": profile.username,
            "ruolo": profile.ruolo,
        }

    # ── open shift ──────────────────────────────────────────────
    async def open_shift(self, user_id: str, cash_id: int, saldo_fisico: float, note: str = "") -> Dict[str, Any]:
        profile = await self._get_or_create_profile(user_id)
        # Check no active shift
        existing = await self.db.execute(
            select(Shifts).where(and_(Shifts.user_id == user_id, Shifts.status == "aperto"))
        )
        if existing.scalars().first():
            raise ValueError("Hai già un turno aperto")

        cash = await self._get_cash(cash_id)
        if not cash:
            raise ValueError("Cassa non trovata")
        if cash.cash_type != "CASSA_OPERATORE":
            raise ValueError("Puoi selezionare solo una Cassa Operatore")
        if cash.status != "libera":
            raise ValueError(f"La cassa è {cash.status}, non disponibile")

        # Lock cash atomically
        cash.status = "in_uso"
        cash.current_operator_id = user_id
        saldo_teorico = cash.saldo_teorico or 0.0
        discrepanza = round(saldo_fisico - saldo_teorico, 2)
        now = datetime.now(timezone.utc)

        shift = Shifts(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            cash_id=cash_id,
            cash_name=cash.name,
            opened_at=now,
            saldo_teorico_apertura=saldo_teorico,
            saldo_fisico_apertura=saldo_fisico,
            discrepanza_apertura=discrepanza,
            note_apertura=note if discrepanza != 0 else "",
            status="aperto",
            totale_incassi=0,
            totale_pagamenti=0,
            totale_sovvenzioni=0,
            totale_restituzioni=0,
            totale_svuotamenti=0,
        )
        self.db.add(shift)
        await self.db.flush()

        cash.current_shift_id = shift.id
        cash.last_operator_name = self._display_name(profile)

        # If discrepancy, update theoretical to match physical
        if discrepanza != 0:
            cash.saldo_teorico = saldo_fisico
            cash.last_physical_balance = saldo_fisico
            await self._create_discrepancy(
                user_id=user_id,
                user_name=self._display_name(profile),
                user_role=profile.ruolo,
                shift_id=shift.id,
                cash_id=cash_id,
                cash_name=cash.name,
                tipo="apertura",
                saldo_teorico=saldo_teorico,
                saldo_fisico=saldo_fisico,
                differenza=discrepanza,
                notes=note,
                status="da_verificare",
            )
            await self._create_movement(
                user_id=user_id,
                user_name=self._display_name(profile),
                user_role=profile.ruolo,
                tipo_movimento="DISCREPANZA_APERTURA",
                importo=discrepanza,
                cassa_destinazione_id=cash_id,
                saldo_destinazione_prima=saldo_teorico,
                saldo_destinazione_dopo=saldo_fisico,
                shift_id=shift.id,
                causale=f"Discrepanza apertura: {note}",
                status="registrato",
            )

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="APERTURA_TURNO",
            importo=saldo_fisico,
            cassa_destinazione_id=cash_id,
            saldo_destinazione_prima=saldo_teorico,
            saldo_destinazione_dopo=cash.saldo_teorico,
            shift_id=shift.id,
            causale="Apertura turno",
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "shift_id": shift.id, "discrepanza": discrepanza}

    # ── close shift ─────────────────────────────────────────────
    async def close_shift(self, user_id: str, saldo_fisico: float, note: str = "") -> Dict[str, Any]:
        profile = await self._get_or_create_profile(user_id)
        result = await self.db.execute(
            select(Shifts).where(and_(Shifts.user_id == user_id, Shifts.status == "aperto"))
        )
        shift = result.scalars().first()
        if not shift:
            raise ValueError("Nessun turno aperto")

        cash = await self._get_cash(shift.cash_id)
        if not cash:
            raise ValueError("Cassa non trovata")

        saldo_teorico = cash.saldo_teorico or 0.0
        discrepanza = round(saldo_fisico - saldo_teorico, 2)
        now = datetime.now(timezone.utc)

        shift.closed_at = now
        shift.saldo_teorico_chiusura = saldo_teorico
        shift.saldo_fisico_chiusura = saldo_fisico
        shift.discrepanza_chiusura = discrepanza
        shift.note_chiusura = note if discrepanza != 0 else ""

        if discrepanza != 0:
            shift.status = "chiuso_con_discrepanza"
            cash.status = "da_verificare"
            await self._create_discrepancy(
                user_id=user_id,
                user_name=self._display_name(profile),
                user_role=profile.ruolo,
                shift_id=shift.id,
                cash_id=cash.id,
                cash_name=cash.name,
                tipo="chiusura",
                saldo_teorico=saldo_teorico,
                saldo_fisico=saldo_fisico,
                differenza=discrepanza,
                notes=note,
                status="da_verificare",
            )
            await self._create_movement(
                user_id=user_id,
                user_name=self._display_name(profile),
                user_role=profile.ruolo,
                tipo_movimento="DISCREPANZA_CHIUSURA",
                importo=discrepanza,
                cassa_destinazione_id=cash.id,
                saldo_destinazione_prima=saldo_teorico,
                saldo_destinazione_dopo=saldo_fisico,
                shift_id=shift.id,
                causale=f"Discrepanza chiusura: {note}",
                status="registrato",
            )
            cash.saldo_teorico = saldo_fisico
        else:
            shift.status = "chiuso"
            cash.status = "libera"

        cash.current_operator_id = None
        cash.current_shift_id = None
        cash.last_physical_balance = saldo_fisico

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="CHIUSURA_TURNO",
            importo=saldo_fisico,
            cassa_destinazione_id=cash.id,
            saldo_destinazione_prima=saldo_teorico,
            saldo_destinazione_dopo=cash.saldo_teorico,
            shift_id=shift.id,
            causale="Chiusura turno",
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "discrepanza": discrepanza, "status": shift.status}

    # ── record income ───────────────────────────────────────────
    async def record_income(self, user_id: str, categoria: str, importo: float, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        result = await self.db.execute(
            select(Shifts).where(and_(Shifts.user_id == user_id, Shifts.status == "aperto"))
        )
        shift = result.scalars().first()
        if not shift:
            raise ValueError("Nessun turno aperto")

        cash = await self._get_cash(shift.cash_id)
        if not cash:
            raise ValueError("Cassa non trovata")

        tipo_map = {
            "scommesse_sportive": "INCASSO_SCOMMESSE_SPORTIVE",
            "scommesse_ippiche": "INCASSO_SCOMMESSE_IPPICHE",
            "scommesse_virtuali": "INCASSO_SCOMMESSE_VIRTUALI",
            "ricariche": "INCASSO_RICARICHE",
        }
        tipo = tipo_map.get(categoria)
        if not tipo:
            raise ValueError(f"Categoria incasso non valida: {categoria}")

        saldo_prima = cash.saldo_teorico or 0.0
        cash.saldo_teorico = round(saldo_prima + importo, 2)
        shift.totale_incassi = round((shift.totale_incassi or 0) + importo, 2)

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento=tipo,
            importo=importo,
            cassa_destinazione_id=cash.id,
            saldo_destinazione_prima=saldo_prima,
            saldo_destinazione_dopo=cash.saldo_teorico,
            shift_id=shift.id,
            causale=f"Incasso {categoria}",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "nuovo_saldo": cash.saldo_teorico}

    # ── record payment ──────────────────────────────────────────
    async def record_payment(self, user_id: str, categoria: str, importo: float, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        result = await self.db.execute(
            select(Shifts).where(and_(Shifts.user_id == user_id, Shifts.status == "aperto"))
        )
        shift = result.scalars().first()
        if not shift:
            raise ValueError("Nessun turno aperto")

        cash = await self._get_cash(shift.cash_id)
        if not cash:
            raise ValueError("Cassa non trovata")

        tipo_map = {
            "scommesse_sportive": "PAGAMENTO_SCOMMESSE_SPORTIVE",
            "scommesse_ippiche": "PAGAMENTO_SCOMMESSE_IPPICHE",
            "scommesse_virtuali": "PAGAMENTO_SCOMMESSE_VIRTUALI",
            "vlt": "PAGAMENTO_VLT",
            "prelievi_web": "PAGAMENTO_PRELIEVI_WEB",
        }
        tipo = tipo_map.get(categoria)
        if not tipo:
            raise ValueError(f"Categoria pagamento non valida: {categoria}")

        saldo_prima = cash.saldo_teorico or 0.0
        cash.saldo_teorico = round(saldo_prima - importo, 2)
        shift.totale_pagamenti = round((shift.totale_pagamenti or 0) + importo, 2)

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento=tipo,
            importo=importo,
            cassa_origine_id=cash.id,
            saldo_origine_prima=saldo_prima,
            saldo_origine_dopo=cash.saldo_teorico,
            shift_id=shift.id,
            causale=f"Pagamento {categoria}",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "nuovo_saldo": cash.saldo_teorico}

    # ── sovvenzione ─────────────────────────────────────────────
    async def sovvenzione(self, user_id: str, target_cash_id: int, importo: float, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        centrale = await self._get_cassa_centrale()
        if not centrale:
            raise ValueError("Cassa Centrale non trovata")
        target = await self._get_cash(target_cash_id)
        if not target:
            raise ValueError("Cassa destinataria non trovata")
        if (centrale.saldo_teorico or 0) < importo:
            raise ValueError("Saldo Cassa Centrale insufficiente")

        saldo_cc_prima = centrale.saldo_teorico or 0.0
        saldo_target_prima = target.saldo_teorico or 0.0
        centrale.saldo_teorico = round(saldo_cc_prima - importo, 2)
        target.saldo_teorico = round(saldo_target_prima + importo, 2)

        # Update shift totals if operator has active shift on this cash
        result = await self.db.execute(
            select(Shifts).where(and_(Shifts.cash_id == target_cash_id, Shifts.status == "aperto"))
        )
        shift = result.scalars().first()
        shift_id = None
        if shift:
            shift.totale_sovvenzioni = round((shift.totale_sovvenzioni or 0) + importo, 2)
            shift_id = shift.id

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="SOVVENZIONE_CASSA",
            importo=importo,
            cassa_origine_id=centrale.id,
            cassa_destinazione_id=target.id,
            saldo_origine_prima=saldo_cc_prima,
            saldo_origine_dopo=centrale.saldo_teorico,
            saldo_destinazione_prima=saldo_target_prima,
            saldo_destinazione_dopo=target.saldo_teorico,
            shift_id=shift_id,
            causale=f"Sovvenzione a {target.name}",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "saldo_centrale": centrale.saldo_teorico, "saldo_target": target.saldo_teorico}

    # ── restituzione ────────────────────────────────────────────
    async def restituzione(self, user_id: str, source_cash_id: int, importo: float, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        centrale = await self._get_cassa_centrale()
        if not centrale:
            raise ValueError("Cassa Centrale non trovata")
        source = await self._get_cash(source_cash_id)
        if not source:
            raise ValueError("Cassa origine non trovata")
        if (source.saldo_teorico or 0) < importo:
            raise ValueError("Saldo cassa insufficiente")

        saldo_src_prima = source.saldo_teorico or 0.0
        saldo_cc_prima = centrale.saldo_teorico or 0.0
        source.saldo_teorico = round(saldo_src_prima - importo, 2)
        centrale.saldo_teorico = round(saldo_cc_prima + importo, 2)

        result = await self.db.execute(
            select(Shifts).where(and_(Shifts.cash_id == source_cash_id, Shifts.status == "aperto"))
        )
        shift = result.scalars().first()
        shift_id = None
        if shift:
            shift.totale_restituzioni = round((shift.totale_restituzioni or 0) + importo, 2)
            shift_id = shift.id

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="RESTITUZIONE_CASSA",
            importo=importo,
            cassa_origine_id=source.id,
            cassa_destinazione_id=centrale.id,
            saldo_origine_prima=saldo_src_prima,
            saldo_origine_dopo=source.saldo_teorico,
            saldo_destinazione_prima=saldo_cc_prima,
            saldo_destinazione_dopo=centrale.saldo_teorico,
            shift_id=shift_id,
            causale=f"Restituzione da {source.name}",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "saldo_source": source.saldo_teorico, "saldo_centrale": centrale.saldo_teorico}

    # ── svuotamento VLT ─────────────────────────────────────────
    async def svuotamento_vlt(self, user_id: str, vlt_id: int, importo: float, dest_cash_id: int, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        if profile.ruolo not in ("admin", "operator_plus"):
            raise ValueError("Solo Admin e Operator+ possono svuotare VLT")

        result = await self.db.execute(select(Vlts).where(Vlts.id == vlt_id))
        vlt = result.scalars().first()
        if not vlt:
            raise ValueError("VLT non trovata")

        dest = await self._get_cash(dest_cash_id)
        if not dest:
            raise ValueError("Cassa destinataria non trovata")

        saldo_prima = dest.saldo_teorico or 0.0
        dest.saldo_teorico = round(saldo_prima + importo, 2)

        result2 = await self.db.execute(
            select(Shifts).where(and_(Shifts.cash_id == dest_cash_id, Shifts.status == "aperto"))
        )
        shift = result2.scalars().first()
        shift_id = None
        if shift:
            shift.totale_svuotamenti = round((shift.totale_svuotamenti or 0) + importo, 2)
            shift_id = shift.id

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="SVUOTAMENTO_VLT",
            importo=importo,
            cassa_destinazione_id=dest.id,
            saldo_destinazione_prima=saldo_prima,
            saldo_destinazione_dopo=dest.saldo_teorico,
            shift_id=shift_id,
            vlt_id=vlt_id,
            causale=f"Svuotamento VLT {vlt.nome if hasattr(vlt, 'nome') else vlt.name}",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "saldo_dest": dest.saldo_teorico}

    # ── svuotamento BetSmart ────────────────────────────────────
    async def svuotamento_betsmart(self, user_id: str, betsmart_id: int, importo: float, dest_cash_id: int, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        if profile.ruolo not in ("admin", "operator_plus"):
            raise ValueError("Solo Admin e Operator+ possono svuotare BetSmart")

        result = await self.db.execute(select(Betsmarts).where(Betsmarts.id == betsmart_id))
        bs = result.scalars().first()
        if not bs:
            raise ValueError("BetSmart non trovata")

        dest = await self._get_cash(dest_cash_id)
        if not dest:
            raise ValueError("Cassa destinataria non trovata")

        saldo_prima = dest.saldo_teorico or 0.0
        dest.saldo_teorico = round(saldo_prima + importo, 2)

        result2 = await self.db.execute(
            select(Shifts).where(and_(Shifts.cash_id == dest_cash_id, Shifts.status == "aperto"))
        )
        shift = result2.scalars().first()
        shift_id = None
        if shift:
            shift.totale_svuotamenti = round((shift.totale_svuotamenti or 0) + importo, 2)
            shift_id = shift.id

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="SVUOTAMENTO_BETSMART",
            importo=importo,
            cassa_destinazione_id=dest.id,
            saldo_destinazione_prima=saldo_prima,
            saldo_destinazione_dopo=dest.saldo_teorico,
            shift_id=shift_id,
            betsmart_id=betsmart_id,
            causale=f"Svuotamento BetSmart {bs.name}",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "saldo_dest": dest.saldo_teorico}

    # ── bank operations ─────────────────────────────────────────
    async def bank_deposit(self, user_id: str, importo: float, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        if profile.ruolo != "admin":
            raise ValueError("Solo Admin può effettuare versamenti in Banca")

        centrale = await self._get_cassa_centrale()
        banca = await self._get_banca()
        if not centrale or not banca:
            raise ValueError("Cassa Centrale o Banca non trovata")
        if (centrale.saldo_teorico or 0) < importo:
            raise ValueError("Saldo Cassa Centrale insufficiente")

        sc_prima = centrale.saldo_teorico or 0.0
        sb_prima = banca.saldo_teorico or 0.0
        centrale.saldo_teorico = round(sc_prima - importo, 2)
        banca.saldo_teorico = round(sb_prima + importo, 2)

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="VERSAMENTO_BANCA",
            importo=importo,
            cassa_origine_id=centrale.id,
            cassa_destinazione_id=banca.id,
            saldo_origine_prima=sc_prima,
            saldo_origine_dopo=centrale.saldo_teorico,
            saldo_destinazione_prima=sb_prima,
            saldo_destinazione_dopo=banca.saldo_teorico,
            causale="Versamento in Banca",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "saldo_centrale": centrale.saldo_teorico, "saldo_banca": banca.saldo_teorico}

    async def bank_withdrawal(self, user_id: str, importo: float, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        if profile.ruolo != "admin":
            raise ValueError("Solo Admin può effettuare prelievi da Banca")

        centrale = await self._get_cassa_centrale()
        banca = await self._get_banca()
        if not centrale or not banca:
            raise ValueError("Cassa Centrale o Banca non trovata")
        if (banca.saldo_teorico or 0) < importo:
            raise ValueError("Saldo Banca insufficiente")

        sc_prima = centrale.saldo_teorico or 0.0
        sb_prima = banca.saldo_teorico or 0.0
        banca.saldo_teorico = round(sb_prima - importo, 2)
        centrale.saldo_teorico = round(sc_prima + importo, 2)

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="PRELIEVO_BANCA",
            importo=importo,
            cassa_origine_id=banca.id,
            cassa_destinazione_id=centrale.id,
            saldo_origine_prima=sb_prima,
            saldo_origine_dopo=banca.saldo_teorico,
            saldo_destinazione_prima=sc_prima,
            saldo_destinazione_dopo=centrale.saldo_teorico,
            causale="Prelievo da Banca",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "saldo_centrale": centrale.saldo_teorico, "saldo_banca": banca.saldo_teorico}

    # ── admin withdrawal from operator cash ─────────────────────
    async def admin_withdrawal(self, user_id: str, source_cash_id: int, importo: float, note: str = "") -> Dict[str, Any]:
        if importo <= 0:
            raise ValueError("L'importo deve essere positivo")
        profile = await self._get_or_create_profile(user_id)
        if profile.ruolo != "admin":
            raise ValueError("Solo Admin può prelevare da Casse Operatore")

        source = await self._get_cash(source_cash_id)
        centrale = await self._get_cassa_centrale()
        if not source or not centrale:
            raise ValueError("Cassa non trovata")

        ss_prima = source.saldo_teorico or 0.0
        sc_prima = centrale.saldo_teorico or 0.0
        source.saldo_teorico = round(ss_prima - importo, 2)
        centrale.saldo_teorico = round(sc_prima + importo, 2)

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="PRELIEVO_ADMIN",
            importo=importo,
            cassa_origine_id=source.id,
            cassa_destinazione_id=centrale.id,
            saldo_origine_prima=ss_prima,
            saldo_origine_dopo=source.saldo_teorico,
            saldo_destinazione_prima=sc_prima,
            saldo_destinazione_dopo=centrale.saldo_teorico,
            causale=f"Prelievo Admin da {source.name}",
            notes=note,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True}

    # ── rettifica ───────────────────────────────────────────────
    async def rettifica(self, user_id: str, rif_movimento_id: int, importo: float, causale: str, cash_id: int, note: str = "") -> Dict[str, Any]:
        profile = await self._get_or_create_profile(user_id)
        if profile.ruolo != "admin":
            raise ValueError("Solo Admin può effettuare rettifiche")

        cash = await self._get_cash(cash_id)
        if not cash:
            raise ValueError("Cassa non trovata")

        saldo_prima = cash.saldo_teorico or 0.0
        cash.saldo_teorico = round(saldo_prima + importo, 2)

        await self._create_movement(
            user_id=user_id,
            user_name=self._display_name(profile),
            user_role=profile.ruolo,
            tipo_movimento="RETTIFICA_ADMIN",
            importo=importo,
            cassa_destinazione_id=cash.id,
            saldo_destinazione_prima=saldo_prima,
            saldo_destinazione_dopo=cash.saldo_teorico,
            causale=causale,
            notes=note,
            riferimento_movimento_id=rif_movimento_id,
            status="registrato",
        )
        await self.db.commit()
        return {"success": True, "nuovo_saldo": cash.saldo_teorico}

    # ── dashboard ───────────────────────────────────────────────
    async def get_dashboard(self) -> Dict[str, Any]:
        centrale = await self._get_cassa_centrale()
        banca = await self._get_banca()

        # Operator cashes
        result = await self.db.execute(select(Cashes).where(Cashes.cash_type == "CASSA_OPERATORE"))
        op_cashes = result.scalars().all()
        somma_casse = sum(c.saldo_teorico or 0 for c in op_cashes)

        # Active shifts
        result = await self.db.execute(select(Shifts).where(Shifts.status == "aperto"))
        active_shifts = result.scalars().all()

        # Today's data
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        result = await self.db.execute(
            select(Discrepancies).where(Discrepancies.created_at >= today_start).order_by(Discrepancies.id.desc())
        )
        today_discrepancies = result.scalars().all()

        # Today's movements for KPIs
        result = await self.db.execute(
            select(Movements).where(Movements.created_at >= today_start)
        )
        today_movs = result.scalars().all()

        incasso_types = ["INCASSO_SCOMMESSE_SPORTIVE", "INCASSO_SCOMMESSE_IPPICHE", "INCASSO_SCOMMESSE_VIRTUALI", "INCASSO_RICARICHE"]
        pagamento_types = ["PAGAMENTO_SCOMMESSE_SPORTIVE", "PAGAMENTO_SCOMMESSE_IPPICHE", "PAGAMENTO_SCOMMESSE_VIRTUALI", "PAGAMENTO_VLT", "PAGAMENTO_PRELIEVI_WEB"]

        tot_incassi = sum(m.importo for m in today_movs if m.tipo_movimento in incasso_types)
        tot_pagamenti = sum(m.importo for m in today_movs if m.tipo_movimento in pagamento_types)
        tot_sovvenzioni = sum(m.importo for m in today_movs if m.tipo_movimento == "SOVVENZIONE_CASSA")
        tot_restituzioni = sum(m.importo for m in today_movs if m.tipo_movimento == "RESTITUZIONE_CASSA")
        tot_svuotamenti_vlt = sum(m.importo for m in today_movs if m.tipo_movimento == "SVUOTAMENTO_VLT")
        tot_svuotamenti_bs = sum(m.importo for m in today_movs if m.tipo_movimento == "SVUOTAMENTO_BETSMART")

        liquidita = (centrale.saldo_teorico if centrale else 0) + somma_casse + (banca.saldo_teorico if banca else 0)

        return {
            "banca": {"saldo": banca.saldo_teorico if banca else 0, "id": banca.id if banca else None},
            "cassa_centrale": {"saldo": centrale.saldo_teorico if centrale else 0, "id": centrale.id if centrale else None},
            "somma_casse_operatori": somma_casse,
            "totale_liquidita": round(liquidita, 2),
            "casse_operatore": [
                {
                    "id": c.id, "name": c.name, "saldo_teorico": c.saldo_teorico,
                    "status": c.status, "current_operator_id": c.current_operator_id,
                    "last_operator_name": c.last_operator_name,
                    "last_physical_balance": c.last_physical_balance,
                }
                for c in op_cashes
            ],
            "turni_attivi": [
                {
                    "id": s.id, "user_name": s.user_name, "user_role": s.user_role,
                    "cash_name": s.cash_name, "cash_id": s.cash_id,
                    "saldo_iniziale": s.saldo_fisico_apertura, "opened_at": s.opened_at.isoformat() if s.opened_at else None,
                    "totale_incassi": s.totale_incassi, "totale_pagamenti": s.totale_pagamenti,
                }
                for s in active_shifts
            ],
            "discrepanze_oggi": [
                {
                    "id": d.id, "user_name": d.user_name, "cash_name": d.cash_name,
                    "tipo": d.tipo, "differenza": d.differenza, "status": d.status,
                    "notes": d.notes,
                }
                for d in today_discrepancies
            ],
            "kpi": {
                "totale_incassi": round(tot_incassi, 2),
                "totale_pagamenti": round(tot_pagamenti, 2),
                "totale_sovvenzioni": round(tot_sovvenzioni, 2),
                "totale_restituzioni": round(tot_restituzioni, 2),
                "totale_svuotamenti_vlt": round(tot_svuotamenti_vlt, 2),
                "totale_svuotamenti_betsmart": round(tot_svuotamenti_bs, 2),
                "turni_aperti": len(active_shifts),
            },
        }

    # ── my shift ────────────────────────────────────────────────
    async def get_my_shift(self, user_id: str) -> Optional[Dict[str, Any]]:
        result = await self.db.execute(
            select(Shifts).where(and_(Shifts.user_id == user_id, Shifts.status == "aperto"))
        )
        shift = result.scalars().first()
        if not shift:
            return None

        cash = await self._get_cash(shift.cash_id)
        return {
            "id": shift.id,
            "cash_id": shift.cash_id,
            "cash_name": shift.cash_name,
            "opened_at": shift.opened_at.isoformat() if shift.opened_at else None,
            "saldo_teorico_apertura": shift.saldo_teorico_apertura,
            "saldo_fisico_apertura": shift.saldo_fisico_apertura,
            "discrepanza_apertura": shift.discrepanza_apertura,
            "saldo_teorico_corrente": cash.saldo_teorico if cash else 0,
            "totale_incassi": shift.totale_incassi or 0,
            "totale_pagamenti": shift.totale_pagamenti or 0,
            "totale_sovvenzioni": shift.totale_sovvenzioni or 0,
            "totale_restituzioni": shift.totale_restituzioni or 0,
            "totale_svuotamenti": shift.totale_svuotamenti or 0,
            "status": shift.status,
        }

    # ── movements list ──────────────────────────────────────────
    async def get_all_movements(self, user_id: str, role: str, skip: int = 0, limit: int = 50, tipo: str = "", date_from: str = "", date_to: str = "") -> Dict[str, Any]:
        query = select(Movements)
        if role not in ("admin",):
            query = query.where(Movements.user_id == user_id)
        if tipo:
            query = query.where(Movements.tipo_movimento == tipo)
        if date_from:
            try:
                df = datetime.fromisoformat(date_from)
                query = query.where(Movements.created_at >= df)
            except ValueError:
                pass
        if date_to:
            try:
                dt = datetime.fromisoformat(date_to)
                query = query.where(Movements.created_at <= dt)
            except ValueError:
                pass

        count_q = select(func.count()).select_from(query.subquery())
        count_res = await self.db.execute(count_q)
        total = count_res.scalar() or 0

        query = query.order_by(Movements.id.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        movs = result.scalars().all()

        return {
            "items": [
                {
                    "id": m.id, "user_name": m.user_name, "user_role": m.user_role,
                    "tipo_movimento": m.tipo_movimento, "importo": m.importo,
                    "causale": m.causale, "notes": m.notes, "status": m.status,
                    "saldo_origine_prima": m.saldo_origine_prima,
                    "saldo_origine_dopo": m.saldo_origine_dopo,
                    "saldo_destinazione_prima": m.saldo_destinazione_prima,
                    "saldo_destinazione_dopo": m.saldo_destinazione_dopo,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in movs
            ],
            "total": total,
        }

    # ── discrepancies list ──────────────────────────────────────
    async def get_all_discrepancies(self, user_id: str, role: str, skip: int = 0, limit: int = 50) -> Dict[str, Any]:
        query = select(Discrepancies)
        if role not in ("admin",):
            query = query.where(Discrepancies.user_id == user_id)

        count_q = select(func.count()).select_from(query.subquery())
        count_res = await self.db.execute(count_q)
        total = count_res.scalar() or 0

        query = query.order_by(Discrepancies.id.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        discs = result.scalars().all()

        return {
            "items": [
                {
                    "id": d.id, "user_name": d.user_name, "user_role": d.user_role,
                    "cash_name": d.cash_name, "tipo": d.tipo,
                    "saldo_teorico": d.saldo_teorico, "saldo_fisico": d.saldo_fisico,
                    "differenza": d.differenza, "notes": d.notes, "status": d.status,
                    "verificato_da": d.verificato_da,
                    "created_at": d.created_at.isoformat() if d.created_at else None,
                }
                for d in discs
            ],
            "total": total,
        }

    # ── verify discrepancy ──────────────────────────────────────
    async def verify_discrepancy(self, user_id: str, disc_id: int, new_status: str, note: str = "") -> Dict[str, Any]:
        profile = await self._get_or_create_profile(user_id)
        if profile.ruolo != "admin":
            raise ValueError("Solo Admin può verificare discrepanze")

        result = await self.db.execute(select(Discrepancies).where(Discrepancies.id == disc_id))
        disc = result.scalars().first()
        if not disc:
            raise ValueError("Discrepanza non trovata")

        disc.status = new_status
        disc.verificato_da = user_id
        disc.verificato_at = datetime.now(timezone.utc)
        if note:
            disc.notes = (disc.notes or "") + f" | Verifica: {note}"

        await self.db.commit()
        return {"success": True}

    # ── get available cashes for shift ──────────────────────────
    async def get_available_cashes(self) -> List[Dict[str, Any]]:
        result = await self.db.execute(
            select(Cashes).where(Cashes.cash_type == "CASSA_OPERATORE").order_by(Cashes.id)
        )
        cashes = result.scalars().all()
        return [
            {
                "id": c.id, "name": c.name, "saldo_teorico": c.saldo_teorico,
                "status": c.status, "current_operator_id": c.current_operator_id,
                "last_operator_name": c.last_operator_name,
            }
            for c in cashes
        ]