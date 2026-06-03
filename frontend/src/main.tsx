import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, Dumbbell, LogOut, Plus, Search, UserRound, Utensils } from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

type User = {
  id: number;
  display_name: string;
  email: string;
  sex?: string;
  age?: number;
  height_cm?: number;
  weight_kg?: number;
  activity_factor: number;
  goal_type: string;
  daily_calorie_target?: number;
  protein_goal_g?: number;
  carbs_goal_g?: number;
  fat_goal_g?: number;
  bmr?: number;
  tdee?: number;
};

type Food = {
  id: number;
  name: string;
  brand?: string;
  source: string;
  serving_sizes: { label: string; grams: number }[];
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  is_favorite: boolean;
};

type FoodEntry = {
  id: number;
  meal_type: string;
  food_name: string;
  quantity_grams?: number;
  computed_calories: number;
  computed_protein_g: number;
  computed_carbs_g: number;
  computed_fat_g: number;
};

type Exercise = {
  id: number;
  name: string;
  equipment: string;
  category: string;
  difficulty: string;
  met: number;
  muscles: string[];
};

type WorkoutRecord = {
  id: number;
  notes: string;
  status: string;
  sets: WorkoutSetRecord[];
};

type WorkoutSetRecord = {
  id: number;
  exercise_id: number;
  exercise_name: string;
  reps?: number;
  weight_kg?: number;
  duration_sec?: number;
  computed_burn_kcal: number;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function App() {
  const [token, setToken] = useState(localStorage.getItem("gym_token") ?? "");
  const [user, setUser] = useState<User | null>(null);
  const [tab, setTab] = useState("today");
  const [error, setError] = useState("");

  const api = useMemo(
    () => async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers
        }
      });
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        throw new Error(detail.detail ?? "Request failed");
      }
      return response.json();
    },
    [token]
  );

  useEffect(() => {
    if (!token) return;
    api<User>("/me").then(setUser).catch(() => {
      localStorage.removeItem("gym_token");
      setToken("");
    });
  }, [api, token]);

  function saveAuth(nextToken: string, nextUser: User) {
    localStorage.setItem("gym_token", nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }

  if (!token || !user) {
    return <AuthScreen api={api} onAuth={saveAuth} error={error} setError={setError} />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <h1>Gym Tracker</h1>
          <p>{user.display_name}</p>
        </div>
        <nav>
          <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><Utensils size={18} /> Today</button>
          <button className={tab === "workout" ? "active" : ""} onClick={() => setTab("workout")}><Dumbbell size={18} /> Workout</button>
          <button className={tab === "exercises" ? "active" : ""} onClick={() => setTab("exercises")}><Activity size={18} /> Exercises</button>
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><UserRound size={18} /> Profile</button>
        </nav>
        <button className="ghost" onClick={() => { localStorage.removeItem("gym_token"); setToken(""); setUser(null); }}><LogOut size={18} /> Sign out</button>
      </aside>
      <main>
        {tab === "today" && <Today api={api} user={user} />}
        {tab === "workout" && <Workout api={api} user={user} />}
        {tab === "exercises" && <ExerciseBrowser api={api} />}
        {tab === "profile" && <Profile api={api} user={user} setUser={setUser} />}
      </main>
    </div>
  );
}

function AuthScreen({ api, onAuth, error, setError }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; onAuth: (token: string, user: User) => void; error: string; setError: (value: string) => void }) {
  const [mode, setMode] = useState<"login" | "register">("register");
  const [form, setForm] = useState({ display_name: "", email: "", password: "" });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const payload = mode === "login" ? { email: form.email, password: form.password } : form;
      const result = await api<{ access_token: string; user: User }>(`/auth/${mode}`, { method: "POST", body: JSON.stringify(payload) });
      onAuth(result.access_token, result.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    }
  }

  return (
    <div className="auth">
      <form className="panel auth-panel" onSubmit={submit}>
        <h1>{mode === "register" ? "Create account" : "Log in"}</h1>
        {mode === "register" && <input placeholder="Display name" value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />}
        <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button>{mode === "register" ? "Register" : "Log in"}</button>
        <button className="ghost" type="button" onClick={() => setMode(mode === "register" ? "login" : "register")}>
          {mode === "register" ? "Use existing account" : "Create an account"}
        </button>
      </form>
    </div>
  );
}

