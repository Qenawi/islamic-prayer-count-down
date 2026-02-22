const PRAYER_ORDER = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"];
const DISPLAY_CELLS = [
  { key: "Fajr", phase: "fajr" },
  { key: "Sunrise", phase: "sunrise" },
  { key: "Dhuhr", phase: "dhuhr" },
  { key: "Asr", phase: "asr" },
  { key: "Maghrib", phase: "maghrib" },
  { key: "Isha", phase: "isha" }
];

const STORAGE_LANGUAGE_KEY = "prayerCountdownLanguage";
const STORAGE_THEME_KEY = "prayerCountdownTheme";
const DEFAULT_FALLBACK_CITY = "Makkah";
const DEFAULT_FALLBACK_COUNTRY = "Saudi Arabia";
const THEMES = ["light", "dark", "dracula"];

const I18N = {
  en: {
    kicker: "Daily Salah Tracker",
    title: "Countdown To Next Prayer",
    locationLoading: "Loading your location...",
    nextPrayerLabel: "Next prayer",
    todayPrayerTimes: "Today's Prayer Times",
    fetchingTimings: "Fetching timings...",
    requestingGeolocation: "Requesting geolocation permission...",
    geolocationUnavailableFallback: (city, country) => `Geolocation unavailable. Loading ${city}, ${country}...`,
    locationBlockedFallback: (city, country) => `Location blocked. Loading ${city}, ${country}...`,
    methodLabel: "Method",
    themeLabel: "Theme",
    unavailable: "Unavailable",
    tomorrow: "Tomorrow",
    themeNames: {
      light: "Light",
      dark: "Dark",
      dracula: "Dracula"
    },
    errors: {
      coordinates: "Unable to fetch prayer times for current coordinates.",
      cityCountry: "Unable to fetch prayer times for city/country.",
      tomorrowCoordinates: "Unable to fetch tomorrow's fajr for coordinates.",
      tomorrowCity: "Unable to fetch tomorrow's fajr for city.",
      noTimings: "Prayer timings not found in API response."
    },
    prayers: {
      Fajr: "Fajar",
      Sunrise: "Sunrise",
      Dhuhr: "Zohar",
      Asr: "Aasar",
      Maghrib: "Magrib",
      Isha: "Isha"
    }
  },
  ar: {
    kicker: "متابع الصلوات اليومية",
    title: "العد التنازلي للصلاة القادمة",
    locationLoading: "جاري تحديد موقعك...",
    nextPrayerLabel: "الصلاة القادمة",
    todayPrayerTimes: "مواقيت الصلاة اليوم",
    fetchingTimings: "جاري تحميل المواقيت...",
    requestingGeolocation: "جاري طلب إذن الموقع...",
    geolocationUnavailableFallback: (city, country) => `الموقع غير متاح. جارٍ تحميل ${city}، ${country}...`,
    locationBlockedFallback: (city, country) => `تم رفض إذن الموقع. جارٍ تحميل ${city}، ${country}...`,
    methodLabel: "طريقة الحساب",
    themeLabel: "المظهر",
    unavailable: "غير متاح",
    tomorrow: "غدًا",
    themeNames: {
      light: "فاتح",
      dark: "داكن",
      dracula: "دراكولا"
    },
    errors: {
      coordinates: "تعذر تحميل مواقيت الصلاة حسب الإحداثيات الحالية.",
      cityCountry: "تعذر تحميل مواقيت الصلاة حسب المدينة/الدولة.",
      tomorrowCoordinates: "تعذر تحميل فجر الغد حسب الإحداثيات.",
      tomorrowCity: "تعذر تحميل فجر الغد حسب المدينة.",
      noTimings: "لم يتم العثور على مواقيت الصلاة في الاستجابة."
    },
    prayers: {
      Fajr: "الفجر",
      Sunrise: "الشروق",
      Dhuhr: "الظهر",
      Asr: "العصر",
      Maghrib: "المغرب",
      Isha: "العشاء"
    }
  }
};

