import { MANUALS } from "./manuals.js";

const ALL_CATEGORY = "Все";

const state = {
  query: "",
  category: ALL_CATEGORY,
  activeId: location.hash.replace(/^#\/?/, "") || MANUALS[0].id,
  theme: localStorage.getItem("beverly-webapp-theme") || "dark",
  timeframe: localStorage.getItem("beverly-webapp-timeframe") || "all",
  navOpen: false,
};

const ui = {
  body: document.body,
  navPanel: document.getElementById("nav-panel"),
  scrim: document.getElementById("scrim"),
  profileHub: document.getElementById("profile-hub"),
  articleShell: document.getElementById("article-shell"),
  tocPanel: document.querySelector(".toc-panel"),
  profileAvatar: document.getElementById("profile-avatar"),
  profileUsername: document.getElementById("profile-username"),
  summaryDomains: document.getElementById("summary-domains"),
  summaryUsers: document.getElementById("summary-users"),
  summaryDeposits: document.getElementById("summary-deposits"),
  statBalance: document.getElementById("stat-balance"),
  statProfit: document.getElementById("stat-profit"),
  statDomains: document.getElementById("stat-domains"),
  chartGrid: document.getElementById("chart-grid"),
  chartBalanceLine: document.getElementById("chart-balance-line"),
  chartProfitLine: document.getElementById("chart-profit-line"),
  chartMonths: document.getElementById("chart-months"),
  categoryChips: document.getElementById("category-chips"),
  manualList: document.getElementById("manual-list"),
  articleHeader: document.getElementById("article-header"),
  articleBody: document.getElementById("article-body"),
  articleFooter: document.getElementById("article-footer"),
  tocList: document.getElementById("toc-list"),
  quickCard: document.getElementById("quick-card"),
  progressBar: document.getElementById("article-progress-bar"),
  searchInput: document.getElementById("search-input"),
  themeToggle: document.getElementById("theme-toggle"),
  timeframeSelect: document.getElementById("chart-timeframe-select"),
  timeframeTrigger: document.getElementById("chart-timeframe-trigger"),
  timeframeMenu: document.getElementById("chart-timeframe-menu"),
  timeframeValue: document.getElementById("chart-timeframe-value"),
  navToggle: document.getElementById("nav-toggle"),
  navClose: document.getElementById("nav-close"),
  bottomDock: document.querySelector(".bottom-dock"),
};

const categories = [ALL_CATEGORY, ...new Set(MANUALS.map((item) => item.category))];
const DOMAIN_PAGE_ID = "domains";
const PROMO_PAGE_ID = "promo";
const DOMAIN_RE = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;
const MANUALS_URL = "https://beverly-hills-2.gitbook.io/manual/";
const TIMEFRAME_LABELS = {
  all: "Всё время",
  month: "Месяц",
  day: "День",
};

function getTelegramUser() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user || {};
}

function getStoredProfile() {
  try {
    return JSON.parse(localStorage.getItem("beverly-webapp-profile") || "{}");
  } catch {
    return {};
  }
}

function getQueryProfile() {
  const params = new URLSearchParams(window.location.search);
  const profile = {};

  if (params.has("s")) profile.stats = decodeCompactJson(params.get("s"));
  if (params.has("u")) profile.tgUsername = params.get("u");
  if (params.has("n")) profile.displayName = params.get("n");
  if (params.has("b")) profile.balance = params.get("b");
  if (params.has("p")) profile.profit = params.get("p");
  if (params.has("d")) profile.domains = params.get("d");
  if (params.has("r")) profile.usersCount = params.get("r");
  if (params.has("m")) profile.deposits = params.get("m");
  if (params.has("mc")) profile.depositCount = params.get("mc");

  if (params.has("user_id")) profile.userId = params.get("user_id");
  if (params.has("tg_username")) profile.tgUsername = params.get("tg_username");
  if (params.has("display_name")) profile.displayName = params.get("display_name");
  if (params.has("system_username")) profile.systemUsername = params.get("system_username");
  if (params.has("nickname")) profile.nickname = params.get("nickname");
  if (params.has("balance")) profile.balance = params.get("balance");
  if (params.has("profit")) profile.profit = params.get("profit");
  if (params.has("domains")) profile.domains = params.get("domains");
  if (params.has("users")) profile.usersCount = params.get("users");
  if (params.has("registrations")) profile.usersCount = params.get("registrations");
  if (params.has("deposits")) profile.deposits = params.get("deposits");
  if (params.has("deposit_count")) profile.depositCount = params.get("deposit_count");
  if (params.has("active")) profile.activeCount = params.get("active");

  return profile;
}

function decodeCompactJson(value) {
  if (!value) return null;
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function resolveDomainCount(value) {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.includes(",")) {
    return value.split(",").map((item) => item.trim()).filter(Boolean).length;
  }
  return toNumber(value);
}

function formatMoney(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function parseSeries(value, fallbackValue = 0) {
  if (Array.isArray(value)) {
    return value.map((item) => toNumber(item)).slice(0, 6);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => toNumber(item)).slice(0, 6);
      }
    } catch {}

    if (value.includes(",")) {
      return value.split(",").map((item) => toNumber(item.trim())).slice(0, 6);
    }
  }

  return [0, 0, 0, 0, 0, toNumber(fallbackValue)];
}

