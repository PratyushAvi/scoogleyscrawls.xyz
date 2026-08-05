/**
 * @typedef {Object} CoffeeEntry
 * @property {string} bagName
 * @property {string} [origin]      where the beans are from
 * @property {string} roaster
 * @property {string} [roasterUrl]
 * @property {string} location
 * @property {string} [locationUrl]
 * @property {string} date          ISO yyyy-mm-dd
 * @property {string} tastingNotes
 * @property {[string, string, string]} [colors]  three CSS colors for the title gradient
 * @property {string} [image]
 * @property {string} [thoughts]
 */

/** @type {CoffeeEntry[]} */
let entries = [];

/** Cards start expanded; this tracks the ones the reader has closed. Keyed by index into `entries`. */
const collapsed = new Set();

/** Missing or empty fields sort last rather than throwing. */
function byField(key) {
    return (a, b) => {
        const x = a[key] ?? '', y = b[key] ?? '';
        if (!x || !y) return (!x ? 1 : 0) - (!y ? 1 : 0);
        return x.localeCompare(y);
    };
}

const sorters = {
    // Reversed on the value only, so blank dates stay at the bottom either way.
    'date-desc': (a, b) => {
        const x = a.date ?? '', y = b.date ?? '';
        if (!x || !y) return (!x ? 1 : 0) - (!y ? 1 : 0);
        return y.localeCompare(x);
    },
    'date-asc': byField('date'),
    'bagName': byField('bagName'),
    'origin': byField('origin'),
    'roaster': byField('roaster'),
    'location': byField('location'),
};

/** yyyy-mm-dd -> "18 Jul 2026", parsed as local time so the day doesn't shift. */
function formatDate(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
        day: 'numeric', month: 'short', year: 'numeric',
    });
}

/** Builds a `<li>` with a bold label; `value` is a node or a string. */
function detail(label, value) {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.className = 'font-semibold';
    span.textContent = `${label}: `;
    li.append(span, value);
    return li;
}

/** Returns a link when a url is given, otherwise the bare text. */
function linkNode(text, url) {
    if (!url) return text;
    const a = document.createElement('a');
    a.className = 'link';
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.textContent = text;
    return a;
}

/**
 * One card. Collapsed hides the bag picture and my thoughts, so the grid
 * drops to a single full-width column.
 * @param {CoffeeEntry} entry
 * @param {number} index
 */
function renderCard(entry, index) {
    const isOpen = !collapsed.has(index);

    const card = document.createElement('div');
    card.className = 'grid grid-cols-4 m-[20px]';

    if (isOpen && entry.image) {
        const imageCol = document.createElement('div');
        imageCol.className = 'col-span-1';
        const img = document.createElement('img');
        img.className = 'w-full object-contain p-[30px] mx-auto my-auto';
        img.src = entry.image;
        img.alt = `${entry.bagName} bag`;
        imageCol.append(img);
        card.append(imageCol);
    }

    const body = document.createElement('div');
    body.className = isOpen && entry.image ? 'col-span-3' : 'col-span-4';

    const heading = document.createElement('button');
    heading.type = 'button';
    heading.className = 'font-bold text-2xl text-left w-full cursor-pointer';
    heading.setAttribute('aria-expanded', String(isOpen));
    heading.addEventListener('click', () => {
        isOpen ? collapsed.add(index) : collapsed.delete(index);
        render();
    });

    // Arrow stays outside the gradient span so it keeps the normal text color.
    const arrow = document.createElement('span');
    arrow.textContent = isOpen ? '▾ ' : '▸ ';

    const name = document.createElement('span');
    name.textContent = entry.bagName;
    if (entry.colors?.length === 3) {
        // Tailwind can't emit classes for runtime values, so this is inline.
        // `inline-block` keeps the gradient box from splitting oddly across wrapped lines.
        name.style.backgroundImage = `linear-gradient(to right, ${entry.colors.join(', ')})`;
        name.style.backgroundClip = 'text';
        name.style.webkitBackgroundClip = 'text';
        name.style.color = 'transparent';
        name.style.display = 'inline-block';
    }

    heading.append(arrow, name);

    // Blank fields are skipped so half-filled entries don't show empty labels.
    const list = document.createElement('ul');
    if (entry.origin) list.append(detail('Origin', entry.origin));
    if (entry.roaster) list.append(detail('Roaster', linkNode(entry.roaster, entry.roasterUrl)));
    if (entry.location) list.append(detail('Location', linkNode(entry.location, entry.locationUrl)));
    if (entry.date) list.append(detail('Date', formatDate(entry.date)));
    if (entry.tastingNotes) list.append(detail('Tasting Notes', entry.tastingNotes));
    if (isOpen && entry.thoughts) {
        list.append(detail('My thoughts', entry.thoughts));
    }

    body.append(heading, list);
    card.append(body);
    return card;
}

function render() {
    const list = document.querySelector('#coffee-list');
    const sortBy = /** @type {HTMLSelectElement} */ (document.querySelector('#sort-by')).value;
    const compare = sorters[sortBy] ?? sorters['date-desc'];

    // Sort a copy of the index list so `collapsed` keys stay stable across re-sorts.
    const order = entries
        .map((entry, index) => ({ entry, index }))
        .sort((a, b) => compare(a.entry, b.entry));

    list.replaceChildren(...order.map(({ entry, index }) => renderCard(entry, index)));
}

async function init() {
    const list = document.querySelector('#coffee-list');
    try {
        const res = await fetch('./coffee.json');
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        entries = await res.json();
    } catch (err) {
        list.textContent = `Could not load coffee.json — ${err.message}. If you opened this file directly, serve it instead (npx serve).`;
        return;
    }

    document.querySelector('#sort-by').addEventListener('change', render);
    document.querySelector('#toggle-all').addEventListener('click', () => {
        if (collapsed.size === 0) {
            entries.forEach((_, i) => collapsed.add(i));
        } else {
            collapsed.clear();
        }
        render();
    });

    render();
}

init();
