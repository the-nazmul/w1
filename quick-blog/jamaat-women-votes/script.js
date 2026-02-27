const CSV_URL = "./data/same-premise-centers.csv";
const PARTY_ORDER = ["bnp", "jamaat"];
const PARTY_LABELS = {
  bnp: "BNP",
  jamaat: "Jamaat"
};
const TYPE_ORDER = ["FEMALE", "MALE"];
const PAGE_SIZE = 10;
const CANONICAL_URL = "https://nazmulahasan.com/quick-blog/jamaat-women-votes/";
const SHARE_TITLE = "Data tidbit shows Jamaat's showing among women voters";

const state = {
  compareMode: "votes",
  distributionViewByScope: {
    overall: "ALL",
    "winner-bnp": "ALL",
    "winner-jamaat": "ALL"
  },
  data: null,
  rawHeaders: [],
  rawRows: [],
  tablePage: 1
};

const recordCountEl = document.getElementById("recordCount");
const compareChartEl = document.getElementById("compareChart");
const compareCaptionEl = document.getElementById("compareCaption");
const loadErrorEl = document.getElementById("loadError");
const rawTableHeadEl = document.getElementById("rawTableHead");
const rawTableBodyEl = document.getElementById("rawTableBody");
const rawTablePaginationEl = document.getElementById("rawTablePagination");
const rawTableSummaryEl = document.getElementById("rawTableSummary");
const shareXEl = document.getElementById("shareX");
const shareFacebookEl = document.getElementById("shareFacebook");
const shareLinkedInEl = document.getElementById("shareLinkedIn");
const shareCopyBtnEl = document.getElementById("shareCopyBtn");
const shareFeedbackEl = document.getElementById("shareFeedback");
const topbarShareToggleEl = document.getElementById("topbarShareToggle");
const topbarShareMenuEl = document.getElementById("topbarShareMenu");
const topbarShareXEl = document.getElementById("topbarShareX");
const topbarShareFacebookEl = document.getElementById("topbarShareFacebook");
const topbarShareLinkedInEl = document.getElementById("topbarShareLinkedIn");
const topbarCopyBtnEl = document.getElementById("topbarCopyBtn");
const scrollProgressBarEl = document.getElementById("scrollProgressBar");

const distributionScopes = {
  overall: {
    chartEl: document.getElementById("distributionChart"),
    captionEl: document.getElementById("distributionCaption"),
    label: "all listed centers",
    getByType: (data) => data.byType,
    getMatchedRows: (data) => data.matchedRows
  },
  "winner-bnp": {
    chartEl: document.getElementById("winnerBnpChart"),
    captionEl: document.getElementById("winnerBnpCaption"),
    label: "BNP-winning constituencies",
    getByType: (data) => data.byWinner.bnp.byType,
    getMatchedRows: (data) => data.byWinner.bnp.matchedRows
  },
  "winner-jamaat": {
    chartEl: document.getElementById("winnerJamaatChart"),
    captionEl: document.getElementById("winnerJamaatCaption"),
    label: "Jamaat-winning constituencies",
    getByType: (data) => data.byWinner.jamaat.byType,
    getMatchedRows: (data) => data.byWinner.jamaat.matchedRows
  }
};

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatPercent(value) {
  return `${value.toFixed(1)}%`;
}

function normalizeParty(value) {
  return String(value || "").trim().toLowerCase();
}

function parseNumber(value) {
  const parsed = Number(String(value || "").replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  cells.push(current);
  return cells;
}

function parseCsv(text) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return { headers: [], rows: [] };
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());

  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });

    return row;
  });

  return { headers, rows };
}

function emptyPartyMap() {
  return { bnp: 0, jamaat: 0 };
}

function emptyByTypeMap() {
  return {
    FEMALE: emptyPartyMap(),
    MALE: emptyPartyMap()
  };
}

function emptyWinnerSummary() {
  return {
    byType: emptyByTypeMap(),
    matchedRows: 0
  };
}

