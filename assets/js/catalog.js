/* =========================================================
   OptiCatalog — data-driven product catalog engine
   Powers /eyeglasses.html and /sunglasses.html: loads
   /assets/data/{eyeglasses,sunglasses}.json, renders category +
   shape filters (only when products exist for that value), the
   product grid, an honest empty state, and a 5-angle product
   viewer (drag / swipe / keyboard / zoom / fullscreen).

   Exposes: window.OptiCatalog.getById(id)
========================================================= */
(function () {
    const grid = document.getElementById('productGrid');
    if (!grid) return; // only on catalog pages

    const isSun = document.body?.dataset?.catalog === 'sunglasses';
    const DATA_URL = isSun ? '/assets/data/sunglasses.json' : '/assets/data/eyeglasses.json';
    const NOUN = isSun ? 'sunglasses' : 'eyeglasses';
    const NOUN_SINGULAR = isSun ? 'sunglasses' : 'eyeglasses';

    const CATEGORY_LABELS = { men: 'Men', women: 'Women', kids: 'Kids', unisex: 'Unisex' };
    const SHAPE_LABELS = {
        rectangle: 'Rectangle', round: 'Round', square: 'Square', aviator: 'Aviator',
        'cat-eye': 'Cat Eye', wayfarer: 'Wayfarer', rimless: 'Rimless',
        'half-rim': 'Half Rim', 'full-rim': 'Full Rim'
    };

    let products = [];
    let activeCategory = 'all';
    let activeShape = 'all';

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    function whatsappUrl(product) {
        const msg = `Hello Shree Hari Chasma Ghar, I am interested in:\n${product.name} (${NOUN_SINGULAR}).\nCould you tell me more?\n\n${window.location.origin}${window.location.pathname}`;
        return `https://wa.me/918732969601?text=${encodeURIComponent(msg)}`;
    }

    // ---------------- Data load ----------------
    async function loadProducts() {
        try {
            const res = await fetch(DATA_URL, { cache: 'no-store' });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            products = Array.isArray(data) ? data : [];
        } catch (e) {
            console.error('OptiCatalog: failed to load', DATA_URL, e);
            products = [];
        }
        render();
    }

    // ---------------- Filters ----------------
    function buildFilters() {
        const catBar = document.getElementById('categoryFilterBar');
        const shapeBar = document.getElementById('shapeFilterBar');
        if (!catBar || !shapeBar) return;

        const catsPresent = new Set(products.map(p => p.category).filter(Boolean));
        const shapesPresent = new Set(products.map(p => p.shape).filter(Boolean));

        if (!products.length) {
            catBar.innerHTML = '';
            shapeBar.innerHTML = '';
            catBar.hidden = true;
            shapeBar.hidden = true;
            return;
        }

        catBar.hidden = false;
        catBar.innerHTML = ['all', ...Object.keys(CATEGORY_LABELS)]
            .filter(c => c === 'all' || catsPresent.has(c))
            .map(c => `<button type="button" class="filter-btn${c === activeCategory ? ' active' : ''}" data-filter-category="${c}">${c === 'all' ? 'All' : esc(CATEGORY_LABELS[c])}</button>`)
            .join('');

        if (shapesPresent.size) {
            shapeBar.hidden = false;
            shapeBar.innerHTML = ['all', ...Object.keys(SHAPE_LABELS)]
                .filter(s => s === 'all' || shapesPresent.has(s))
                .map(s => `<button type="button" class="filter-btn filter-btn-shape${s === activeShape ? ' active' : ''}" data-filter-shape="${s}">${s === 'all' ? 'All Styles' : esc(SHAPE_LABELS[s])}</button>`)
                .join('');
        } else {
            shapeBar.hidden = true;
            shapeBar.innerHTML = '';
        }

        catBar.querySelectorAll('[data-filter-category]').forEach(btn => {
            btn.addEventListener('click', () => {
                activeCategory = btn.dataset.filterCategory;
                buildFilters();
                render();
            });
        });
        shapeBar.querySelectorAll('[data-filter-shape]').forEach(btn => {
            btn.addEventListener('click', () => {
                activeShape = btn.dataset.filterShape;
                buildFilters();
                render();
            });
        });
    }

    function getFiltered() {
        return products.filter(p =>
            (activeCategory === 'all' || p.category === activeCategory) &&
            (activeShape === 'all' || p.shape === activeShape)
        );
    }

    // ---------------- Grid ----------------
    function productCard(p) {
        const metaParts = [];
        if (p.category && CATEGORY_LABELS[p.category]) metaParts.push(CATEGORY_LABELS[p.category]);
        if (p.shape && SHAPE_LABELS[p.shape]) metaParts.push(SHAPE_LABELS[p.shape]);
        const priceHtml = (typeof p.price === 'number' && p.price > 0)
            ? `<p class="product-price">₹${p.price.toLocaleString('en-IN')}</p>`
            : '';
        const alt = esc(p.altText || p.name);
        return `
        <div class="col-12 col-sm-6 col-lg-4" data-aos="fade-up">
            <div class="product-card">
                <button type="button" class="product-image product-image-btn" data-open-detail="${esc(p.id)}" aria-label="View details for ${esc(p.name)}">
                    <img src="${esc(p.images?.front)}" alt="${alt}" loading="lazy" decoding="async" width="400" height="400">
                </button>
                <div class="product-details">
                    <h3 class="product-title">${esc(p.name)}</h3>
                    <p class="product-meta">${esc(metaParts.join(' • '))}</p>
                    ${priceHtml}
                    <div class="product-actions">
                        <button type="button" class="tryon-card-btn" data-tryon="${esc(p.id)}"><i class="fas fa-camera"></i> Try On</button>
                        <button type="button" class="product-view-btn" data-open-detail="${esc(p.id)}"><i class="fas fa-images"></i> View Details</button>
                    </div>
                    <a class="product-whatsapp-btn" href="${whatsappUrl(p)}" target="_blank" rel="noopener" aria-label="Enquire about ${esc(p.name)} on WhatsApp">
                        <i class="fab fa-whatsapp"></i> Enquire on WhatsApp
                    </a>
                </div>
            </div>
        </div>`;
    }

    function emptyStateHtml() {
        const label = isSun ? 'sunglasses' : 'eyeglasses';
        return `
        <div class="col-12">
            <div class="catalog-empty-state">
                <i class="fas fa-glasses" aria-hidden="true"></i>
                <h3>New frames arriving soon</h3>
                <p>We're photographing our current in-store ${esc(label)} collection for this page. In the meantime, our full range is ready for you to browse and try on in person at our New Ranip store.</p>
                <div class="catalog-empty-actions">
                    <a href="tel:+918732969601" class="ahero-btn ahero-btn-primary"><i class="fas fa-phone"></i> Call the Store</a>
                    <a href="https://wa.me/918732969601?text=${encodeURIComponent('Hello Shree Hari Chasma Ghar, I would like to know about your ' + label + ' collection.')}" target="_blank" rel="noopener" class="ahero-btn ahero-btn-wa"><i class="fab fa-whatsapp"></i> Ask on WhatsApp</a>
                </div>
            </div>
        </div>`;
    }

    function noMatchHtml() {
        return `
        <div class="col-12">
            <div class="catalog-empty-state catalog-empty-state-small">
                <i class="fas fa-filter" aria-hidden="true"></i>
                <p>No frames match this filter yet. <button type="button" class="catalog-reset-link" id="catalogResetFilters">Clear filters</button></p>
            </div>
        </div>`;
    }

    function render() {
        buildFilters();
        const filtered = getFiltered();
        const countLabel = document.getElementById('visibleCount');
        const totalLabel = document.getElementById('totalCount');
        if (countLabel) countLabel.textContent = filtered.length;
        if (totalLabel) totalLabel.textContent = products.length;

        if (!products.length) {
            grid.innerHTML = emptyStateHtml();
        } else if (!filtered.length) {
            grid.innerHTML = noMatchHtml();
            const resetBtn = document.getElementById('catalogResetFilters');
            if (resetBtn) resetBtn.addEventListener('click', () => {
                activeCategory = 'all';
                activeShape = 'all';
                buildFilters();
                render();
            });
        } else {
            grid.innerHTML = filtered.map(productCard).join('');
        }

        grid.querySelectorAll('[data-open-detail]').forEach(el => {
            el.addEventListener('click', () => openDetail(el.dataset.openDetail));
        });
        grid.querySelectorAll('[data-tryon]').forEach(el => {
            el.addEventListener('click', () => {
                if (window.OptiTryOn && typeof window.OptiTryOn.open === 'function') {
                    window.OptiTryOn.open(el.dataset.tryon);
                }
            });
        });

        if (window.AOS && typeof window.AOS.refreshHard === 'function') window.AOS.refreshHard();
    }

    // ---------------- 5-angle detail viewer ----------------
    const ANGLE_ORDER = ['front', 'left', 'right', 'leftSide', 'rightSide'];
    const ANGLE_LABELS = { front: 'Front', left: 'Left 3/4', right: 'Right 3/4', leftSide: 'Left Side', rightSide: 'Right Side' };

    let detailProduct = null;
    let detailAngleIndex = 0;
    let detailAngles = [];

    function getById(id) { return products.find(p => String(p.id) === String(id)); }

    function openDetail(id) {
        const p = getById(id);
        if (!p) return;
        detailProduct = p;
        detailAngles = ANGLE_ORDER.filter(a => p.images && p.images[a]);
        detailAngleIndex = 0;

        const modal = document.getElementById('detailModal');
        if (!modal) return;
        document.getElementById('detailTitle').textContent = p.name;
        const metaParts = [];
        if (p.category && CATEGORY_LABELS[p.category]) metaParts.push(CATEGORY_LABELS[p.category]);
        if (p.shape && SHAPE_LABELS[p.shape]) metaParts.push(SHAPE_LABELS[p.shape]);
        document.getElementById('detailMeta').textContent = metaParts.join(' • ');
        const priceEl = document.getElementById('detailPrice');
        if (typeof p.price === 'number' && p.price > 0) {
            priceEl.textContent = '₹' + p.price.toLocaleString('en-IN');
            priceEl.hidden = false;
        } else {
            priceEl.hidden = true;
        }

        const thumbs = document.getElementById('detailThumbs');
        thumbs.innerHTML = detailAngles.map((a, i) => `
            <button type="button" class="detail-thumb${i === 0 ? ' active' : ''}" data-angle-index="${i}" aria-label="${esc(ANGLE_LABELS[a])} view">
                <img src="${esc(p.images[a])}" alt="${esc((p.altText || p.name) + ' — ' + ANGLE_LABELS[a])}" loading="lazy" decoding="async">
            </button>`).join('');
        thumbs.querySelectorAll('[data-angle-index]').forEach(btn => {
            btn.addEventListener('click', () => setAngle(parseInt(btn.dataset.angleIndex, 10)));
        });

        const whatsappBtn = document.getElementById('detailWhatsapp');
        if (whatsappBtn) whatsappBtn.href = whatsappUrl(p);

        const tryOnBtn = document.getElementById('detailTryOn');
        if (tryOnBtn) tryOnBtn.dataset.tryon = p.id;

        setAngle(0);
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        document.getElementById('detailClose')?.focus();
    }

    function setAngle(index) {
        if (!detailAngles.length) return;
        detailAngleIndex = ((index % detailAngles.length) + detailAngles.length) % detailAngles.length;
        const angle = detailAngles[detailAngleIndex];
        const img = document.getElementById('detailMainImage');
        img.src = detailProduct.images[angle];
        img.alt = esc((detailProduct.altText || detailProduct.name) + ' — ' + ANGLE_LABELS[angle]);
        document.getElementById('detailAngleLabel').textContent = ANGLE_LABELS[angle];
        document.querySelectorAll('.detail-thumb').forEach((t, i) => t.classList.toggle('active', i === detailAngleIndex));
    }

    function closeDetail() {
        const modal = document.getElementById('detailModal');
        if (modal) modal.hidden = true;
        document.body.style.overflow = '';
        document.getElementById('detailViewerStage')?.classList.remove('is-zoomed', 'is-fullscreen');
    }

    function wireDetailModal() {
        const modal = document.getElementById('detailModal');
        if (!modal) return;
        document.getElementById('detailClose')?.addEventListener('click', closeDetail);
        modal.addEventListener('click', e => { if (e.target === modal) closeDetail(); });
        document.addEventListener('keydown', e => {
            if (modal.hidden) return;
            if (e.key === 'Escape') closeDetail();
            if (e.key === 'ArrowLeft') setAngle(detailAngleIndex - 1);
            if (e.key === 'ArrowRight') setAngle(detailAngleIndex + 1);
        });
        document.getElementById('detailPrev')?.addEventListener('click', () => setAngle(detailAngleIndex - 1));
        document.getElementById('detailNext')?.addEventListener('click', () => setAngle(detailAngleIndex + 1));

        const stage = document.getElementById('detailViewerStage');
        const img = document.getElementById('detailMainImage');
        if (stage && img) {
            // Drag / swipe to rotate through angles
            let startX = 0, dragging = false, moved = 0;
            const THRESHOLD = 40;
            const start = x => { dragging = true; startX = x; moved = 0; stage.classList.add('is-dragging'); };
            const move = x => { if (dragging) moved = x - startX; };
            const end = () => {
                if (!dragging) return;
                dragging = false;
                stage.classList.remove('is-dragging');
                if (moved > THRESHOLD) setAngle(detailAngleIndex - 1);
                else if (moved < -THRESHOLD) setAngle(detailAngleIndex + 1);
            };
            stage.addEventListener('mousedown', e => start(e.clientX));
            window.addEventListener('mousemove', e => move(e.clientX));
            window.addEventListener('mouseup', end);
            stage.addEventListener('touchstart', e => start(e.touches[0].clientX), { passive: true });
            stage.addEventListener('touchmove', e => move(e.touches[0].clientX), { passive: true });
            stage.addEventListener('touchend', end);

            // Zoom toggle
            document.getElementById('detailZoom')?.addEventListener('click', () => stage.classList.toggle('is-zoomed'));
            img.addEventListener('dblclick', () => stage.classList.toggle('is-zoomed'));

            // Fullscreen toggle (CSS-based; falls back gracefully if Fullscreen API unavailable)
            document.getElementById('detailFullscreen')?.addEventListener('click', () => {
                if (document.fullscreenElement) { document.exitFullscreen?.(); return; }
                if (stage.requestFullscreen) stage.requestFullscreen().catch(() => stage.classList.toggle('is-fullscreen'));
                else stage.classList.toggle('is-fullscreen');
            });
        }

        document.getElementById('detailTryOn')?.addEventListener('click', function () {
            if (window.OptiTryOn && typeof window.OptiTryOn.open === 'function') {
                closeDetail();
                window.OptiTryOn.open(this.dataset.tryon);
            }
        });
    }

    wireDetailModal();
    loadProducts();

    window.OptiCatalog = { getById: id => getById(id) };
})();
