export const STORAGE_KEY = "devquest.data.v1";
export const SCHEMA_VERSION = 1;
export const COLORS = ["violet", "blue", "mint", "peach", "rose"];
export const CATEGORIES = {
  game: "Игра",
  app: "Приложение",
  web: "Сайт",
  other: "Другое",
};
export const PROJECT_STATUSES = {
  active: "В работе",
  planned: "Идея",
  completed: "Завершён",
  archived: "В архиве",
};
export const TASK_STATUSES = {
  todo: "К выполнению",
  progress: "В работе",
  done: "Готово",
};
export const PRIORITIES = {
  low: { label: "Низкий", xp: 10 },
  medium: { label: "Средний", xp: 20 },
  high: { label: "Высокий", xp: 30 },
};
export const uid = () => globalThis.crypto.randomUUID();
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function relativeDay(offset, now = new Date()) {
  const date = new Date(now);
  date.setDate(date.getDate() + offset);
  return dayKey(date);
}
export function emptyData() {
  return {
    version: SCHEMA_VERSION,
    demo: false,
    profile: { name: "Разработчик", dailyGoal: 3 },
    projects: [],
    tasks: [],
    rewards: [],
  };
}
export function demoData(now = new Date()) {
  const data = emptyData();
  data.demo = true;
  const createdAt = new Date(now.getTime() - 7 * 86400000).toISOString();
  data.projects = [
    {
      id: "demo-orbit",
      name: "Orbit Runner",
      description:
        "Космический раннер на Godot. От первой механики до собственного релиза.",
      category: "game",
      status: "active",
      color: "violet",
      createdAt,
    },
    {
      id: "demo-habit",
      name: "Habit Flow",
      description: "Минималистичный трекер привычек для Android.",
      category: "app",
      status: "active",
      color: "mint",
      createdAt,
    },
    {
      id: "demo-portfolio",
      name: "Личный сайт",
      description: "Место для проектов, заметок и маленьких побед.",
      category: "web",
      status: "planned",
      color: "blue",
      createdAt,
    },
  ];
  data.tasks = [
    {
      id: "demo-task-1",
      title: "Настроить движение персонажа",
      description: "Добавить плавное ускорение и управление касаниями.",
      projectId: "demo-orbit",
      priority: "high",
      due: dayKey(now),
      status: "progress",
      createdAt,
    },
    {
      id: "demo-task-2",
      title: "Собрать главный экран",
      description: "Набросать первую версию интерфейса трекера.",
      projectId: "demo-habit",
      priority: "medium",
      due: dayKey(now),
      status: "todo",
      createdAt,
    },
    {
      id: "demo-task-3",
      title: "Придумать систему бонусов",
      description: "",
      projectId: "demo-orbit",
      priority: "medium",
      due: relativeDay(1, now),
      status: "todo",
      createdAt,
    },
    {
      id: "demo-task-4",
      title: "Выбрать палитру и шрифты",
      description: "",
      projectId: "demo-habit",
      priority: "low",
      due: dayKey(now),
      status: "done",
      createdAt,
    },
    {
      id: "demo-task-5",
      title: "Создать проект в Godot",
      description: "",
      projectId: "demo-orbit",
      priority: "medium",
      due: relativeDay(-1, now),
      status: "done",
      createdAt,
    },
    {
      id: "demo-task-6",
      title: "Нарисовать первый уровень",
      description: "",
      projectId: "demo-orbit",
      priority: "high",
      due: dayKey(now),
      status: "done",
      createdAt,
    },
    {
      id: "demo-task-7",
      title: "Собрать референсы",
      description: "",
      projectId: "demo-portfolio",
      priority: "low",
      due: relativeDay(2, now),
      status: "todo",
      createdAt,
    },
  ];
  data.rewards = [
    { taskId: "demo-task-4", xp: 10, date: dayKey(now) },
    { taskId: "demo-task-5", xp: 20, date: relativeDay(-1, now) },
    { taskId: "demo-task-6", xp: 30, date: dayKey(now) },
    ...Array.from({ length: 9 }, (_, i) => ({
      taskId: `demo-history-${i}`,
      xp: 20,
      date: relativeDay(-1 - (i % 6), now),
    })),
  ];
  return data;
}

