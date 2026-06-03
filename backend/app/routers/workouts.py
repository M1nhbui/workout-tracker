from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import can_access_client, current_user, require_active_link
from ..models import Exercise, User, Workout, WorkoutSet
from ..schemas import WorkoutCreate, WorkoutOut, WorkoutSetCreate, WorkoutSetOut, WorkoutSetUpdate, WorkoutUpdate

router = APIRouter(prefix="/workouts", tags=["workouts"])


def set_out(item: WorkoutSet) -> WorkoutSetOut:
    return WorkoutSetOut(
        id=item.id,
        exercise_id=item.exercise_id,
        exercise_name=item.activity_name or (item.exercise.name if item.exercise else "Custom activity"),
        activity_type=item.activity_type,
        activity_name=item.activity_name,
        reps=item.reps,
        weight_kg=item.weight_kg,
        duration_sec=item.duration_sec,
        manual_calories=item.manual_calories,
        computed_burn_kcal=item.computed_burn_kcal,
    )


def workout_out(workout: Workout) -> WorkoutOut:
    return WorkoutOut(
        id=workout.id,
        client_id=workout.client_id,
        created_by_id=workout.created_by_id,
        assigned_by_trainer=workout.assigned_by_trainer,
        date=workout.date,
        status=workout.status,
        notes=workout.notes,
        sets=[set_out(item) for item in workout.sets],
    )


@router.post("", response_model=WorkoutOut)
def create_workout(
    payload: WorkoutCreate,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> WorkoutOut:
    client_id = payload.client_id or actor.id
    if client_id != actor.id:
        require_active_link(db, actor.id, client_id)
    workout = Workout(
        client_id=client_id,
        created_by_id=actor.id,
        assigned_by_trainer=client_id != actor.id,
        date=payload.date,
        status=payload.status,
        notes=payload.notes,
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout_out(workout)


@router.get("", response_model=list[WorkoutOut])
def list_workouts(
    day: date,
    client_id: int | None = None,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[WorkoutOut]:
    target_id = client_id or actor.id
    if not can_access_client(db, actor, target_id):
        raise HTTPException(status_code=403, detail="Cannot read this client's workouts")
    workouts = db.query(Workout).filter(Workout.client_id == target_id, Workout.date == day).all()
    return [workout_out(workout) for workout in workouts]


def compute_burn(actor: User, exercise: Exercise | None, duration_sec: int | None, manual_calories: float | None) -> float:
    if manual_calories is not None:
        return round(max(manual_calories, 0), 1)
    if not exercise:
        return 0
    hours = (duration_sec or 180) / 3600
    weight = actor.weight_kg or 75
    return round(exercise.met * weight * hours, 1)


def should_use_manual_calories(activity_type: str) -> bool:
    return activity_type == "custom"


@router.patch("/{workout_id}", response_model=WorkoutOut)
def update_workout(
    workout_id: int,
    payload: WorkoutUpdate,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> WorkoutOut:
    workout = db.get(Workout, workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if not can_access_client(db, actor, workout.client_id):
        raise HTTPException(status_code=403, detail="Cannot edit this workout")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(workout, key, value)
    db.commit()
    db.refresh(workout)
    return workout_out(workout)


@router.delete("/{workout_id}")
def delete_workout(
    workout_id: int,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    workout = db.get(Workout, workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if not can_access_client(db, actor, workout.client_id):
        raise HTTPException(status_code=403, detail="Cannot remove this workout")
    db.delete(workout)
    db.commit()
    return {"status": "deleted"}


@router.post("/{workout_id}/sets", response_model=WorkoutSetOut)
def add_set(
    workout_id: int,
    payload: WorkoutSetCreate,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> WorkoutSetOut:
    workout = db.get(Workout, workout_id)
    if not workout:
        raise HTTPException(status_code=404, detail="Workout not found")
    if not can_access_client(db, actor, workout.client_id):
        raise HTTPException(status_code=403, detail="Cannot edit this workout")
    exercise = db.get(Exercise, payload.exercise_id) if payload.exercise_id else None
    if payload.activity_type != "custom" and not exercise:
        raise HTTPException(status_code=404, detail="Exercise not found")
    if payload.activity_type == "custom" and payload.manual_calories is None:
        raise HTTPException(status_code=400, detail="Manual calories are required for custom activities")
    burn = compute_burn(
        actor,
        exercise,
        payload.duration_sec,
        payload.manual_calories if should_use_manual_calories(payload.activity_type) else None,
    )
    item = WorkoutSet(
        workout_id=workout.id,
        exercise_id=exercise.id if exercise else None,
        activity_type=payload.activity_type,
        activity_name=payload.activity_name,
        reps=payload.reps,
        weight_kg=payload.weight_kg,
        duration_sec=payload.duration_sec,
        manual_calories=payload.manual_calories,
        computed_burn_kcal=burn,
    )
    db.add(item)
    workout.status = "in_progress"
    db.commit()
    db.refresh(item)
    return set_out(item)


@router.patch("/{workout_id}/sets/{set_id}", response_model=WorkoutSetOut)
def update_set(
    workout_id: int,
    set_id: int,
    payload: WorkoutSetUpdate,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> WorkoutSetOut:
    workout = db.get(Workout, workout_id)
    item = db.get(WorkoutSet, set_id)
    if not workout or not item or item.workout_id != workout.id:
        raise HTTPException(status_code=404, detail="Workout set not found")
    if not can_access_client(db, actor, workout.client_id):
        raise HTTPException(status_code=403, detail="Cannot edit this workout")

    if payload.exercise_id is not None:
        exercise = db.get(Exercise, payload.exercise_id)
        if not exercise:
            raise HTTPException(status_code=404, detail="Exercise not found")
        item.exercise_id = exercise.id
    else:
        exercise = item.exercise

    if payload.activity_type is not None:
        item.activity_type = payload.activity_type
    if payload.activity_name is not None:
        item.activity_name = payload.activity_name
    if payload.reps is not None:
        item.reps = payload.reps
    if payload.weight_kg is not None:
        item.weight_kg = payload.weight_kg
    if payload.duration_sec is not None:
        item.duration_sec = payload.duration_sec
    if payload.manual_calories is not None:
        item.manual_calories = payload.manual_calories

    if item.activity_type == "custom" and item.manual_calories is None:
        raise HTTPException(status_code=400, detail="Manual calories are required for custom activities")
    if item.activity_type != "custom":
        item.manual_calories = None
        if not exercise:
            raise HTTPException(status_code=400, detail="Exercise is required for strength and cardio activities")
    item.computed_burn_kcal = compute_burn(
        actor,
        exercise,
        item.duration_sec,
        item.manual_calories if should_use_manual_calories(item.activity_type) else None,
    )
    db.commit()
    db.refresh(item)
    return set_out(item)


@router.delete("/{workout_id}/sets/{set_id}")
def delete_set(
    workout_id: int,
    set_id: int,
    actor: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    workout = db.get(Workout, workout_id)
    item = db.get(WorkoutSet, set_id)
    if not workout or not item or item.workout_id != workout.id:
        raise HTTPException(status_code=404, detail="Workout set not found")
    if not can_access_client(db, actor, workout.client_id):
        raise HTTPException(status_code=403, detail="Cannot edit this workout")
    db.delete(item)
    db.commit()
    return {"status": "deleted"}