function summarize(rows) {
  const totals = emptyPartyMap();
  const byType = emptyByTypeMap();
  const byWinner = {
    bnp: emptyWinnerSummary(),
    jamaat: emptyWinnerSummary()
  };

  let matchedRows = 0;

  rows.forEach((row) => {
    const rowType = String(row.type || "").trim().toUpperCase();
    const winner = normalizeParty(row.constituency_winner);
    let matchedThisRow = false;

    [
      ["top1_party", "top1_vote"],
      ["top2_party", "top2_vote"]
    ].forEach(([partyKey, voteKey]) => {
      const party = normalizeParty(row[partyKey]);

      if (!PARTY_ORDER.includes(party)) {
        return;
      }

      const vote = parseNumber(row[voteKey]);
      totals[party] += vote;

      if (TYPE_ORDER.includes(rowType)) {
        byType[rowType][party] += vote;

        if (PARTY_ORDER.includes(winner)) {
          byWinner[winner].byType[rowType][party] += vote;
        }
      }

      matchedThisRow = true;
    });

    if (!matchedThisRow) {
      return;
    }

    matchedRows += 1;

    if (PARTY_ORDER.includes(winner)) {
      byWinner[winner].matchedRows += 1;
    }
  });

  const combinedTotal = PARTY_ORDER.reduce((sum, party) => sum + totals[party], 0);

  return {
    rowCount: rows.length,
    matchedRows,
    totals,
    byType,
    byWinner,
    combinedTotal
  };
}

function totalsByParty(byType) {
  return PARTY_ORDER.reduce((acc, party) => {
    acc[party] = TYPE_ORDER.reduce((sum, type) => sum + (byType[type]?.[party] || 0), 0);
    return acc;
  }, {});
}

function animateWidths(rootEl, selector) {
  requestAnimationFrame(() => {
    rootEl.querySelectorAll(selector).forEach((el) => {
      const target = Number(el.dataset.width || 0);
      el.style.width = `${target}%`;
    });
  });
}

function setButtonGroupActive(button) {
  const group = button.closest(".control-group");

  if (!group) {
    return;
  }

  group.querySelectorAll(".control-btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn === button);
  });
}

function renderCompare() {
  if (!state.data) {
    return;
  }

  const { totals, combinedTotal } = state.data;
  const maxVotes = Math.max(...PARTY_ORDER.map((party) => totals[party]), 1);

  compareChartEl.innerHTML = PARTY_ORDER.map((party) => {
    const votes = totals[party];
    const share = combinedTotal ? (votes / combinedTotal) * 100 : 0;
    const width = state.compareMode === "votes" ? (votes / maxVotes) * 100 : share;

    const primaryValue = state.compareMode === "votes" ? formatNumber(votes) : formatPercent(share);
    const secondaryValue = state.compareMode === "votes" ? `${formatPercent(share)} share` : `${formatNumber(votes)} votes`;

    return `
      <div class="compare-row">
        <div class="compare-party">${PARTY_LABELS[party]}</div>
        <div class="compare-track">
          <div class="compare-fill compare-fill--${party}" data-width="${width.toFixed(2)}" title="${PARTY_LABELS[party]}: ${formatNumber(votes)} votes (${formatPercent(share)})"></div>
        </div>
        <div class="compare-value">
          <strong>${primaryValue}</strong>
          <span>${secondaryValue}</span>
        </div>
      </div>
    `;
  }).join("");

  animateWidths(compareChartEl, ".compare-fill");

  const leadParty = totals.bnp >= totals.jamaat ? "bnp" : "jamaat";
  const trailingParty = leadParty === "bnp" ? "jamaat" : "bnp";
  const voteGap = Math.abs(totals.bnp - totals.jamaat);
  const gapShare = combinedTotal ? (voteGap / combinedTotal) * 100 : 0;

  if (state.compareMode === "votes") {
    compareCaptionEl.innerHTML = `<span class="accent">${PARTY_LABELS[leadParty]}</span> leads by <strong>${formatNumber(voteGap)}</strong> votes.`;
  } else {
    compareCaptionEl.innerHTML = `<span class="accent">${PARTY_LABELS[leadParty]}</span> is ahead by <strong>${formatPercent(gapShare)}</strong> of the two-party total over ${PARTY_LABELS[trailingParty]}.`;
  }
}