const ui = {
  themeToggle: document.getElementById("themeToggle"),
  languageToggle: document.getElementById("languageToggle"),
  kicker: document.getElementById("kickerText"),
  title: document.getElementById("heroTitle"),
  locationLabel: document.getElementById("locationLabel"),
  nextPrayerLabel: document.getElementById("nextPrayerLabel"),
  nextPrayer: document.getElementById("nextPrayer"),
  countdown: document.getElementById("countdown"),
  meta: document.getElementById("meta"),
  timesTitle: document.getElementById("timesTitle"),
  prayerList: document.getElementById("prayerList"),
  prayerScene: document.getElementById("prayerScene")
};

const state = {
  language: "en",
  theme: "light",
  locationLabel: "",
  timings: null,
  tomorrowFajr: null,
  intervalId: null,
  lastRenderedPhase: null,
  lastRenderedLanguage: null,
  metaReadableDate: "",
  metaMethodName: ""
};

const SCENE_CLASSES = [
  "scene-fajr",
  "scene-sunrise",
  "scene-dhuhr",
  "scene-asr",
  "scene-maghrib",
  "scene-isha"
];

const PHASE_CLASSES = [
  "phase-fajr",
  "phase-sunrise",
  "phase-dhuhr",
  "phase-asr",
  "phase-maghrib",
  "phase-isha"
];

function getLangPack() {
  return I18N[state.language] || I18N.en;
}

function t(key) {
  return getLangPack()[key];
}

function tError(key) {
  return getLangPack().errors[key];
}

function getPrayerLabel(key) {
  return getLangPack().prayers[key] || key;
}

function getThemeLabel(themeKey) {
  return getLangPack().themeNames[themeKey] || themeKey;
}

function pad2(num) {
  return String(num).padStart(2, "0");
}

