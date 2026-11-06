import {
  STORAGE_KEY,
  COLORS,
  CATEGORIES,
  PROJECT_STATUSES,
  TASK_STATUSES,
  PRIORITIES,
  uid,
  dayKey,
  relativeDay,
  emptyData,
  demoData,
  parseImport,
  loadData,
  saveData,
  setTaskStatus,
  removeProject,
  levelInfo,
  projectProgress,
  dailyStats,
  streak,
  achievements,
} from "./model.js";
import { icon } from "./icons.js";
import { PROMPTS } from "./prompts.js";

const app = document.querySelector("#app");
const sheet = document.querySelector("#sheet");
const toastElement = document.querySelector("#toast");
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw new Error("Хранилище недоступно.");
    },
    setItem() {
      throw new Error();
    },
  };
}
const loaded = loadData(storage);
let data = loaded.data;
let storageError = loaded.error;
let corrupt = loaded.corrupt;
let page = location.hash.slice(1) || "home";
let taskFilter = "open",
  projectFilter = "current",
  promptFilter = "Все";
let taskProject = "all",
  taskPriority = "all",
  taskSearch = "";
let installPrompt = null,
  swReady = false,
  pendingImport = null,
  toastTimer;
let lastFocus = null;
const navItems = [
  ["home", "home", "Главная"],
  ["projects", "layers", "Проекты"],
  ["tasks", "tasks", "Задачи"],
  ["library", "book", "Библиотека"],
  ["settings", "settings", "Настройки"],
];
const titles = {
  home: "Главная",
  projects: "Мои проекты",
  tasks: "Мои задачи",
  library: "Библиотека промптов",
  settings: "Настройки",
  progress: "Мой прогресс",
};
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ],
  );
const button = (label, action, glyph = "", extra = "", cls = "button") =>
  `<button class="${cls}" data-action="${action}" ${extra}>${glyph ? icon(glyph) : ""}<span>${label}</span></button>`;
const iconButton = (label, action, glyph, extra = "") =>
  `<button class="icon-button" aria-label="${esc(label)}" title="${esc(label)}" data-action="${action}" ${extra}>${icon(glyph)}</button>`;
const badge = (text, cls = "") => `<span class="badge ${cls}">${text}</span>`;
const prettyDate = (value, options = { day: "numeric", month: "short" }) =>
  new Intl.DateTimeFormat("ru-RU", options).format(
    new Date(`${value.slice(0, 10)}T12:00:00`),
  );
const dueLabel = (due) =>
  due === dayKey()
    ? "Сегодня"
    : due === relativeDay(1)
      ? "Завтра"
      : prettyDate(due);
const sectionHeading = (title, subtitle = "", action = "") =>
  `<div class="section-heading"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div>${action}</div>`;
function emptyState(glyph, title, description, action = "") {
  return `<div class="empty-state"><div class="empty-icon">${icon(glyph)}</div><h3>${title}</h3><p>${description}</p>${action}</div>`;
}
function notify(message, type = "") {
  clearTimeout(toastTimer);
  toastElement.textContent = message;
  toastElement.className = `visible ${type}`;
  toastTimer = setTimeout(() => {
    toastElement.className = "";
  }, 4200);
}
function commit(change, message, { replace = false } = {}) {
  if (corrupt && !replace) {
    notify("Сначала восстановите или очистите данные в настройках.", "error");
    return false;
  }
  try {
    const draft = structuredClone(data);
    const replacement = change(draft);
    data = saveData(storage, replacement || draft);
    storageError = "";
    corrupt = false;
    if (message) notify(message);
    render();
    return true;
  } catch (error) {
    notify(error.message, "error");
    return false;
  }
}
function navigate(target) {
  if (!titles[target]) target = "home";
  if (sheet.open) closeSheet();
  if (page === target) {
    render();
    return;
  }
  location.hash = target;
}
window.addEventListener("hashchange", () => {
  page = titles[location.hash.slice(1)] ? location.hash.slice(1) : "home";
  render();
  window.scrollTo({ top: 0 });
  document.querySelector("main").focus({ preventScroll: true });
});

function navigation() {
  return navItems
    .map(
      ([id, glyph, title]) =>
        `<a class="nav-item ${page === id ? "active" : ""}" href="#${id}" ${page === id ? 'aria-current="page"' : ""}>${icon(glyph)}<span>${title}</span>${id === "tasks" ? `<b class="nav-count">${data.tasks.filter((t) => t.status !== "done").length}</b>` : ""}</a>`,
    )
    .join("");
}
function render() {
  if (!titles[page]) page = "home";
  document.title = `${titles[page]} · DevQuest`;
  const level = levelInfo(data);
  app.innerHTML = `<aside class="sidebar"><a class="brand" href="#home"><img src="./assets/icon.svg" alt="" width="34" height="34"><span>Dev<span class="brand-light">Quest</span><small>ТВОЙ ПУТЬ РАЗРАБОТЧИКА</small></span></a><div class="nav-label">РАБОЧЕЕ ПРОСТРАНСТВО</div><nav aria-label="Основная навигация">${navigation()}</nav><div class="sidebar-bottom"><div class="local-note">${icon("shield")}<span>Твои идеи — только твои<small>Данные хранятся на устройстве</small></span></div><span class="version">DevQuest · MVP 0.1</span></div></aside>
    <div class="workspace"><header class="topbar"><a class="brand mobile-brand" href="#home"><img src="./assets/icon.svg" alt="" width="30" height="30"><span>Dev<span class="brand-light">Quest</span></span></a><div class="breadcrumb">Рабочее пространство ${icon("chevron")} <span>${titles[page]}</span></div><div class="header-actions">${data.demo ? '<button class="demo-badge" data-action="demo-info">Демо</button>' : ""}<span class="network-state ${navigator.onLine ? "" : "is-offline"}" title="${navigator.onLine ? "Есть подключение к сети" : "Нет подключения к сети"}">${icon(navigator.onLine ? "wifi" : "offline")}<span>${navigator.onLine ? "На устройстве" : "Без сети"}</span></span><button class="avatar" data-action="navigate" data-page="progress" aria-label="Мой прогресс, уровень ${level.level}">${icon("gem")}<span>${level.level}</span></button></div></header>
    <main id="main" tabindex="-1">${storageError ? `<div class="storage-warning" role="alert">${icon("info")}<div>${esc(storageError)}<br><a href="#settings">Открыть восстановление данных</a></div></div>` : ""}${{ home: homePage, projects: projectsPage, tasks: tasksPage, library: libraryPage, settings: settingsPage, progress: progressPage }[page]()}</main><footer class="desktop-footer"><span>Маленькие шаги. Большие проекты.</span><span>Сделано для тех, кто создаёт ${icon("spark")}</span></footer></div>
    <nav class="bottom-nav" aria-label="Мобильная навигация">${navigation()}</nav>`;
}