function getDefaultLabels(type) {
  const now = new Date();
  if (type === "day") {
    return Array.from({ length: 6 }, (_, index) => {
      const point = new Date(now.getTime() - ((5 - index) * 4 * 60 * 60 * 1000));
      return point.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    });
  }

  if (type === "month") {
    return Array.from({ length: 6 }, (_, index) => {
      const point = new Date(now.getTime() - ((5 - index) * 5 * 24 * 60 * 60 * 1000));
      return point.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" });
    });
  }

  return Array.from({ length: 6 }, (_, index) => {
    const point = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    return point.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
  });
}

function normalizeChartEntry(entry, fallbackBalance, fallbackProfit, fallbackLabels) {
  return {
    labels: Array.isArray(entry?.l) && entry.l.length ? entry.l.slice(0, 6) : fallbackLabels,
    balance: parseSeries(entry?.b, fallbackBalance),
    profit: parseSeries(entry?.p, fallbackProfit),
  };
}

function normalizeChartData(rawStats, fallbackBalance, fallbackProfit) {
  return {
    all: normalizeChartEntry(rawStats?.a || rawStats?.all, fallbackBalance, fallbackProfit, getDefaultLabels("all")),
    month: normalizeChartEntry(rawStats?.m || rawStats?.month, fallbackBalance, fallbackProfit, getDefaultLabels("month")),
    day: normalizeChartEntry(rawStats?.d || rawStats?.day, fallbackBalance, fallbackProfit, getDefaultLabels("day")),
  };
}

function resolveProfileData() {
  const telegramUser = getTelegramUser();
  const injectedProfile = window.BEVERLY_PROFILE || {};
  const storedProfile = getStoredProfile();
  const queryProfile = getQueryProfile();
  const profile = { ...storedProfile, ...queryProfile, ...injectedProfile };

  if (Object.keys(queryProfile).length || Object.keys(injectedProfile).length) {
    localStorage.setItem("beverly-webapp-profile", JSON.stringify(profile));
  }

  const displayName = [
    telegramUser.first_name,
    telegramUser.last_name,
  ].filter(Boolean).join(" ") || profile.displayName || telegramUser.username || profile.nickname || "Beverly User";

  const username = telegramUser.username ? `@${telegramUser.username}` : "Без username";

  return {
    displayName,
    username,
    photoUrl: telegramUser.photo_url || profile.photoUrl || "",
    balance: toNumber(profile.balance),
    profit: toNumber(profile.profit ?? profile.allTimeBalance),
    domains: resolveDomainCount(profile.domains ?? profile.domainCount),
    usersCount: toNumber(profile.usersCount ?? profile.registrations ?? profile.users ?? profile.referrals),
    deposits: toNumber(profile.deposits ?? profile.depositAmount ?? profile.depositsAmount),
    activeCount: toNumber(profile.activeCount ?? profile.onlineCount ?? profile.domains ?? profile.domainCount),
    chartData: normalizeChartData(
      profile.stats ?? profile.chartData,
      toNumber(profile.balance),
      toNumber(profile.profit ?? profile.allTimeBalance),
    ),
  };
}

function getBotUsername() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get("bot") ||
    window.BEVERLY_BOT_USERNAME ||
    "BeverlyWorkBot"
  ).replace(/^@+/, "");
}

function resolveWebappProfileData() {
  const telegramUser = getTelegramUser();
  const injectedProfile = window.BEVERLY_PROFILE || {};
  const storedProfile = getStoredProfile();
  const queryProfile = getQueryProfile();
  const profile = { ...storedProfile, ...queryProfile, ...injectedProfile };

  if (Object.keys(queryProfile).length || Object.keys(injectedProfile).length) {
    localStorage.setItem("beverly-webapp-profile", JSON.stringify(profile));
  }

  const displayName = [
    telegramUser.first_name,
    telegramUser.last_name,
  ].filter(Boolean).join(" ") || profile.displayName || profile.systemUsername || telegramUser.username || profile.tgUsername || profile.nickname || "Beverly User";

  const usernameValue = telegramUser.username || profile.tgUsername || profile.systemUsername || "";
  const balanceValue = toNumber(profile.balance);
  const profitValue = toNumber(profile.profit ?? profile.allTimeBalance);
  const username = usernameValue ? (usernameValue.startsWith("@") ? usernameValue : `@${usernameValue}`) : "Без username";

  return {
    displayName,
    username,
    photoUrl: telegramUser.photo_url || profile.photoUrl || "",
    balance: balanceValue,
    profit: profitValue,
    domains: resolveDomainCount(profile.domains ?? profile.domainCount),
    usersCount: toNumber(profile.usersCount ?? profile.registrations ?? profile.users ?? profile.referrals),
    deposits: toNumber(profile.deposits ?? profile.depositAmount ?? profile.depositsAmount),
    depositCount: toNumber(profile.depositCount),
    activeCount: toNumber(profile.activeCount ?? profile.onlineCount ?? profile.domains ?? profile.domainCount),
    chartData: normalizeChartData(profile.stats ?? profile.chartData, balanceValue, profitValue),
  };
}