const isRecord = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const fail = (message) => {
  throw new Error(message);
};
function str(value, field, max, allowEmpty = false) {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (!allowEmpty && !value.trim())
  )
    fail(`Некорректное поле «${field}».`);
  return value.trim();
}
function enumeration(value, values, field) {
  if (!values.includes(value)) fail(`Неизвестное значение поля «${field}».`);
  return value;
}
function identifier(value) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value))
    fail("Некорректный идентификатор.");
  return value;
}
function dateOnly(value, optional = false) {
  if (optional && value === "") return "";
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail("Некорректная дата.");
  const parsed = new Date(`${value}T12:00:00Z`);
  if (
    !Number.isFinite(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  )
    fail("Несуществующая дата.");
  return value;
}
function timestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    fail("Некорректная дата создания.");
  if (
    !Number.isFinite(Date.parse(value)) ||
    new Date(value).toISOString() !== value
  )
    fail("Некорректная дата создания.");
  return value;
}
function array(value, max, field) {
  if (
    !Array.isArray(value) ||
    value.length > max ||
    value.some((item) => !isRecord(item))
  )
    fail(`Некорректный список «${field}».`);
  return value;
}
function unique(items, field) {
  if (new Set(items.map((item) => item[field])).size !== items.length)
    fail("Идентификаторы не должны повторяться.");
}

// Reconstruct known fields only: imports never become executable markup or arbitrary settings.
export function validateData(input) {
  if (!isRecord(input) || input.version !== SCHEMA_VERSION)
    fail("Неподдерживаемый формат. Нужен экспорт DevQuest версии 1.");
  if (!isRecord(input.profile) || typeof input.demo !== "boolean")
    fail("Отсутствуют настройки профиля.");
  if (
    !Number.isInteger(input.profile.dailyGoal) ||
    input.profile.dailyGoal < 1 ||
    input.profile.dailyGoal > 20
  )
    fail("Цель дня должна быть от 1 до 20.");
  const data = {
    version: SCHEMA_VERSION,
    demo: input.demo,
    profile: {
      name: str(input.profile.name, "Имя", 40),
      dailyGoal: input.profile.dailyGoal,
    },
  };
  data.projects = array(input.projects, 500, "Проекты").map((p) => ({
    id: identifier(p.id),
    name: str(p.name, "Название проекта", 80),
    description: str(p.description, "Описание проекта", 2000, true),
    category: enumeration(p.category, Object.keys(CATEGORIES), "Категория"),
    status: enumeration(
      p.status,
      Object.keys(PROJECT_STATUSES),
      "Статус проекта",
    ),
    color: enumeration(p.color, COLORS, "Цвет"),
    createdAt: timestamp(p.createdAt),
  }));
  unique(data.projects, "id");
  const projectIds = new Set(data.projects.map((p) => p.id));
  data.tasks = array(input.tasks, 5000, "Задачи").map((t) => {
    if (t.projectId !== null && !projectIds.has(t.projectId))
      fail("Задача ссылается на несуществующий проект.");
    return {
      id: identifier(t.id),
      title: str(t.title, "Название задачи", 120),
      description: str(t.description, "Описание задачи", 3000, true),
      projectId: t.projectId,
      priority: enumeration(t.priority, Object.keys(PRIORITIES), "Приоритет"),
      due: dateOnly(t.due, true),
      status: enumeration(
        t.status,
        Object.keys(TASK_STATUSES),
        "Статус задачи",
      ),
      createdAt: timestamp(t.createdAt),
    };
  });
  unique(data.tasks, "id");
  data.rewards = array(input.rewards, 50000, "Награды").map((r) => ({
    taskId: identifier(r.taskId),
    xp: enumeration(r.xp, [10, 20, 30], "Опыт"),
    date: dateOnly(r.date),
  }));
  unique(data.rewards, "taskId");
  const rewarded = new Set(data.rewards.map((r) => r.taskId));
  if (data.tasks.some((t) => t.status === "done" && !rewarded.has(t.id)))
    fail("У выполненной задачи отсутствует запись опыта.");
  return data;
}
export function parseImport(text) {
  if (
    typeof text !== "string" ||
    new TextEncoder().encode(text).length > 5 * 1024 * 1024
  )
    fail("Файл слишком большой. Максимум — 5 МБ.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    fail("Не удалось прочитать JSON. Выберите файл экспорта DevQuest.");
  }
  return validateData(data);
}
export function loadData(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) {
      const data = demoData();
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { data, error: "", corrupt: false };
    }
    return { data: parseImport(raw), error: "", corrupt: false };
  } catch (error) {
    return {
      data: emptyData(),
      error: `Не удалось открыть локальные данные: ${error.message}`,
      corrupt: true,
    };
  }
}
export function saveData(storage, data) {
  const valid = validateData(data);
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(valid));
  } catch {
    fail(
      "Не удалось сохранить данные. Проверьте свободное место и разрешение браузера на хранение данных.",
    );
  }
  return valid;
}
export function setTaskStatus(data, id, status, date = dayKey()) {
  enumeration(status, Object.keys(TASK_STATUSES), "Статус задачи");
  dateOnly(date);
  const task = data.tasks.find((t) => t.id === id);
  if (!task) fail("Задача не найдена.");
  let earned = 0;
  task.status = status;
  if (status === "done" && !data.rewards.some((r) => r.taskId === id)) {
    earned = PRIORITIES[task.priority].xp;
    data.rewards.push({ taskId: id, xp: earned, date });
  }
  return earned;
}
export function removeProject(data, id) {
  data.projects = data.projects.filter((p) => p.id !== id);
  // Keep tasks and the immutable XP ledger when a project is deleted.
  data.tasks.forEach((t) => {
    if (t.projectId === id) t.projectId = null;
  });
}
export const totalXP = (data) =>
  data.rewards.reduce((sum, reward) => sum + reward.xp, 0);
