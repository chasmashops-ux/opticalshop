/* =========================================================
   OptiCare Virtual Try-On — face-tracking AR (MediaPipe)
   Loads the face-mesh model lazily, overlays an SVG vector
   frame on the user's eyes and follows head tilt/turn.
   Exposes: window.OptiTryOn.open(id) / .close()
========================================================= */
(function () {
    const modal = document.getElementById('tryOnModal');
    if (!modal) return; // only on eyeglasses / sunglasses pages

    const video = document.getElementById('tryOnVideo');
    const canvas = document.getElementById('tryOnCanvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const statusEl = document.getElementById('tryOnStatus');
    const stylesEl = document.getElementById('tryOnStyles');
    const sizeEl = document.getElementById('tryOnSize');
    const titleEl = document.getElementById('tryOnTitle');
    const isSun = (document.body && document.body.dataset && document.body.dataset.catalog === 'sunglasses');

    if (!video || !canvas || !ctx) return;

    const MP_VERSION = '0.10.6';
    const MP_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@' + MP_VERSION;
    const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

    let stream = null, landmarker = null, raf = null, running = false;
    let facing = 'user', sizeMul = 1, currentStyle = 'rectangle';
    let lastTs = 0;
    const imgCache = {};

    const STYLES = [
        { id: 'rectangle', name: 'Rectangle' },
        { id: 'wayfarer', name: 'Wayfarer' },
        { id: 'round', name: 'Round' },
        { id: 'aviator', name: 'Aviator' },
        { id: 'cateye', name: 'Cat-Eye' },
        { id: 'sport', name: 'Sport' }
    ];

    function styleForCategory(cat) {
        cat = (cat || '').toLowerCase();
        if (cat.indexOf('aviator') > -1) return 'aviator';
        if (cat.indexOf('wayfarer') > -1) return 'wayfarer';
        if (cat.indexOf('round') > -1) return 'round';
        if (cat.indexOf('cat') > -1) return 'cateye';
        if (cat.indexOf('sport') > -1) return 'sport';
        if (cat.indexOf('women') > -1) return 'cateye';
        if (cat.indexOf('kid') > -1) return 'round';
        return 'rectangle';
    }

    // ---- SVG vector frame (viewBox 0 0 220 80, bridge centred at x=110) ----
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
            case 'sport':
                lenses = "<path d='M16 30 q94 -24 188 0 q-6 34 -42 38 q-52 6 -104 0 q-36 -4 -42 -38 z'/>";
                bridge = 'M104 28 v36';
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

    function frameImg(style) {
        const key = style + (isSun ? '_s' : '_c');
        if (!imgCache[key]) {
            const img = new Image();
            img.src = frameSVG(style, isSun);
            imgCache[key] = img;
        }
        return imgCache[key];
    }

    function setStatus(t) {
        if (!statusEl) return;
        statusEl.textContent = t || '';
        statusEl.style.display = t ? 'block' : 'none';
    }

    // ---- Build style selector chips ----
    function buildStyles() {
        if (!stylesEl || stylesEl.childElementCount) return;
        STYLES.forEach(s => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'tryon-style-chip';
            b.dataset.style = s.id;
            b.textContent = s.name;
            b.addEventListener('click', () => { currentStyle = s.id; highlightStyle(); });
            stylesEl.appendChild(b);
        });
    }
    function highlightStyle() {
        if (!stylesEl) return;
        stylesEl.querySelectorAll('.tryon-style-chip').forEach(b => {
            b.classList.toggle('active', b.dataset.style === currentStyle);
        });
    }

    // ---- Geometry + draw ----
    function pt(lm, i) { return { x: lm[i].x * canvas.width, y: lm[i].y * canvas.height }; }

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

        const fw = eyeW * 2.05 * sizeMul;
        const fh = fw * (80 / 220);

        // yaw estimate for the "360" turn feel (nose offset vs eye centre)
        let yaw = (nose.x - cx) / eyeW;            // ~ -0.5 .. 0.5
        yaw = Math.max(-0.6, Math.min(0.6, yaw));
        const sx = 1 - Math.abs(yaw) * 0.45;        // compress horizontally when turned

        const img = frameImg(currentStyle);
        if (!img.complete || !img.naturalWidth) return;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(yaw * eyeW * 0.25, 0);        // slide toward turn direction
        ctx.scale(sx, 1);
        ctx.globalAlpha = 0.97;
        ctx.drawImage(img, -fw / 2, -fh / 2, fw, fh);
        ctx.restore();
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
            } catch (e) { /* skip frame */ }
            if (res && res.faceLandmarks && res.faceLandmarks.length) {
                drawGlasses(res.faceLandmarks[0]);
                setStatus('');
            } else {
                setStatus('Center your face in the camera 🙂');
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
        setStatus('Loading face tracking…');
        const vision = await import(MP_BASE + '/vision_bundle.mjs');
        const FaceLandmarker = vision.FaceLandmarker;
        const FilesetResolver = vision.FilesetResolver;
        const fileset = await FilesetResolver.forVisionTasks(MP_BASE + '/wasm');
        try {
            landmarker = await FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
                runningMode: 'VIDEO', numFaces: 1
            });
        } catch (e) {
            landmarker = await FaceLandmarker.createFromOptions(fileset, {
                baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
                runningMode: 'VIDEO', numFaces: 1
            });
        }
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
        const a = document.createElement('a');
        a.href = out.toDataURL('image/png');
        a.download = 'shree-hari-tryon.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
    }

    // ---- Public open / close ----
    async function open(id) {
        const frames = window.eyeglassFrames || [];
        const frame = frames.find(f => f.id === id);
        currentStyle = styleForCategory(frame && frame.category);
        if (titleEl && frame) titleEl.textContent = frame.title;
        sizeMul = 1;
        if (sizeEl) sizeEl.value = '1';
        buildStyles();
        highlightStyle();
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        try {
            await startCam();
            await initLandmarker();
            running = true;
            loop();
        } catch (err) {
            const denied = err && (err.name === 'NotAllowedError' || err.name === 'NotFoundError');
            setStatus(denied
                ? '📷 Camera blocked. Please allow camera access in your browser, then reopen Try-On.'
                : '⚠️ Unable to start the camera. Try a different browser or check your connection.');
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
    }

    // ---- Wire controls ----
    document.querySelectorAll('#closeTryOn, #closeTryOnFooter').forEach(b => b.addEventListener('click', close));
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.hidden) close(); });

    const capBtn = document.getElementById('tryOnCapture');
    if (capBtn) capBtn.addEventListener('click', capture);

    const switchBtn = document.getElementById('tryOnSwitch');
    if (switchBtn) switchBtn.addEventListener('click', async () => {
        facing = (facing === 'user') ? 'environment' : 'user';
        try { await startCam(); } catch (e) { setStatus('⚠️ Could not switch camera.'); }
    });

    if (sizeEl) sizeEl.addEventListener('input', () => { sizeMul = parseFloat(sizeEl.value) || 1; });

    window.OptiTryOn = { open, close };
})();
