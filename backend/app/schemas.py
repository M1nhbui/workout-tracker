from datetime import date
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class RegisterIn(BaseModel):
    display_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    is_client: bool = True
    is_trainer: bool = False


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    display_name: str
    email: EmailStr
    is_client: bool
    is_trainer: bool
    sex: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_factor: float
    goal_type: str
    daily_calorie_target: Optional[float] = None
    protein_goal_g: Optional[float] = None
    carbs_goal_g: Optional[float] = None
    fat_goal_g: Optional[float] = None
    bmr: Optional[float] = None
    tdee: Optional[float] = None

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    is_client: Optional[bool] = None
    is_trainer: Optional[bool] = None
    sex: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_factor: Optional[float] = None
    goal_type: Optional[str] = None
    daily_calorie_target: Optional[float] = None
    protein_goal_g: Optional[float] = None
    carbs_goal_g: Optional[float] = None
    fat_goal_g: Optional[float] = None


class FoodOut(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    barcode: Optional[str] = None
    source: str
    serving_sizes: list[dict]
    calories_per_100g: float
    protein_per_100g: float
    carbs_per_100g: float
    fat_per_100g: float
    is_favorite: bool

    model_config = {"from_attributes": True}


class FoodCreate(BaseModel):
    name: str
    brand: Optional[str] = None
    serving_sizes: list[dict] = Field(default_factory=list)
    calories_per_100g: float = 0
    protein_per_100g: float = 0
    carbs_per_100g: float = 0
    fat_per_100g: float = 0
    is_favorite: bool = False


class FoodLogCreate(BaseModel):
    date: date
    meal_type: str = "snack"
    food_id: Optional[int] = None
    food_name: Optional[str] = None
    quantity_grams: Optional[float] = None
    manual_calories: Optional[float] = None
    manual_protein_g: float = 0
    manual_carbs_g: float = 0
    manual_fat_g: float = 0


class FoodLogOut(BaseModel):
    id: int
    date: date
    meal_type: str
    food_name: str
    quantity_grams: Optional[float]
    computed_calories: float
    computed_protein_g: float
    computed_carbs_g: float
    computed_fat_g: float

    model_config = {"from_attributes": True}


class DayFoodLogOut(BaseModel):
    entries: list[FoodLogOut]
    totals: dict[str, float]


class MuscleGroupOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class ExerciseOut(BaseModel):
    id: int
    name: str
    equipment: str
    category: str
    difficulty: str
    met: float
    instructions: str
    muscles: list[str]


class WorkoutCreate(BaseModel):
    client_id: Optional[int] = None
    date: date
    status: str = "planned"
    notes: str = ""


class WorkoutUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None


class WorkoutSetCreate(BaseModel):
    exercise_id: int
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    duration_sec: Optional[int] = None


class WorkoutSetUpdate(BaseModel):
    exercise_id: Optional[int] = None
    reps: Optional[int] = None
    weight_kg: Optional[float] = None
    duration_sec: Optional[int] = None


class WorkoutSetOut(BaseModel):
    id: int
    exercise_id: int
    exercise_name: str
    reps: Optional[int]
    weight_kg: Optional[float]
    duration_sec: Optional[int]
    computed_burn_kcal: float


class WorkoutOut(BaseModel):
    id: int
    client_id: int
    created_by_id: int
    assigned_by_trainer: bool
    date: date
    status: str
    notes: str
    sets: list[WorkoutSetOut]


class LinkInviteIn(BaseModel):
    client_email: EmailStr


class LinkOut(BaseModel):
    id: int
    trainer_id: int
    client_id: int
    trainer_name: str
    client_name: str
    status: str


class AiRequest(BaseModel):
    task: str
    context: str
