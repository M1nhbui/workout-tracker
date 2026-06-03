from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from .database import get_db
from .models import TrainerClientLink, User
from .security import decode_token


def current_user(
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing token")
    payload = decode_token(authorization.removeprefix("Bearer ").strip())
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_active_link(db: Session, trainer_id: int, client_id: int) -> TrainerClientLink:
    link = (
        db.query(TrainerClientLink)
        .filter(
            TrainerClientLink.trainer_id == trainer_id,
            TrainerClientLink.client_id == client_id,
            TrainerClientLink.status == "active",
        )
        .first()
    )
    if not link:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="No active trainer/client link")
    return link


def can_access_client(db: Session, actor: User, client_id: int) -> bool:
    if actor.id == client_id:
        return True
    return bool(
        db.query(TrainerClientLink)
        .filter(
            TrainerClientLink.trainer_id == actor.id,
            TrainerClientLink.client_id == client_id,
            TrainerClientLink.status == "active",
        )
        .first()
    )
