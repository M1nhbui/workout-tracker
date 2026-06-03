import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Activity, Dumbbell, LogOut, Plus, Search, UserRound, Utensils } from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
type Lang = "en" | "vi";

const text = {
  en: {
    appName: "Gym Tracker",
    today: "Today",
    workout: "Workout",
    exercises: "Exercises",
    profile: "Profile",
    signOut: "Sign out",
    createAccount: "Create account",
    login: "Log in",
    displayName: "Display name",
    email: "Email",
    password: "Password",
    register: "Register",
    useExistingAccount: "Use existing account",
    createAnAccount: "Create an account",
    dailyTarget: "Daily target",
    caloriesIn: "Calories in",
    caloriesOut: "Calories out",
    remaining: "Remaining",
    logFoodManually: "Log food manually",
    manualFoodHint: "Use this when you already know the total calories for what you ate.",
    meal: "Meal",
    whatDidYouEat: "What did you eat?",
    foodExample: "Example: chicken rice bowl",
    totalCaloriesMeal: "Total calories for this meal",
    addEntry: "Add entry",
    foodSearch: "Food search",
    foodSearchHint: "Search packaged or common foods, then click a result to log it.",
    searchFoods: "Search foods",
    saveCustomFood: "Save custom food",
    customFoodHint: "Use this to create a reusable food. Calories here are per 100 grams, like a nutrition database entry.",
    foodName: "Food name",
    brandOptional: "Brand optional",
    usualServing: "Usual serving g",
    calories100g: "Calories / 100g",
    favorite: "Favorite",
    saveFood: "Save food",
    loggedMeals: "Logged meals",
    remove: "Remove",
    exerciseBrowser: "Exercise Browser",
    noExercises: "No exercises match that combination yet.",
    sessions: "Sessions",
    startWorkout: "Start workout",
    selected: "Selected",
    startOrSelectSession: "Start or select a session first.",
    selectedSession: "Selected session",
    selectedSessionHint: "Rename the selected session or remove the whole session and all its sets.",
    sessionName: "Session name",
    sessionExample: "Example: Push day",
    saveName: "Save name",
    removeSession: "Remove session",
    addSet: "Add set",
    addSetHint: "Start or select a workout, then enter one exercise set. Duration is used to estimate calories burned.",
    exercise: "Exercise",
    reps: "Reps",
    weightUsed: "Weight used, kg",
    durationSeconds: "Duration, seconds",
    setsInSelectedSession: "Sets in selected session",
    noSessionSelected: "No session selected.",
    noSetsAdded: "No sets added yet.",
    weightKg: "Weight, kg",
    saveSet: "Save set",
    sex: "Sex",
    chooseSex: "Choose sex",
    age: "Age",
    heightCm: "Height, cm",
    goal: "Goal",
    dailyCalorieTarget: "Daily calorie target, kcal",
    saveProfile: "Save profile",
    language: "Tiếng Việt",
    breakfast: "breakfast",
    lunch: "lunch",
    dinner: "dinner",
    snack: "snack",
    lose: "lose",
    maintain: "maintain",
    gain: "gain",
  },
  vi: {
    appName: "Theo Dõi Gym",
    today: "Hôm nay",
    workout: "Tập luyện",
    exercises: "Bài tập",
    profile: "Hồ sơ",
    signOut: "Đăng xuất",
    createAccount: "Tạo tài khoản",
    login: "Đăng nhập",
    displayName: "Tên hiển thị",
    email: "Email",
    password: "Mật khẩu",
    register: "Đăng ký",
    useExistingAccount: "Dùng tài khoản có sẵn",
    createAnAccount: "Tạo tài khoản mới",
    dailyTarget: "Mục tiêu ngày",
    caloriesIn: "Calo nạp vào",
    caloriesOut: "Calo tiêu hao",
    remaining: "Calo còn lại",
    logFoodManually: "Nhập món ăn thủ công",
    manualFoodHint: "Dùng mục này khi bạn đã biết tổng lượng calo của món đã ăn.",
    meal: "Bữa ăn",
    whatDidYouEat: "Bạn đã ăn gì?",
    foodExample: "Ví dụ: cơm gà",
    totalCaloriesMeal: "Tổng calo của bữa này",
    addEntry: "Thêm món",
    foodSearch: "Tìm món ăn",
    foodSearchHint: "Tìm thực phẩm đóng gói hoặc món phổ biến, rồi bấm vào kết quả để ghi lại.",
    searchFoods: "Tìm món ăn",
    saveCustomFood: "Lưu món tự tạo",
    customFoodHint: "Dùng để tạo món ăn dùng lại. Calo ở đây tính theo mỗi 100 gram.",
    foodName: "Tên món",
    brandOptional: "Thương hiệu nếu có",
    usualServing: "Khẩu phần thường dùng, g",
    calories100g: "Calo / 100g",
    favorite: "Yêu thích",
    saveFood: "Lưu món",
    loggedMeals: "Món đã ghi",
    remove: "Xóa",
    exerciseBrowser: "Danh sách bài tập",
    noExercises: "Không có bài tập nào khớp với lựa chọn này.",
    sessions: "Buổi tập",
    startWorkout: "Bắt đầu buổi tập",
    selected: "Đã chọn",
    startOrSelectSession: "Hãy bắt đầu hoặc chọn một buổi tập trước.",
    selectedSession: "Buổi tập đang chọn",
    selectedSessionHint: "Đổi tên buổi tập đang chọn hoặc xóa toàn bộ buổi tập và các set bên trong.",
    sessionName: "Tên buổi tập",
    sessionExample: "Ví dụ: Ngày đẩy",
    saveName: "Lưu tên",
    removeSession: "Xóa buổi tập",
    addSet: "Thêm set",
    addSetHint: "Bắt đầu hoặc chọn một buổi tập, rồi nhập một set. Thời lượng được dùng để ước tính calo tiêu hao.",
    exercise: "Bài tập",
    reps: "Số lần",
    weightUsed: "Mức tạ dùng, kg",
    durationSeconds: "Thời lượng, giây",
    setsInSelectedSession: "Set trong buổi đang chọn",
    noSessionSelected: "Chưa chọn buổi tập.",
    noSetsAdded: "Chưa có set nào.",
    weightKg: "Cân nặng, kg",
    saveSet: "Lưu set",
    sex: "Giới tính",
    chooseSex: "Chọn giới tính",
    age: "Tuổi",
    heightCm: "Chiều cao, cm",
    goal: "Mục tiêu",
    dailyCalorieTarget: "Mục tiêu calo mỗi ngày, kcal",
    saveProfile: "Lưu hồ sơ",
    language: "English",
    breakfast: "bữa sáng",
    lunch: "bữa trưa",
    dinner: "bữa tối",
    snack: "ăn nhẹ",
    lose: "giảm cân",
    maintain: "duy trì",
    gain: "tăng cân",
  }
};