function normalizeDomainInput(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .split("/")[0]
    .split("?")[0]
    .split("#")[0]
    .replace(/\.+$/, "");
}

function normalizePromoName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function normalizePromoAmount(value) {
  const cleaned = String(value || "").replace(",", ".").trim();
  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric) || numeric <= 0) return "";
  return String(Math.floor(numeric));
}

function isValidDomain(value) {
  return DOMAIN_RE.test(value);
}

function setDomainFormStatus(text, tone = "neutral") {
  const node = ui.articleBody.querySelector("[data-domain-status]");
  if (!node) return;
  node.textContent = text || "";
  node.dataset.tone = tone;
  node.hidden = !text;
}

function setPromoFormStatus(text, tone = "neutral") {
  const node = ui.articleBody.querySelector("[data-promo-status]");
  if (!node) return;
  node.textContent = text || "";
  node.dataset.tone = tone;
  node.hidden = !text;
}

function openBotDomainFlow(domain) {
  const tg = window.Telegram?.WebApp;

  setDomainFormStatus("Открываем бота и передаём домен...", "success");

  if (tg?.sendData) {
    tg.sendData(JSON.stringify({
      action: "add_domain",
      domain,
      web_version: "green",
    }));
    window.setTimeout(() => {
      try {
        tg.close();
      } catch {}
    }, 120);
    return;
  }

  setDomainFormStatus("Откройте mini app через кнопку Панель в боте.", "error");
}

function openManualsLink() {
  const tg = window.Telegram?.WebApp;

  if (tg?.openLink) {
    try {
      tg.openLink(MANUALS_URL);
      return;
    } catch {}
  }

  const popup = window.open(MANUALS_URL, "_blank", "noopener,noreferrer");
  if (popup) return;
  window.location.assign(MANUALS_URL);
}

function openTimeframeMenu() {
  if (!ui.timeframeSelect || !ui.timeframeMenu || !ui.timeframeTrigger) return;
  ui.timeframeSelect.classList.add("is-open");
  ui.timeframeMenu.hidden = false;
  ui.timeframeTrigger.setAttribute("aria-expanded", "true");
}

function closeTimeframeMenu() {
  if (!ui.timeframeSelect || !ui.timeframeMenu || !ui.timeframeTrigger) return;
  ui.timeframeSelect.classList.remove("is-open");
  ui.timeframeMenu.hidden = true;
  ui.timeframeTrigger.setAttribute("aria-expanded", "false");
}

function toggleTimeframeMenu() {
  if (ui.timeframeSelect?.classList.contains("is-open")) {
    closeTimeframeMenu();
  } else {
    openTimeframeMenu();
  }
}