function buildDistributionRowAll(
  party,
  femaleVotes,
  maleVotes,
  partyTotal,
  maxPartyTotal,
  femaleShareOfTwoParty,
  maleShareOfTwoParty
) {
  const femaleShare = partyTotal ? (femaleVotes / partyTotal) * 100 : 0;
  const maleShare = partyTotal ? (maleVotes / partyTotal) * 100 : 0;
  const rowWidth = partyTotal ? (partyTotal / maxPartyTotal) * 100 : 0;

  return `
    <div class="dist-row">
      <div class="dist-party">${PARTY_LABELS[party]}</div>
      <div class="dist-track">
        <div class="dist-bar" data-width="${rowWidth.toFixed(2)}" title="${PARTY_LABELS[party]} total: ${formatNumber(partyTotal)} votes (Female ${formatNumber(femaleVotes)}, Male ${formatNumber(maleVotes)})">
          <div class="dist-segment dist-segment--female" data-width="${femaleShare.toFixed(2)}" title="Female: ${formatNumber(femaleVotes)} (${formatPercent(femaleShare)} of party; ${formatPercent(femaleShareOfTwoParty)} of two-party)"></div>
          <div class="dist-segment dist-segment--male" data-width="${maleShare.toFixed(2)}" title="Male: ${formatNumber(maleVotes)} (${formatPercent(maleShare)} of party; ${formatPercent(maleShareOfTwoParty)} of two-party)"></div>
        </div>
      </div>
      <div class="dist-value">
        <strong>${formatNumber(partyTotal)}</strong>
        <span>total votes</span>
      </div>
      <div class="dist-meta">
        <span class="dist-chip"><em>F</em> ${formatNumber(femaleVotes)} (${formatPercent(femaleShare)} party · ${formatPercent(femaleShareOfTwoParty)} two-party)</span>
        <span class="dist-chip"><em>M</em> ${formatNumber(maleVotes)} (${formatPercent(maleShare)} party · ${formatPercent(maleShareOfTwoParty)} two-party)</span>
      </div>
    </div>
  `;
}

function buildDistributionRowSingleType(
  party,
  type,
  selectedVotes,
  partyTotal,
  maxSelectedVotes,
  selectedShareOfTwoParty
) {
  const shareWithinParty = partyTotal ? (selectedVotes / partyTotal) * 100 : 0;
  const rowWidth = selectedVotes ? (selectedVotes / maxSelectedVotes) * 100 : 0;
  const segmentClass = type === "FEMALE" ? "dist-segment--female" : "dist-segment--male";
  const typeShort = type === "FEMALE" ? "F" : "M";

  return `
    <div class="dist-row">
      <div class="dist-party">${PARTY_LABELS[party]}</div>
      <div class="dist-track">
        <div class="dist-bar" data-width="${rowWidth.toFixed(2)}">
          <div class="dist-segment ${segmentClass}" data-width="100" title="${type}: ${formatNumber(selectedVotes)} votes (${formatPercent(shareWithinParty)} of party; ${formatPercent(selectedShareOfTwoParty)} of two-party)"></div>
        </div>
      </div>
      <div class="dist-value">
        <strong>${formatNumber(selectedVotes)}</strong>
        <span>${type.toLowerCase()} votes</span>
      </div>
      <div class="dist-meta">
        <span class="dist-chip"><em>${typeShort}</em> ${formatPercent(shareWithinParty)} of party · ${formatPercent(selectedShareOfTwoParty)} of two-party</span>
      </div>
    </div>
  `;
}

