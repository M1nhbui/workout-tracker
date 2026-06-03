from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_runtime_schema(engine: Engine) -> None:
    inspector = inspect(engine)
    if "workout_sets" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("workout_sets")}
    dialect = engine.dialect.name
    string_type = "TEXT" if dialect == "sqlite" else "VARCHAR(180)"
    columns = {
        "activity_type": "VARCHAR(30) DEFAULT 'strength' NOT NULL",
        "activity_name": string_type,
        "manual_calories": "FLOAT",
    }
    with engine.begin() as connection:
        for name, definition in columns.items():
            if name not in existing:
                connection.execute(text(f"ALTER TABLE workout_sets ADD COLUMN {name} {definition}"))
        exercise_id = next((column for column in inspector.get_columns("workout_sets") if column["name"] == "exercise_id"), None)
        if exercise_id and not exercise_id.get("nullable", True):
            if dialect == "sqlite":
                connection.execute(text("PRAGMA foreign_keys=OFF"))
                connection.execute(
                    text(
                        """
                        CREATE TABLE workout_sets_new (
                            id INTEGER NOT NULL PRIMARY KEY,
                            workout_id INTEGER NOT NULL REFERENCES workouts(id),
                            exercise_id INTEGER REFERENCES exercises(id),
                            activity_type VARCHAR(30) NOT NULL DEFAULT 'strength',
                            activity_name TEXT,
                            reps INTEGER,
                            weight_kg FLOAT,
                            duration_sec INTEGER,
                            manual_calories FLOAT,
                            computed_burn_kcal FLOAT NOT NULL DEFAULT 0
                        )
                        """
                    )
                )
                connection.execute(
                    text(
                        """
                        INSERT INTO workout_sets_new (
                            id, workout_id, exercise_id, activity_type, activity_name, reps,
                            weight_kg, duration_sec, manual_calories, computed_burn_kcal
                        )
                        SELECT
                            id, workout_id, exercise_id, activity_type, activity_name, reps,
                            weight_kg, duration_sec, manual_calories, computed_burn_kcal
                        FROM workout_sets
                        """
                    )
                )
                connection.execute(text("DROP TABLE workout_sets"))
                connection.execute(text("ALTER TABLE workout_sets_new RENAME TO workout_sets"))
                connection.execute(text("PRAGMA foreign_keys=ON"))
            else:
                connection.execute(text("ALTER TABLE workout_sets ALTER COLUMN exercise_id DROP NOT NULL"))
