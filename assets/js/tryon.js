/* =========================================================
   OptiCare Virtual Try-On — real-time face-tracking AR
   Technology: MediaPipe Tasks Vision — FaceLandmarker (browser-side,
   no data leaves the device). Live video is never sent to any server.

   Flow: permission screen -> getUserMedia -> FaceLandmarker load ->
   per-frame landmark detection -> geometry-based overlay placement
   (eye centres, inter-eye distance, head roll/yaw) -> optional capture.

   Overlay note: until a product supplies a real transparent cutout of
   itself (product.tryOn.overlay), this engine draws a stylized vector
   shape matched to the product's frame "shape" and clearly labels it
   as a preview shape — never presented as a photo of the real product.

   Calibration: append ?tryonDebug=true to the page URL to reveal
   scale/offset/rotation sliders and live landmark points for tuning a
   product's tryOn config. Hidden from normal visitors.

   Exposes: window.OptiTryOn.open(id) / .close()
========================================================= */
(function () {
    const modal = document.getElementById('tryOnModal');
    if (!modal) return; // only on eyeglasses / sunglasses pages

    const video = document.getElementById('tryOnVideo');
    const canvas = document.getElementById('tryOnCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const statusEl = document.getElementById('tryOnStatus');
    const titleEl = document.getElementById('tryOnTitle');
    const isSun = document.body?.dataset?.catalog === 'sunglasses';
    const DEBUG = new URLSearchParams(window.location.search).get('tryonDebug') === 'true';

    if (!video || !canvas || !ctx) return;

    const MP_VERSION = '0.10.6';
    const MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + MP_VERSION;
    const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

    let stream = null, landmarker = null, raf = null, running = false;
    let facing = 'user';
    let lastTs = 0;
    let currentProduct = null;
    let debugConfig = { widthRatio: 2.0, verticalOffset: 0, noseOffset: 0, rotationMultiplier: 1 };
    const imgCache = {};
    let noFaceFrames = 0, multiFaceFrames = 0;

    function setStatus(t, tone) {
        if (!statusEl) return;
        statusEl.textContent = t || '';
        statusEl.style.display = t ? 'block' : 'none';
        statusEl.dataset.tone = tone || 'info';
    }

    function setPanel(which) {
        modal.querySelectorAll('[data-tryon-panel]').forEach(p => {
            p.hidden = p.dataset.tryonPanel !== which;
        });
        modal.dataset.state = which;
    }

    // ---- Vector placeholder shapes (used only until a real overlay exists) ----
    function shapeForProduct(p) {
        const s = (p && p.shape || '').toLowerCase();
        if (['aviator', 'round', 'cat-eye', 'wayfarer', 'rectangle'].includes(s)) return s === 'cat-eye' ? 'cateye' : s;
        if (s === 'square' || s === 'full-rim') return 'rectangle';
        if (s === 'rimless' || s === 'half-rim') return 'rectangle';
        return 'rectangle';
    }

    function frameSVG(style, sun) {
        const lens = sun ? 'rgba(20,24,36,0.80)' : 'rgba(150,196,255,0.20)';
        const edge = sun ? '#0f172a' : '#1f2937';
        const sw = 6;
        let lenses = '', bridge = 'M92 38 q18 -7 36 0';
        switch (style) {
            case 'round':
                lenses = "<circle cx='62' cy='42' r='30'/><circle cx='158' cy='42' r='30'/>";
                break;
            case 'aviator':
                lenses = "<path d='M28 30 q34 -10 64 0 q-2 34 -32 38 q-30 -4 -32 -38 z'/>" +
                         "<path d='M128 30 q34 -10 64 0 q-2 34 -32 38 q-30 -4 -32 -38 z'/>";
                break;
            case 'wayfarer':
                lenses = "<path d='M22 26 q40 -8 78 -2 q0 30 -10 40 q-30 6 -54 -2 q-14 -16 -14 -36 z'/>" +
                         "<path d='M120 24 q40 -6 78 2 q0 20 -14 36 q-24 8 -54 2 q-10 -10 -10 -40 z'/>";
                bridge = 'M100 34 h20';
                break;
            case 'cateye':
                lenses = "<path d='M22 42 q4 -24 44 -24 q34 0 36 22 q-6 18 -38 20 q-38 -2 -42 -18 z'/>" +
                         "<path d='M118 40 q2 -24 38 -24 q40 0 42 24 q-8 16 -42 18 q-32 -2 -38 -18 z'/>";
                bridge = 'M96 36 q14 -6 28 0';
                break;
            default: // rectangle
                lenses = "<rect x='22' y='22' width='78' height='44' rx='16'/>" +
                         "<rect x='120' y='22' width='78' height='44' rx='16'/>";
                bridge = 'M100 36 h20';
        }
        const arms = 'M24 30 L4 23 M196 30 L216 23';
        const svg = "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 220 80'>" +
            "<g fill='" + lens + "' stroke='" + edge + "' stroke-width='" + sw + "' stroke-linejoin='round' stroke-linecap='round'>" + lenses + "</g>" +
            "<g fill='none' stroke='" + edge + "' stroke-width='" + sw + "' stroke-linecap='round' stroke-linejoin='round'><path d='" + bridge + " " + arms + "'/></g>" +
            "</svg>";
        return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    }

    function overlayImage(p) {
        const hasReal = p && p.tryOn && p.tryOn.overlay;
        const key = hasReal ? p.tryOn.overlay : ('shape:' + shapeForProduct(p) + (isSun ? ':sun' : ':clear'));
        if (!imgCache[key]) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = hasReal ? p.tryOn.overlay : frameSVG(shapeForProduct(p), isSun);
            imgCache[key] = img;
        }
        return { img: imgCache[key], isReal: !!hasReal };
    }

    function activeConfig() {
        const cfg = (currentProduct && currentProduct.tryOn) || {};
        if (DEBUG) return debugConfig;
        return {
            widthRatio: typeof cfg.widthRatio === 'number' ? cfg.widthRatio : 2.0,
            verticalOffset: typeof cfg.verticalOffset === 'number' ? cfg.verticalOffset : 0,
            noseOffset: typeof cfg.noseOffset === 'number' ? cfg.noseOffset : 0,
            rotationMultiplier: typeof cfg.rotationMultiplier === 'number' ? cfg.rotationMultiplier : 1
        };
    }

    // ---- Geometry + draw ----
    function pt(lm, i) { return { x: lm[i].x * canvas.width, y: lm[i].y * canvas.height }; }

    function drawLandmarkDots(lm) {
        if (!DEBUG) return;
        ctx.fillStyle = 'rgba(34,197,94,0.85)';
        for (let i = 0; i < lm.length; i += 3) {
            const p = pt(lm, i);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1.6, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function drawGlasses(lm) {
        const lEye = pt(lm, 33);    // left eye outer corner
        const rEye = pt(lm, 263);   // right eye outer corner
        const nose = pt(lm, 1);     // nose tip
        const cx = (lEye.x + rEye.x) / 2;
        const cy = (lEye.y + rEye.y) / 2;
        const dx = rEye.x - lEye.x;
        const dy = rEye.y - lEye.y;
        const eyeW = Math.hypot(dx, dy);
        if (!eyeW) return;
        const angle = Math.atan2(dy, dx);
        const cfg = activeConfig();

        const fw = eyeW * cfg.widthRatio;
        const fh = fw * (80 / 220);

        let yaw = (nose.x - cx) / eyeW;
        yaw = Math.max(-0.6, Math.min(0.6, yaw));
        const sx = 1 - Math.abs(yaw) * 0.45;

        const { img } = overlayImage(currentProduct);
        if (!img.complete || !img.naturalWidth) return;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle * cfg.rotationMultiplier);
        ctx.translate(yaw * eyeW * 0.25 + cfg.noseOffset * eyeW, cfg.verticalOffset * fh);
        ctx.scale(sx, 1);
        ctx.globalAlpha = 0.97;
        ctx.drawImage(img, -fw / 2, -fh / 2, fw, fh);
        ctx.restore();

        drawLandmarkDots(lm);
    }

    function loop() {
        if (!running) return;
        if (video.readyState >= 2 && video.videoWidth) {
            if (canvas.width !== video.videoWidth) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
            }
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            let res = null;
            try {
                let ts = performance.now();
                if (ts <= lastTs) ts = lastTs + 1;
                lastTs = ts;
                res = landmarker.detectForVideo(video, ts);
            } catch (e) { /* skip this frame, keep the loop alive */ }

            const faces = (res && res.faceLandmarks) || [];
            if (faces.length === 1) {
                noFaceFrames = 0; multiFaceFrames = 0;
                drawGlasses(faces[0]);
                setStatus('Face detected', 'ok');
            } else if (faces.length > 1) {
                multiFaceFrames++; noFaceFrames = 0;
                if (multiFaceFrames > 5) setStatus('Please make sure only one face is visible.', 'warn');
            } else {
                noFaceFrames++; multiFaceFrames = 0;
                if (noFaceFrames > 8) setStatus('Move your face into the camera frame.', 'warn');
            }
        }
        raf = requestAnimationFrame(loop);
    }

    // ---- Camera + model ----
    async function startCam() {
        stopCam();
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = stream;
        await video.play();
    }
    function stopCam() {
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        if (video) video.srcObject = null;
    }

    async function initLandmarker() {
        if (landmarker) return;
        const vision = await import(MP_BASE + '/vision_bundle.mjs');
        const FaceLandmarker = vision.FaceLandmarker;
        const FilesetResolver = vision.FilesetResolver;
        const fileset = await FilesetResolver.forVisionTasks(MP_BASE + '/wasm');
        try {
            landmarker = await FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                runningMode: 'VIDEO', numFaces: 2
            });
        } catch (e) {
            landmarker = await FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                runningMode: 'VIDEO', numFaces: 2
            });
        }
    }

    function browserSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.WebAssembly);
    }

    // ---- Capture (mirrored, to match the on-screen preview) ----
    function capture() {
        if (!canvas.width) return;
        const out = document.createElement('canvas');
        out.width = canvas.width;
        out.height = canvas.height;
        const o = out.getContext('2d');
        o.translate(out.width, 0);
        o.scale(-1, 1);
        o.drawImage(canvas, 0, 0);
        const dataUrl = out.toDataURL('image/png');

        const previewImg = document.getElementById('tryOnCaptureImg');
        if (previewImg) previewImg.src = dataUrl;
        setPanel('captured');
    }

    function retake() {
        setPanel('live');
    }

    function downloadCapture() {
        const previewImg = document.getElementById('tryOnCaptureImg');
        if (!previewImg || !previewImg.src) return;
        const a = document.createElement('a');
        a.href = previewImg.src;
        a.download = 'shree-hari-tryon.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    // ---- Debug calibration panel ----
    function buildDebugPanel() {
        if (!DEBUG) return;
        const panel = document.getElementById('tryOnDebugPanel');
        if (!panel || panel.dataset.built) return;
        panel.dataset.built = '1';
        panel.hidden = false;
        panel.innerHTML = `
            <p class="tryon-debug-title">Calibration (debug mode)</p>
            <label>Width ratio <input type="range" id="dbgWidth" min="1.2" max="3" step="0.01" value="${debugConfig.widthRatio}"><span id="dbgWidthVal">${debugConfig.widthRatio}</span></label>
            <label>Vertical offset <input type="range" id="dbgVert" min="-0.5" max="0.5" step="0.01" value="${debugConfig.verticalOffset}"><span id="dbgVertVal">${debugConfig.verticalOffset}</span></label>
            <label>Nose offset <input type="range" id="dbgNose" min="-0.3" max="0.3" step="0.01" value="${debugConfig.noseOffset}"><span id="dbgNoseVal">${debugConfig.noseOffset}</span></label>
            <label>Rotation multiplier <input type="range" id="dbgRot" min="0" max="2" step="0.01" value="${debugConfig.rotationMultiplier}"><span id="dbgRotVal">${debugConfig.rotationMultiplier}</span></label>
            <pre id="dbgOutput"></pre>
        `;
        const bind = (id, key, out) => {
            const el = document.getElementById(id);
            el.addEventListener('input', () => {
                debugConfig[key] = parseFloat(el.value);
                document.getElementById(out).textContent = el.value;
                updateDebugOutput();
            });
        };
        bind('dbgWidth', 'widthRatio', 'dbgWidthVal');
        bind('dbgVert', 'verticalOffset', 'dbgVertVal');
        bind('dbgNose', 'noseOffset', 'dbgNoseVal');
        bind('dbgRot', 'rotationMultiplier', 'dbgRotVal');
        updateDebugOutput();
    }
    function updateDebugOutput() {
        const out = document.getElementById('dbgOutput');
        if (!out) return;
        out.textContent = '"tryOn": ' + JSON.stringify(debugConfig, null, 2);
    }

    // ---- Public open / close ----
    async function open(id) {
        currentProduct = (window.OptiCatalog && window.OptiCatalog.getById(id)) || null;
        if (titleEl) titleEl.textContent = currentProduct ? ('Try On: ' + currentProduct.name) : 'Virtual Try-On';

        modal.hidden = false;
        document.body.style.overflow = 'hidden';

        if (!browserSupported()) {
            setPanel('unsupported');
            return;
        }

        setPanel('permission');
        buildDebugPanel();
    }

    async function beginCamera() {
        setPanel('loading');
        try {
            await startCam();
            await initLandmarker();
            running = true;
            noFaceFrames = 0; multiFaceFrames = 0;
            setPanel('live');
            loop();
        } catch (err) {
            const denied = err && (err.name === 'NotAllowedError' || err.name === 'SecurityError');
            const noCam = err && err.name === 'NotFoundError';
            if (denied) {
                setPanel('denied');
            } else if (noCam) {
                setPanel('unsupported');
            } else {
                console.error('OptiTryOn init error', err);
                setPanel('unsupported');
            }
        }
    }

    function close() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = null;
        stopCam();
        if (ctx && canvas.width) ctx.clearRect(0, 0, canvas.width, canvas.height);
        modal.hidden = true;
        document.body.style.overflow = '';
        setPanel('permission');
    }

    // ---- Wire controls ----
    modal.querySelectorAll('[data-tryon-close]').forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });

    document.getElementById('tryOnAllow')?.addEventListener('click', beginCamera);
    document.getElementById('tryOnRetryPermission')?.addEventListener('click', beginCamera);

    document.getElementById('tryOnCapture')?.addEventListener('click', capture);
    document.getElementById('tryOnRetake')?.addEventListener('click', retake);
    document.getElementById('tryOnDownload')?.addEventListener('click', downloadCapture);

    const switchBtn = document.getElementById('tryOnSwitch');
    if (switchBtn) switchBtn.addEventListener('click', async () => {
        facing = (facing === 'user') ? 'environment' : 'user';
        try { await startCam(); } catch (e) { setStatus('Could not switch camera.', 'warn'); }
    });

    document.getElementById('tryOnHelpToggle')?.addEventListener('click', function () {
        const help = document.getElementById('tryOnHelpText');
        if (help) help.hidden = !help.hidden;
        this.setAttribute('aria-expanded', String(help && !help.hidden));
    });

    window.OptiTryOn = { open, close };
})();