function formatHMS(msDiff) {
  const total = Math.max(0, Math.floor(msDiff / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function parseApiTimeToDate(timeStr, baseDate) {
  if (typeof timeStr !== "string") {
    return null;
  }
  const match = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }
  const date = new Date(baseDate);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

function formatDateForApi(date) {
  return `${pad2(date.getDate())}-${pad2(date.getMonth() + 1)}-${date.getFullYear()}`;
}

function getInitialLanguage() {
  const saved = localStorage.getItem(STORAGE_LANGUAGE_KEY);
  if (saved === "en" || saved === "ar") {
    return saved;
  }
  return navigator.language.toLowerCase().startsWith("ar") ? "ar" : "en";
}

function getInitialTheme() {
  const saved = localStorage.getItem(STORAGE_THEME_KEY);
  if (THEMES.includes(saved)) {
    return saved;
  }
  return "light";
}

function updateThemeToggleLabel() {
  ui.themeToggle.textContent = `${t("themeLabel")}: ${getThemeLabel(state.theme)}`;
}

function setTheme(nextTheme) {
  if (!THEMES.includes(nextTheme)) {
    return;
  }
  state.theme = nextTheme;
  localStorage.setItem(STORAGE_THEME_KEY, nextTheme);
  applyTheme();
}

function toggleTheme() {
  const currentIndex = THEMES.indexOf(state.theme);
  const nextTheme = THEMES[(currentIndex + 1) % THEMES.length];
  setTheme(nextTheme);
}

function applyTheme() {
  document.body.dataset.theme = state.theme;
  updateThemeToggleLabel();
}

function setLanguage(nextLanguage) {
  state.language = nextLanguage;
  localStorage.setItem(STORAGE_LANGUAGE_KEY, nextLanguage);
  applyLanguage();
}

function toggleLanguage() {
  setLanguage(state.language === "en" ? "ar" : "en");
}

function applyLanguage() {
  const lang = getLangPack();
  document.documentElement.lang = state.language;
  document.documentElement.dir = state.language === "ar" ? "rtl" : "ltr";

  ui.kicker.textContent = lang.kicker;
  ui.title.textContent = lang.title;
  ui.nextPrayerLabel.textContent = lang.nextPrayerLabel;
  ui.timesTitle.textContent = lang.todayPrayerTimes;
  ui.languageToggle.textContent = state.language === "en" ? "AR" : "EN";
  updateThemeToggleLabel();

  if (!state.timings) {
    ui.locationLabel.textContent = lang.locationLoading;
    ui.meta.textContent = lang.fetchingTimings;
    renderPrayerList({}, "fajr");
    return;
  }

  ui.locationLabel.textContent = state.locationLabel;
  ui.meta.textContent = `${state.metaReadableDate} - ${lang.methodLabel}: ${state.metaMethodName}`;
  state.lastRenderedLanguage = null;
  updateCountdownTick();
}

function getNextPrayer(timings, now, tomorrowFajr) {
  const todayEntries = PRAYER_ORDER.map((name) => ({
    name,
    date: parseApiTimeToDate(timings[name], now)
  })).filter((entry) => entry.date);

  for (const entry of todayEntries) {
    if (entry.date > now) {
      return { ...entry, isTomorrow: false };
    }
  }

  if (tomorrowFajr && tomorrowFajr > now) {
    return { name: "Fajr", date: tomorrowFajr, isTomorrow: true };
  }

  const fallbackFajrToday = parseApiTimeToDate(timings.Fajr, now);
  if (!fallbackFajrToday) {
    return null;
  }
  const fallbackFajrTomorrow = new Date(fallbackFajrToday.getTime() + 24 * 60 * 60 * 1000);
  return { name: "Fajr", date: fallbackFajrTomorrow, isTomorrow: true };
}

function renderPrayerList(timings, currentPhase) {
  const html = DISPLAY_CELLS.map((cell) => {
    const active = cell.phase === currentPhase ? "active" : "";
    const value = timings[cell.key] ? timings[cell.key].slice(0, 5) : "--:--";

    return `<li class="prayer-row prayer-row-${cell.phase} ${active}">
      <span class="prayer-cell-main">
        <span class="prayer-cell-name">${getPrayerLabel(cell.key)}</span>
      </span>
      <strong>${value}</strong>
    </li>`;
  }).join("");

  ui.prayerList.innerHTML = html;
}

function getCurrentPrayerPhase(timings, now) {
  const fajr = parseApiTimeToDate(timings.Fajr, now);
  const sunrise = parseApiTimeToDate(timings.Sunrise, now);
  const dhuhr = parseApiTimeToDate(timings.Dhuhr, now);
  const asr = parseApiTimeToDate(timings.Asr, now);
  const maghrib = parseApiTimeToDate(timings.Maghrib, now);
  const isha = parseApiTimeToDate(timings.Isha, now);

  if (!fajr || !sunrise || !dhuhr || !asr || !maghrib || !isha) {
    return "fajr";
  }

  if (now < fajr) {
    return "isha";
  }
  if (now < sunrise) {
    return "fajr";
  }
  if (now < dhuhr) {
    return "sunrise";
  }
  if (now < asr) {
    return "dhuhr";
  }
  if (now < maghrib) {
    return "asr";
  }
  if (now < isha) {
    return "maghrib";
  }
  return "isha";
}

function renderPrayerScene(phase) {
  if (!ui.prayerScene) {
    return;
  }
  for (const cls of SCENE_CLASSES) {
    ui.prayerScene.classList.remove(cls);
  }
  ui.prayerScene.classList.add(`scene-${phase}`);
}

function applyPhaseTheme(phase) {
  for (const cls of PHASE_CLASSES) {
    document.body.classList.remove(cls);
  }
  document.body.classList.add(`phase-${phase}`);
}

function updateCountdownTick() {
  if (!state.timings) {
    return;
  }

  const now = new Date();
  const next = getNextPrayer(state.timings, now, state.tomorrowFajr);
  const scenePhase = getCurrentPrayerPhase(state.timings, now);

  renderPrayerScene(scenePhase);
  applyPhaseTheme(scenePhase);

  if (!next) {
    ui.nextPrayer.textContent = t("unavailable");
    ui.countdown.textContent = "--:--:--";
    return;
  }

  const diff = next.date.getTime() - now.getTime();
  const localizedPrayerName = getPrayerLabel(next.name);
  ui.nextPrayer.textContent = next.isTomorrow
    ? `${localizedPrayerName} (${t("tomorrow")})`
    : localizedPrayerName;
  ui.countdown.textContent = formatHMS(diff);

  if (state.lastRenderedPhase !== scenePhase || state.lastRenderedLanguage !== state.language) {
    renderPrayerList(state.timings, scenePhase);
    state.lastRenderedPhase = scenePhase;
    state.lastRenderedLanguage = state.language;
  }
}

function startCountdown() {
  if (state.intervalId) {
    clearInterval(state.intervalId);
  }
  updateCountdownTick();
  state.intervalId = setInterval(updateCountdownTick, 1000);
}

function updateUiAfterFetch() {
  ui.locationLabel.textContent = state.locationLabel;
  ui.meta.textContent = `${state.metaReadableDate} - ${t("methodLabel")}: ${state.metaMethodName}`;
  startCountdown();
}

function getCurrentPosition(options) {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function fetchJson(url, errorMessage) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(errorMessage);
  }
  return response.json();
}

async function fetchTomorrowFajrByCoordinates(lat, lon) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const datePath = formatDateForApi(tomorrow);
  const url = new URL(`https://api.aladhan.com/v1/timings/${datePath}`);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("method", "2");

  const payload = await fetchJson(url, tError("tomorrowCoordinates"));
  return parseApiTimeToDate(payload?.data?.timings?.Fajr, tomorrow);
}

async function fetchTomorrowFajrByCity(city, country) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const datePath = formatDateForApi(tomorrow);
  const url = new URL(`https://api.aladhan.com/v1/timingsByCity/${datePath}`);
  url.searchParams.set("city", city);
  url.searchParams.set("country", country);
  url.searchParams.set("method", "2");

  const payload = await fetchJson(url, tError("tomorrowCity"));
  return parseApiTimeToDate(payload?.data?.timings?.Fajr, tomorrow);
}