type Copy = typeof text.en;

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
  const [lang, setLang] = useState<Lang>((localStorage.getItem("gym_lang") as Lang) || "en");
  const copy = text[lang];

  function toggleLang() {
    const next = lang === "en" ? "vi" : "en";
    localStorage.setItem("gym_lang", next);
    setLang(next);
  }

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
    return <AuthScreen api={api} onAuth={saveAuth} error={error} setError={setError} copy={copy} onToggleLang={toggleLang} />;
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div>
          <h1>{copy.appName}</h1>
          <p>{user.display_name}</p>
        </div>
        <LanguageToggle copy={copy} onToggleLang={toggleLang} />
        <nav>
          <button className={tab === "today" ? "active" : ""} onClick={() => setTab("today")}><Utensils size={18} /> {copy.today}</button>
          <button className={tab === "workout" ? "active" : ""} onClick={() => setTab("workout")}><Dumbbell size={18} /> {copy.workout}</button>
          <button className={tab === "exercises" ? "active" : ""} onClick={() => setTab("exercises")}><Activity size={18} /> {copy.exercises}</button>
          <button className={tab === "profile" ? "active" : ""} onClick={() => setTab("profile")}><UserRound size={18} /> {copy.profile}</button>
        </nav>
        <button className="ghost" onClick={() => { localStorage.removeItem("gym_token"); setToken(""); setUser(null); }}><LogOut size={18} /> {copy.signOut}</button>
      </aside>
      <main>
        {tab === "today" && <Today api={api} user={user} copy={copy} />}
        {tab === "workout" && <Workout api={api} user={user} copy={copy} />}
        {tab === "exercises" && <ExerciseBrowser api={api} copy={copy} />}
        {tab === "profile" && <Profile api={api} user={user} setUser={setUser} copy={copy} />}
      </main>
    </div>
  );
}