function renderDistributionScope(scopeKey) {
  if (!state.data || !distributionScopes[scopeKey]) {
    return;
  }

  const scope = distributionScopes[scopeKey];
  const view = state.distributionViewByScope[scopeKey];
  const byType = scope.getByType(state.data);
  const matchedRows = scope.getMatchedRows(state.data);
  const totals = totalsByParty(byType);

  const scopeTwoPartyTotal = PARTY_ORDER.reduce((sum, party) => sum + totals[party], 0);

  if (scopeTwoPartyTotal === 0) {
    scope.chartEl.innerHTML = `<p class="chart-empty">No BNP/Jamaat vote totals found for ${scope.label}.</p>`;
    scope.captionEl.textContent = "";
    return;
  }

  if (view === "ALL") {
    const maxPartyTotal = Math.max(...PARTY_ORDER.map((party) => totals[party]), 1);

    scope.chartEl.innerHTML = PARTY_ORDER.map((party) => {
      const femaleVotes = byType.FEMALE[party];
      const maleVotes = byType.MALE[party];
      const femaleShareOfTwoParty = scopeTwoPartyTotal ? (femaleVotes / scopeTwoPartyTotal) * 100 : 0;
      const maleShareOfTwoParty = scopeTwoPartyTotal ? (maleVotes / scopeTwoPartyTotal) * 100 : 0;

      return buildDistributionRowAll(
        party,
        femaleVotes,
        maleVotes,
        totals[party],
        maxPartyTotal,
        femaleShareOfTwoParty,
        maleShareOfTwoParty
      );
    }).join("");

    const femaleLeader = byType.FEMALE.bnp >= byType.FEMALE.jamaat ? "bnp" : "jamaat";
    const maleLeader = byType.MALE.bnp >= byType.MALE.jamaat ? "bnp" : "jamaat";
    const bnpTwoPartyShare = scopeTwoPartyTotal ? (totals.bnp / scopeTwoPartyTotal) * 100 : 0;
    const jamaatTwoPartyShare = scopeTwoPartyTotal ? (totals.jamaat / scopeTwoPartyTotal) * 100 : 0;

    scope.captionEl.innerHTML = `${formatNumber(matchedRows)} rows. Female lead: <span class="accent">${PARTY_LABELS[femaleLeader]}</span>. Male lead: <span class="accent">${PARTY_LABELS[maleLeader]}</span>. Of two-party votes: BNP ${formatPercent(bnpTwoPartyShare)}, Jamaat ${formatPercent(jamaatTwoPartyShare)}.`;
  } else {
    const maxSelectedVotes = Math.max(...PARTY_ORDER.map((party) => byType[view][party]), 1);
    const selectedTypeTwoPartyTotal = PARTY_ORDER.reduce((sum, party) => sum + byType[view][party], 0);

    scope.chartEl.innerHTML = PARTY_ORDER.map((party) => {
      const selectedVotes = byType[view][party];
      const selectedShareOfTwoParty = selectedTypeTwoPartyTotal ? (selectedVotes / selectedTypeTwoPartyTotal) * 100 : 0;

      return buildDistributionRowSingleType(
        party,
        view,
        selectedVotes,
        totals[party],
        maxSelectedVotes,
        selectedShareOfTwoParty
      );
    }).join("");

    const selectedLeader = byType[view].bnp >= byType[view].jamaat ? "bnp" : "jamaat";
    const trailingParty = selectedLeader === "bnp" ? "jamaat" : "bnp";
    const leadGap = Math.abs(byType[view].bnp - byType[view].jamaat);
    const bnpTwoPartyShare = selectedTypeTwoPartyTotal ? (byType[view].bnp / selectedTypeTwoPartyTotal) * 100 : 0;
    const jamaatTwoPartyShare = selectedTypeTwoPartyTotal ? (byType[view].jamaat / selectedTypeTwoPartyTotal) * 100 : 0;

    scope.captionEl.innerHTML = `${formatNumber(matchedRows)} rows in ${scope.label}. In <span class="accent">${view}</span> centers, ${PARTY_LABELS[selectedLeader]} leads ${PARTY_LABELS[trailingParty]} by <strong>${formatNumber(leadGap)}</strong> votes. Of two-party votes: BNP ${formatPercent(bnpTwoPartyShare)}, Jamaat ${formatPercent(jamaatTwoPartyShare)}.`;
  }

  animateWidths(scope.chartEl, ".dist-bar, .dist-segment");
}

function buildPageButtons(totalPages, currentPage) {
  const parts = [];

  parts.push(`<button class="page-btn" data-page="${Math.max(1, currentPage - 1)}" ${currentPage === 1 ? "disabled" : ""} type="button">Prev</button>`);

  const visibleCount = 5;
  let start = Math.max(1, currentPage - 2);
  let end = Math.min(totalPages, start + visibleCount - 1);

  if (end - start < visibleCount - 1) {
    start = Math.max(1, end - visibleCount + 1);
  }

  if (start > 1) {
    parts.push(`<button class="page-btn" data-page="1" type="button">1</button>`);
    if (start > 2) {
      parts.push('<span class="page-ellipsis">...</span>');
    }
  }

  for (let page = start; page <= end; page += 1) {
    parts.push(`<button class="page-btn ${page === currentPage ? "is-active" : ""}" data-page="${page}" type="button">${page}</button>`);
  }

  if (end < totalPages) {
    if (end < totalPages - 1) {
      parts.push('<span class="page-ellipsis">...</span>');
    }
    parts.push(`<button class="page-btn" data-page="${totalPages}" type="button">${totalPages}</button>`);
  }

  parts.push(`<button class="page-btn" data-page="${Math.min(totalPages, currentPage + 1)}" ${currentPage === totalPages ? "disabled" : ""} type="button">Next</button>`);

  return parts.join("");
}

