/* =========================
   Generic toggle handling
   ========================= */
function wireToggles() {
    function setExperienceView(panel, expanded) {
        const items = panel.querySelectorAll(".item");

        items.forEach((item) => {
            const more = item.querySelector(".item-more");
            if (!more) return;

            const extraLis = Array.from(more.querySelectorAll("li"));

            if (expanded) {
                // Expanded: show all extra bullets
                if (extraLis.length) more.hidden = false;
                extraLis.forEach((li) => (li.hidden = false));
            } else {
                // Collapsed/default: base bullet + first extra bullet (if any) => 2 bullets total
                if (!extraLis.length) {
                    more.hidden = true;
                    return;
                }
                more.hidden = false;
                extraLis.forEach((li, i) => (li.hidden = i !== 0));
            }
        });
    }

    // --- INIT: enforce default view (2 bullets where possible) ---
    const expBtn = document.querySelector(".exp-toggle");
    const expPanelId = expBtn?.getAttribute("aria-controls") || expBtn?.dataset.target;
    const expPanel = expPanelId
        ? document.getElementById(expPanelId) || document.querySelector(expPanelId)
        : null;

    if (expBtn && expPanel) {
        expBtn.setAttribute("aria-expanded", "false");
        expBtn.textContent = "Expanded View";
        setExperienceView(expPanel, false);
    }

    // --- CLICK HANDLER ---
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".bio-toggle, .exp-toggle, .link-toggle");
        if (!btn) return;

        const id = btn.getAttribute("aria-controls") || btn.dataset.target;
        if (!id) return;

        const panel = document.getElementById(id) || document.querySelector(id);
        if (!panel) return;

        const isExpanded = btn.getAttribute("aria-expanded") === "true";
        const nextExpanded = !isExpanded;
        btn.setAttribute("aria-expanded", String(nextExpanded));

        if (btn.classList.contains("bio-toggle")) {
            panel.hidden = isExpanded;
            btn.textContent = isExpanded ? "More" : "Less";
            return;
        }

        if (btn.classList.contains("link-toggle")) {
            panel.hidden = isExpanded;
            return;
        }

        if (btn.classList.contains("exp-toggle")) {
            setExperienceView(panel, nextExpanded);
            btn.textContent = nextExpanded ? "Collapsed View" : "Expanded View";
            return;
        }
    });
}


/* =========================
   Selected work filters
   ========================= */

function wireWorkFilters() {
    const grid = document.getElementById("workGrid");
    if (!grid) return;

    const filterBar = document.querySelector(".work-filters");
    if (!filterBar) return;

    const filterButtons = filterBar.querySelectorAll(".filter");
    if (!filterButtons.length) return;

    function setActiveFilter(tag) {
        filterButtons.forEach((btn) => {
            btn.setAttribute("aria-pressed", String(btn.dataset.filter === tag));
        });

        grid.querySelectorAll(".work").forEach((card) => {
            const tags = (card.dataset.tags || "").split(/\s+/).filter(Boolean);
            card.hidden = !(tag === "all" || tags.includes(tag));
        });
    }

    // Default state: All
    setActiveFilter("all");

    // Top filter buttons
    filterButtons.forEach((btn) => {
        btn.addEventListener("click", () => setActiveFilter(btn.dataset.filter));
    });

    // Per-card icon tags (delegated)
    grid.addEventListener("click", (e) => {
        const tagBtn = e.target.closest(".tag");
        if (!tagBtn) return;

        e.preventDefault(); // don't open article
        setActiveFilter(tagBtn.dataset.filter);
    });
}

function wireWorkViewMore() {
    const grid = document.getElementById("workGrid");
    const btn = document.getElementById("workMore");
    if (!grid || !btn) return;

    const items = Array.from(grid.querySelectorAll(".work"));

    function colsPerRow() {
        if (window.matchMedia("(max-width: 640px)").matches) return 2;
        if (window.matchMedia("(max-width: 980px)").matches) return 2;
        return 3;
    }

    // Always show 2 rows on initial load, across all devices
    function initialVisibleCount() {
        const cols = colsPerRow();
        const rows = 2;
        return rows * cols;
    }

    let visible = initialVisibleCount();

    function render() {
        const total = items.length;

        items.forEach((el, i) => {
            el.hidden = i >= visible;
        });

        const remaining = total - visible;
        if (remaining > 0) {
            btn.hidden = false;
            btn.textContent = `View more (${remaining})`;
        } else {
            btn.hidden = true;
        }
    }

    render();

    btn.addEventListener("click", () => {
        // Add one full row each click
        visible = Math.min(items.length, visible + colsPerRow());
        render();
    });

    window.addEventListener("resize", () => {
        // Keep at least 2 rows after resize, but don't hide already-revealed items
        visible = Math.max(visible, initialVisibleCount());
        render();
    });
}


/* =========================
   Back to top
   ========================= */

function scrollSmoothTo(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;

    el.scrollIntoView({
        block: "start",
        behavior: "smooth",
    });
}

/* =========================
   External links
   ========================= */

function wireExternalLinks() {
    document.querySelectorAll('a[href^="http"]').forEach((a) => {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
    });
}

/* =========================
   Init
   ========================= */

document.addEventListener("DOMContentLoaded", () => {
    wireToggles();
    wireWorkFilters();
    wireWorkViewMore();
    wireExternalLinks();
});
