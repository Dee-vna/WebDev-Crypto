/* ═══════════════════════════════════════════════════
   CRYPTONEXUS — MAIN.JS
   Sections: API MODULE → UI MODULE → APP MODULE
═══════════════════════════════════════════════════ */

/* ════════════════════════════════════════════════
   ◈  API MODULE
   Responsibility: fetch data, handle errors
════════════════════════════════════════════════ */
const API = (() => {
  const BASE_URL = "https://api.coingecko.com/api/v3";

  async function fetchCoins() {
    const url = `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
    return res.json();
  }

  return { fetchCoins };
})();

/* ════════════════════════════════════════════════
   ◈  UI MODULE
   Responsibility: render, build DOM, skeletons
════════════════════════════════════════════════ */
const UI = (() => {
  /* ── Helpers ── */
  function formatPrice(n) {
    if (n == null) return "—";
    if (n >= 1)
      return (
        "$" +
        n.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      );
    return (
      "$" +
      n.toLocaleString("en-US", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 6,
      })
    );
  }

  function formatLarge(n) {
    if (n == null) return "—";
    if (n >= 1e12) return "$" + (n / 1e12).toFixed(2) + "T";
    if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
    if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    return "$" + n.toLocaleString();
  }

  function formatChange(n) {
    if (n == null) return "—";
    const sign = n >= 0 ? "+" : "";
    return sign + n.toFixed(2) + "%";
  }

  function formatSupply(n) {
    if (n == null) return "—";
    return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function timeNow() {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  /* ── Skeletons ── */
  function showSkeletons(count = 20) {
    const grid = document.getElementById("coin-grid");
    const template = document.getElementById("skeleton-template");
    grid.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const clone = template.content.cloneNode(true);
      grid.appendChild(clone);
    }
  }

  /* ── Build one coin card ── */
  function buildCard(coin, isFav) {
    const change = coin.price_change_percentage_24h;
    const changeClass = change >= 0 ? "up" : "down";
    const changeLabel = formatChange(change);
    const favClass = isFav ? "fav-btn--active" : "";
    const favLabel = isFav ? "Remove from watchlist" : "Add to watchlist";

    const card = document.createElement("article");
    card.className = "coin-card";
    card.setAttribute("role", "listitem");
    card.setAttribute("data-id", coin.id);
    card.style.animationDelay = `${(coin._index || 0) * 40}ms`;

    card.innerHTML = `
      <span class="coin-card__rank" aria-label="Rank ${coin.market_cap_rank}">#${coin.market_cap_rank ?? "—"}</span>
      <div class="coin-card__header">
        <img
          class="coin-card__logo"
          src="${coin.image}"
          alt="${coin.name} logo"
          width="40" height="40"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/40/2C3531/D1E8E2?text=${coin.symbol.toUpperCase()[0]}'"
        />
        <div class="coin-card__name-group">
          <p class="coin-card__name">${coin.name}</p>
          <p class="coin-card__symbol">${coin.symbol.toUpperCase()}</p>
        </div>
        <span class="coin-card__change coin-card__change--${changeClass}" aria-label="24h change ${changeLabel}">
          ${changeLabel}
        </span>
      </div>
      <div class="coin-card__body">
        <p class="coin-card__price" aria-label="Price ${formatPrice(coin.current_price)}">${formatPrice(coin.current_price)}</p>
        <p class="coin-card__mcap">Mkt Cap: ${formatLarge(coin.market_cap)}</p>
      </div>
      <div class="coin-card__footer">
        <div class="coin-card__volume">
          Vol <span>${formatLarge(coin.total_volume)}</span>
        </div>
        <button
          class="fav-btn ${favClass}"
          data-id="${coin.id}"
          aria-label="${favLabel}"
          title="${favLabel}"
        >★</button>
      </div>
    `;

    return card;
  }

  /* ── Render coin grid ── */
  function renderCoins(coins, favorites) {
    const grid = document.getElementById("coin-grid");
    const empty = document.getElementById("empty-state");
    grid.innerHTML = "";

    if (coins.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const fragment = document.createDocumentFragment();
    coins.forEach((coin, i) => {
      coin._index = i;
      const isFav = favorites.includes(coin.id);
      fragment.appendChild(buildCard(coin, isFav));
    });
    grid.appendChild(fragment);
  }

  /* ── Render watchlist grid ── */
  function renderWatchlist(coins, favorites) {
    const grid = document.getElementById("watchlist-grid");
    const empty = document.getElementById("watchlist-empty");
    grid.innerHTML = "";

    const favCoins = coins.filter((c) => favorites.includes(c.id));

    if (favCoins.length === 0) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;

    const fragment = document.createDocumentFragment();
    favCoins.forEach((coin, i) => {
      coin._index = i;
      fragment.appendChild(buildCard(coin, true));
    });
    grid.appendChild(fragment);
  }

  /* ── Update stats bar ── */
  function updateStats(coins) {
    const gainers = coins.filter(
      (c) => (c.price_change_percentage_24h ?? 0) >= 0,
    ).length;
    const losers = coins.length - gainers;
    document.getElementById("stat-total").textContent = coins.length;
    document.getElementById("stat-gainers").textContent = gainers;
    document.getElementById("stat-losers").textContent = losers;
    document.getElementById("stat-updated").textContent = timeNow();
  }

  /* ── Update watchlist badge ── */
  function updateWatchlistBadge(count) {
    document.getElementById("watchlist-count").textContent = count;
  }

  /* ── Show / hide error banner ── */
  function showError(msg) {
    const banner = document.getElementById("error-banner");
    document.getElementById("error-msg").textContent = msg;
    banner.hidden = false;
  }

  function hideError() {
    document.getElementById("error-banner").hidden = true;
  }

  /* ── Open modal with coin data ── */
  function openModal(coin, isFav) {
    const modal = document.getElementById("coin-modal");
    const change = coin.price_change_percentage_24h;

    document.getElementById("modal-logo").src = coin.image;
    document.getElementById("modal-logo").alt = coin.name + " logo";
    document.getElementById("modal-title").textContent = coin.name;
    document.getElementById("modal-symbol").textContent =
      coin.symbol.toUpperCase();
    document.getElementById("modal-price").textContent = formatPrice(
      coin.current_price,
    );
    document.getElementById("modal-mcap").textContent = formatLarge(
      coin.market_cap,
    );
    document.getElementById("modal-volume").textContent = formatLarge(
      coin.total_volume,
    );
    document.getElementById("modal-ath").textContent = formatPrice(coin.ath);
    document.getElementById("modal-supply").textContent = formatSupply(
      coin.circulating_supply,
    );
    document.getElementById("modal-rank").textContent =
      "#" + (coin.market_cap_rank ?? "—");

    const changeEl = document.getElementById("modal-change");
    changeEl.textContent = formatChange(change);
    changeEl.style.color = change >= 0 ? "var(--clr-up)" : "var(--clr-down)";

    const favBtn = document.getElementById("modal-fav-btn");
    favBtn.dataset.id = coin.id;
    favBtn.classList.toggle("active", isFav);
    favBtn.title = isFav ? "Remove from watchlist" : "Add to watchlist";

    modal.showModal();
  }

  function closeModal() {
    document.getElementById("coin-modal").close();
  }

  /* ── Toggle fav button state on a card ── */
  function toggleCardFavUI(id, isFav) {
    document.querySelectorAll(`.fav-btn[data-id="${id}"]`).forEach((btn) => {
      btn.classList.toggle("fav-btn--active", isFav);
      btn.title = isFav ? "Remove from watchlist" : "Add to watchlist";
      btn.classList.add("pop");
      btn.addEventListener("animationend", () => btn.classList.remove("pop"), {
        once: true,
      });
    });
    const modalFav = document.getElementById("modal-fav-btn");
    if (modalFav.dataset.id === id) {
      modalFav.classList.toggle("active", isFav);
    }
  }

  return {
    showSkeletons,
    renderCoins,
    renderWatchlist,
    updateStats,
    updateWatchlistBadge,
    showError,
    hideError,
    openModal,
    closeModal,
    toggleCardFavUI,
  };
})();

/* ════════════════════════════════════════════════
   ◈  APP MODULE
   Responsibility: state, events, orchestration
════════════════════════════════════════════════ */
const App = (() => {
  /* ── Central State ── */
  const State = {
    coins: [],
    favorites: JSON.parse(localStorage.getItem("cx_favorites") || "[]"),
    searchQuery: "",
    sortBy: "rank",
    darkMode: localStorage.getItem("cx_theme") !== "light",
    activeTab: "market",
    loading: false,
  };

  /* ── Persist ── */
  function saveFavorites() {
    localStorage.setItem("cx_favorites", JSON.stringify(State.favorites));
  }

  function saveTheme() {
    localStorage.setItem("cx_theme", State.darkMode ? "dark" : "light");
  }

  /* ── Apply theme on load ── */
  function applyTheme() {
    document.documentElement.setAttribute(
      "data-theme",
      State.darkMode ? "dark" : "light",
    );
  }

  /* ── Filter + Sort pipeline ── */
  function getFilteredCoins() {
    let result = [...State.coins];

    // Filter
    if (State.searchQuery) {
      const q = State.searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.symbol.toLowerCase().includes(q),
      );
    }

    // Sort
    switch (State.sortBy) {
      case "rank":
        result.sort(
          (a, b) => (a.market_cap_rank ?? 999) - (b.market_cap_rank ?? 999),
        );
        break;
      case "name":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "price_desc":
        result.sort((a, b) => b.current_price - a.current_price);
        break;
      case "price_asc":
        result.sort((a, b) => a.current_price - b.current_price);
        break;
      case "change_desc":
        result.sort(
          (a, b) =>
            (b.price_change_percentage_24h ?? 0) -
            (a.price_change_percentage_24h ?? 0),
        );
        break;
      case "change_asc":
        result.sort(
          (a, b) =>
            (a.price_change_percentage_24h ?? 0) -
            (b.price_change_percentage_24h ?? 0),
        );
        break;
    }

    return result;
  }

  /* ── Re-render current view ── */
  function renderCurrent() {
    if (State.activeTab === "market") {
      UI.renderCoins(getFilteredCoins(), State.favorites);
    } else {
      UI.renderWatchlist(State.coins, State.favorites);
    }
    UI.updateWatchlistBadge(State.favorites.length);
  }

  /* ── Fetch & load data ── */
  async function loadData() {
    if (State.loading) return;
    State.loading = true;

    UI.hideError();
    UI.showSkeletons(20);

    const btn = document.getElementById("refresh-btn");
    btn.classList.add("loading");
    btn.disabled = true;

    try {
      const coins = await API.fetchCoins();
      State.coins = coins;
      UI.updateStats(coins);
      renderCurrent();
    } catch (err) {
      //UI.showError(
      //"Failed to fetch market data. Check your connection and try again.",
      //);
      console.error(err);
    } finally {
      State.loading = false;
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  /* ── Toggle favorite ── */
  function toggleFavorite(id) {
    const idx = State.favorites.indexOf(id);
    if (idx === -1) {
      State.favorites.push(id);
    } else {
      State.favorites.splice(idx, 1);
    }
    saveFavorites();
    UI.toggleCardFavUI(id, State.favorites.includes(id));
    UI.updateWatchlistBadge(State.favorites.length);
    if (State.activeTab === "watchlist") renderCurrent();
  }

  /* ── Switch tab ── */
  function switchTab(tab) {
    State.activeTab = tab;

    document.querySelectorAll(".nav__tab").forEach((btn) => {
      const active = btn.dataset.tab === tab;
      btn.classList.toggle("nav__tab--active", active);
      btn.setAttribute("aria-selected", active);
    });

    document
      .getElementById("panel-market")
      .classList.toggle("panel--active", tab === "market");
    document.getElementById("panel-market").hidden = tab !== "market";
    document
      .getElementById("panel-watchlist")
      .classList.toggle("panel--active", tab === "watchlist");
    document.getElementById("panel-watchlist").hidden = tab !== "watchlist";

    renderCurrent();
  }

  /* ── Wire up all events ── */
  function bindEvents() {
    // Search
    const searchInput = document.getElementById("search-input");
    searchInput.addEventListener("input", (e) => {
      State.searchQuery = e.target.value.trim();
      renderCurrent();
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        State.searchQuery = "";
        renderCurrent();
        searchInput.blur();
      }
    });

    // Sort
    document.getElementById("sort-select").addEventListener("change", (e) => {
      State.sortBy = e.target.value;
      renderCurrent();
    });

    // Refresh
    document.getElementById("refresh-btn").addEventListener("click", loadData);

    // Theme toggle
    document.getElementById("theme-toggle").addEventListener("click", () => {
      State.darkMode = !State.darkMode;
      applyTheme();
      saveTheme();
    });

    // Nav tabs
    document.querySelectorAll(".nav__tab").forEach((btn) => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    // Error banner close
    document
      .getElementById("error-close")
      .addEventListener("click", UI.hideError);

    // Card grid — fav & modal (event delegation)
    document.getElementById("coin-grid").addEventListener("click", (e) => {
      const favBtn = e.target.closest(".fav-btn");
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.id);
        return;
      }

      const card = e.target.closest(".coin-card");
      if (card) {
        const coin = State.coins.find((c) => c.id === card.dataset.id);
        if (coin) UI.openModal(coin, State.favorites.includes(coin.id));
      }
    });

    // Watchlist grid — same delegation
    document.getElementById("watchlist-grid").addEventListener("click", (e) => {
      const favBtn = e.target.closest(".fav-btn");
      if (favBtn) {
        e.stopPropagation();
        toggleFavorite(favBtn.dataset.id);
        return;
      }

      const card = e.target.closest(".coin-card");
      if (card) {
        const coin = State.coins.find((c) => c.id === card.dataset.id);
        if (coin) UI.openModal(coin, State.favorites.includes(coin.id));
      }
    });

    // Modal close
    document
      .getElementById("modal-close")
      .addEventListener("click", UI.closeModal);
    document.getElementById("coin-modal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) UI.closeModal();
    });

    // Modal fav button
    document.getElementById("modal-fav-btn").addEventListener("click", (e) => {
      toggleFavorite(e.currentTarget.dataset.id);
    });

    // Close modal on ESC (native dialog handles it, but sync state)
    document.getElementById("coin-modal").addEventListener("close", () => {});
  }

  /* ── Init ── */
  function init() {
    applyTheme();
    bindEvents();

    // Set initial panel visibility
    document.getElementById("panel-market").hidden = false;
    document.getElementById("panel-watchlist").hidden = true;

    loadData();
  }

  return { init };
})();

/* ── Bootstrap ── */
document.addEventListener("DOMContentLoaded", App.init);
