/**
 * components.js — Entity reference web component + Xanadu-style side panel
 *
 * Markup in source pages:
 *   <entity-ref slug="person/cleric/cornelius-a-lapide">Cornelius a Lapide</entity-ref>
 *
 * Desktop (>860px): Card panel appears in right margin, sticky to viewport
 * Mobile (<=860px): Card inserts inline after the source paragraph
 */

// ── Entity Panel (singleton) ──

class EntityPanel {
	constructor() {
		this.stack = [];        // { slug, cardEl, paragraphEl }
		this.index = 0;
		this.cache = new Map(); // slug → { name, meta, description, url }
		this.el = null;
		this.mobileAnchor = null;
		this._scrollHandler = null;
		this._build();
	}

	_build() {
		this.el = document.createElement('aside');
		this.el.id = 'entity-panel';
		this.el.setAttribute('aria-label', 'Entity reference panel');
		this.el.innerHTML = `
      <div class="ep-header">
        <button class="ep-nav ep-prev" aria-label="Previous card" disabled>&#8249;</button>
        <span class="ep-count"></span>
        <button class="ep-nav ep-next" aria-label="Next card" disabled>&#8250;</button>
        <button class="ep-dismiss" aria-label="Close">&times;</button>
      </div>
      <div class="ep-body"></div>
    `;

		this.el.querySelector('.ep-dismiss').addEventListener('click', () => this._dismiss());
		this.el.querySelector('.ep-prev').addEventListener('click', () => this._navigate(-1));
		this.el.querySelector('.ep-next').addEventListener('click', () => this._navigate(1));

		// Close on Escape
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && this.el.classList.contains('active')) {
				this._dismiss();
			}
		});

		document.body.appendChild(this.el);
	}

	async show(slug, paragraphEl) {
		// If already in stack, jump to it
		const existing = this.stack.findIndex(c => c.slug === slug);
		if (existing >= 0) {
			this.index = existing;
			this._render();
			return;
		}

		// Fetch entity data
		const data = await this._fetchEntity(slug);
		if (!data) return;

		// Build card element
		const card = document.createElement('div');
		card.className = 'ep-card';
		card.innerHTML = `
      <h3 class="ep-card-name">${data.name}</h3>
      ${data.meta}
      ${data.mapHtml || ''}
      ${data.description ? `<div class="ep-card-desc">${data.description}</div>` : ''}
      <a href="${data.url}" class="ep-card-link">View full entry &#8594;</a>
    `;

		this.stack.push({ slug, cardEl: card, paragraphEl });
		this.index = this.stack.length - 1;
		this._render();
		this._position(paragraphEl);
		this.el.classList.add('active');
	}

	async _fetchEntity(slug) {
		if (this.cache.has(slug)) return this.cache.get(slug);

		const url = `/index/${slug}.html`;
		try {
			const resp = await fetch(url);
			if (!resp.ok) return null;
			const text = await resp.text();

			const doc = new DOMParser().parseFromString(text, 'text/html');
			const article = doc.querySelector('article#entry');
			if (!article) return null;

			const name = article.querySelector('h1')?.textContent || slug.split('/').pop();

			// Build compact meta from <dl class="entry-meta">
			let meta = '';
			const dl = article.querySelector('.entry-meta');
			if (dl) {
				const pairs = [];
				const dts = dl.querySelectorAll('dt');
				dts.forEach(dt => {
					const dd = dt.nextElementSibling;
					if (dd && dd.tagName === 'DD') {
						// Skip coordinates — shown as map instead
						if (dt.textContent.trim() === 'Coordinates') return;
						pairs.push(`<span class="ep-meta-label">${dt.textContent}</span> ${dd.textContent}`);
					}
				});
				if (pairs.length) {
					meta = `<div class="ep-card-meta">${pairs.join('<br>')}</div>`;
				}
			}

			// Extract map HTML if present
			const mapEl = article.querySelector('.osm-map');
			const mapHtml = mapEl ? mapEl.outerHTML : '';

			// First paragraph of description
			const descP = article.querySelector('#description > p');
			let description = descP ? descP.textContent : '';

			// For year entries (or any with an events section), include events
			const eventsUl = article.querySelector('#events > ul');
			if (eventsUl) {
				const items = [...eventsUl.querySelectorAll('li')].map(li => li.textContent);
				const eventsText = items.map(t => `• ${t}`).join('\n');
				description = description ? `${description}\n\n${eventsText}` : eventsText;
			}

			const data = { name, meta, mapHtml, description, url };
			this.cache.set(slug, data);
			return data;
		} catch (e) {
			console.warn('[entity-panel] fetch failed:', slug, e);
			return null;
		}
	}

	_render() {
		const body = this.el.querySelector('.ep-body');
		body.innerHTML = '';

		if (this.stack.length === 0) {
			this.el.classList.remove('active');
			return;
		}

		body.appendChild(this.stack[this.index].cardEl);

		// Navigation state
		const count = this.el.querySelector('.ep-count');
		const prev = this.el.querySelector('.ep-prev');
		const next = this.el.querySelector('.ep-next');

		if (this.stack.length > 1) {
			count.textContent = `${this.index + 1} / ${this.stack.length}`;
			prev.style.visibility = 'visible';
			next.style.visibility = 'visible';
			prev.disabled = this.index === 0;
			next.disabled = this.index === this.stack.length - 1;
		} else {
			count.textContent = '';
			prev.style.visibility = 'hidden';
			next.style.visibility = 'hidden';
		}
	}

	_navigate(delta) {
		this.index = Math.max(0, Math.min(this.stack.length - 1, this.index + delta));
		this._render();
	}

	_dismiss() {
		if (this.stack.length === 0) return;
		this.stack.splice(this.index, 1);
		if (this.stack.length === 0) {
			this.index = 0;
			this.el.classList.remove('active');
			// On mobile, move panel back to body
			if (this.el.parentNode !== document.body) {
				document.body.appendChild(this.el);
			}
			return;
		}
		this.index = Math.min(this.index, this.stack.length - 1);
		this._render();
	}

	_position(paragraphEl) {
		const mobile = window.innerWidth <= 860;
		if (mobile && paragraphEl) {
			// Insert panel directly after the paragraph
			if (this.el.parentNode !== paragraphEl.parentNode ||
				this.el.previousElementSibling !== paragraphEl) {
				paragraphEl.after(this.el);
			}
		} else {
			// Desktop: panel lives in body, positioned via CSS
			if (this.el.parentNode !== document.body) {
				document.body.appendChild(this.el);
			}
		}
	}
}

