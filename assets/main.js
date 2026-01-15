const bioToggle = document.querySelector('.bio-toggle');
const bioMore = document.querySelector('.bio-more');

if (bioToggle && bioMore) {
    bioToggle.addEventListener('click', () => {
        const expanded = bioToggle.getAttribute('aria-expanded') === 'true';
        bioToggle.setAttribute('aria-expanded', String(!expanded));
        bioMore.hidden = expanded;
        bioToggle.textContent = expanded ? 'More' : 'Close';
    });
}


const grid = document.getElementById('workGrid');
const filterButtons = document.querySelectorAll('.filter');

function setActiveFilter(tag) {
    filterButtons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === tag || (tag === 'all' && b.dataset.filter === 'all'))));

    grid.querySelectorAll('.work').forEach(card => {
        const tags = (card.dataset.tags || '').split(/\s+/).filter(Boolean);
        const show = tag === 'all' || tags.includes(tag);
        card.hidden = !show;
    });
}

// top filter buttons
filterButtons.forEach(btn => {
    btn.addEventListener('click', () => setActiveFilter(btn.dataset.filter));
});

// per-card icon tags (delegated)
grid.addEventListener('click', (e) => {
    const btn = e.target.closest('.tag');
    if (!btn) return;
    e.preventDefault(); // prevent opening the article link
    setActiveFilter(btn.dataset.filter);
});


document.querySelectorAll('.link-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
        const id = btn.dataset.target;
        const reveal = document.getElementById(id);
        const expanded = btn.getAttribute('aria-expanded') === 'true';

        btn.setAttribute('aria-expanded', String(!expanded));
        reveal.hidden = expanded;
    });
});



function scrollSmoothTo(elementId) {
    var element = document.getElementById(elementId);
    element.scrollIntoView({
        block: 'start',
        behavior: 'smooth'
    });
}




document.addEventListener("DOMContentLoaded", function () {
    const links = document.querySelectorAll('a');

    links.forEach(link => {
        // Check if the href starts with "http" or "https://"
        if (link.getAttribute('href') && link.getAttribute('href').startsWith('http')) {
            link.setAttribute('target', '_blank'); // Open in a new tab
            link.setAttribute('rel', 'noopener noreferrer'); // Security measures
        }
    });
});