function renderRawTable() {
  const { rawHeaders, rawRows } = state;

  if (!rawHeaders.length || !rawRows.length) {
    rawTableHeadEl.innerHTML = "";
    rawTableBodyEl.innerHTML = "";
    rawTablePaginationEl.innerHTML = "";
    rawTableSummaryEl.textContent = "";
    return;
  }

  const totalRows = rawRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  state.tablePage = Math.min(Math.max(1, state.tablePage), totalPages);

  const from = (state.tablePage - 1) * PAGE_SIZE;
  const to = Math.min(totalRows, from + PAGE_SIZE);
  const pageRows = rawRows.slice(from, to);

  rawTableHeadEl.innerHTML = `<tr>${rawHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}</tr>`;

  rawTableBodyEl.innerHTML = pageRows.map((row) => {
    const cells = rawHeaders.map((header) => {
      const value = row[header] || "";
      const safe = escapeHtml(value);
      return `<td title="${safe}">${safe}</td>`;
    }).join("");

    return `<tr>${cells}</tr>`;
  }).join("");

  rawTablePaginationEl.innerHTML = buildPageButtons(totalPages, state.tablePage);
  rawTableSummaryEl.textContent = `Showing rows ${formatNumber(from + 1)}-${formatNumber(to)} of ${formatNumber(totalRows)}.`;
}

function wireFootnotes() {
  const footnotesList = document.getElementById("footnotesList");

  if (!footnotesList) {
    return;
  }

  const footnotes = Array.from(footnotesList.querySelectorAll("li"));

  footnotes.forEach((item, index) => {
    const number = index + 1;

    if (!item.id) {
      item.id = `fn-${number}`;
    }

    if (!item.querySelector(".footnote-backlink")) {
      item.insertAdjacentHTML(
        "beforeend",
        ` <a class="footnote-backlink" href="#fnref-${number}-1" aria-label="Back to reference ${number}">↩</a>`
      );
    }
  });

  const refCountByNumber = {};

  document.querySelectorAll("article.article p").forEach((paragraph) => {
    if (paragraph.closest(".footnotes")) {
      return;
    }

    paragraph.innerHTML = paragraph.innerHTML.replace(/\(footnote\s*(\d+)\)/gi, (match, nStr) => {
      const number = Number(nStr);

      if (!Number.isInteger(number) || number < 1 || number > footnotes.length) {
        return match;
      }

      refCountByNumber[number] = (refCountByNumber[number] || 0) + 1;
      const refId = `fnref-${number}-${refCountByNumber[number]}`;

      return `<sup class="footnote-ref"><a id="${refId}" href="#fn-${number}" aria-describedby="footnotes-title">${number}</a></sup>`;
    });
  });
}

function setShareLinks(xEl, facebookEl, linkedInEl, encodedUrl, encodedTitle) {
  if (xEl) {
    xEl.href = "https://twitter.com/intent/tweet?text=" + encodedTitle + "&url=" + encodedUrl;
  }

  if (facebookEl) {
    facebookEl.href = "https://www.facebook.com/sharer/sharer.php?u=" + encodedUrl;
  }

  if (linkedInEl) {
    linkedInEl.href = "https://www.linkedin.com/sharing/share-offsite/?url=" + encodedUrl;
  }
}

