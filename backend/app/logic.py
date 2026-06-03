from .models import User


def bmr(user: User) -> float | None:
    if not user.sex or not user.weight_kg or not user.height_cm or not user.age:
        return None
    sex = user.sex.lower()
    base = 10 * user.weight_kg + 6.25 * user.height_cm - 5 * user.age
    if sex == "male":
        return round(base + 5)
    if sex == "female":
        return round(base - 161)
    return round(base - 78)


def tdee(user: User) -> float | None:
    value = bmr(user)
    if value is None:
        return None
    return round(value * user.activity_factor)


def recommended_target(user: User) -> float | None:
    value = tdee(user)
    if value is None:
        return None
    if user.goal_type == "lose":
        return value - 400
    if user.goal_type == "gain":
        return value + 300
    return value
