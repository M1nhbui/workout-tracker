from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import current_user
from ..logic import bmr, recommended_target, tdee
from ..models import User
from ..schemas import ProfileUpdate, UserOut

router = APIRouter(prefix="/me", tags=["me"])


def serialize(user: User) -> UserOut:
    data = UserOut.model_validate(user)
    data.bmr = bmr(user)
    data.tdee = tdee(user)
    if data.daily_calorie_target is None:
        data.daily_calorie_target = recommended_target(user)
    return data


@router.get("", response_model=UserOut)
def read_me(user: User = Depends(current_user)) -> UserOut:
    return serialize(user)


@router.patch("", response_model=UserOut)
def update_me(
    payload: ProfileUpdate,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> UserOut:
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return serialize(user)