export function levelInfo(data) {
  const xp = totalXP(data);
  return {
    level: Math.floor(xp / 100) + 1,
    current: xp % 100,
    next: 100,
    total: xp,
  };
}
export function projectProgress(data, project) {
  const tasks = data.tasks.filter((t) => t.projectId === project.id);
  const done = tasks.filter((t) => t.status === "done").length;
  return {
    total: tasks.length,
    done,
    percent: tasks.length
      ? Math.round((done / tasks.length) * 100)
      : project.status === "completed"
        ? 100
        : 0,
  };
}
export function dailyStats(data, day = dayKey()) {
  const rewards = data.rewards.filter((r) => r.date === day);
  return {
    count: rewards.length,
    xp: rewards.reduce((sum, r) => sum + r.xp, 0),
  };
}
export function streak(data, now = new Date()) {
  const days = new Set(data.rewards.map((r) => r.date));
  let offset = days.has(dayKey(now)) ? 0 : -1,
    result = 0;
  while (days.has(relativeDay(offset--, now))) result++;
  return result;
}
export function achievements(data) {
  const xp = totalXP(data),
    count = data.rewards.length;
  return [
    {
      id: "first",
      icon: "spark",
      title: "Первый шаг",
      description: "Завершить первую задачу",
      unlocked: count >= 1,
      progress: Math.min(count, 1),
      goal: 1,
    },
    {
      id: "builder",
      icon: "layers",
      title: "Создатель",
      description: "Создать 3 проекта",
      unlocked: data.projects.length >= 3,
      progress: Math.min(data.projects.length, 3),
      goal: 3,
    },
    {
      id: "ten",
      icon: "check",
      title: "В потоке",
      description: "Завершить 10 задач",
      unlocked: count >= 10,
      progress: Math.min(count, 10),
      goal: 10,
    },
    {
      id: "xp",
      icon: "gem",
      title: "Искатель опыта",
      description: "Набрать 500 XP",
      unlocked: xp >= 500,
      progress: Math.min(xp, 500),
      goal: 500,
    },
    {
      id: "master",
      icon: "crown",
      title: "Мастер квестов",
      description: "Завершить 50 задач",
      unlocked: count >= 50,
      progress: Math.min(count, 50),
      goal: 50,
    },
    {
      id: "legend",
      icon: "trophy",
      title: "Новая легенда",
      description: "Достичь 10 уровня",
      unlocked: xp >= 900,
      progress: Math.min(Math.floor(xp / 100) + 1, 10),
      goal: 10,
    },
  ];
}