// ── <entity-ref> Custom Element ──

class EntityRefElement extends HTMLElement {
	connectedCallback() {
		this.setAttribute('role', 'button');
		this.setAttribute('tabindex', '0');

		this.addEventListener('click', (e) => {
			e.preventDefault();
			this._activate();
		});
		this.addEventListener('keydown', (e) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				this._activate();
			}
		});
	}

	_activate() {
		const slug = this.getAttribute('slug');
		if (!slug) return;

		const paragraph = this.closest('p');
		getPanel().show(slug, paragraph);
	}
}

customElements.define('entity-ref', EntityRefElement);

// ── Singleton accessor ──

let _panel = null;
function getPanel() {
	if (!_panel) _panel = new EntityPanel();
	return _panel;
}

// ── Inject styles ──

const STYLES = `
/* ── entity-ref inline styling ── */

entity-ref {
  color: #4a4a8a;
  border-bottom: 1px dotted #4a4a8a;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
entity-ref:hover,
entity-ref:focus {
  color: #2a2a6a;
  border-bottom-color: #2a2a6a;
  outline: none;
}

/* ── Entity panel ── */

#entity-panel {
  display: none;
  line-height: 1.5;
  z-index: 100;
  max-height: 80vh;
  overflow-y: auto;
}

#entity-panel.active {
  display: block;
}

/* Desktop: fixed side panel in the right margin */
@media (min-width: 861px) {
  #entity-panel {
    position: fixed;
    top: 2rem;
    right: 2rem;
    width: min(380px, calc((100vw - 70ch) / 2 - 3rem));
    min-width: 260px;
  }
}

/* Mobile: inline after paragraph */
@media (max-width: 860px) {
  #entity-panel {
    position: relative;
    margin: 1em 0;
    width: 100%;
  }
}

/* ── Panel chrome ── */

.ep-header {
  display: flex;
  align-items: center;
  padding: 0.4em 0.6em;
  gap: 0.4em;
}

.ep-count {
  flex: 1;
  text-align: center;
  color: #666;
}

.ep-nav,
.ep-dismiss {
  background: none;
  border: 1px solid #eee;
  border-radius: 3px;
  cursor: pointer;
  font-size: 1.1em;
  line-height: 1;
  padding: 0.15em 0.5em;
  color: #444;
	background-color: #fafafa;
	box-shadow: 2px 2px 3px #0000004f;
  line-height: 1.3;
}
.ep-nav:hover:not(:disabled),
.ep-dismiss:hover {
  background: #e8e7e0;
}
.ep-nav:disabled {
  opacity: 0.3;
  cursor: default;
}

/* ── Card content ── */

.ep-body {
  padding: 0.8em;
}

.ep-card-name {
  margin: 0 0 0.4em;
  font-size: 1.1em;
  color: #333;
}

.ep-card-meta {
  color: #666;
  margin-bottom: 0.5em;
  line-height: 1.6;
}
.ep-meta-label {
  font-weight: 600;
  color: #555;
}

.ep-card-desc {
  margin: 0.5em 0;
  color: #444;
  white-space: pre-line;
}

.ep-card-link {
  display: inline-block;
  margin-top: 0.5em;
  color: #4a4a8a;
  text-decoration: none;
}
.ep-card-link:hover {
  text-decoration: underline;
}

/* ── Satellite map (in entity cards) ── */

.osm-map {
  position: relative;
  width: 100%;
  max-width: 500px;
  height: 280px;
  overflow: hidden;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin: 0.6em 0;
  background: #1a1a2e;
}
.ep-card .osm-map {
  max-width: 100%;
  height: 180px;
}
.osm-map-grid {
  position: absolute;
  display: grid;
  grid-template-columns: repeat(3, 256px);
}
.osm-map-grid img {
  width: 256px;
  height: 256px;
  display: block;
}
.osm-map-pin {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  background: #e53935;
  border: 2px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 1px 4px rgba(0,0,0,0.5);
  pointer-events: none;
}
.osm-map-attr {
  position: absolute;
  bottom: 0;
  right: 0;
  background: rgba(0,0,0,0.5);
  font-size: 0.6em;
  padding: 1px 5px;
  color: rgba(255,255,255,0.8);
}

/* ── Passage highlights ── */

mark.passage-highlight {
  background-color: #fef3c7;
  border-bottom: 2px solid #d4a017;
  transition: background-color 1s ease, border-color 1s ease;
}
mark.passage-highlight.fade-out {
  background-color: transparent;
  border-color: transparent;
}
.passage-highlight-para {
  background-color: #fef3c7;
  transition: background-color 1s ease;
}
`;