function Today({ api, user }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; user: User }) {
  const [date, setDate] = useState(today());
  const [log, setLog] = useState<{ entries: FoodEntry[]; totals: Record<string, number> }>({ entries: [], totals: {} });
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [q, setQ] = useState("");
  const [entry, setEntry] = useState({ meal_type: "breakfast", food_name: "", manual_calories: 0 });
  const [customFood, setCustomFood] = useState({ name: "", brand: "", serving_grams: 100, calories_per_100g: 0, is_favorite: true });

  async function refresh() {
    const [nextLog, nextWorkouts] = await Promise.all([
      api<{ entries: FoodEntry[]; totals: Record<string, number> }>(`/food-log?day=${date}`),
      api<WorkoutRecord[]>(`/workouts?day=${date}`)
    ]);
    setLog(nextLog);
    setWorkouts(nextWorkouts);
  }
  useEffect(() => { refresh(); }, [date]);

  async function search() {
    setFoods(await api(`/foods/search?q=${encodeURIComponent(q)}`));
  }

  async function addManual(event: React.FormEvent) {
    event.preventDefault();
    await api("/food-log", { method: "POST", body: JSON.stringify({ ...entry, date }) });
    setEntry({ ...entry, food_name: "", manual_calories: 0 });
    refresh();
  }

  async function addFromFood(food: Food) {
    await api("/food-log", { method: "POST", body: JSON.stringify({ date, meal_type: entry.meal_type, food_name: food.name, manual_calories: food.calories_per_100g }) });
    refresh();
  }

  async function removeEntry(entryId: number) {
    await api(`/food-log/${entryId}`, { method: "DELETE" });
    refresh();
  }

  async function saveCustomFood(event: React.FormEvent) {
    event.preventDefault();
    const saved = await api<Food>("/foods", {
      method: "POST",
      body: JSON.stringify({
        name: customFood.name,
        brand: customFood.brand || null,
        serving_sizes: [{ label: `${customFood.serving_grams} g`, grams: customFood.serving_grams }],
        calories_per_100g: customFood.calories_per_100g,
        protein_per_100g: 0,
        carbs_per_100g: 0,
        fat_per_100g: 0,
        is_favorite: customFood.is_favorite
      })
    });
    setFoods([saved, ...foods]);
    setCustomFood({ name: "", brand: "", serving_grams: 100, calories_per_100g: 0, is_favorite: true });
  }

  return (
    <section>
      <header className="page-head"><h2>Today</h2><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></header>
      <CalorieSummary user={user} caloriesIn={log.totals.calories ?? 0} caloriesOut={workoutCaloriesOut(workouts)} />
      <div className="grid">
        <form className="panel" onSubmit={addManual}>
          <h3>Log food manually</h3>
          <p className="hint">Use this when you already know the total calories for what you ate.</p>
          <label>
            Meal
            <select value={entry.meal_type} onChange={(e) => setEntry({ ...entry, meal_type: e.target.value })}>
              <option>breakfast</option><option>lunch</option><option>dinner</option><option>snack</option>
            </select>
          </label>
          <label>
            What did you eat?
            <input placeholder="Example: chicken rice bowl" value={entry.food_name} onChange={(e) => setEntry({ ...entry, food_name: e.target.value })} />
          </label>
          <label>
            Total calories for this meal
            <input type="number" placeholder="Example: 650" value={entry.manual_calories} onChange={(e) => setEntry({ ...entry, manual_calories: Number(e.target.value) })} />
          </label>
          <button><Plus size={18} /> Add entry</button>
        </form>
        <div className="panel">
          <h3>Food search</h3>
          <p className="hint">Search packaged or common foods, then click a result to log it.</p>
          <div className="row"><input placeholder="Search foods" value={q} onChange={(e) => setQ(e.target.value)} /><button onClick={search}><Search size={18} /></button></div>
          <div className="list">
            {foods.map((food, index) => <button className="list-item" key={`${food.name}-${index}`} onClick={() => addFromFood(food)}>{food.name}<span>{Math.round(food.calories_per_100g)} kcal / 100g</span></button>)}
          </div>
        </div>
      </div>
      <form className="panel" onSubmit={saveCustomFood}>
        <h3>Save custom food</h3>
        <p className="hint">Use this to create a reusable food. Calories here are per 100 grams, like a nutrition database entry.</p>
        <div className="two">
          <label>
            Food name
            <input placeholder="Example: homemade chicken curry" value={customFood.name} onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })} />
          </label>
          <label>
            Brand optional
            <input placeholder="Example: homemade" value={customFood.brand} onChange={(e) => setCustomFood({ ...customFood, brand: e.target.value })} />
          </label>
        </div>
        <div className="five">
          <label>
            Usual serving g
            <input type="number" placeholder="100" value={customFood.serving_grams} onChange={(e) => setCustomFood({ ...customFood, serving_grams: Number(e.target.value) })} />
          </label>
          <label>
            Calories / 100g
            <input type="number" placeholder="180" value={customFood.calories_per_100g} onChange={(e) => setCustomFood({ ...customFood, calories_per_100g: Number(e.target.value) })} />
          </label>
        </div>
        <label className="inline-check"><input type="checkbox" checked={customFood.is_favorite} onChange={(e) => setCustomFood({ ...customFood, is_favorite: e.target.checked })} /> Favorite</label>
        <button>Save food</button>
      </form>
      <div className="panel">
        <h3>Logged meals</h3>
        <div className="list">
          {log.entries.map((item) => (
            <div className="list-item" key={item.id}>
              <span className="meal-name">
                {item.food_name}
                <small>{item.meal_type}</small>
              </span>
              <span>{item.computed_calories} kcal</span>
              <button className="danger small" onClick={() => removeEntry(item.id)}>Remove</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function workoutCaloriesOut(workouts: WorkoutRecord[]) {
  return workouts.reduce((total, workout) => total + workout.sets.reduce((setTotal, item) => setTotal + item.computed_burn_kcal, 0), 0);
}

function CalorieSummary({ user, caloriesIn, caloriesOut }: { user: User; caloriesIn: number; caloriesOut: number }) {
  const target = user.daily_calorie_target ?? user.tdee ?? 0;
  const remaining = target ? target - caloriesIn + caloriesOut : 0;
  return (
    <div className="metrics">
      <Metric label="Daily target" value={target} />
      <Metric label="Calories in" value={caloriesIn} />
      <Metric label="Calories out" value={caloriesOut} />
      <Metric label="Remaining" value={remaining} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{Math.round(value)}</strong><small>kcal</small></div>;
}

function ExerciseBrowser({ api }: { api: <T>(path: string, options?: RequestInit) => Promise<T> }) {
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  useEffect(() => { api<{ id: number; name: string }[]>("/muscle-groups").then(setGroups); api<Exercise[]>("/exercises").then(setExercises); }, []);
  async function toggle(name: string) {
    const next = selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name];
    setSelected(next);
    setExercises(await api(`/exercises${next.length ? `?muscles=${next.join(",")}` : ""}`));
  }
  return <section><header className="page-head"><h2>Exercise Browser</h2></header><div className="chips">{groups.map((group) => <button className={selected.includes(group.name) ? "chip selected" : "chip"} onClick={() => toggle(group.name)} key={group.id}>{group.name}</button>)}</div><div className="cards">{exercises.map((exercise) => <article className="panel" key={exercise.id}><h3>{exercise.name}</h3><p>{exercise.equipment} · {exercise.difficulty} · MET {exercise.met}</p><small>{exercise.muscles.join(", ")}</small></article>)}</div>{exercises.length === 0 && <p className="empty">No exercises match that combination yet.</p>}</section>;
}

function Workout({ api, user }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; user: User }) {
  const [date, setDate] = useState(today());
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [log, setLog] = useState<{ entries: FoodEntry[]; totals: Record<string, number> }>({ entries: [], totals: {} });
  const [activeId, setActiveId] = useState<number | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [setForm, setSetForm] = useState({ exercise_id: 1, reps: 10, weight_kg: 0, duration_sec: 180 });
  const [editSets, setEditSets] = useState<Record<number, { exercise_id: number; reps: number; weight_kg: number; duration_sec: number }>>({});
  const activeWorkout = workouts.find((workout) => workout.id === activeId) ?? null;

  async function refresh() {
    const [nextWorkouts, nextLog] = await Promise.all([
      api<WorkoutRecord[]>(`/workouts?day=${date}`),
      api<{ entries: FoodEntry[]; totals: Record<string, number> }>(`/food-log?day=${date}`)
    ]);
    setWorkouts(nextWorkouts);
    const stillActive = activeId ? nextWorkouts.some((workout) => workout.id === activeId) : false;
    if (!stillActive && nextWorkouts[0]) {
      setActiveId(nextWorkouts[0].id);
      setSessionName(nextWorkouts[0].notes || `Workout #${nextWorkouts[0].id}`);
    }
    if (!nextWorkouts.length) {
      setActiveId(null);
      setSessionName("");
    }
    setLog(nextLog);
  }
  useEffect(() => { api<Exercise[]>("/exercises").then((items) => { setExercises(items); if (items[0]) setSetForm((s) => ({ ...s, exercise_id: items[0].id })); }); refresh(); }, [date]);
  async function createWorkout() {
    const workout = await api<WorkoutRecord>("/workouts", { method: "POST", body: JSON.stringify({ date, status: "in_progress", notes: "Workout session" }) });
    setActiveId(workout.id);
    setSessionName(workout.notes || `Workout #${workout.id}`);
    refresh();
  }
  function selectWorkout(workout: WorkoutRecord) {
    setActiveId(workout.id);
    setSessionName(workout.notes || `Workout #${workout.id}`);
  }
  async function renameWorkout(event: React.FormEvent) {
    event.preventDefault();
    if (!activeId) return;
    await api(`/workouts/${activeId}`, { method: "PATCH", body: JSON.stringify({ notes: sessionName }) });
    refresh();
  }
  async function removeWorkout() {
    if (!activeId) return;
    await api(`/workouts/${activeId}`, { method: "DELETE" });
    setActiveId(null);
    setSessionName("");
    refresh();
  }
  async function addSet(event: React.FormEvent) { event.preventDefault(); if (!activeId) return; await api(`/workouts/${activeId}/sets`, { method: "POST", body: JSON.stringify(setForm) }); refresh(); }
  async function updateSet(setId: number) {
    if (!activeId || !editSets[setId]) return;
    await api(`/workouts/${activeId}/sets/${setId}`, { method: "PATCH", body: JSON.stringify(editSets[setId]) });
    refresh();
  }
  async function removeSet(setId: number) {
    if (!activeId) return;
    await api(`/workouts/${activeId}/sets/${setId}`, { method: "DELETE" });
    refresh();
  }
  function editableSet(item: WorkoutSetRecord) {
    return editSets[item.id] ?? {
      exercise_id: item.exercise_id,
      reps: item.reps ?? 0,
      weight_kg: item.weight_kg ?? 0,
      duration_sec: item.duration_sec ?? 180
    };
  }
  function updateEditableSet(setId: number, value: { exercise_id: number; reps: number; weight_kg: number; duration_sec: number }) {
    setEditSets({ ...editSets, [setId]: value });
  }

  return (
    <section>
      <header className="page-head"><h2>Workout</h2><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></header>
      <CalorieSummary user={user} caloriesIn={log.totals.calories ?? 0} caloriesOut={workoutCaloriesOut(workouts)} />
      <div className="grid">
        <div className="panel">
          <h3>Sessions</h3>
          <button onClick={createWorkout}><Plus size={18} /> Start workout</button>
          <p className="hint">{activeWorkout ? `Selected: ${activeWorkout.notes || `Workout #${activeWorkout.id}`}` : "Start or select a session first."}</p>
          <div className="list">
            {workouts.map((w) => <button className={activeId === w.id ? "list-item selected-row" : "list-item"} key={w.id} onClick={() => selectWorkout(w)}>{w.notes || `Workout #${w.id}`}<span>{w.sets.length} sets · {Math.round(workoutCaloriesOut([w]))} kcal out</span></button>)}
          </div>
        </div>
        <form className="panel" onSubmit={renameWorkout}>
          <h3>Selected session</h3>
          <p className="hint">Rename the selected session or remove the whole session and all its sets.</p>
          <label>
            Session name
            <input value={sessionName} onChange={(e) => setSessionName(e.target.value)} disabled={!activeId} placeholder="Example: Push day" />
          </label>
          <div className="row">
            <button disabled={!activeId}>Save name</button>
            <button className="danger" type="button" disabled={!activeId} onClick={removeWorkout}>Remove session</button>
          </div>
        </form>
        <form className="panel" onSubmit={addSet}>
          <h3>Add set</h3>
          <p className="hint">Start or select a workout, then enter one exercise set. Duration is used to estimate calories burned.</p>
          <label>
            Exercise
            <select value={setForm.exercise_id} onChange={(e) => setSetForm({ ...setForm, exercise_id: Number(e.target.value) })}>{exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select>
          </label>
          <label>
            Reps
            <input type="number" value={setForm.reps} onChange={(e) => setSetForm({ ...setForm, reps: Number(e.target.value) })} />
          </label>
          <label>
            Weight used, kg
            <input type="number" value={setForm.weight_kg} onChange={(e) => setSetForm({ ...setForm, weight_kg: Number(e.target.value) })} />
          </label>
          <label>
            Duration, seconds
            <input type="number" value={setForm.duration_sec} onChange={(e) => setSetForm({ ...setForm, duration_sec: Number(e.target.value) })} />
          </label>
          <button disabled={!activeId}>Add set</button>
        </form>
      </div>
      <div className="panel">
        <h3>Sets in selected session</h3>
        {!activeWorkout && <p className="hint">No session selected.</p>}
        {activeWorkout && activeWorkout.sets.length === 0 && <p className="hint">No sets added yet.</p>}
        <div className="set-list">
          {activeWorkout?.sets.map((item) => {
            const draft = editableSet(item);
            return (
              <div className="set-editor" key={item.id}>
                <label>
                  Exercise
                  <select value={draft.exercise_id} onChange={(e) => updateEditableSet(item.id, { ...draft, exercise_id: Number(e.target.value) })}>{exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select>
                </label>
                <label>
                  Reps
                  <input type="number" value={draft.reps} onChange={(e) => updateEditableSet(item.id, { ...draft, reps: Number(e.target.value) })} />
                </label>
                <label>
                  Weight, kg
                  <input type="number" value={draft.weight_kg} onChange={(e) => updateEditableSet(item.id, { ...draft, weight_kg: Number(e.target.value) })} />
                </label>
                <label>
                  Duration, seconds
                  <input type="number" value={draft.duration_sec} onChange={(e) => updateEditableSet(item.id, { ...draft, duration_sec: Number(e.target.value) })} />
                </label>
                <div className="set-actions">
                  <span>{Math.round(item.computed_burn_kcal)} kcal out</span>
                  <button className="small" onClick={() => updateSet(item.id)} type="button">Save set</button>
                  <button className="danger small" onClick={() => removeSet(item.id)} type="button">Remove</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Profile({ api, user, setUser }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; user: User; setUser: (user: User) => void }) {
  const [form, setForm] = useState(user);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setUser(await api("/me", { method: "PATCH", body: JSON.stringify(form) }));
  }
  return (
    <section>
      <header className="page-head"><h2>Profile</h2></header>
      <form className="panel profile" onSubmit={save}>
        <label>
          Display name
          <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </label>
        <label>
          Sex
          <select value={form.sex ?? ""} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            <option value="">Choose sex</option>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="other">other</option>
          </select>
        </label>
        <label>
          Age
          <input type="number" placeholder="Example: 28" value={form.age ?? ""} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
        </label>
        <label>
          Height, cm
          <input type="number" placeholder="Example: 175" value={form.height_cm ?? ""} onChange={(e) => setForm({ ...form, height_cm: Number(e.target.value) })} />
        </label>
        <label>
          Weight, kg
          <input type="number" placeholder="Example: 72" value={form.weight_kg ?? ""} onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) })} />
        </label>
        <label>
          Goal
          <select value={form.goal_type} onChange={(e) => setForm({ ...form, goal_type: e.target.value })}>
            <option value="lose">lose</option>
            <option value="maintain">maintain</option>
            <option value="gain">gain</option>
          </select>
        </label>
        <label>
          Daily calorie target, kcal
          <input type="number" placeholder="Example: 2200" value={form.daily_calorie_target ?? ""} onChange={(e) => setForm({ ...form, daily_calorie_target: Number(e.target.value) })} />
        </label>
        <button>Save profile</button>
      </form>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
