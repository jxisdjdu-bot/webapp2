import { MANUALS } from "./manuals.js";

const ALL_CATEGORY = "Все";

const state = {
  query: "",
  category: ALL_CATEGORY,
  activeId: location.hash.replace(/^#\/?/, "") || MANUALS[0].id,
  theme: localStorage.getItem("beverly-webapp-theme") || "dark",
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
  chartBalanceLine: document.getElementById("chart-balance-line"),
  chartProfitLine: document.getElementById("chart-profit-line"),
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
  navToggle: document.getElementById("nav-toggle"),
  navClose: document.getElementById("nav-close"),
  bottomDock: document.querySelector(".bottom-dock"),
};

const categories = [ALL_CATEGORY, ...new Set(MANUALS.map((item) => item.category))];
const DOMAIN_PAGE_ID = "domains";
const DOMAIN_RE = /^(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/i;

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

  if (params.has("nickname")) profile.nickname = params.get("nickname");
  if (params.has("balance")) profile.balance = params.get("balance");
  if (params.has("profit")) profile.profit = params.get("profit");
  if (params.has("domains")) profile.domains = params.get("domains");
  if (params.has("users")) profile.usersCount = params.get("users");
  if (params.has("deposits")) profile.deposits = params.get("deposits");
  if (params.has("active")) profile.activeCount = params.get("active");

  return profile;
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
    usersCount: toNumber(profile.usersCount ?? profile.users ?? profile.referrals),
    deposits: toNumber(profile.deposits ?? profile.depositAmount ?? profile.depositsAmount),
    activeCount: toNumber(profile.activeCount ?? profile.onlineCount ?? profile.domains ?? profile.domainCount),
    balanceSeries: parseSeries(profile.balanceSeries ?? profile.balanceChart, profile.balance),
    profitSeries: parseSeries(profile.profitSeries ?? profile.profitChart, profile.profit),
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

function isValidDomain(value) {
  return DOMAIN_RE.test(value);
}

function encodeStartPayload(value) {
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function setDomainFormStatus(text, tone = "neutral") {
  const node = ui.articleBody.querySelector("[data-domain-status]");
  if (!node) return;
  node.textContent = text;
  node.dataset.tone = tone;
}

function openBotDomainFlow(domain) {
  const username = getBotUsername();
  const encoded = encodeStartPayload(domain);
  const url = `https://t.me/${username}?start=adddom_${encoded}`;
  const tg = window.Telegram?.WebApp;

  setDomainFormStatus("Открываем бота и передаём домен...", "success");

  if (tg?.openTelegramLink) {
    tg.openTelegramLink(url);
    window.setTimeout(() => {
      try {
        tg.close();
      } catch {}
    }, 220);
    return;
  }

  window.location.href = url;
}

function buildPolylinePoints(values) {
  const width = 320;
  const height = 180;
  const top = 20;
  const bottom = 160;
  const left = 0;
  const right = width;
  const maxValue = Math.max(1, ...values);

  return values.map((value, index) => {
    const x = left + (right - left) * (index / Math.max(1, values.length - 1));
    const y = bottom - ((value / maxValue) * (bottom - top));
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
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
  const profile = resolveProfileData();
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
  ui.chartBalanceLine.setAttribute("points", buildPolylinePoints(profile.balanceSeries));
  ui.chartProfitLine.setAttribute("points", buildPolylinePoints(profile.profitSeries));
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

      <p class="domain-webapp-status" data-domain-status data-tone="neutral">
        После нажатия mini app закроется и бот отправит NS-записи в обычный чат.
      </p>
    </section>
  `;

  ui.tocList.innerHTML = "";
  ui.quickCard.innerHTML = "";
  ui.articleFooter.innerHTML = "";
}

function renderArticle(manual) {
  if (manual.id === DOMAIN_PAGE_ID) {
    renderDomainsPage(manual);
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
    if (!submitButton) return;

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

    openBotDomainFlow(domain);
  });

  ui.articleBody.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const input = event.target.closest("#domain-input");
    if (!input) return;
    event.preventDefault();
    ui.articleBody.querySelector("[data-domain-submit]")?.click();
  });

  ui.searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    syncArticleToFilters();
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

    if (actionButton.dataset.dockAction === "menu") {
      toggleNav();
      return;
    }

    if (actionButton.dataset.dockAction === "theme") {
      toggleTheme();
    }
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.navOpen) {
      closeNav();
    }
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
  renderProfileSummary();
  ui.searchInput.value = state.query;
  renderChips();
  syncArticleToFilters();
  bindEvents();
  updateHomeVisibility();
  updateDockState();
}

boot();
