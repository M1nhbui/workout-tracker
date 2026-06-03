from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import current_user
from ..models import TrainerClientLink, User
from ..schemas import LinkInviteIn, LinkOut

router = APIRouter(prefix="/links", tags=["links"])


def link_out(link: TrainerClientLink) -> LinkOut:
    return LinkOut(
        id=link.id,
        trainer_id=link.trainer_id,
        client_id=link.client_id,
        trainer_name=link.trainer.display_name,
        client_name=link.client.display_name,
        status=link.status,
    )


@router.post("/invite", response_model=LinkOut)
def invite_client(
    payload: LinkInviteIn,
    trainer: User = Depends(current_user),
    db: Session = Depends(get_db),
) -> LinkOut:
    if not trainer.is_trainer:
        raise HTTPException(status_code=403, detail="Only trainers can invite clients")
    client = db.query(User).filter(User.email == payload.client_email.lower()).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    if client.id == trainer.id:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
    link = (
        db.query(TrainerClientLink)
        .filter(TrainerClientLink.trainer_id == trainer.id, TrainerClientLink.client_id == client.id)
        .first()
    )
    if link:
        link.status = "pending" if link.status == "revoked" else link.status
    else:
        link = TrainerClientLink(trainer_id=trainer.id, client_id=client.id, status="pending")
        db.add(link)
    db.commit()
    db.refresh(link)
    return link_out(link)


@router.post("/{link_id}/accept", response_model=LinkOut)
def accept_link(link_id: int, client: User = Depends(current_user), db: Session = Depends(get_db)) -> LinkOut:
    link = db.get(TrainerClientLink, link_id)
    if not link or link.client_id != client.id:
        raise HTTPException(status_code=404, detail="Invite not found")
    link.status = "active"
    db.commit()
    db.refresh(link)
    return link_out(link)


@router.post("/{link_id}/revoke", response_model=LinkOut)
def revoke_link(link_id: int, actor: User = Depends(current_user), db: Session = Depends(get_db)) -> LinkOut:
    link = db.get(TrainerClientLink, link_id)
    if not link or actor.id not in (link.trainer_id, link.client_id):
        raise HTTPException(status_code=404, detail="Link not found")
    link.status = "revoked"
    db.commit()
    db.refresh(link)
    return link_out(link)


@router.get("", response_model=list[LinkOut])
def my_links(actor: User = Depends(current_user), db: Session = Depends(get_db)) -> list[LinkOut]:
    links = (
        db.query(TrainerClientLink)
        .filter(or_(TrainerClientLink.trainer_id == actor.id, TrainerClientLink.client_id == actor.id))
        .all()
    )
    return [link_out(link) for link in links]