// ── Passage annotations (sidecar) ──

let _annotations = null;

function getAnnotations() {
	if (_annotations) return _annotations;
	const el = document.getElementById('passage-annotations');
	if (!el) return [];
	try {
		_annotations = JSON.parse(el.textContent);
	} catch {
		_annotations = [];
	}
	return _annotations;
}

// ── Highlight a passage using sidecar character offsets ──

// Walk text nodes inside an element, counting characters (text-only, skipping tags).
// Returns the text node + local offset for a given character position.
function findTextPosition(el, charOffset) {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	let pos = 0;
	let node;
	while ((node = walker.nextNode())) {
		const len = node.textContent.length;
		if (pos + len > charOffset) {
			return { node, offset: charOffset - pos };
		}
		pos += len;
	}
	return null;
}

// Remove any existing highlight marks
function clearHighlights() {
	document.querySelectorAll('mark.passage-highlight').forEach(mark => {
		const parent = mark.parentNode;
		while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
		parent.removeChild(mark);
		parent.normalize(); // merge adjacent text nodes
	});
}

function highlightPassage() {
	clearHighlights();

	const hash = location.hash.slice(1);
	if (!hash) return;

	// Check if this is a sidecar annotation ID (contains -s-)
	if (!hash.includes('-s-')) {
		// Regular anchor — just scroll to it
		const target = document.getElementById(hash);
		if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
		return;
	}

	const annotations = getAnnotations();
	const annotation = annotations.find(a => a.id === hash);
	if (!annotation) {
		// Fallback: try to scroll to the paragraph
		const paraId = hash.replace(/-s-[a-f0-9]+$/, '');
		const para = document.getElementById(paraId);
		if (para) para.scrollIntoView({ behavior: 'smooth', block: 'center' });
		return;
	}

	const para = document.getElementById(annotation.paragraph);
	if (!para) return;

	// Find the text positions using character offsets
	const startPos = findTextPosition(para, annotation.start);
	const endPos = findTextPosition(para, annotation.end);
	if (!startPos || !endPos) {
		// Offsets don't match — just scroll to paragraph
		para.scrollIntoView({ behavior: 'smooth', block: 'center' });
		return;
	}

	// Create a Range and wrap it in a <mark>
	try {
		const range = document.createRange();
		range.setStart(startPos.node, startPos.offset);
		range.setEnd(endPos.node, endPos.offset);

		const mark = document.createElement('mark');
		mark.className = 'passage-highlight';
		mark.id = hash;
		range.surroundContents(mark);

		// Scroll and fade
		mark.scrollIntoView({ behavior: 'smooth', block: 'center' });
		setTimeout(() => mark.classList.add('fade-out'), 5000);
		setTimeout(() => {
			clearHighlights();
		}, 6000);
	} catch (e) {
		// surroundContents can fail if range spans multiple elements
		// Fall back to highlighting the whole paragraph
		para.classList.add('passage-highlight-para');
		para.scrollIntoView({ behavior: 'smooth', block: 'center' });
		setTimeout(() => para.classList.remove('passage-highlight-para'), 6000);
	}
}

// Auto-open entity card when arriving from an entity page via ?entity=slug
function autoShowEntity() {
	const params = new URLSearchParams(location.search);
	const entitySlug = params.get('entity');
	if (!entitySlug) return;

	const hash = location.hash.slice(1);
	let paragraph = null;

	if (hash) {
		// Try to find the paragraph from the annotation
		if (hash.includes('-s-')) {
			const annotations = getAnnotations();
			const annotation = annotations.find(a => a.id === hash);
			if (annotation) {
				paragraph = document.getElementById(annotation.paragraph);
			}
		}
		if (!paragraph) {
			const target = document.getElementById(hash);
			paragraph = target ? (target.closest('p') || target) : null;
		}
	}

	getPanel().show(entitySlug, paragraph);
}

// Run on load and on hash change
window.addEventListener('hashchange', highlightPassage);
window.addEventListener('DOMContentLoaded', () => {
	highlightPassage();
	autoShowEntity();
});

// ── Inject styles ──

if (!document.getElementById('entity-panel-styles')) {
	const style = document.createElement('style');
	style.id = 'entity-panel-styles';
	style.textContent = STYLES;
	document.head.appendChild(style);
}