function buildPolylinePoints(values, maxValue = null) {
  const width = 320;
  const top = 20;
  const bottom = 160;
  const left = 0;
  const right = width;
  const chartValues = values.length === 1 ? [values[0], values[0]] : values;
  const resolvedMaxValue = Math.max(1, ...(maxValue ? [maxValue] : chartValues));

  return chartValues.map((value, index) => {
    const x = left + (right - left) * (index / Math.max(1, chartValues.length - 1));
    const y = bottom - ((value / resolvedMaxValue) * (bottom - top));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function buildChartFallbackSeries(totalValue) {
  const safeTotal = Math.max(0, toNumber(totalValue));
  return [0, 0, 0, 0, 0, safeTotal];
}

function formatAxisValue(value) {
  if (value <= 0) return "$0";
  if (value >= 100) return `$${Math.round(value)}`;
  if (value >= 10) return `$${value.toFixed(0)}`;
  return `$${value.toFixed(2).replace(/\.00$/, "")}`;
}

function renderChart(profile) {
  const hasExplicitTimeframe = Boolean(profile.chartData?.[state.timeframe]);
  const timeframeKey = hasExplicitTimeframe ? state.timeframe : "all";
  const timeframe = profile.chartData?.[timeframeKey] || normalizeChartData(null, profile.balance, profile.profit).all;
  const resolvedBalance = Array.isArray(timeframe.balance) ? [...timeframe.balance] : buildChartFallbackSeries(profile.balance);
  const resolvedProfit = Array.isArray(timeframe.profit) ? [...timeframe.profit] : buildChartFallbackSeries(profile.deposits || profile.profit);
  const hasAnyChartValue = [...resolvedBalance, ...resolvedProfit].some((value) => toNumber(value) > 0);
  const axisMax = hasAnyChartValue ? Math.max(...resolvedBalance, ...resolvedProfit) : 0;
  const plotMax = axisMax > 0 ? Math.max(1, axisMax * 1.18) : 1;

  if (ui.timeframeValue) {
    ui.timeframeValue.textContent = TIMEFRAME_LABELS[timeframeKey] || TIMEFRAME_LABELS.all;
  }

  if (ui.timeframeMenu) {
    ui.timeframeMenu.querySelectorAll("[data-timeframe]").forEach((button) => {
      const isActive = button.dataset.timeframe === timeframeKey;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", isActive ? "true" : "false");
    });
  }

  if (ui.chartGrid) {
    const axisLabels = axisMax > 0
      ? [formatAxisValue(plotMax), formatAxisValue(plotMax / 2), "$0"]
      : ["$0", "$0", "$0"];
    ui.chartGrid.innerHTML = axisLabels.map((value) => `<span>${value}</span>`).join("");
  }

  if (ui.chartMonths) {
    ui.chartMonths.style.gridTemplateColumns = `repeat(${Math.max(1, timeframe.labels.length)}, minmax(0, 1fr))`;
    ui.chartMonths.innerHTML = timeframe.labels.map((label) => `<span>${label}</span>`).join("");
  }

  ui.chartBalanceLine.setAttribute("points", buildPolylinePoints(resolvedBalance, plotMax));
  ui.chartProfitLine.setAttribute("points", buildPolylinePoints(resolvedProfit, plotMax));
}

function updateHomeVisibility() {
  const isHome = state.activeId === "welcome";
  ui.profileHub.hidden = !isHome;
  ui.profileHub.setAttribute("aria-hidden", isHome ? "false" : "true");
  ui.profileHub.style.display = isHome ? "" : "none";
  ui.profileHub.style.height = isHome ? "" : "0";
  ui.profileHub.style.minHeight = isHome ? "" : "0";
  ui.profileHub.style.margin = isHome ? "" : "0";
  ui.profileHub.style.padding = isHome ? "" : "0";
  ui.profileHub.style.border = isHome ? "" : "0";
  ui.profileHub.style.overflow = isHome ? "" : "hidden";
  ui.body.classList.toggle("home-mode", isHome);
  ui.articleShell.hidden = isHome;
  ui.articleShell.setAttribute("aria-hidden", isHome ? "true" : "false");
  ui.articleShell.style.display = isHome ? "none" : "";
  ui.articleShell.style.height = isHome ? "0" : "";
  ui.articleShell.style.minHeight = isHome ? "0" : "";
  ui.articleShell.style.margin = isHome ? "0" : "";
  ui.articleShell.style.padding = isHome ? "0" : "";
  ui.articleShell.style.border = isHome ? "0" : "";
  ui.articleShell.style.overflow = isHome ? "hidden" : "";
  if (ui.tocPanel) {
    ui.tocPanel.hidden = isHome;
    ui.tocPanel.setAttribute("aria-hidden", isHome ? "true" : "false");
    ui.tocPanel.style.display = isHome ? "none" : "";
    ui.tocPanel.style.height = isHome ? "0" : "";
    ui.tocPanel.style.minHeight = isHome ? "0" : "";
    ui.tocPanel.style.margin = isHome ? "0" : "";
    ui.tocPanel.style.padding = isHome ? "0" : "";
    ui.tocPanel.style.border = isHome ? "0" : "";
    ui.tocPanel.style.overflow = isHome ? "hidden" : "";
  }
}

function renderProfileSummary() {
  const profile = resolveWebappProfileData();
  const initials = (profile.username || "BU")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.replace("@", "")[0]?.toUpperCase() || "")
    .join("") || "BU";

  if (profile.photoUrl) {
    const image = document.createElement("img");
    image.src = profile.photoUrl;
    image.alt = "";
    ui.profileAvatar.replaceChildren(image);
  } else {
    ui.profileAvatar.textContent = initials;
  }

  ui.profileUsername.textContent = profile.username;
  ui.summaryDomains.textContent = String(profile.domains);
  ui.summaryUsers.textContent = String(profile.usersCount);
  ui.summaryDeposits.textContent = formatMoney(profile.deposits).replace(".00", "");
  ui.statBalance.textContent = formatMoney(profile.balance);
  ui.statProfit.textContent = formatMoney(profile.profit);
  ui.statDomains.textContent = String(profile.domains);
  renderChart(profile);
}

function applyTheme() {
  ui.body.classList.toggle("theme-light", state.theme === "light");
  ui.themeToggle.innerHTML = `
    <span class="dock-button__icon material-symbols-rounded">${state.theme === "dark" ? "light_mode" : "dark_mode"}</span>
    <span class="dock-button__label">${state.theme === "dark" ? "Свет" : "Тьма"}</span>
  `;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", state.theme === "dark" ? "#050608" : "#f3f5fb");
}

function initTelegram() {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;
  tg.ready();
  tg.expand();
  try {
    tg.setHeaderColor(state.theme === "dark" ? "#050608" : "#f3f5fb");
    tg.setBackgroundColor(state.theme === "dark" ? "#050608" : "#f3f5fb");
  } catch {}
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  localStorage.setItem("beverly-webapp-theme", state.theme);
  applyTheme();
  initTelegram();
  updateDockState();
}

function filteredManuals() {
  const query = state.query.trim().toLowerCase();
  return MANUALS.filter((manual) => {
    const categoryOk = state.category === ALL_CATEGORY || manual.category === state.category;
    if (!categoryOk) return false;
    if (!query) return true;
    const haystack = [
      manual.title,
      manual.lead,
      manual.summary,
      manual.category,
      ...manual.sections.flatMap((section) => [
        section.title,
        ...section.body.flatMap((block) => block.text ? [block.text] : block.items || block.code ? [block.code || "", ...(block.items || [])] : []),
      ]),
    ].join(" ").toLowerCase();
    return haystack.includes(query);
  });
}

function ensureActiveManual() {
  const visible = filteredManuals();
  if (!visible.some((item) => item.id === state.activeId)) {
    state.activeId = visible[0]?.id || MANUALS[0].id;
  }
}

function openNav() {
  state.navOpen = true;
  ui.body.classList.add("nav-open");
  ui.navPanel.classList.add("is-open");
  ui.navPanel.setAttribute("aria-hidden", "false");
  ui.navToggle.setAttribute("aria-expanded", "true");
  ui.scrim.hidden = false;
  requestAnimationFrame(() => ui.scrim.classList.add("is-visible"));
  updateDockState();
}

function closeNav() {
  state.navOpen = false;
  ui.body.classList.remove("nav-open");
  ui.navPanel.classList.remove("is-open");
  ui.navPanel.setAttribute("aria-hidden", "true");
  ui.navToggle.setAttribute("aria-expanded", "false");
  ui.scrim.classList.remove("is-visible");
  setTimeout(() => {
    if (!ui.navPanel.classList.contains("is-open")) ui.scrim.hidden = true;
  }, 280);
  updateDockState();
}

function toggleNav() {
  if (state.navOpen) {
    closeNav();
  } else {
    openNav();
  }
}

function renderChips() {
  ui.categoryChips.innerHTML = categories.map((category) => `
    <button class="chip ${category === state.category ? "is-active" : ""}" data-category="${category}">
      ${category}
    </button>
  `).join("");
}

function renderManualList() {
  const manuals = filteredManuals();

  if (!manuals.length) {
    ui.manualList.innerHTML = `
      <div class="manual-tile is-active">
        <h3 class="manual-tile__title">Ничего не найдено</h3>
        <p class="manual-tile__excerpt">Попробуйте другой запрос или переключите раздел.</p>
      </div>
    `;
    return;
  }

  ui.manualList.innerHTML = manuals.map((manual) => `
    <button class="manual-tile ${manual.id === state.activeId ? "is-active" : ""}" data-manual-id="${manual.id}">
      <div class="manual-tile__meta">
        <div class="manual-tile__icon">
          <span class="material-symbols-rounded">${manual.icon}</span>
        </div>
        <span class="manual-tile__eyebrow">${manual.category}</span>
      </div>
      <h3 class="manual-tile__title">${manual.title}</h3>
      <p class="manual-tile__excerpt">${manual.summary}</p>
    </button>
  `).join("");
}

function updateDockState() {
  const dockButtons = [...document.querySelectorAll(".dock-button")];
  dockButtons.forEach((button) => button.classList.remove("is-active"));

  if (state.navOpen) {
    ui.navToggle.classList.add("is-active");
    return;
  }

  const activeManualButton = document.querySelector(`[data-dock-manual="${state.activeId}"]`);
  if (activeManualButton) {
    activeManualButton.classList.add("is-active");
  }
}

function renderEmptyArticle() {
  ui.articleHeader.innerHTML = `
    <div class="article-badge-row">
      <div class="article-badge">
        <span class="material-symbols-rounded">search_off</span>
        <span>Пустой результат</span>
      </div>
    </div>
    <h2 class="article-title">Ничего не подошло под текущий фильтр</h2>
    <p class="article-lead">Сбросьте поиск, смените категорию или откройте соседний раздел из навигации слева.</p>
  `;

  ui.articleBody.innerHTML = `
    <section class="section-block">
      <h2>Что можно сделать</h2>
      <div class="check-list">
        <div class="check-item">
          <div class="check-icon"><span class="material-symbols-rounded">restart_alt</span></div>
          <div>Очистить строку поиска и посмотреть весь список материалов.</div>
        </div>
        <div class="check-item">
          <div class="check-icon"><span class="material-symbols-rounded">tune</span></div>
          <div>Сменить категорию, если фильтр получился слишком узким.</div>
        </div>
        <div class="check-item">
          <div class="check-icon"><span class="material-symbols-rounded">menu_book</span></div>
          <div>Добавить новый manual в <code>manuals.js</code>, если темы действительно ещё нет.</div>
        </div>
      </div>
    </section>
  `;

  ui.tocList.innerHTML = "";
  ui.quickCard.innerHTML = "<h4>Подсказка</h4><p>База знаний уже отделена от интерфейса, поэтому новые статьи можно добавлять без переписывания shell.</p>";
  ui.articleFooter.innerHTML = "";
}

function renderBlock(block) {
  if (block.type === "paragraph") return `<p>${block.text}</p>`;
  if (block.type === "list") return `<ul>${block.items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
  if (block.type === "steps") {
    return `<div class="step-list">${block.items.map((item, index) => `
      <div class="step-item">
        <div class="step-index">${index + 1}</div>
        <div>${item}</div>
      </div>`).join("")}</div>`;
  }
  if (block.type === "checklist") {
    return `<div class="check-list">${block.items.map((item) => `
      <div class="check-item">
        <div class="check-icon"><span class="material-symbols-rounded">done</span></div>
        <div>${item}</div>
      </div>`).join("")}</div>`;
  }
  if (block.type === "callout") {
    return `<div class="callout ${block.tone || "info"}">
      <span class="material-symbols-rounded">${block.icon || "info"}</span>
      <div>${block.text}</div>
    </div>`;
  }
  if (block.type === "quote") return `<blockquote class="quote-card">${block.text}</blockquote>`;
  if (block.type === "code") {
    return `<div class="code-card">
      <div class="code-card__header">
        <span>${block.label || "Snippet"}</span>
        <span class="material-symbols-rounded">code</span>
      </div>
      <pre><code>${block.code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>
    </div>`;
  }
  return "";
}

function renderDomainsPage(manual) {
  ui.articleHeader.innerHTML = `
    <h2 class="article-title">Домены</h2>
    <p class="article-lead">Введите домен и нажмите <b>Добавить</b>. Mini app закроется, а бот в обычном чате отправит NS-записи для этого домена.</p>
  `;

  ui.articleBody.innerHTML = `
    <section class="domain-webapp-card">
      <div class="domain-webapp-card__head">
        <div class="domain-webapp-card__icon">
          <span class="material-symbols-rounded">language</span>
        </div>
        <div>
          <h3>Добавить домен</h3>
          <p>Поддерживается формат вроде <code>example.com</code></p>
        </div>
      </div>

      <label class="domain-webapp-field">
        <span>Домен</span>
        <input
          id="domain-input"
          type="text"
          inputmode="url"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="Введите домен, который хотите добавить"
        >
      </label>

      <button class="domain-webapp-submit" type="button" data-domain-submit>
        <span>Добавить</span>
      </button>

      <div class="domain-webapp-note">
        <h3>Важно</h3>
        <p>После добавления домена вы получите NS серверы, которые необходимо указать у вашего провайдера вместо старых. После успешной установки NS серверов вам будет необходимо нажать кнопку "Проверить" на нужном домене в таблице. Проверка доступна раз в 3 минуты и необходима для полного функционирования домена.</p>
      </div>

      <p class="domain-webapp-status" data-domain-status data-tone="neutral" hidden></p>
    </section>
  `;

  ui.tocList.innerHTML = "";
  ui.quickCard.innerHTML = "";
  ui.articleFooter.innerHTML = "";
}

function submitDomainViaWebApp(domain) {
  const tg = window.Telegram?.WebApp;

  setDomainFormStatus("Отправляем домен в бота...", "success");

  if (tg && typeof tg.sendData === "function") {
    tg.sendData(JSON.stringify({
      action: "add_domain",
      domain,
      web_version: "green",
    }));
    return;
  }

  setDomainFormStatus("Telegram WebApp data недоступна в этой среде.", "error");
}

function submitPromoViaWebApp(name, amount, shouldWager) {
  const tg = window.Telegram?.WebApp;

  setPromoFormStatus("Отправляем промокод в бота...", "success");

  if (tg && typeof tg.sendData === "function") {
    tg.sendData(JSON.stringify({
      action: "create_promo",
      name,
      amount,
      should_wager: shouldWager,
    }));
    return;
  }

  setPromoFormStatus("Telegram WebApp data недоступна в этой среде.", "error");
}

function renderDomainsPageCompact() {
  ui.articleHeader.innerHTML = "";
  ui.articleBody.innerHTML = `
    <section class="domain-webapp-card domain-webapp-card--compact">
      <div class="domain-webapp-card__head">
        <div class="domain-webapp-card__icon">
          <span class="material-symbols-rounded">language</span>
        </div>
        <div>
          <h3>Добавить домен</h3>
        </div>
      </div>

      <label class="domain-webapp-field">
        <span>Домен</span>
        <input
          id="domain-input"
          type="text"
          inputmode="url"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="Введите домен, который хотите добавить"
        >
      </label>

      <button class="domain-webapp-submit" type="button" data-domain-submit>
        <span>Добавить</span>
      </button>

      <div class="domain-webapp-note">
        <h3>Важно</h3>
        <p>После добавления бот отправит NS серверы, которые нужно указать у регистратора. Проверку домена дальше делайте уже в самом боте.</p>
      </div>

      <p class="domain-webapp-status" data-domain-status data-tone="neutral" hidden></p>
    </section>
  `;
  ui.tocList.innerHTML = "";
  ui.quickCard.innerHTML = "";
  ui.articleFooter.innerHTML = "";
}

function renderPromoPageCompact() {
  ui.articleHeader.innerHTML = "";
  ui.articleBody.innerHTML = `
    <section class="promo-webapp-card">
      <div class="domain-webapp-card__head">
        <div class="domain-webapp-card__icon">
          <span class="material-symbols-rounded">redeem</span>
        </div>
        <div>
          <h3>Создать промокод</h3>
        </div>
      </div>

      <label class="domain-webapp-field">
        <span>Название промокода</span>
        <input
          id="promo-name-input"
          type="text"
          inputmode="text"
          autocomplete="off"
          autocapitalize="off"
          spellcheck="false"
          placeholder="Введите название промокода"
        >
      </label>

      <label class="domain-webapp-field">
        <span>Сумма промокода</span>
        <input
          id="promo-amount-input"
          type="number"
          inputmode="decimal"
          min="1"
          step="1"
          placeholder="Введите сумму"
        >
      </label>

      <label class="promo-webapp-switch">
        <div class="promo-webapp-switch__copy">
          <strong>Отыгрыш включён</strong>
        </div>
        <input class="promo-webapp-toggle" id="promo-wager-input" type="checkbox" checked>
      </label>

      <button class="promo-webapp-submit" type="button" data-promo-submit disabled>
        <span>Создать промокод</span>
      </button>

      <p class="domain-webapp-status" data-promo-status data-tone="neutral" hidden></p>
    </section>
  `;
  ui.tocList.innerHTML = "";
  ui.quickCard.innerHTML = "";
  ui.articleFooter.innerHTML = "";
  updatePromoSubmitState();
}

function renderArticle(manual) {
  if (manual.id === DOMAIN_PAGE_ID) {
    renderDomainsPageCompact();
    return;
  }
  if (manual.id === PROMO_PAGE_ID) {
    renderPromoPageCompact();
    return;
  }

  ui.articleHeader.innerHTML = `
    <div class="article-badge-row">
      <div class="article-badge"><span class="material-symbols-rounded">${manual.icon}</span><span>${manual.category}</span></div>
      <div class="article-badge"><span class="material-symbols-rounded">schedule</span><span>${manual.readingTime}</span></div>
    </div>
    <h2 class="article-title">${manual.title}</h2>
    <p class="article-lead">${manual.lead}</p>
    <div class="article-meta-row">
      <div class="article-meta"><span class="material-symbols-rounded">update</span><span>Обновлено ${manual.updatedAt}</span></div>
      <div class="article-meta"><span class="material-symbols-rounded">article</span><span>${manual.sections.length} секции</span></div>
    </div>
  `;

  ui.articleBody.innerHTML = manual.sections.map((section, index) => `
    <section class="section-block" id="${section.id}" style="animation-delay:${index * 36}ms">
      <h2>${section.title}</h2>
      ${section.body.map(renderBlock).join("")}
    </section>
  `).join("");

  ui.tocList.innerHTML = manual.sections.map((section) => `
    <a class="toc-link" href="#${section.id}" data-section-link="${section.id}">
      <span class="material-symbols-rounded">chevron_right</span>
      <span>${section.title}</span>
    </a>
  `).join("");

  ui.quickCard.innerHTML = `<h4>Короткая мысль</h4><p>${manual.quickTip}</p>`;

  const idx = MANUALS.findIndex((item) => item.id === manual.id);
  const prev = MANUALS[idx - 1];
  const next = MANUALS[idx + 1];

  ui.articleFooter.innerHTML = `
    <button class="article-nav-card ${prev ? "" : "is-hidden"}" ${prev ? `data-manual-id="${prev.id}"` : ""}>
      <p class="article-nav-card__label">Предыдущий материал</p>
      <p class="article-nav-card__title">${prev?.title || ""}</p>
    </button>
    <button class="article-nav-card ${next ? "" : "is-hidden"}" ${next ? `data-manual-id="${next.id}"` : ""}>
      <p class="article-nav-card__label">Следующий материал</p>
      <p class="article-nav-card__title">${next?.title || ""}</p>
    </button>
  `;
}

function updateProgress() {
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? Math.min(100, Math.max(0, window.scrollY / maxScroll * 100)) : 0;
  ui.progressBar.style.width = `${progress}%`;
}

function updateTocHighlight() {
  const links = [...ui.tocList.querySelectorAll("[data-section-link]")];
  const sections = links.map((link) => ({
    link,
    section: document.getElementById(link.dataset.sectionLink),
  })).filter((entry) => entry.section);

  let active = sections[0];
  for (let index = sections.length - 1; index >= 0; index -= 1) {
    if (sections[index].section.getBoundingClientRect().top <= 180) {
      active = sections[index];
      break;
    }
  }

  links.forEach((link) => link.classList.remove("is-active"));
  if (active) active.link.classList.add("is-active");
}

function syncArticleToFilters() {
  const manuals = filteredManuals();
  if (!manuals.length) {
    renderManualList();
    renderEmptyArticle();
    history.replaceState(null, "", "#");
    updateProgress();
    updateDockState();
    return;
  }

  ensureActiveManual();
  setActiveManual(state.activeId, false);
}

function setActiveManual(id, pushHash = true) {
  const manual = MANUALS.find((item) => item.id === id) || MANUALS[0];
  state.activeId = manual.id;
  if (pushHash) history.replaceState(null, "", `#${manual.id}`);

  const render = () => {
    updateHomeVisibility();
    renderManualList();
    renderArticle(manual);
    updateHomeVisibility();
    window.scrollTo(0, 0);
    updateProgress();
    updateTocHighlight();
    updateDockState();
  };

  if (document.startViewTransition) {
    document.startViewTransition(render);
  } else {
    render();
  }
}

function bindEvents() {
  ui.categoryChips.addEventListener("click", (event) => {
    const target = event.target.closest("[data-category]");
    if (!target) return;
    state.category = target.dataset.category;
    renderChips();
    syncArticleToFilters();
  });

  ui.manualList.addEventListener("click", (event) => {
    const target = event.target.closest("[data-manual-id]");
    if (!target) return;
    setActiveManual(target.dataset.manualId);
    closeNav();
  });

  ui.articleFooter.addEventListener("click", (event) => {
    const target = event.target.closest("[data-manual-id]");
    if (!target) return;
    setActiveManual(target.dataset.manualId);
  });

  ui.articleBody.addEventListener("click", (event) => {
    const submitButton = event.target.closest("[data-domain-submit]");
    if (submitButton) {
      const input = ui.articleBody.querySelector("#domain-input");
      const domain = normalizeDomainInput(input?.value);
      if (input) {
        input.value = domain;
      }

      if (!domain) {
        setDomainFormStatus("Введите домен перед отправкой.", "error");
        input?.focus();
        return;
      }

      if (!isValidDomain(domain)) {
        setDomainFormStatus("Домен должен быть в формате example.com.", "error");
        input?.focus();
        return;
      }

      submitDomainViaWebApp(domain);
      return;
    }

    const promoSubmitButton = event.target.closest("[data-promo-submit]");
    if (!promoSubmitButton) return;

    const nameInput = ui.articleBody.querySelector("#promo-name-input");
    const amountInput = ui.articleBody.querySelector("#promo-amount-input");
    const wagerInput = ui.articleBody.querySelector("#promo-wager-input");
    const promoName = normalizePromoName(nameInput?.value);
    const promoAmount = normalizePromoAmount(amountInput?.value);

    if (nameInput) {
      nameInput.value = promoName;
    }
    if (amountInput) {
      amountInput.value = promoAmount;
    }

    if (!promoName) {
      setPromoFormStatus("Введите корректное название промокода.", "error");
      nameInput?.focus();
      return;
    }

    if (!promoAmount) {
      setPromoFormStatus("Введите корректную сумму промокода.", "error");
      amountInput?.focus();
      return;
    }

    submitPromoViaWebApp(promoName, promoAmount, Boolean(wagerInput?.checked));
  });

  ui.articleBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const input = event.target.closest("#domain-input");
    if (input) {
      event.preventDefault();
      ui.articleBody.querySelector("[data-domain-submit]")?.click();
      return;
    }

    const promoInput = event.target.closest("#promo-name-input, #promo-amount-input");
    if (!promoInput) return;
    event.preventDefault();
    ui.articleBody.querySelector("[data-promo-submit]")?.click();
  });

  ui.articleBody.addEventListener("input", (event) => {
    const promoNameInput = event.target.closest("#promo-name-input");
    if (promoNameInput) {
      promoNameInput.value = normalizePromoName(promoNameInput.value);
      updatePromoSubmitState();
      return;
    }

    const promoAmountInput = event.target.closest("#promo-amount-input");
    if (!promoAmountInput) return;
    promoAmountInput.value = promoAmountInput.value.replace(/[^\d.,]/g, "");
    updatePromoSubmitState();
  });

  ui.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    syncArticleToFilters();
  });

  ui.timeframeTrigger?.addEventListener("click", () => {
    toggleTimeframeMenu();
  });

  ui.timeframeMenu?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-timeframe]");
    if (!button) return;
    state.timeframe = button.dataset.timeframe;
    localStorage.setItem("beverly-webapp-timeframe", state.timeframe);
    closeTimeframeMenu();
    renderProfileSummary();
  });

  ui.navToggle?.addEventListener("click", (event) => {
    if (event.currentTarget?.dataset?.dockAction === "manuals-link") {
      event.preventDefault();
      event.stopPropagation();
      openManualsLink();
      return;
    }
    toggleNav();
  });

  ui.navClose.addEventListener("click", closeNav);
  ui.scrim.addEventListener("click", closeNav);

  ui.bottomDock.addEventListener("click", (event) => {
    const manualButton = event.target.closest("[data-dock-manual]");
    if (manualButton) {
      state.category = ALL_CATEGORY;
      renderChips();
      setActiveManual(manualButton.dataset.dockManual);
      closeNav();
      return;
    }

    const actionButton = event.target.closest("[data-dock-action]");
    if (!actionButton) return;

    if (actionButton.dataset.dockAction === "manuals-link") {
      openManualsLink();
      return;
    }

    if (actionButton.dataset.dockAction === "theme") {
      toggleTheme();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && ui.timeframeSelect?.classList.contains("is-open")) {
      closeTimeframeMenu();
    }
    if (event.key === "Escape" && state.navOpen) {
      closeNav();
    }
  });

  document.addEventListener("click", (event) => {
    if (!ui.timeframeSelect?.classList.contains("is-open")) return;
    if (event.target.closest("#chart-timeframe-select")) return;
    closeTimeframeMenu();
  });

  window.addEventListener("hashchange", () => {
    const target = location.hash.replace(/^#\/?/, "");
    if (target) setActiveManual(target, false);
  });

  window.addEventListener("scroll", () => {
    updateProgress();
    updateTocHighlight();
  }, { passive: true });
}

function boot() {
  applyTheme();
  initTelegram();
  closeTimeframeMenu();
  renderProfileSummary();
  ui.searchInput.value = state.query;
  renderChips();
  syncArticleToFilters();
  bindEvents();
  updateHomeVisibility();
  updateDockState();
}

boot();





