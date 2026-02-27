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
const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");
const PARTY_SET = new Set(PARTY_ORDER);
const TYPE_SET = new Set(TYPE_ORDER);

const state = {
  compareMode: "votes",
  distributionViewByScope: {
    overall: "ALL"
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
  }
};

function formatNumber(value) {
  return NUMBER_FORMATTER.format(Math.round(value));
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
  const chart1VotesByParty = emptyPartyMap();
  let totalVotesCastSum = 0;
  const totalVotesCastByType = { FEMALE: 0, MALE: 0 };
  const byType = emptyByTypeMap();
  const byWinner = {
    bnp: emptyWinnerSummary(),
    jamaat: emptyWinnerSummary()
  };

  let matchedRows = 0;

  rows.forEach((row) => {
    const rowType = String(row.type || "").trim().toUpperCase();
    const winner = normalizeParty(row.constituency_winner);
        const votesCast = parseNumber(row.totalVotes_cast);
    let matchedThisRow = false;

    [
      ["top1_party", "top1_vote"],
      ["top2_party", "top2_vote"]
    ].forEach(([partyKey, voteKey]) => {
      const party = normalizeParty(row[partyKey]);

      if (!PARTY_SET.has(party)) {
        return;
      }

      const vote = parseNumber(row[voteKey]);
      totals[party] += vote;
      chart1VotesByParty[party] += vote;

      if (TYPE_SET.has(rowType)) {
        byType[rowType][party] += vote;

        if (PARTY_SET.has(winner)) {
          byWinner[winner].byType[rowType][party] += vote;
        }
      }

      matchedThisRow = true;
    });

    if (!matchedThisRow) {
      return;
    }

    matchedRows += 1;
    totalVotesCastSum += votesCast;
    if (TYPE_SET.has(rowType)) {
      totalVotesCastByType[rowType] += votesCast;
    }

    if (PARTY_SET.has(winner)) {
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
    combinedTotal,
    chart1VotesByParty,
    totalVotesCastSum,
    totalVotesCastByType
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
  if (!state.data) return;

  const { chart1VotesByParty, totalVotesCastSum } = state.data;

  compareChartEl.innerHTML = `<div class="stat-pair">${PARTY_ORDER.map((party) => {
    const votes = chart1VotesByParty[party];
    const share = totalVotesCastSum ? (votes / totalVotesCastSum) * 100 : 0;
    return `<div class="stat-block stat-block--${party}">
        <div class="stat-share">${formatPercent(share)}</div>
        <div class="stat-label">of total votes cast</div>
        <div class="stat-votes">${formatNumber(votes)} votes</div>
        <div class="stat-party">${PARTY_LABELS[party]}</div>
      </div>`;
  }).join("")}</div>`;

  const leadParty = chart1VotesByParty.bnp >= chart1VotesByParty.jamaat ? "bnp" : "jamaat";
  const voteGap = Math.abs(chart1VotesByParty.bnp - chart1VotesByParty.jamaat);
  const gapShare = totalVotesCastSum ? (voteGap / totalVotesCastSum) * 100 : 0;
  compareCaptionEl.innerHTML = `<span class="accent">${PARTY_LABELS[leadParty]}</span> leads by <strong>${formatNumber(voteGap)}</strong> votes — a margin of ${formatPercent(gapShare)} of total votes cast across all 98 centres.`;
}

function renderDumbbellScope(scopeKey) {
  if (!state.data || !distributionScopes[scopeKey]) return;

  const scope = distributionScopes[scopeKey];
  const byType = scope.getByType(state.data);
  const matchedRows = scope.getMatchedRows(state.data);

  const castF = state.data.totalVotesCastByType?.FEMALE || 0;
  const castM = state.data.totalVotesCastByType?.MALE || 0;

  if (!castF && !castM) {
    scope.chartEl.innerHTML = `<p class="chart-empty">No BNP/Jamaat vote totals found for ${scope.label}.</p>`;
    scope.captionEl.textContent = "";
    return;
  }

  const partyData = PARTY_ORDER.map((party) => ({
    party,
    f: castF ? (byType.FEMALE[party] / castF) * 100 : 0,
    m: castM ? (byType.MALE[party] / castM) * 100 : 0
  }));

  const allVals = partyData.flatMap((d) => [d.f, d.m]);
  const minV = Math.floor(Math.min(...allVals)) - 2;
  const maxV = Math.ceil(Math.max(...allVals)) + 2;
  const toLeftPct = (v) => ((v - minV) / (maxV - minV) * 100).toFixed(2) + "%";
  const toLeftNum = (v) => (v - minV) / (maxV - minV) * 100;

  // axis
  let axisHtml = `<div class="dumbbell-axis-row"><div></div><div class="dumbbell-axis">`;
  for (let v = Math.ceil(minV); v <= Math.floor(maxV); v++) {
    if (v % 2 !== 0) continue;
    axisHtml += `<div class="dumbbell-tick" style="left:${((v - minV) / (maxV - minV) * 100).toFixed(2)}%">${v}%</div>`;
  }
  axisHtml += `</div></div>`;

  const rowsHtml = partyData.map(({ party, f, m }) => {
    const fLeft = toLeftNum(f);
    const mLeft = toLeftNum(m);
    const connLeft = Math.min(fLeft, mLeft);
    const connWidth = Math.abs(fLeft - mLeft);
    const gap = Math.abs(f - m).toFixed(1);
    const midLeft = ((fLeft + mLeft) / 2).toFixed(2);
    const showGap = connWidth > 2;

    return `<div class="dumbbell-row">
      <div class="dumbbell-party dumbbell-party--${party}">${PARTY_LABELS[party]}</div>
      <div class="dumbbell-track">
        <div class="dumbbell-connector dumbbell-connector--${party}" style="left:${connLeft.toFixed(2)}%;width:${connWidth.toFixed(2)}%"></div>
        ${showGap ? `<div class="dumbbell-gap-label" style="left:${midLeft}%">${gap}pp</div>` : ""}
        <div class="dumbbell-dot dumbbell-dot--female" style="left:${fLeft.toFixed(2)}%" title="Female centres: ${formatPercent(f)}"></div>
        <div class="dumbbell-label dumbbell-label--below" style="left:${fLeft.toFixed(2)}%">${formatPercent(f)}</div>
        <div class="dumbbell-dot dumbbell-dot--male" style="left:${mLeft.toFixed(2)}%" title="Male centres: ${formatPercent(m)}"></div>
        <div class="dumbbell-label dumbbell-label--above" style="left:${mLeft.toFixed(2)}%">${formatPercent(m)}</div>
      </div>
    </div>`;
  }).join("");

  scope.chartEl.innerHTML = axisHtml + rowsHtml;

  const jd = partyData.find((d) => d.party === "jamaat");
  const jamaatGap = jd.f - jd.m;
  const sign = jamaatGap >= 0 ? "+" : "";
  scope.captionEl.innerHTML = `${formatNumber(matchedRows)} centres. Share of total votes cast by gender. Jamaat female: <strong>${formatPercent(jd.f)}</strong> vs male: <strong>${formatPercent(jd.m)}</strong> (${sign}${jamaatGap.toFixed(1)}pp female advantage).`;
}

function renderSlopeChart() {
  const slopeEl = document.getElementById("slopeChart");
  if (!slopeEl || !state.data) return;

  const contexts = [
    { label: "All",         byType: state.data.byType },
    { label: "BNP-won",     byType: state.data.byWinner.bnp.byType },
    { label: "Jamaat-won",  byType: state.data.byWinner.jamaat.byType }
  ];

  function withinGenderShare(byType, gender, party) {
    const total = byType[gender].bnp + byType[gender].jamaat;
    return total ? (byType[gender][party] / total) * 100 : 0;
  }

  const series = [
    { id: "bnp-f",    party: "bnp",    gender: "FEMALE", color: "#1e3a6e", label: "BNP \u00b7 Female",    filled: true  },
    { id: "bnp-m",    party: "bnp",    gender: "MALE",   color: "#1e3a6e", label: "BNP \u00b7 Male",      filled: false },
    { id: "jamaat-f", party: "jamaat", gender: "FEMALE", color: "#8b1a1a", label: "Jamaat \u00b7 Female", filled: true  },
    { id: "jamaat-m", party: "jamaat", gender: "MALE",   color: "#8b1a1a", label: "Jamaat \u00b7 Male",   filled: false }
  ];

  series.forEach((s) => {
    s.values = contexts.map((ctx) => withinGenderShare(ctx.byType, s.gender, s.party));
  });

  const allVals = series.flatMap((s) => s.values);
  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const minV = Math.floor(rawMin / 5) * 5;
  const maxV = Math.ceil(rawMax / 5) * 5;

  const W = 500, H = 210;
  const PAD = { top: 20, right: 86, bottom: 30, left: 42 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;
  const xs = contexts.map((_, i) => PAD.left + (i / (contexts.length - 1)) * cW);
  const toY = (v) => PAD.top + ((maxV - v) / (maxV - minV)) * cH;

  let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;overflow:visible" role="img" aria-label="Slope chart">`;

  // Gridlines + Y labels
  for (let v = minV; v <= maxV; v += 5) {
    const y = toY(v).toFixed(1);
    svg += `<line x1="${PAD.left}" x2="${W - PAD.right}" y1="${y}" y2="${y}" stroke="rgba(196,184,154,0.55)" stroke-width="1"/>`;
    svg += `<text x="${PAD.left - 5}" y="${y}" text-anchor="end" dominant-baseline="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#6b5e4e">${v}%</text>`;
  }

  // Column lines + X labels
  xs.forEach((x, i) => {
    svg += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${PAD.top}" y2="${H - PAD.bottom}" stroke="rgba(196,184,154,0.9)" stroke-width="1"/>`;
    svg += `<text x="${x.toFixed(1)}" y="${H - 6}" text-anchor="middle" font-family="IBM Plex Mono,monospace" font-size="9" fill="#6b5e4e">${contexts[i].label.toUpperCase()}</text>`;
  });

  // Compute final y positions for label nudging
  const endYs = series.map((s) => toY(s.values[2]));
  // Sort by y position (ascending = higher on chart) and assign nudges
  const nudges = {};
  series.forEach((s, si) => {
    nudges[s.id] = 0;
    series.forEach((s2, sj) => {
      if (si !== sj && s.color === s2.color) {
        const dy = endYs[si] - endYs[sj];
        if (Math.abs(dy) < 14) nudges[s.id] = dy < 0 ? -6 : 6;
      }
    });
  });

  // Lines
  series.forEach((s) => {
    const opacity = s.filled ? "1" : "0.48";
    const dash = s.filled ? "none" : "5 3";
    const pts = s.values.map((v, i) => `${xs[i].toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
    svg += `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="1.8" stroke-opacity="${opacity}" stroke-dasharray="${dash}"/>`;
  });

  // Dots + end labels
  series.forEach((s) => {
    const opacity = s.filled ? "1" : "0.48";
    s.values.forEach((v, i) => {
      const x = xs[i].toFixed(1);
      const y = toY(v).toFixed(1);
      if (s.filled) {
        svg += `<circle cx="${x}" cy="${y}" r="5" fill="${s.color}" opacity="${opacity}"/>`;
      } else {
        svg += `<circle cx="${x}" cy="${y}" r="4" fill="#f5f0e8" stroke="${s.color}" stroke-width="1.8" stroke-opacity="${opacity}"/>`;
      }
      if (i === 2) {
        const labelY = (toY(v) + (nudges[s.id] || 0)).toFixed(1);
        svg += `<text x="${(xs[i] + 9).toFixed(1)}" y="${labelY}" dominant-baseline="middle" font-family="IBM Plex Mono,monospace" font-size="9.5" fill="${s.color}" opacity="${opacity}">${v.toFixed(1)}%</text>`;
      }
    });
  });

  svg += `</svg>`;

  const legendHtml = `<div class="slope-legend">${series.map((s) => {
    const opacity = s.filled ? "1" : "0.48";
    const dash = s.filled ? "none" : "5 3";
    return `<span class="slope-legend-item" style="color:${s.color};opacity:${opacity}">
      <svg width="20" height="10" viewBox="0 0 20 10" style="flex-shrink:0;vertical-align:middle">
        <line x1="0" y1="5" x2="20" y2="5" stroke="${s.color}" stroke-width="1.8" stroke-dasharray="${dash}"/>
        ${s.filled ? `<circle cx="10" cy="5" r="3.5" fill="${s.color}"/>` : `<circle cx="10" cy="5" r="3" fill="#f5f0e8" stroke="${s.color}" stroke-width="1.5"/>`}
      </svg>
      ${s.label}
    </span>`;
  }).join("")}</div>`;

  slopeEl.innerHTML = legendHtml + svg;

  const slopeCapEl = document.getElementById("slopeCaption");
  if (slopeCapEl) {
    const jF = series.find((s) => s.id === "jamaat-f");
    const jM = series.find((s) => s.id === "jamaat-m");
    const jFwon = jF.values[2].toFixed(1);
    const jMwon = jM.values[2].toFixed(1);
    const delta = (jF.values[2] - jM.values[2]).toFixed(1);
    const sign = delta >= 0 ? "+" : "";
    slopeCapEl.innerHTML = `In Jamaat-won constituencies, Jamaat’s female share reaches 58.6% compared with 53.7% among men (+5.0pp), while BNP’s female share falls to 41.4% versus 46.3% among men (-4.9pp).`;
  }
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

  setShareLinks(topbarShareXEl, topbarShareFacebookEl, topbarShareLinkedInEl, encodedUrl, encodedTitle);

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

  let rafId = 0;

  const updateProgress = () => {
    rafId = 0;

    const doc = document.documentElement;
    const maxScroll = doc.scrollHeight - window.innerHeight;
    const ratio = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    const width = Math.max(0, Math.min(100, ratio * 100));
    scrollProgressBarEl.style.width = width.toFixed(2) + "%";
  };

  const queueUpdate = () => {
    if (rafId) {
      return;
    }

    rafId = window.requestAnimationFrame(updateProgress);
  };

  updateProgress();
  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate);
}

function renderAll() {
  renderCompare();
  renderSlopeChart();
  Object.keys(distributionScopes).forEach((scopeKey) => renderDumbbellScope(scopeKey));
  renderRawTable();
}

function wireControls() {
  rawTablePaginationEl.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-page]");
    if (!button) return;
    const nextPage = Number(button.dataset.page);
    if (!Number.isInteger(nextPage) || nextPage < 1 || nextPage === state.tablePage) return;
    state.tablePage = nextPage;
    renderRawTable();
  });
}

function clearAllCharts() {
  compareChartEl.innerHTML = "";
  compareCaptionEl.textContent = "";
  const slopeEl = document.getElementById("slopeChart");
  if (slopeEl) slopeEl.innerHTML = "";
  const slopeCap = document.getElementById("slopeCaption");
  if (slopeCap) slopeCap.textContent = "";

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