function LanguageToggle({ copy, onToggleLang }: { copy: Copy; onToggleLang: () => void }) {
  return <button className="language-toggle" type="button" onClick={onToggleLang}>{copy.language}</button>;
}

function AuthScreen({ api, onAuth, error, setError, copy, onToggleLang }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; onAuth: (token: string, user: User) => void; error: string; setError: (value: string) => void; copy: Copy; onToggleLang: () => void }) {
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
        <LanguageToggle copy={copy} onToggleLang={onToggleLang} />
        <h1>{mode === "register" ? copy.createAccount : copy.login}</h1>
        {mode === "register" && <input placeholder={copy.displayName} value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />}
        <input placeholder={copy.email} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input placeholder={copy.password} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        {error && <p className="error">{error}</p>}
        <button>{mode === "register" ? copy.register : copy.login}</button>
        <button className="ghost" type="button" onClick={() => setMode(mode === "register" ? "login" : "register")}>
          {mode === "register" ? copy.useExistingAccount : copy.createAnAccount}
        </button>
      </form>
    </div>
  );
}

function Today({ api, user, copy }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; user: User; copy: Copy }) {
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
      <header className="page-head"><h2>{copy.today}</h2><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></header>
      <CalorieSummary user={user} caloriesIn={log.totals.calories ?? 0} caloriesOut={workoutCaloriesOut(workouts)} copy={copy} />
      <div className="grid">
        <form className="panel" onSubmit={addManual}>
          <h3>{copy.logFoodManually}</h3>
          <p className="hint">{copy.manualFoodHint}</p>
          <label>
            {copy.meal}
            <select value={entry.meal_type} onChange={(e) => setEntry({ ...entry, meal_type: e.target.value })}>
              <option value="breakfast">{copy.breakfast}</option><option value="lunch">{copy.lunch}</option><option value="dinner">{copy.dinner}</option><option value="snack">{copy.snack}</option>
            </select>
          </label>
          <label>
            {copy.whatDidYouEat}
            <input placeholder={copy.foodExample} value={entry.food_name} onChange={(e) => setEntry({ ...entry, food_name: e.target.value })} />
          </label>
          <label>
            {copy.totalCaloriesMeal}
            <input type="number" placeholder="Example: 650" value={entry.manual_calories} onChange={(e) => setEntry({ ...entry, manual_calories: Number(e.target.value) })} />
          </label>
          <button><Plus size={18} /> {copy.addEntry}</button>
        </form>
        <div className="panel">
          <h3>{copy.foodSearch}</h3>
          <p className="hint">{copy.foodSearchHint}</p>
          <div className="row"><input placeholder={copy.searchFoods} value={q} onChange={(e) => setQ(e.target.value)} /><button onClick={search}><Search size={18} /></button></div>
          <div className="list">
            {foods.map((food, index) => <button className="list-item" key={`${food.name}-${index}`} onClick={() => addFromFood(food)}>{food.name}<span>{Math.round(food.calories_per_100g)} kcal / 100g</span></button>)}
          </div>
        </div>
      </div>
      <form className="panel" onSubmit={saveCustomFood}>
        <h3>{copy.saveCustomFood}</h3>
        <p className="hint">{copy.customFoodHint}</p>
        <div className="two">
          <label>
            {copy.foodName}
            <input placeholder="Example: homemade chicken curry" value={customFood.name} onChange={(e) => setCustomFood({ ...customFood, name: e.target.value })} />
          </label>
          <label>
            {copy.brandOptional}
            <input placeholder="Example: homemade" value={customFood.brand} onChange={(e) => setCustomFood({ ...customFood, brand: e.target.value })} />
          </label>
        </div>
        <div className="five">
          <label>
            {copy.usualServing}
            <input type="number" placeholder="100" value={customFood.serving_grams} onChange={(e) => setCustomFood({ ...customFood, serving_grams: Number(e.target.value) })} />
          </label>
          <label>
            {copy.calories100g}
            <input type="number" placeholder="180" value={customFood.calories_per_100g} onChange={(e) => setCustomFood({ ...customFood, calories_per_100g: Number(e.target.value) })} />
          </label>
        </div>
        <label className="inline-check"><input type="checkbox" checked={customFood.is_favorite} onChange={(e) => setCustomFood({ ...customFood, is_favorite: e.target.checked })} /> {copy.favorite}</label>
        <button>{copy.saveFood}</button>
      </form>
      <div className="panel">
        <h3>{copy.loggedMeals}</h3>
        <div className="list">
          {log.entries.map((item) => (
            <div className="list-item" key={item.id}>
              <span className="meal-name">
                {item.food_name}
                <small>{copy[item.meal_type as keyof Copy] || item.meal_type}</small>
              </span>
              <span>{item.computed_calories} kcal</span>
              <button className="danger small" onClick={() => removeEntry(item.id)}>{copy.remove}</button>
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

function CalorieSummary({ user, caloriesIn, caloriesOut, copy }: { user: User; caloriesIn: number; caloriesOut: number; copy: Copy }) {
  const target = user.daily_calorie_target ?? user.tdee ?? 0;
  const remaining = target ? target - caloriesIn + caloriesOut : 0;
  return (
    <div className="metrics">
      <Metric label={copy.dailyTarget} value={target} />
      <Metric label={copy.caloriesIn} value={caloriesIn} />
      <Metric label={copy.caloriesOut} value={caloriesOut} />
      <Metric label={copy.remaining} value={remaining} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="metric"><span>{label}</span><strong>{Math.round(value)}</strong><small>kcal</small></div>;
}

function ExerciseBrowser({ api, copy }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; copy: Copy }) {
  const [groups, setGroups] = useState<{ id: number; name: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  useEffect(() => { api<{ id: number; name: string }[]>("/muscle-groups").then(setGroups); api<Exercise[]>("/exercises").then(setExercises); }, []);
  async function toggle(name: string) {
    const next = selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name];
    setSelected(next);
    setExercises(await api(`/exercises${next.length ? `?muscles=${next.join(",")}` : ""}`));
  }
  return <section><header className="page-head"><h2>{copy.exerciseBrowser}</h2></header><div className="chips">{groups.map((group) => <button className={selected.includes(group.name) ? "chip selected" : "chip"} onClick={() => toggle(group.name)} key={group.id}>{group.name}</button>)}</div><div className="cards">{exercises.map((exercise) => <article className="panel" key={exercise.id}><h3>{exercise.name}</h3><p>{exercise.equipment} · {exercise.difficulty} · MET {exercise.met}</p><small>{exercise.muscles.join(", ")}</small></article>)}</div>{exercises.length === 0 && <p className="empty">{copy.noExercises}</p>}</section>;
}

function Workout({ api, user, copy }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; user: User; copy: Copy }) {
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
      <header className="page-head"><h2>{copy.workout}</h2><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></header>
      <CalorieSummary user={user} caloriesIn={log.totals.calories ?? 0} caloriesOut={workoutCaloriesOut(workouts)} copy={copy} />
      <div className="grid">
        <div className="panel">
          <h3>{copy.sessions}</h3>
          <button onClick={createWorkout}><Plus size={18} /> {copy.startWorkout}</button>
          <p className="hint">{activeWorkout ? `${copy.selected}: ${activeWorkout.notes || `Workout #${activeWorkout.id}`}` : copy.startOrSelectSession}</p>
          <div className="list">
            {workouts.map((w) => <button className={activeId === w.id ? "list-item selected-row" : "list-item"} key={w.id} onClick={() => selectWorkout(w)}>{w.notes || `Workout #${w.id}`}<span>{w.sets.length} sets · {Math.round(workoutCaloriesOut([w]))} kcal out</span></button>)}
          </div>
        </div>
        <form className="panel" onSubmit={renameWorkout}>
          <h3>{copy.selectedSession}</h3>
          <p className="hint">{copy.selectedSessionHint}</p>
          <label>
            {copy.sessionName}
            <input value={sessionName} onChange={(e) => setSessionName(e.target.value)} disabled={!activeId} placeholder={copy.sessionExample} />
          </label>
          <div className="row">
            <button disabled={!activeId}>{copy.saveName}</button>
            <button className="danger" type="button" disabled={!activeId} onClick={removeWorkout}>{copy.removeSession}</button>
          </div>
        </form>
        <form className="panel" onSubmit={addSet}>
          <h3>{copy.addSet}</h3>
          <p className="hint">{copy.addSetHint}</p>
          <label>
            {copy.exercise}
            <select value={setForm.exercise_id} onChange={(e) => setSetForm({ ...setForm, exercise_id: Number(e.target.value) })}>{exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select>
          </label>
          <label>
            {copy.reps}
            <input type="number" value={setForm.reps} onChange={(e) => setSetForm({ ...setForm, reps: Number(e.target.value) })} />
          </label>
          <label>
            {copy.weightUsed}
            <input type="number" value={setForm.weight_kg} onChange={(e) => setSetForm({ ...setForm, weight_kg: Number(e.target.value) })} />
          </label>
          <label>
            {copy.durationSeconds}
            <input type="number" value={setForm.duration_sec} onChange={(e) => setSetForm({ ...setForm, duration_sec: Number(e.target.value) })} />
          </label>
          <button disabled={!activeId}>{copy.addSet}</button>
        </form>
      </div>
      <div className="panel">
        <h3>{copy.setsInSelectedSession}</h3>
        {!activeWorkout && <p className="hint">{copy.noSessionSelected}</p>}
        {activeWorkout && activeWorkout.sets.length === 0 && <p className="hint">{copy.noSetsAdded}</p>}
        <div className="set-list">
          {activeWorkout?.sets.map((item) => {
            const draft = editableSet(item);
            return (
              <div className="set-editor" key={item.id}>
                <label>
                  {copy.exercise}
                  <select value={draft.exercise_id} onChange={(e) => updateEditableSet(item.id, { ...draft, exercise_id: Number(e.target.value) })}>{exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}</select>
                </label>
                <label>
                  {copy.reps}
                  <input type="number" value={draft.reps} onChange={(e) => updateEditableSet(item.id, { ...draft, reps: Number(e.target.value) })} />
                </label>
                <label>
                  {copy.weightKg}
                  <input type="number" value={draft.weight_kg} onChange={(e) => updateEditableSet(item.id, { ...draft, weight_kg: Number(e.target.value) })} />
                </label>
                <label>
                  {copy.durationSeconds}
                  <input type="number" value={draft.duration_sec} onChange={(e) => updateEditableSet(item.id, { ...draft, duration_sec: Number(e.target.value) })} />
                </label>
                <div className="set-actions">
                  <span>{Math.round(item.computed_burn_kcal)} kcal out</span>
                  <button className="small" onClick={() => updateSet(item.id)} type="button">{copy.saveSet}</button>
                  <button className="danger small" onClick={() => removeSet(item.id)} type="button">{copy.remove}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Profile({ api, user, setUser, copy }: { api: <T>(path: string, options?: RequestInit) => Promise<T>; user: User; setUser: (user: User) => void; copy: Copy }) {
  const [form, setForm] = useState(user);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setUser(await api("/me", { method: "PATCH", body: JSON.stringify(form) }));
  }
  return (
    <section>
      <header className="page-head"><h2>{copy.profile}</h2></header>
      <form className="panel profile" onSubmit={save}>
        <label>
          {copy.displayName}
          <input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} />
        </label>
        <label>
          {copy.sex}
          <select value={form.sex ?? ""} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
            <option value="">{copy.chooseSex}</option>
            <option value="male">male</option>
            <option value="female">female</option>
            <option value="other">other</option>
          </select>
        </label>
        <label>
          {copy.age}
          <input type="number" placeholder="Example: 28" value={form.age ?? ""} onChange={(e) => setForm({ ...form, age: Number(e.target.value) })} />
        </label>
        <label>
          {copy.heightCm}
          <input type="number" placeholder="Example: 175" value={form.height_cm ?? ""} onChange={(e) => setForm({ ...form, height_cm: Number(e.target.value) })} />
        </label>
        <label>
          {copy.weightKg}
          <input type="number" placeholder="Example: 72" value={form.weight_kg ?? ""} onChange={(e) => setForm({ ...form, weight_kg: Number(e.target.value) })} />
        </label>
        <label>
          {copy.goal}
          <select value={form.goal_type} onChange={(e) => setForm({ ...form, goal_type: e.target.value })}>
            <option value="lose">{copy.lose}</option>
            <option value="maintain">{copy.maintain}</option>
            <option value="gain">{copy.gain}</option>
          </select>
        </label>
        <label>
          {copy.dailyCalorieTarget}
          <input type="number" placeholder="Example: 2200" value={form.daily_calorie_target ?? ""} onChange={(e) => setForm({ ...form, daily_calorie_target: Number(e.target.value) })} />
        </label>
        <button>{copy.saveProfile}</button>
      </form>
    </section>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
