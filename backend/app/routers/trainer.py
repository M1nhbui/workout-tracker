from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import current_user, require_active_link
from ..models import FoodLogEntry, TrainerClientLink, User
from ..schemas import DayFoodLogOut, FoodLogOut, UserOut
from .auth import user_out

router = APIRouter(prefix="/trainer", tags=["trainer"])


@router.get("/clients", response_model=list[UserOut])
def clients(trainer: User = Depends(current_user), db: Session = Depends(get_db)) -> list[UserOut]:
    if not trainer.is_trainer:
        raise HTTPException(status_code=403, detail="Only trainers can list clients")
    links = (
        db.query(TrainerClientLink)
        .filter(TrainerClientLink.trainer_id == trainer.id, TrainerClientLink.status == "active")
        .all()
    )
    return [user_out(link.client) for link in links]


@router.get("/clients/{client_id}/logs", response_model=DayFoodLogOut)
def client_logs(
    client_id: int,
    day: date,
    trainer: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> DayFoodLogOut:
    require_active_link(db, trainer.id, client_id)
    entries = db.query(FoodLogEntry).filter(FoodLogEntry.client_id == client_id, FoodLogEntry.date == day).all()
    totals = {
        "calories": round(sum(entry.computed_calories for entry in entries), 1),
        "protein_g": round(sum(entry.computed_protein_g for entry in entries), 1),
        "carbs_g": round(sum(entry.computed_carbs_g for entry in entries), 1),
        "fat_g": round(sum(entry.computed_fat_g for entry in entries), 1),
    }
    return DayFoodLogOut(entries=[FoodLogOut.model_validate(entry) for entry in entries], totals=totals)
