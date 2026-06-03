from datetime import date

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import can_access_client, current_user
from ..models import Food, FoodLogEntry, User
from ..schemas import DayFoodLogOut, FoodCreate, FoodLogCreate, FoodLogOut, FoodOut

router = APIRouter(tags=["foods"])


def serialize_entry(entry: FoodLogEntry) -> FoodLogOut:
    return FoodLogOut.model_validate(entry)


@router.get("/foods/search", response_model=list[FoodOut])
def search_foods(
    q: str = Query(min_length=1),
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[Food]:
    local = (
        db.query(Food)
        .filter(or_(Food.owner_id.is_(None), Food.owner_id == user.id), Food.name.ilike(f"%{q}%"))
        .limit(15)
        .all()
    )
    results: list[Food] = list(local)
    if settings.openfoodfacts_enabled and len(results) < 10:
        try:
            response = httpx.get(
                "https://world.openfoodfacts.org/cgi/search.pl",
                params={"search_terms": q, "search_simple": 1, "action": "process", "json": 1, "page_size": 10},
                timeout=6,
            )
            response.raise_for_status()
            for product in response.json().get("products", []):
                nutriments = product.get("nutriments") or {}
                name = product.get("product_name") or product.get("generic_name")
                if not name:
                    continue
                results.append(
                    Food(
                        id=0,
                        name=name,
                        brand=product.get("brands"),
                        barcode=product.get("code"),
                        source="openfoodfacts",
                        serving_sizes=[{"label": product.get("serving_size") or "100 g", "grams": 100}],
                        calories_per_100g=float(nutriments.get("energy-kcal_100g") or 0),
                        protein_per_100g=float(nutriments.get("proteins_100g") or 0),
                        carbs_per_100g=float(nutriments.get("carbohydrates_100g") or 0),
                        fat_per_100g=float(nutriments.get("fat_100g") or 0),
                    )
                )
        except Exception:
            pass
    return results[:20]


@router.post("/foods", response_model=FoodOut)
def create_food(payload: FoodCreate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> Food:
    food = Food(owner_id=user.id, source="custom", **payload.model_dump())
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


@router.get("/foods", response_model=list[FoodOut])
def user_foods(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[Food]:
    return db.query(Food).filter(Food.owner_id == user.id).order_by(Food.id.desc()).all()


@router.get("/foods/favorites", response_model=list[FoodOut])
def favorite_foods(user: User = Depends(current_user), db: Session = Depends(get_db)) -> list[Food]:
    return db.query(Food).filter(Food.owner_id == user.id, Food.is_favorite.is_(True)).all()


@router.delete("/foods/{food_id}")
def delete_food(food_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)) -> dict[str, str]:
    food = db.get(Food, food_id)
    if not food:
        raise HTTPException(status_code=404, detail="Food not found")
    if food.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Only your custom foods can be removed")
    db.delete(food)
    db.commit()
    return {"status": "deleted"}


@router.post("/food-log", response_model=FoodLogOut)
def log_food(payload: FoodLogCreate, user: User = Depends(current_user), db: Session = Depends(get_db)) -> FoodLogEntry:
    food = db.get(Food, payload.food_id) if payload.food_id else None
    if payload.food_id and not food:
        raise HTTPException(status_code=404, detail="Food not found")
    if food and food.owner_id not in (None, user.id):
        raise HTTPException(status_code=403, detail="Cannot use this food")

    if food and payload.quantity_grams:
        factor = payload.quantity_grams / 100
        name = food.name
        calories = food.calories_per_100g * factor
        protein = food.protein_per_100g * factor
        carbs = food.carbs_per_100g * factor
        fat = food.fat_per_100g * factor
    else:
        name = payload.food_name or "Manual entry"
        calories = payload.manual_calories or 0
        protein = payload.manual_protein_g
        carbs = payload.manual_carbs_g
        fat = payload.manual_fat_g

    entry = FoodLogEntry(
        client_id=user.id,
        food_id=food.id if food and food.id else None,
        date=payload.date,
        meal_type=payload.meal_type,
        food_name=name,
        quantity_grams=payload.quantity_grams,
        computed_calories=round(calories, 1),
        computed_protein_g=round(protein, 1),
        computed_carbs_g=round(carbs, 1),
        computed_fat_g=round(fat, 1),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/food-log", response_model=DayFoodLogOut)
def read_food_log(
    day: date,
    client_id: int | None = None,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> DayFoodLogOut:
    target_id = client_id or actor.id
    if not can_access_client(db, actor, target_id):
        raise HTTPException(status_code=403, detail="Cannot read this client's logs")
    entries = db.query(FoodLogEntry).filter(FoodLogEntry.client_id == target_id, FoodLogEntry.date == day).all()
    totals = {
        "calories": round(sum(entry.computed_calories for entry in entries), 1),
        "protein_g": round(sum(entry.computed_protein_g for entry in entries), 1),
        "carbs_g": round(sum(entry.computed_carbs_g for entry in entries), 1),
        "fat_g": round(sum(entry.computed_fat_g for entry in entries), 1),
    }
    return DayFoodLogOut(entries=[serialize_entry(entry) for entry in entries], totals=totals)


@router.delete("/food-log/{entry_id}")
def delete_food_log_entry(
    entry_id: int,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    entry = db.get(FoodLogEntry, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Food log entry not found")
    if entry.client_id != actor.id:
        raise HTTPException(status_code=403, detail="Only the client can remove their own meal entries")
    db.delete(entry)
    db.commit()
    return {"status": "deleted"}