async function fetchByCoordinates(lat, lon) {
  const url = new URL("https://api.aladhan.com/v1/timings");
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set("method", "2");

  const payload = await fetchJson(url, tError("coordinates"));
  const data = payload?.data;
  if (!data?.timings) {
    throw new Error(tError("noTimings"));
  }

  state.timings = data.timings;
  state.lastRenderedPhase = null;
  state.lastRenderedLanguage = null;
  state.tomorrowFajr = await fetchTomorrowFajrByCoordinates(lat, lon).catch(() => null);
  state.locationLabel = `${data.meta.timezone} (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
  state.metaReadableDate = data.date.readable;
  state.metaMethodName = data.meta.method.name;
  updateUiAfterFetch();
}

async function fetchByCity(city, country) {
  const url = new URL("https://api.aladhan.com/v1/timingsByCity");
  url.searchParams.set("city", city);
  url.searchParams.set("country", country);
  url.searchParams.set("method", "2");

  const payload = await fetchJson(url, tError("cityCountry"));
  const data = payload?.data;
  if (!data?.timings) {
    throw new Error(tError("noTimings"));
  }

  state.timings = data.timings;
  state.lastRenderedPhase = null;
  state.lastRenderedLanguage = null;
  state.tomorrowFajr = await fetchTomorrowFajrByCity(city, country).catch(() => null);
  state.locationLabel = `${city}, ${country}`;
  state.metaReadableDate = data.date.readable;
  state.metaMethodName = data.meta.method.name;
  updateUiAfterFetch();
}

async function loadAutomaticLocation() {
  if (!navigator.geolocation) {
    ui.meta.textContent = t("geolocationUnavailableFallback")(DEFAULT_FALLBACK_CITY, DEFAULT_FALLBACK_COUNTRY);
    await fetchByCity(DEFAULT_FALLBACK_CITY, DEFAULT_FALLBACK_COUNTRY).catch((err) => {
      ui.meta.textContent = err.message;
    });
    return;
  }

  ui.meta.textContent = t("requestingGeolocation");

  try {
    const position = await getCurrentPosition({ enableHighAccuracy: true, timeout: 12000 });
    await fetchByCoordinates(position.coords.latitude, position.coords.longitude);
  } catch {
    ui.meta.textContent = t("locationBlockedFallback")(DEFAULT_FALLBACK_CITY, DEFAULT_FALLBACK_COUNTRY);
    await fetchByCity(DEFAULT_FALLBACK_CITY, DEFAULT_FALLBACK_COUNTRY).catch((err) => {
      ui.meta.textContent = err.message;
    });
  }
}

function initLanguage() {
  state.language = getInitialLanguage();
  ui.languageToggle.addEventListener("click", toggleLanguage);
  applyLanguage();
}

function initTheme() {
  state.theme = getInitialTheme();
  ui.themeToggle.addEventListener("click", toggleTheme);
  applyTheme();
}

function initGeolocation() {
  loadAutomaticLocation();
}

applyPhaseTheme("sunrise");
initTheme();
initLanguage();
initGeolocation();
