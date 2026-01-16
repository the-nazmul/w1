/* =========================
   Generic toggle handling
   ========================= */

function wireToggles() {
    document.addEventListener("click", (e) => {
        const btn = e.target.closest(".bio-toggle, .exp-toggle");
        if (!btn) return;

        const id = btn.getAttribute("aria-controls") || btn.dataset.target;
        if (!id) return;

        const panel = document.getElementById(id) || document.querySelector(id);
        if (!panel) return;

        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));

        // BIO toggle: show/hide the single bio panel
        if (btn.classList.contains("bio-toggle")) {
            panel.hidden = expanded;
            btn.textContent = expanded ? "More" : "Less";
            return;
        }

        // EXPERIENCE global toggle: show/hide all item-more blocks inside the container
        if (btn.classList.contains("exp-toggle")) {
            const moreBlocks = panel.querySelectorAll(".item-more");
            moreBlocks.forEach((blk) => {
                blk.hidden = expanded; // expanded=false -> show all, expanded=true -> hide all
            });

            btn.textContent = expanded ? "Expanded view" : "Collapsed view";
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

/* =========================
   Selected work: View more
   ========================= */

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



    function initialVisibleCount() {
        const cols = colsPerRow();
        const rows = cols === 3 ? 3 : cols === 2 ? 2 : 1;
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
        visible = Math.min(items.length, visible + colsPerRow());
        render();
    });

    window.addEventListener("resize", () => {
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
