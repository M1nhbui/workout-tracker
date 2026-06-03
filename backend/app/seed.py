from sqlalchemy.orm import Session

from .models import Exercise, ExerciseMuscle, MuscleGroup


SEED_EXERCISES = [
    ("Push-up", "bodyweight", "strength", "beginner", 3.8, ["chest", "triceps", "shoulders"]),
    ("Bench Press", "barbell", "strength", "intermediate", 5.0, ["chest", "triceps", "shoulders"]),
    ("Squat", "barbell", "strength", "intermediate", 5.5, ["quads", "glutes", "hamstrings"]),
    ("Deadlift", "barbell", "strength", "intermediate", 6.0, ["back", "glutes", "hamstrings"]),
    ("Pull-up", "bodyweight", "strength", "intermediate", 5.0, ["back", "biceps"]),
    ("Lat Pulldown", "cable", "strength", "beginner", 4.5, ["back", "biceps"]),
    ("Romanian Deadlift", "barbell", "strength", "intermediate", 5.0, ["hamstrings", "glutes", "back"]),
    ("Walking Lunge", "dumbbell", "strength", "beginner", 4.5, ["quads", "glutes", "hamstrings"]),
    ("Shoulder Press", "dumbbell", "strength", "beginner", 4.0, ["shoulders", "triceps"]),
    ("Biceps Curl", "dumbbell", "strength", "beginner", 3.5, ["biceps"]),
    ("Triceps Rope Pushdown", "cable", "strength", "beginner", 3.5, ["triceps"]),
    ("Plank", "bodyweight", "strength", "beginner", 3.0, ["core"]),
    ("Crunch", "bodyweight", "strength", "beginner", 2.8, ["core"]),
    ("Calf Raise", "machine", "strength", "beginner", 3.2, ["calves"]),
    ("Treadmill Run", "machine", "cardio", "beginner", 8.0, ["cardio", "legs"]),
    ("Stationary Bike", "machine", "cardio", "beginner", 7.0, ["cardio", "legs"]),
    ("Rowing Machine", "machine", "cardio", "intermediate", 7.5, ["cardio", "back", "legs"]),
    ("Elliptical", "machine", "cardio", "beginner", 5.0, ["cardio", "legs"]),
]


def seed_reference_data(db: Session) -> None:
    groups = {}
    existing_groups = {group.name: group for group in db.query(MuscleGroup).all()}
    for name in sorted({muscle for *_, muscles in SEED_EXERCISES for muscle in muscles}):
        group = existing_groups.get(name)
        if not group:
            group = MuscleGroup(name=name)
            db.add(group)
        groups[name] = group
    db.flush()
    existing_exercises = {exercise.name for exercise in db.query(Exercise).all()}
    for name, equipment, category, difficulty, met, muscles in SEED_EXERCISES:
        if name in existing_exercises:
            continue
        exercise = Exercise(
            name=name,
            equipment=equipment,
            category=category,
            difficulty=difficulty,
            met=met,
            instructions="Use controlled form and stop if pain occurs.",
        )
        db.add(exercise)
        db.flush()
        for index, muscle in enumerate(muscles):
            db.add(
                ExerciseMuscle(
                    exercise_id=exercise.id,
                    muscle_group_id=groups[muscle].id,
                    role="primary" if index == 0 else "secondary",
                )
            )
    db.commit()
