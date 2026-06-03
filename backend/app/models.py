from datetime import date, datetime
from typing import Optional

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import JSON

from .database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    display_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    is_client: Mapped[bool] = mapped_column(Boolean, default=True)
    is_trainer: Mapped[bool] = mapped_column(Boolean, default=False)
    sex: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    activity_factor: Mapped[float] = mapped_column(Float, default=1.375)
    goal_type: Mapped[str] = mapped_column(String(20), default="maintain")
    daily_calorie_target: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    protein_goal_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    carbs_goal_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    fat_goal_g: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())


class TrainerClientLink(Base):
    __tablename__ = "trainer_client_links"
    __table_args__ = (UniqueConstraint("trainer_id", "client_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    trainer_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(20), default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    trainer: Mapped[User] = relationship(foreign_keys=[trainer_id])
    client: Mapped[User] = relationship(foreign_keys=[client_id])


class Food(Base):
    __tablename__ = "foods"

    id: Mapped[int] = mapped_column(primary_key=True)
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    brand: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    barcode: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[str] = mapped_column(String(50), default="custom")
    serving_sizes: Mapped[list[dict]] = mapped_column(JSON, default=list)
    calories_per_100g: Mapped[float] = mapped_column(Float, default=0)
    protein_per_100g: Mapped[float] = mapped_column(Float, default=0)
    carbs_per_100g: Mapped[float] = mapped_column(Float, default=0)
    fat_per_100g: Mapped[float] = mapped_column(Float, default=0)
    is_favorite: Mapped[bool] = mapped_column(Boolean, default=False)


class FoodLogEntry(Base):
    __tablename__ = "food_log_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    food_id: Mapped[Optional[int]] = mapped_column(ForeignKey("foods.id"), nullable=True)
    date: Mapped[date] = mapped_column(Date, index=True)
    meal_type: Mapped[str] = mapped_column(String(20), default="snack")
    food_name: Mapped[str] = mapped_column(String(255))
    quantity_grams: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    computed_calories: Mapped[float] = mapped_column(Float, default=0)
    computed_protein_g: Mapped[float] = mapped_column(Float, default=0)
    computed_carbs_g: Mapped[float] = mapped_column(Float, default=0)
    computed_fat_g: Mapped[float] = mapped_column(Float, default=0)

    food: Mapped[Optional[Food]] = relationship()


class MuscleGroup(Base):
    __tablename__ = "muscle_groups"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(80), unique=True, index=True)


class Exercise(Base):
    __tablename__ = "exercises"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(180), index=True)
    equipment: Mapped[str] = mapped_column(String(100), default="bodyweight")
    category: Mapped[str] = mapped_column(String(100), default="strength")
    difficulty: Mapped[str] = mapped_column(String(50), default="beginner")
    met: Mapped[float] = mapped_column(Float, default=4)
    instructions: Mapped[str] = mapped_column(Text, default="")
    muscles: Mapped[list["ExerciseMuscle"]] = relationship(back_populates="exercise", cascade="all, delete-orphan")


class ExerciseMuscle(Base):
    __tablename__ = "exercise_muscles"

    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"), primary_key=True)
    muscle_group_id: Mapped[int] = mapped_column(ForeignKey("muscle_groups.id"), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), default="primary")

    exercise: Mapped[Exercise] = relationship(back_populates="muscles")
    muscle_group: Mapped[MuscleGroup] = relationship()


class Workout(Base):
    __tablename__ = "workouts"

    id: Mapped[int] = mapped_column(primary_key=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_by_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    assigned_by_trainer: Mapped[bool] = mapped_column(Boolean, default=False)
    date: Mapped[date] = mapped_column(Date, index=True)
    status: Mapped[str] = mapped_column(String(30), default="planned")
    notes: Mapped[str] = mapped_column(Text, default="")
    sets: Mapped[list["WorkoutSet"]] = relationship(back_populates="workout", cascade="all, delete-orphan")


class WorkoutSet(Base):
    __tablename__ = "workout_sets"

    id: Mapped[int] = mapped_column(primary_key=True)
    workout_id: Mapped[int] = mapped_column(ForeignKey("workouts.id"))
    exercise_id: Mapped[int] = mapped_column(ForeignKey("exercises.id"))
    reps: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    weight_kg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    duration_sec: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    computed_burn_kcal: Mapped[float] = mapped_column(Float, default=0)

    workout: Mapped[Workout] = relationship(back_populates="sets")
    exercise: Mapped[Exercise] = relationship()