function pageHeading(eyebrow, title, description, action = "") {
  return `<div class="page-heading"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
}
function homePage() {
  const level = levelInfo(data),
    today = dailyStats(data),
    active = data.projects.filter((p) => p.status === "active");
  const openTasks = data.tasks
    .filter(
      (t) =>
        t.status !== "done" &&
        !data.projects.some(
          (p) => p.id === t.projectId && p.status === "archived",
        ),
    )
    .sort(
      (a, b) =>
        (a.due || "9999").localeCompare(b.due || "9999") ||
        PRIORITIES[b.priority].xp - PRIORITIES[a.priority].xp,
    );
  const dayProgress = Math.min(
    100,
    (today.count / data.profile.dailyGoal) * 100,
  );
  return `${pageHeading(prettyDate(dayKey(), { weekday: "long", day: "numeric", month: "long" }), `Рад видеть тебя${data.profile.name === "Разработчик" ? "" : `, ${esc(data.profile.name)}`} <span class="wave">✦</span>`, "Хороший день, чтобы создать что-то новое.", button("Новая задача", "new-task", "plus", "", "button primary heading-action"))}
    <div class="overview-grid"><section class="hero-card"><div class="hero-content"><div class="hero-label">${icon("spark")} ТВОЁ ПРИКЛЮЧЕНИЕ</div><h2>Каждый шаг —<br>новый опыт.</h2><p>Превращай идеи в проекты.<br>А задачи — в маленькие победы.</p><button class="hero-link" data-action="navigate" data-page="progress">Мой прогресс ${icon("arrow")}</button></div><img class="hero-crystal" src="./assets/crystal.svg" alt="Сияющий кристалл опыта" width="280" height="280"><div class="hero-progress"><div><span class="level-badge">${icon("gem")} Уровень ${level.level}</span><span class="xp-value">${level.current} <span>/ ${level.next} XP</span></span></div><div class="progress-track" role="progressbar" aria-label="Опыт до следующего уровня" aria-valuenow="${level.current}" aria-valuemin="0" aria-valuemax="100"><i style="width:${level.current}%"></i></div><div class="hero-progress-caption"><span>${level.level < 3 ? "Начало большого пути" : level.level < 6 ? "Исследователь возможностей" : "Архитектор своих идей"}</span><span>До уровня ${level.level + 1} ещё ${100 - level.current} XP</span></div></div></section>
    <section class="daily-card"><div class="daily-title"><span class="icon-tile peach">${icon("flame")}</span><div><h2>Твой ритм</h2><p>Одна задача за другой</p></div><span class="streak-number">${streak(data)} <small>дн.</small></span></div><div class="daily-main"><div class="day-ring" style="--progress:${dayProgress}%" role="img" aria-label="Цель дня: ${today.count} из ${data.profile.dailyGoal}"><div><strong>${today.count}<span>/${data.profile.dailyGoal}</span></strong><small>задачи</small></div></div><div><span class="eyebrow">ЦЕЛЬ НА СЕГОДНЯ</span><h3>${today.count >= data.profile.dailyGoal ? "Отличная работа!" : "Ты на верном пути"}</h3><p>${today.count >= data.profile.dailyGoal ? "Дневная цель достигнута.<br>Можно гордиться собой." : `Ещё ${data.profile.dailyGoal - today.count} до цели.<br>У тебя всё получится.`}</p><span class="xp-pill">${icon("spark")} +${today.xp} XP сегодня</span></div></div><div class="week-strip">${Array.from(
      { length: 7 },
      (_, i) => {
        const date = relativeDay(i - 6),
          count = dailyStats(data, date).count;
        return `<div class="week-day ${count ? "done" : ""} ${i === 6 ? "today" : ""}"><span>${prettyDate(date, { weekday: "short" })}</span><span class="day-check">${count ? icon("check") : "<i></i>"}</span></div>`;
      },
    ).join("")}</div></section></div>
    <div class="stats-grid"><div class="stat-card"><span class="icon-tile violet">${icon("layers")}</span><div><strong>${active.length}</strong><span>В работе</span></div></div><div class="stat-card"><span class="icon-tile mint">${icon("check")}</span><div><strong>${data.tasks.filter((t) => t.status === "done").length}</strong><span>Задач готово</span></div></div><button class="stat-card" data-action="navigate" data-page="progress"><span class="icon-tile peach">${icon("trophy")}</span><div><strong>${achievements(data).filter((a) => a.unlocked).length}<small> / 6</small></strong><span>Достижения</span></div>${icon("chevron", "stat-arrow")}</button></div>
    <div class="dashboard-grid"><section>${sectionHeading("Ближайшие квесты", "Большие идеи начинаются с маленьких дел", '<a class="text-link" href="#tasks">Все задачи ' + icon("arrow") + "</a>")}<div class="task-list">${openTasks.length ? openTasks.slice(0, 3).map(taskCard).join("") : emptyState("check", "Всё под контролем", "Добавь следующую задачу для своей идеи.", button("Добавить задачу", "new-task", "plus", "", "button secondary"))}</div>${openTasks.length ? `<button class="add-task-line" data-action="new-task">${icon("plus")} Добавить задачу</button>` : ""}</section><section>${sectionHeading("Активные проекты", "Идеи, которым ты даёшь жизнь", '<a class="text-link" href="#projects">Все ' + icon("arrow") + "</a>")}<div class="home-projects">${
      active.length
        ? active
            .slice(0, 2)
            .map((p) => projectCard(p, true))
            .join("")
        : emptyState(
            "layers",
            "Всё начинается с идеи",
            "Создай свой первый проект.",
            button(
              "Создать проект",
              "new-project",
              "plus",
              "",
              "button secondary",
            ),
          )
    }</div></section></div>
    <button class="prompt-banner" data-action="navigate" data-page="library"><span class="icon-tile violet">${icon("book")}</span><div><span class="eyebrow">МЕНЬШЕ РУТИНЫ. БОЛЬШЕ ТВОРЧЕСТВА.</span><h3>Хороший промпт — половина дела</h3><p>5 шаблонов для твоего следующего прорыва</p></div>${icon("arrow")}</button>`;
}
function taskCard(task) {
  const project = data.projects.find((p) => p.id === task.projectId);
  const done = task.status === "done";
  const reward = data.rewards.find((r) => r.taskId === task.id);
  return `<article class="task-card ${done ? "is-done" : ""}"><button class="task-check ${done ? "checked" : ""}" data-action="toggle-task" data-id="${task.id}" aria-label="${done ? "Вернуть в работу" : "Завершить"}: ${esc(task.title)}" aria-pressed="${done}">${done ? icon("check") : ""}</button><button class="task-content" data-action="edit-task" data-id="${task.id}"><span class="task-title">${esc(task.title)}</span><span class="task-meta"><span class="project-dot ${project?.color || "blue"}"></span><span class="task-project-name">${esc(project?.name || "Без проекта")}</span>${task.due ? `<span class="due ${task.due < dayKey() && !done ? "overdue" : ""}">${icon("calendar")}${dueLabel(task.due)}</span>` : ""}</span>${task.status === "progress" ? '<span class="in-progress-label">В работе</span>' : ""}</button><div class="task-right"><span class="priority-dot ${task.priority}" role="img" aria-label="${PRIORITIES[task.priority].label} приоритет" title="${PRIORITIES[task.priority].label} приоритет"></span><span class="task-xp">${reward ? "✓" : "+"}${reward?.xp ?? PRIORITIES[task.priority].xp} <small>XP</small></span></div></article>`;
}
function projectCard(project, compact = false) {
  const progress = projectProgress(data, project);
  return `<article class="project-card ${compact ? "compact" : ""}"><div class="project-top"><span class="project-icon ${project.color}">${icon(project.category)}</span><div><button class="project-name" data-action="project-detail" data-id="${project.id}">${esc(project.name)}</button><span class="project-category">${CATEGORIES[project.category]}</span></div>${iconButton(`Действия с проектом ${project.name}`, "edit-project", "more", `data-id="${project.id}"`)}</div>${!compact ? `<p class="project-description">${esc(project.description || "Здесь начинается что-то классное.")}</p>` : ""}<div class="project-progress-label"><span>${progress.done} из ${progress.total} задач</span><strong>${progress.percent}%</strong></div><div class="progress-track ${project.color}" role="progressbar" aria-label="Прогресс ${esc(project.name)}" aria-valuenow="${progress.percent}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress.percent}%"></i></div>${!compact ? `<div class="project-bottom">${badge(PROJECT_STATUSES[project.status], project.status)}<span>${prettyDate(project.createdAt)}</span></div>` : ""}</article>`;
}
function projectsPage() {
  const filtered = data.projects.filter(
    (p) =>
      projectFilter === "all" ||
      (projectFilter === "current"
        ? p.status !== "archived"
        : p.status === projectFilter),
  );
  return `${pageHeading("ОТ ИДЕИ ДО РЕЛИЗА", "Мои проекты", "У каждой большой идеи есть первый шаг.", button("Создать проект", "new-project", "plus", "", "button primary heading-action"))}<div class="filter-row" role="group" aria-label="Фильтр проектов">${[
    ["current", "Текущие"],
    ["active", "В работе"],
    ["completed", "Завершённые"],
    ["archived", "Архив"],
    ["all", "Все"],
  ]
    .map(
      ([value, label]) =>
        `<button class="chip ${projectFilter === value ? "selected" : ""}" data-action="project-filter" data-value="${value}" aria-pressed="${projectFilter === value}">${label}</button>`,
    )
    .join(
      "",
    )}</div><div class="projects-grid">${filtered.map((p) => projectCard(p)).join("")}${projectFilter === "current" || projectFilter === "all" ? `<button class="new-project-card" data-action="new-project"><span>${icon("plus")}</span><h3>Следующая большая идея</h3><p>Начни новый проект</p></button>` : ""}</div>${!filtered.length && projectFilter !== "current" && projectFilter !== "all" ? emptyState("layers", "Здесь пока тихо", "Проекты с выбранным статусом появятся здесь.") : ""}`;
}
function tasksPage() {
  const filtered = data.tasks
    .filter((t) => {
      const status =
        taskFilter === "all" ||
        (taskFilter === "open"
          ? t.status !== "done"
          : taskFilter === "today"
            ? t.due === dayKey() && t.status !== "done"
            : taskFilter === "overdue"
              ? t.due && t.due < dayKey() && t.status !== "done"
              : t.status === taskFilter);
      return (
        status &&
        (taskProject === "all" ||
          (taskProject === "none"
            ? t.projectId === null
            : t.projectId === taskProject)) &&
        (taskPriority === "all" || t.priority === taskPriority) &&
        t.title
          .toLocaleLowerCase("ru")
          .includes(taskSearch.toLocaleLowerCase("ru"))
      );
    })
    .sort(
      (a, b) =>
        (a.due || "9999").localeCompare(b.due || "9999") ||
        PRIORITIES[b.priority].xp - PRIORITIES[a.priority].xp,
    );
  return `${pageHeading("ТВОЙ ЖУРНАЛ КВЕСТОВ", "Мои задачи", "Сосредоточься на следующем небольшом шаге.", button("Новая задача", "new-task", "plus", "", "button primary heading-action"))}<div class="filter-row" role="group" aria-label="Статус задач">${[
    ["open", "Активные"],
    ["today", "Сегодня"],
    ["progress", "В работе"],
    ["overdue", "Просрочено"],
    ["done", "Готово"],
    ["all", "Все"],
  ]
    .map(
      ([value, label]) =>
        `<button class="chip ${taskFilter === value ? "selected" : ""}" data-action="task-filter" data-value="${value}" aria-pressed="${taskFilter === value}">${label}</button>`,
    )
    .join(
      "",
    )}</div><div class="task-tools"><label class="search-field">${icon("search")}<input type="search" id="task-search" aria-label="Поиск задач" placeholder="Найти свой квест…" value="${esc(taskSearch)}" maxlength="120"></label><div class="select-filters"><label><span class="sr-only">Проект</span><select id="task-project-filter"><option value="all">Все проекты</option><option value="none" ${taskProject === "none" ? "selected" : ""}>Без проекта</option>${data.projects.map((p) => `<option value="${p.id}" ${taskProject === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select></label><label><span class="sr-only">Приоритет</span><select id="task-priority-filter"><option value="all">Все приоритеты</option>${Object.entries(
    PRIORITIES,
  )
    .map(
      ([key, p]) =>
        `<option value="${key}" ${taskPriority === key ? "selected" : ""}>${p.label}</option>`,
    )
    .join(
      "",
    )}</select></label></div></div><div class="results-caption">Найдено задач: ${filtered.length}<span>10–30 XP за завершение</span></div><div class="task-list full-task-list">${filtered.length ? filtered.map(taskCard).join("") : emptyState("tasks", "Свободное место для новых побед", "Измени фильтры или добавь новую задачу.", button("Добавить задачу", "new-task", "plus", "", "button secondary"))}</div>`;
}
function libraryPage() {
  return `${pageHeading("ТВОЙ НАБОР ИНСТРУМЕНТОВ", "Библиотека промптов", "Меньше пустого листа. Больше хороших решений.")}<div class="library-intro"><span class="icon-tile violet">${icon("spark")}</span><div><h3>Хорошая отправная точка для ИИ</h3><p>Выбери шаблон, заполни детали и скопируй промпт в своего ИИ-помощника.</p></div></div><div class="filter-row" role="group" aria-label="Категория промптов">${["Все", ...PROMPTS.map((p) => p.category)].map((category) => `<button class="chip ${promptFilter === category ? "selected" : ""}" data-action="prompt-filter" data-value="${category}" aria-pressed="${promptFilter === category}">${category}</button>`).join("")}</div><div class="prompt-grid">${PROMPTS.filter(
    (p) => promptFilter === "Все" || p.category === promptFilter,
  )
    .map(
      (p) =>
        `<button class="prompt-card" data-action="open-prompt" data-id="${p.id}"><div class="prompt-card-top"><span class="icon-tile ${p.color}">${icon(p.icon)}</span>${badge(p.category)}</div><h2>${p.title}</h2><p>${p.description}</p><div><span>${p.time}</span>${icon("arrow")}</div></button>`,
    )
    .join(
      "",
    )}</div><p class="muted-note">${icon("info")} Шаблоны работают локально. Код и параметры никуда не отправляются.</p>`;
}
function progressPage() {
  const level = levelInfo(data),
    unlocked = achievements(data).filter((a) => a.unlocked).length;
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = relativeDay(i - 6);
    return { date, ...dailyStats(data, date) };
  });
  const max = Math.max(30, ...days.map((d) => d.xp));
  return `${pageHeading("МАЛЕНЬКИЕ ПОБЕДЫ ИМЕЮТ ЗНАЧЕНИЕ", "Мой прогресс", "Твой опыт растёт вместе с твоими проектами.")}<section class="level-panel"><img src="./assets/crystal.svg" width="160" height="160" alt="Кристалл опыта"><div><span class="eyebrow">ТВОЙ ТЕКУЩИЙ УРОВЕНЬ</span><h2>Уровень ${level.level}</h2><p>${level.total} XP за весь путь</p><div class="progress-track"><i style="width:${level.current}%"></i></div><div class="hero-progress-caption"><span>${level.current} / 100 XP</span><span>Уровень ${level.level + 1}</span></div></div></section><div class="progress-summary"><div><strong>${data.rewards.length}</strong><span>Задач принесли опыт</span></div><div><strong>${streak(data)}</strong><span>Дней в серии</span></div><div><strong>${unlocked}<small> / 6</small></strong><span>Достижения</span></div></div><section class="activity-panel">${sectionHeading("Опыт за неделю", "Засчитывается первое завершение задачи")}<div class="activity-chart">${days.map((d) => `<div class="chart-day ${d.date === dayKey() ? "today" : ""}"><span>${d.xp}</span><div class="chart-track"><i style="height:${(d.xp / max) * 100}%"></i></div><span>${prettyDate(d.date, { weekday: "short" })}</span></div>`).join("")}</div></section><section>${sectionHeading("Коллекция достижений", "У каждого значка — своя история")}<div class="achievement-grid">${achievements(
    data,
  )
    .map(
      (a) =>
        `<article class="achievement ${a.unlocked ? "unlocked" : ""}"><span class="achievement-icon">${icon(a.icon)}</span><div><h3>${a.title}</h3><p>${a.description}</p><span>${a.unlocked ? `${icon("check")} Получено` : `${a.progress} / ${a.goal}`}</span></div>${!a.unlocked ? icon("lock", "lock-icon") : ""}</article>`,
    )
    .join(
      "",
    )}</div></section><div class="info-panel">${icon("gem")}<p>Низкий приоритет — <b>10 XP</b>, средний — <b>20 XP</b>, высокий — <b>30 XP</b>. Каждый уровень требует 100 XP. Опыт даётся один раз и сохраняется после возврата или удаления задачи.</p></div>`;
}
function settingsPage() {
  const size = (
    new TextEncoder().encode(JSON.stringify(data)).length / 1024
  ).toFixed(1);
  return `${pageHeading("ТВОЁ ПРОСТРАНСТВО", "Настройки", "Пусть всё работает в твоём ритме.")}<div class="settings-grid"><section class="settings-panel"><h2>${icon("gem")} Профиль разработчика</h2><form id="profile-form"><label>Как тебя называть?<input name="name" value="${esc(data.profile.name)}" maxlength="40" required autocomplete="nickname"></label><label>Задач в день<select name="dailyGoal">${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}" ${data.profile.dailyGoal === i + 1 ? "selected" : ""}>${i + 1}</option>`).join("")}</select><small>Небольшая цель помогает сохранять ритм.</small></label><button class="button secondary" type="submit">${icon("check")} Сохранить профиль</button></form></section><section class="settings-panel"><h2>${icon("app")} Приложение</h2><div class="setting-line"><span class="icon-tile violet">${icon("moon")}</span><div><strong>Тёмная сторона творчества</strong><p>Тёмная тема · комфортно каждый день</p></div></div><div class="setting-line"><span class="icon-tile mint">${icon("shield")}</span><div><strong>${swReady ? "Готово к работе без сети" : "Автономный режим"}</strong><p>${swReady ? "Файлы приложения сохранены на устройстве" : "Подготовится после загрузки приложения по HTTPS"}</p></div></div>${button(window.matchMedia("(display-mode: standalone)").matches ? "Приложение установлено" : "Установить на Android", "install", "download", "", "button secondary full-width")}<p class="setting-help">Открывай DevQuest с главного экрана, как обычное приложение.</p></section><section class="settings-panel"><h2>${icon("archive")} Твои данные</h2><div class="storage-meter"><div><strong>${size} КБ</strong><span>на этом устройстве</span></div>${icon("shield")}</div><p class="setting-help">${data.projects.length} проектов · ${data.tasks.length} задач · ${data.rewards.length} записей опыта. Синхронизации между устройствами нет — сохраняй резервные копии.</p><div class="data-actions">${button("Экспорт JSON", "export", "download", "", "button secondary")}${button("Импорт JSON", "import", "upload", "", "button secondary")}</div><input type="file" id="import-file" accept=".json,application/json" hidden>${corrupt ? button("Скачать исходные данные", "export-raw", "download", "", "button secondary full-width") : ""}</section><section class="settings-panel danger-panel"><h2>${icon("restore")} Начать заново</h2><p class="setting-help">Сначала экспортируй данные, если хочешь сохранить свой путь.</p>${button("Восстановить демоданные", "reset-demo", "restore", "", "setting-action")}${button("Удалить все данные", "clear-data", "trash", "", "setting-action danger")}</section></div><div class="about-app"><img src="./assets/icon.svg" alt="" width="40" height="40"><div><strong>DevQuest <span>v0.1.0</span></strong><p>Твоя мастерская. Твои квесты. Твой следующий уровень.</p></div></div>`;
}

function openSheet(title, content, className = "") {
  lastFocus = document.activeElement;
  sheet.className = className;
  sheet.innerHTML = `<div class="sheet-handle"></div><div class="sheet-header"><h2 id="sheet-title">${title}</h2>${iconButton("Закрыть", "close", "close")}</div><div class="sheet-body">${content}</div>`;
  if (!sheet.open) sheet.showModal();
  document.body.classList.add("modal-open");
}
function closeSheet() {
  sheet.close();
}
sheet.addEventListener("close", () => {
  document.body.classList.remove("modal-open");
  pendingImport = null;
  if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
});
sheet.addEventListener("click", (event) => {
  if (event.target === sheet) {
    const r = sheet.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      closeSheet();
  }
});

function projectForm(id) {
  const project = data.projects.find((p) => p.id === id);
  openSheet(
    project ? "Редактировать проект" : "Новый проект",
    `<form id="project-form" data-id="${project?.id || ""}"><label>Название проекта<input name="name" placeholder="Дай своей идее имя" maxlength="80" value="${esc(project?.name || "")}" required autofocus></label><label>О чём этот проект?<textarea name="description" placeholder="Пара слов о том, что ты хочешь создать" maxlength="2000" rows="3">${esc(project?.description || "")}</textarea></label><div class="form-row"><label>Категория<select name="category">${Object.entries(
      CATEGORIES,
    )
      .map(
        ([key, label]) =>
          `<option value="${key}" ${project?.category === key ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Статус<select name="status">${Object.entries(
      PROJECT_STATUSES,
    )
      .map(
        ([key, label]) =>
          `<option value="${key}" ${project?.status === key ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label></div><fieldset class="color-picker"><legend>Цвет проекта</legend>${COLORS.map((color, i) => `<label class="color-option ${color}" title="${["Фиолетовый", "Синий", "Мятный", "Персиковый", "Розовый"][i]}"><input type="radio" name="color" aria-label="${["Фиолетовый", "Синий", "Мятный", "Персиковый", "Розовый"][i]}" value="${color}" ${(project?.color || "violet") === color ? "checked" : ""}><span aria-label="${["Фиолетовый", "Синий", "Мятный", "Персиковый", "Розовый"][i]}">${icon("check")}</span></label>`).join("")}</fieldset><p class="form-hint">Прогресс рассчитывается по выполненным задачам.${project ? ` Создан ${prettyDate(project.createdAt)}.` : ""}</p><button class="button primary full-width" type="submit">${icon("check")} ${project ? "Сохранить изменения" : "Создать проект"}</button></form>${project ? `<div class="sheet-secondary-actions">${button(project.status === "archived" ? "Вернуть из архива" : "В архив", "archive-project", "archive", `data-id="${project.id}"`, "button ghost")}${button("Удалить", "delete-project", "trash", `data-id="${project.id}"`, "button ghost danger")}</div>` : ""}`,
  );
}
function taskForm(id, projectId = "") {
  const task = data.tasks.find((t) => t.id === id);
  const selectedProject = task?.projectId || projectId;
  openSheet(
    task ? "Редактировать задачу" : "Новый квест",
    `<form id="task-form" data-id="${task?.id || ""}"><label>Что нужно сделать?<input name="title" placeholder="Один небольшой, понятный шаг" maxlength="120" value="${esc(task?.title || "")}" required autofocus></label><label>Детали<textarea name="description" placeholder="Идеи, ссылки или критерии готовности" maxlength="3000" rows="3">${esc(task?.description || "")}</textarea></label><label>Проект<select name="projectId"><option value="">Без проекта</option>${data.projects.map((p) => `<option value="${p.id}" ${selectedProject === p.id ? "selected" : ""}>${esc(p.name)}${p.status === "archived" ? " (архив)" : ""}</option>`).join("")}</select></label><div class="form-row"><label>Приоритет<select name="priority">${Object.entries(
      PRIORITIES,
    )
      .map(
        ([key, p]) =>
          `<option value="${key}" ${(task?.priority || "medium") === key ? "selected" : ""}>${p.label} · ${p.xp} XP</option>`,
      )
      .join(
        "",
      )}</select></label><label>Срок<input name="due" type="date" min="0001-01-01" max="9999-12-31" value="${task?.due ?? dayKey()}"></label></div><label>Статус<select name="status">${Object.entries(
      TASK_STATUSES,
    )
      .map(
        ([key, label]) =>
          `<option value="${key}" ${task?.status === key ? "selected" : ""}>${label}</option>`,
      )
      .join(
        "",
      )}</select></label><p class="form-hint">${task && data.rewards.some((r) => r.taskId === task.id) ? "Опыт за эту задачу уже получен. Повторная награда не начисляется." : "Заверши задачу, чтобы получить опыт. Каждая награда — один раз."}</p><button class="button primary full-width" type="submit">${icon("check")} ${task ? "Сохранить изменения" : "Добавить задачу"}</button></form>${task ? `<div class="sheet-secondary-actions">${button("Удалить задачу", "delete-task", "trash", `data-id="${task.id}"`, "button ghost danger")}</div>` : ""}`,
  );
}
function projectDetail(id) {
  const project = data.projects.find((p) => p.id === id);
  if (!project) return;
  const tasks = data.tasks.filter((t) => t.projectId === id);
  openSheet(
    esc(project.name),
    `<div class="detail-meta">${badge(CATEGORIES[project.category])}${badge(PROJECT_STATUSES[project.status], project.status)}</div><p class="detail-description">${esc(project.description || "Добавь описание проекта, чтобы не потерять идею.")}</p><div class="detail-actions">${button("Добавить задачу", "new-task", "plus", `data-project="${id}"`, "button primary")}${iconButton("Редактировать проект", "edit-project", "edit", `data-id="${id}"`)}</div><h3 class="detail-subtitle">Задачи проекта · ${tasks.length}</h3><div class="task-list">${tasks.length ? tasks.map(taskCard).join("") : emptyState("tasks", "Начни с первого шага", "Добавь задачу к этому проекту.")}</div>`,
    "project-detail",
  );
}
function confirmDialog(title, description, action, label, id = "") {
  openSheet(
    title,
    `<p class="confirm-description">${description}</p><div class="confirm-actions">${button("Отмена", "close", "", "", "button secondary")}${button(label, action, "", `data-id="${id}"`, "button danger-button")}</div>`,
  );
}
function promptForm(id) {
  const prompt = PROMPTS.find((p) => p.id === id);
  if (!prompt) return;
  openSheet(
    prompt.title,
    `<p class="prompt-form-intro">${prompt.description} Заполни поля под свою задачу.</p><form id="prompt-form" data-id="${id}">${prompt.fields.map((field) => `<label>${field.label}${field.multiline ? `<textarea name="${field.key}" placeholder="${field.placeholder}" rows="3" maxlength="10000" required></textarea>` : `<input name="${field.key}" placeholder="${field.placeholder}" maxlength="500" required>`}</label>`).join("")}<button class="button primary full-width" type="submit">${icon("spark")} Собрать промпт</button></form><div id="prompt-result" hidden><label>Готовый промпт<textarea id="generated-prompt" rows="11" readonly></textarea></label>${button("Скопировать промпт", "copy-prompt", "copy", "", "button primary full-width")}<p class="form-hint">Вставь его в ИИ-помощника, которым пользуешься.</p></div>`,
    "prompt-sheet",
  );
}
async function copyPrompt() {
  const textarea = document.querySelector("#generated-prompt");
  try {
    await navigator.clipboard.writeText(textarea.value);
    notify("Промпт скопирован. Время создавать!");
  } catch {
    textarea.focus();
    textarea.select();
    if (document.execCommand("copy")) notify("Промпт скопирован");
    else notify("Текст выделен. Нажмите «Копировать» в меню браузера.");
  }
}
function download(text, filename) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "application/json;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
async function importFile(file) {
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024)
      throw new Error("Файл слишком большой. Максимум — 5 МБ.");
    const valid = parseImport(await file.text());
    confirmDialog(
      "Восстановить данные?",
      `В файле: <b>${valid.projects.length} проектов</b>, <b>${valid.tasks.length} задач</b> и <b>${levelInfo(valid).total} XP</b>.<br><br>Текущие данные будут заменены. Перед импортом рекомендуем сохранить экспорт.`,
      "confirm-import",
      "Восстановить",
    );
    pendingImport = valid;
  } catch (error) {
    notify(error.message, "error");
  }
}

document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  const { action, id, value } = target.dataset;
  switch (action) {
    case "navigate":
      navigate(target.dataset.page);
      break;
    case "close":
      closeSheet();
      break;
    case "new-project":
      projectForm();
      break;
    case "edit-project":
      projectForm(id);
      break;
    case "project-detail":
      projectDetail(id);
      break;
    case "new-task":
      taskForm("", target.dataset.project);
      break;
    case "edit-task":
      taskForm(id);
      break;
    case "toggle-task": {
      let earned = 0;
      const previousLevel = levelInfo(data).level;
      const task = data.tasks.find((t) => t.id === id);
      if (!task) break;
      const done = task.status !== "done";
      if (
        commit((draft) => {
          earned = setTaskStatus(draft, id, done ? "done" : "todo");
        })
      ) {
        notify(
          earned
            ? `+${earned} XP! ${levelInfo(data).level > previousLevel ? `Новый уровень: ${levelInfo(data).level} ✦` : "Ещё одна маленькая победа ✦"}`
            : done
              ? "Задача готова. Опыт уже получен ранее."
              : "Задача снова активна. Опыт сохранён.",
        );
        if (sheet.open && sheet.classList.contains("project-detail"))
          projectDetail(task.projectId);
      }
      break;
    }
    case "project-filter":
      projectFilter = value;
      render();
      break;
    case "task-filter":
      taskFilter = value;
      render();
      break;
    case "prompt-filter":
      promptFilter = value;
      render();
      break;
    case "open-prompt":
      promptForm(id);
      break;
    case "copy-prompt":
      await copyPrompt();
      break;
    case "archive-project":
      if (
        commit((draft) => {
          const p = draft.projects.find((p) => p.id === id);
          p.status = p.status === "archived" ? "active" : "archived";
        }, "Статус проекта обновлён")
      )
        closeSheet();
      break;
    case "delete-project":
      confirmDialog(
        "Удалить проект?",
        "Проект будет удалён. Его задачи останутся в списке «Без проекта», а заработанный опыт сохранится.",
        "confirm-delete-project",
        "Удалить проект",
        id,
      );
      break;
    case "confirm-delete-project":
      if (
        commit(
          (draft) => removeProject(draft, id),
          "Проект удалён. Задачи сохранены.",
        )
      ) {
        taskProject = "all";
        closeSheet();
        render();
      }
      break;
    case "delete-task":
      confirmDialog(
        "Удалить задачу?",
        "Задачу нельзя будет восстановить. Уже заработанный за неё опыт сохранится.",
        "confirm-delete-task",
        "Удалить задачу",
        id,
      );
      break;
    case "confirm-delete-task":
      if (
        commit((draft) => {
          draft.tasks = draft.tasks.filter((t) => t.id !== id);
        }, "Задача удалена")
      )
        closeSheet();
      break;
    case "export":
      download(JSON.stringify(data, null, 2), `devquest-${dayKey()}.json`);
      notify("Резервная копия подготовлена");
      break;
    case "export-raw": {
      try {
        download(
          storage.getItem(STORAGE_KEY) || "{}",
          `devquest-recovery-${dayKey()}.json`,
        );
      } catch {
        notify("Хранилище недоступно", "error");
      }
      break;
    }
    case "import":
      document.querySelector("#import-file").click();
      break;
    case "confirm-import":
      if (
        pendingImport &&
        commit(() => pendingImport, "Данные восстановлены", { replace: true })
      ) {
        taskProject = "all";
        closeSheet();
      }
      break;
    case "reset-demo":
      confirmDialog(
        "Вернуть демоданные?",
        "Текущие проекты, задачи и опыт заменятся примерами. Сохрани экспорт, если хочешь вернуться к своим данным.",
        "confirm-demo",
        "Вернуть демо",
      );
      break;
    case "confirm-demo":
      if (
        commit(() => demoData(), "Демоданные восстановлены", { replace: true })
      ) {
        taskProject = "all";
        closeSheet();
      }
      break;
    case "clear-data":
      confirmDialog(
        "Начать с чистого листа?",
        "Все проекты, задачи, опыт и настройки DevQuest на этом устройстве будут удалены. Это действие нельзя отменить без резервной копии.",
        "confirm-clear",
        "Удалить всё",
      );
      break;
    case "confirm-clear":
      if (
        commit(() => emptyData(), "Чистый лист. Впереди — твой первый квест!", {
          replace: true,
        })
      ) {
        taskProject = "all";
        closeSheet();
      }
      break;
    case "demo-info":
      openSheet(
        "Это твоё первое знакомство",
        '<p class="confirm-description">Мы добавили примеры проектов и задач, чтобы показать, как работает DevQuest. Опыт и достижения на этом экране — тоже демонстрационные.</p><p class="confirm-description">Когда будешь готов, открой настройки и нажми «Удалить все данные», чтобы начать свой путь с первого уровня.</p>' +
          button(
            "Открыть настройки",
            "navigate",
            "settings",
            'data-page="settings"',
            "button primary full-width",
          ),
      );
      break;
    case "install":
      if (window.matchMedia("(display-mode: standalone)").matches) {
        notify("DevQuest уже открыт как приложение");
        break;
      }
      if (installPrompt) {
        const prompt = installPrompt;
        installPrompt = null;
        await prompt.prompt();
        const choice = await prompt.userChoice;
        notify(
          choice.outcome === "accepted"
            ? "DevQuest добавляется на главный экран"
            : "Установить приложение можно позже",
        );
      } else
        openSheet(
          "DevQuest на главном экране",
          '<div class="install-illustration">' +
            icon("app") +
            '</div><ol class="install-steps"><li>Открой этот сайт в <b>Chrome на Android</b>.</li><li>Нажми <b>⋮</b> в меню браузера.</li><li>Выбери <b>«Добавить на главный экран» → «Установить»</b>.</li></ol><p class="form-hint">Нужно HTTPS-подключение. После первой полной загрузки приложение доступно без сети. Название пункта может отличаться в разных версиях Chrome.</p>',
        );
      break;
  }
});
document.addEventListener("submit", (event) => {
  const form = event.target;
  if (
    !["project-form", "task-form", "profile-form", "prompt-form"].includes(
      form.id,
    )
  )
    return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(form));
  for (const input of form.querySelectorAll("[required]")) {
    if (!input.value.trim()) {
      input.setCustomValidity("Заполни поле: одних пробелов недостаточно.");
      input.reportValidity();
      return;
    }
  }
  if (form.id === "project-form") {
    const id = form.dataset.id;
    if (
      commit(
        (draft) => {
          const fields = {
            name: values.name.trim(),
            description: values.description.trim(),
            category: values.category,
            status: values.status,
            color: values.color,
          };
          if (id)
            Object.assign(
              draft.projects.find((p) => p.id === id),
              fields,
            );
          else
            draft.projects.push({
              ...fields,
              id: uid(),
              createdAt: new Date().toISOString(),
            });
        },
        id ? "Проект обновлён" : "Новая идея получила свой дом ✦",
      )
    )
      closeSheet();
  } else if (form.id === "task-form") {
    let earned = 0;
    const oldLevel = levelInfo(data).level;
    if (
      commit((draft) => {
        const id = form.dataset.id || uid();
        const fields = {
          title: values.title.trim(),
          description: values.description.trim(),
          projectId: values.projectId || null,
          priority: values.priority,
          due: values.due,
          status: "todo",
        };
        if (form.dataset.id)
          Object.assign(
            draft.tasks.find((t) => t.id === id),
            fields,
          );
        else
          draft.tasks.push({
            ...fields,
            id,
            createdAt: new Date().toISOString(),
          });
        earned = setTaskStatus(draft, id, values.status);
      })
    ) {
      closeSheet();
      notify(
        earned
          ? `+${earned} XP! ${levelInfo(data).level > oldLevel ? "Новый уровень открыт ✦" : "Квест завершён ✦"}`
          : "Задача сохранена",
      );
    }
  } else if (form.id === "profile-form") {
    commit((draft) => {
      draft.profile = {
        name: values.name.trim(),
        dailyGoal: Number(values.dailyGoal),
      };
    }, "Профиль сохранён");
  } else if (form.id === "prompt-form") {
    const prompt = PROMPTS.find((p) => p.id === form.dataset.id);
    document.querySelector("#generated-prompt").value = prompt.template(
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, value.trim()]),
      ),
    );
    document.querySelector("#prompt-result").hidden = false;
    document
      .querySelector("#prompt-result")
      .scrollIntoView({ behavior: "smooth", block: "start" });
  }
});
document.addEventListener("input", (event) => {
  if (event.target.setCustomValidity) event.target.setCustomValidity("");
  if (event.target.id === "task-search") {
    const position = event.target.selectionStart;
    taskSearch = event.target.value;
    render();
    const input = document.querySelector("#task-search");
    input.focus();
    try {
      input.setSelectionRange(position, position);
    } catch {
      /* Search inputs vary across browsers. */
    }
  }
});
document.addEventListener("change", (event) => {
  if (event.target.id === "task-project-filter") {
    taskProject = event.target.value;
    render();
  }
  if (event.target.id === "task-priority-filter") {
    taskPriority = event.target.value;
    render();
  }
  if (event.target.id === "import-file") {
    importFile(event.target.files[0]);
    event.target.value = "";
  }
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener("appinstalled", () => {
  installPrompt = null;
  notify("DevQuest установлен!");
  if (page === "settings") render();
});
window.addEventListener("online", render);
window.addEventListener("offline", render);
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  const result = loadData(storage);
  data = result.data;
  storageError = result.error;
  corrupt = result.corrupt;
  if (sheet.open) closeSheet();
  render();
  notify("Данные обновлены в другой вкладке");
});
let currentDay = dayKey();
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && currentDay !== dayKey()) {
    currentDay = dayKey();
    render();
  }
});
render();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("./sw.js", { scope: "./" })
    .then(async () => {
      await navigator.serviceWorker.ready;
      swReady = true;
      if (page === "settings") render();
    })
    .catch(() => {
      if (page === "settings")
        notify(
          "Автономный режим пока недоступен. Открой приложение по HTTPS и обнови страницу.",
          "error",
        );
    });
}