async function copyCanonicalUrl() {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(CANONICAL_URL);
    } else {
      const tmpInput = document.createElement("input");
      tmpInput.value = CANONICAL_URL;
      document.body.appendChild(tmpInput);
      tmpInput.select();
      document.execCommand("copy");
      tmpInput.remove();
    }

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function wireShare() {
  const encodedUrl = encodeURIComponent(CANONICAL_URL);
  const encodedTitle = encodeURIComponent(SHARE_TITLE);

  setShareLinks(shareXEl, shareFacebookEl, shareLinkedInEl, encodedUrl, encodedTitle);
  setShareLinks(topbarShareXEl, topbarShareFacebookEl, topbarShareLinkedInEl, encodedUrl, encodedTitle);

  if (shareCopyBtnEl) {
    shareCopyBtnEl.addEventListener("click", async () => {
      const copied = await copyCanonicalUrl();

      if (!shareFeedbackEl) {
        return;
      }

      shareFeedbackEl.textContent = copied ? "Copied" : "Failed";
      window.setTimeout(() => {
        shareFeedbackEl.textContent = "";
      }, 1400);
    });
  }

  if (topbarCopyBtnEl) {
    topbarCopyBtnEl.addEventListener("click", async () => {
      const originalLabel = topbarCopyBtnEl.textContent;
      const copied = await copyCanonicalUrl();
      topbarCopyBtnEl.textContent = copied ? "OK" : "!";
      window.setTimeout(() => {
        topbarCopyBtnEl.textContent = originalLabel;
      }, 900);
    });
  }

  if (!topbarShareToggleEl || !topbarShareMenuEl) {
    return;
  }

  const setMenuOpen = (isOpen) => {
    topbarShareMenuEl.hidden = !isOpen;
    topbarShareToggleEl.setAttribute("aria-expanded", isOpen ? "true" : "false");
  };

  topbarShareToggleEl.addEventListener("click", () => {
    setMenuOpen(topbarShareMenuEl.hidden);
  });

  document.addEventListener("click", (event) => {
    if (topbarShareMenuEl.hidden) {
      return;
    }

    const target = event.target;

    if (topbarShareMenuEl.contains(target) || topbarShareToggleEl.contains(target)) {
      return;
    }

    setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  });
}

function wireScrollProgress() {
  if (!scrollProgressBarEl) {
    return;
  }

  const updateProgress = () => {
    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    const width = Math.max(0, Math.min(100, ratio * 100));
    scrollProgressBarEl.style.width = width.toFixed(2) + "%";
  };

  updateProgress();
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress);
}

function renderAll() {
  renderCompare();
  Object.keys(distributionScopes).forEach((scopeKey) => renderDistributionScope(scopeKey));
  renderRawTable();
}

function wireControls() {
  document.querySelectorAll("[data-compare-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextMode = button.dataset.compareMode;

      if (!nextMode || nextMode === state.compareMode) {
        return;
      }

      state.compareMode = nextMode;
      setButtonGroupActive(button);
      renderCompare();
    });
  });

  document.querySelectorAll("[data-distribution-scope][data-distribution-view]").forEach((button) => {
    button.addEventListener("click", () => {
      const scope = button.dataset.distributionScope;
      const nextView = button.dataset.distributionView;

      if (!scope || !nextView || !distributionScopes[scope]) {
        return;
      }

      if (state.distributionViewByScope[scope] === nextView) {
        return;
      }

      state.distributionViewByScope[scope] = nextView;
      setButtonGroupActive(button);
      renderDistributionScope(scope);
    });
  });

  rawTablePaginationEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");

    if (!button) {
      return;
    }

    const nextPage = Number(button.dataset.page);

    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage === state.tablePage) {
      return;
    }

    state.tablePage = nextPage;
    renderRawTable();
  });
}

function clearAllCharts() {
  compareChartEl.innerHTML = "";
  compareCaptionEl.textContent = "";

  Object.values(distributionScopes).forEach((scope) => {
    scope.chartEl.innerHTML = "";
    scope.captionEl.textContent = "";
  });

  rawTableHeadEl.innerHTML = "";
  rawTableBodyEl.innerHTML = "";
  rawTablePaginationEl.innerHTML = "";
  rawTableSummaryEl.textContent = "";
}

async function loadData() {
  try {
    const response = await fetch(CSV_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const parsed = parseCsv(csvText);

    state.rawHeaders = parsed.headers;
    state.rawRows = parsed.rows;
    state.tablePage = 1;

    state.data = summarize(parsed.rows);
    recordCountEl.textContent = `${formatNumber(state.data.matchedRows)} rows aggregated`;
    loadErrorEl.hidden = true;

    renderAll();
  } catch (error) {
    console.error(error);
    recordCountEl.textContent = "Data failed to load";
    loadErrorEl.hidden = false;
    clearAllCharts();
  }
}

wireShare();
wireScrollProgress();
wireFootnotes();
wireControls();
loadData();
