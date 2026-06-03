from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import current_user
from ..models import Exercise, ExerciseMuscle, MuscleGroup, User
from ..schemas import ExerciseOut, MuscleGroupOut

router = APIRouter(tags=["exercises"])


def exercise_out(exercise: Exercise) -> ExerciseOut:
    return ExerciseOut(
        id=exercise.id,
        name=exercise.name,
        equipment=exercise.equipment,
        category=exercise.category,
        difficulty=exercise.difficulty,
        met=exercise.met,
        instructions=exercise.instructions,
        muscles=[link.muscle_group.name for link in exercise.muscles],
    )


@router.get("/muscle-groups", response_model=list[MuscleGroupOut])
def muscle_groups(_: User = Depends(current_user), db: Session = Depends(get_db)) -> list[MuscleGroup]:
    return db.query(MuscleGroup).order_by(MuscleGroup.name).all()


@router.get("/exercises", response_model=list[ExerciseOut])
def exercises(
    muscles: str | None = None,
    equipment: str | None = None,
    difficulty: str | None = None,
    _: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> list[ExerciseOut]:
    query = db.query(Exercise).distinct()
    if muscles:
        names = [name.strip().lower() for name in muscles.split(",") if name.strip()]
        query = query.join(ExerciseMuscle).join(MuscleGroup).filter(MuscleGroup.name.in_(names))
    if equipment:
        query = query.filter(Exercise.equipment == equipment)
    if difficulty:
        query = query.filter(Exercise.difficulty == difficulty)
    return [exercise_out(exercise) for exercise in query.order_by(Exercise.name).all()]
