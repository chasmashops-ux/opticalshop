document.addEventListener("DOMContentLoaded", function () {

    // ===== HEADER =====
    document.getElementById("site-header").innerHTML = `
     <!-- Premium Navigation -->
    <nav class="navbar navbar-expand-lg" role="navigation" aria-label="Primary navigation">
        <div class="container">
            <a href="/" class="navbar-brand" aria-label="Shree Hari Chasma Ghar home">
                <img src="/assets/images/Logo.png" alt="Shree Hari Chasma Ghar logo" title="Shree Hari Chasma Ghar" class="shcg-logo">
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto align-items-lg-center">
                    <li class="nav-item">
                        <a class="nav-link" href="/">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/eyeglasses.html">Eyeglasses</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/sunglasses.html">Sunglasses</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/contactlenses.html">Contact Lenses</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/services.html">Services</a>
                    </li>
                    
                    <li class="nav-item">
                        <a class="nav-link" href="/about-us.html">About Us</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="/contact-us.html">Contact</a>
                    </li>
                    <li class="nav-item">
                        <a class="btn btn-book" href="tel:+918732969601">Book Eye Test</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
    `;

    // Inject Service JSON-LD for pages under /services/
    (function injectServiceSchema(){
        try {
            if (!window.location.pathname.includes('/services/')) return;

            const titleEl = document.querySelector('h1');
            const pageTitle = titleEl ? titleEl.innerText.trim() : document.title || '';
            const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';

            const schema = {
                "@context": "https://schema.org",
                "@type": "Service",
                "name": pageTitle || 'Optical Service',
                "description": metaDesc || 'Professional optical service at Shree Hari Chasma Ghar in New Ranip, Ahmedabad.',
                "provider": {
                    "@type": "Optician",
                    "name": "Shree Hari Chasma Ghar",
                    "url": window.location.origin || (window.location.protocol + '//' + window.location.host),
                    "telephone": "+918732969601",
                    "address": {
                        "@type": "PostalAddress",
                        "streetAddress": "5 Sun Residency, Anand Party Plot Rd, near Manki Circle",
                        "addressLocality": "New Ranip",
                        "addressRegion": "Gujarat",
                        "postalCode": "382470",
                        "addressCountry": "IN"
                    }
                },
                "areaServed": {
                    "@type": "City",
                    "name": "Ahmedabad"
                }
            };

            const script = document.createElement('script');
            script.type = 'application/ld+json';
            script.text = JSON.stringify(schema);
            document.head.appendChild(script);
        } catch (e) {
            // fail silently
            console.error('InjectServiceSchema error', e);
        }
    })();

    // Inject site-wide Organization + WebSite JSON-LD (E-E-A-T / trust signals) on every page
    (function injectOrgSchema(){
        try {
            const origin = "https://www.shreeharichasmaghar.com";
            const graph = {
                "@context": "https://schema.org",
                "@graph": [
                    {
                        "@type": "Organization",
                        "@id": origin + "/#organization",
                        "name": "Shree Hari Chasma Ghar",
                        "alternateName": "Shree Hari Chasma Ghar - Optical Shop New Ranip",
                        "url": origin,
                        "logo": {
                            "@type": "ImageObject",
                            "url": origin + "/assets/images/Logo.png",
                            "width": 3493,
                            "height": 688
                        },
                        "image": origin + "/assets/images/Logo.png",
                        "telephone": "+918732969601",
                        "email": "chasmashops@gmail.com",
                        "foundingLocation": "New Ranip, Ahmedabad",
                        "address": {
                            "@type": "PostalAddress",
                            "streetAddress": "5 Sun Residency, Anand Party Plot Rd, near Manki Circle",
                            "addressLocality": "New Ranip",
                            "addressRegion": "Gujarat",
                            "postalCode": "382470",
                            "addressCountry": "IN"
                        },
                        "contactPoint": {
                            "@type": "ContactPoint",
                            "telephone": "+918732969601",
                            "contactType": "customer service",
                            "areaServed": "IN",
                            "availableLanguage": ["en", "hi", "gu"]
                        },
                        "sameAs": [
                            "https://www.instagram.com/shreeharichasmagharindia/",
                            "https://twitter.com/hari_ghar",
                            "https://www.facebook.com/shriharichasmaghar",
                            "https://www.linkedin.com/in/shree-hari-chasma-ghar/"
                        ]
                    },
                    {
                        "@type": "WebSite",
                        "@id": origin + "/#website",
                        "url": origin,
                        "name": "Shree Hari Chasma Ghar",
                        "inLanguage": "en-IN",
                        "publisher": { "@id": origin + "/#organization" }
                    }
                ]
            };
            const s = document.createElement('script');
            s.type = 'application/ld+json';
            s.text = JSON.stringify(graph);
            document.head.appendChild(s);
        } catch (e) {
            console.error('InjectOrgSchema error', e);
        }
    })();

    // ===== FOOTER =====
    document.getElementById("site-footer").innerHTML = `

      <footer class="footer">
        <div class="container">
            <div class="footer-content">
                <div class="row g-5">
                    <div class="col-lg-3 col-md-6">
                        <h3 class="footer-logo">
                            <img src="/assets/images/Logo.png"  alt="Shree Hari chasma Ghar logo" title="Shree Hari Chasma Ghar" class="shcg-logo"> 
                        </h3>
                        <p class="footer-description">Premium optical store specializing in eyeglasses, sunglasses, and contact lenses with 30+ years of professional eye care experience in New Ranip, Ahmedabad.</p>
                        <div class="social-links">
                            <a href="https://twitter.com/hari_ghar" target="_blank" rel="noreferrer noopener" class="social-link" aria-label="Twitter">
                                <i class="fab fa-twitter"></i>
                            </a>
                            <a href="https://www.facebook.com/shriharichasmaghar" target="_blank" rel="noreferrer noopener" class="social-link" aria-label="Facebook">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                            <a href="https://www.linkedin.com/in/shree-hari-chasma-ghar/" target="_blank" rel="noreferrer noopener" class="social-link" aria-label="LinkedIn">
                                <i class="fab fa-linkedin-in"></i>
                            </a>
                            <a href="https://www.instagram.com/shreeharichasmagharindia/" target="_blank" rel="noreferrer noopener" class="social-link" aria-label="Instagram">
                                <i class="fab fa-instagram"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div class="col-lg-2 col-md-6">
                        <h4 class="footer-title">Quick Links</h4>
                        <ul class="footer-links">
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Home</a></li>
                            <li><a href="/eyeglasses.html"><i class="fas fa-chevron-right"></i> Eyeglasses</a></li>
                            <li><a href="/sunglasses.html"><i class="fas fa-chevron-right"></i> Sunglasses</a></li>
                            <li><a href="/contactlenses.html"><i class="fas fa-chevron-right"></i> Contact Lenses</a></li>
                            <li><a href="/services.html"><i class="fas fa-chevron-right"></i> Services</a></li>
                            <li><a href="/blog.html"><i class="fas fa-chevron-right"></i> Blog</a></li>
                            <li><a href="/about-us.html"><i class="fas fa-chevron-right"></i> About Us</a></li>
                            <li><a href="/contact-us.html"><i class="fas fa-chevron-right"></i> Contact Us</a></li>
                        </ul>
                    </div>
                    
                    <div class="col-lg-2 col-md-6">
                        <h4 class="footer-title">Popular Links</h4>
                        <ul class="footer-links">
                            <li><a href="/services/professional-optometry-service.html"><i class="fas fa-chevron-right"></i> Professional Optometry</a></li>
                            <li><a href="/services/best-optician-in-new-ranip.html"><i class="fas fa-chevron-right"></i> Best Optician</a></li>
                            <li><a href="/services/blue-cut-glasses-store-ahmedabad.html"><i class="fas fa-chevron-right"></i> Blue Cut Glasses</a></li>
                            <li><a href="/services/computer-glasses-in-ranip.html"><i class="fas fa-chevron-right"></i> Computer Glasses</a></li>
                            <li><a href="/services/premium-optical-store-in-new-ranip.html"><i class="fas fa-chevron-right"></i> Premium Store</a></li>
                            <li><a href="/services/digital-eye-test-center-ahmedabad.html"><i class="fas fa-chevron-right"></i> Eye Testing</a></li>
                            <li><a href="/faq.html"><i class="fas fa-chevron-right"></i> FAQ</a></li>
                            <li><a href="/googlereviews.html"><i class="fas fa-chevron-right"></i> Google Reviews</a></li>
                        </ul>
                    </div>
                    
                    <div class="col-lg-2 col-md-6">
                        <h4 class="footer-title">Categories</h4>
                        <ul class="footer-links">
                            <li><a href="/services/men-spectacle-frames-ahmedabad.html"><i class="fas fa-chevron-right"></i> Men Frames</a></li>
                            <li><a href="/services/women-spectacle-frames-ranip.html"><i class="fas fa-chevron-right"></i> Women Frames</a></li>
                            <li><a href="/services/kids-eyeglasses-store-in-new-ranip.html"><i class="fas fa-chevron-right"></i> Kids Glasses</a></li>
                            <li><a href="/services/designer-sunglasses-shop-ahmedabad.html"><i class="fas fa-chevron-right"></i> Designer Sunglasses</a></li>
                            <li><a href="/services/sports-sunglasses-ahmedabad.html"><i class="fas fa-chevron-right"></i> Sports Sunglasses</a></li>
                            <li><a href="/services/reading-glasses-shop-in-ranip.html"><i class="fas fa-chevron-right"></i> Reading Glasses</a></li>
                        </ul>
                    </div>
                    
                    <div class="col-lg-3 col-md-6">
                        <h4 class="footer-title">Get In Touch</h4>
                        <div class="footer-contact">
                            <p><i class="fas fa-map-marker-alt"></i> <a target="_blank" href="https://www.google.com/maps/place/Shree+Hari+Chasma+Ghar+-+Chasma+Shop,+Sunglasses+S/data=!3m1!4b1!4m2!3m1!1s0x395e830b7c13fa3d:0x66f048eaa31a8594">
                            5 Sun Residency, Anand Party Plot Rd, near Manki Circle, New Ranip, Ahmedabad, Gujarat 382470</a></p>
                            <p><i class="fas fa-phone"></i> <a href="tel:+918732969601">+91 8732969601</a></p>
                            <p><i class="fas fa-envelope"></i> <a href="mailto:chasmashops@gmail.com">chasmashops@gmail.com</a></p>
                            <p><i class="fas fa-clock"></i> Mon-Sat: 10:00 AM - 9:00 PM</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="footer-bottom">
                <p class="mb-0">
                    Copyright &copy; 2026 All Rights Reserved.
                    <a href="/privacypolicy.html" class="me-2">Privacy Policy</a><br>
                    For Eyewear Shop In New Ranip Ahmedabad <a href="/">Shree Hari Chasma Ghar</a>
                </p>
            </div>
        </div>
    </footer>
    <!-- Floating Buttons -->
    <a href="https://wa.me/918732969601" target="_blank" class="whatsapp-float" aria-label="WhatsApp">
        <i class="fab fa-whatsapp"></i>
    </a>
    
<!-- ===================================
     OPTICARE AI ASSISTANT
=================================== -->

<div class="floating-ai-wrapper">

    <div class="ai-hover-message">
        👋 Ask OptiCare AI — glasses, lenses &amp; eye care
    </div>

    <div class="premium-ai-button" id="aiChatButton" role="button" tabindex="0" aria-label="Open OptiCare AI chat">
        <span class="pulse-ring"></span>
        <img src="/assets/images/ai-robot.svg" alt="OptiCare AI" width="50" height="60">
        <span class="ai-button-dot"></span>
    </div>

</div>

<!-- CHAT WINDOW -->

<div class="premium-ai-chat" id="aiChatContainer" role="dialog" aria-label="OptiCare AI assistant">

    <div class="premium-ai-header">

        <div class="ai-header-left">
            <span class="ai-avatar">
                <img src="/assets/images/ai-robot.svg" alt="OptiCare AI" width="40" height="40">
                <span class="ai-status-dot"></span>
            </span>
            <div>
                <h4>OptiCare AI</h4>
                <span>Online • replies instantly</span>
            </div>
        </div>

        <button id="closeChat" aria-label="Close chat">&times;</button>

    </div>

    <div class="premium-ai-body" id="chatBody">

        <div class="bot-message">
            👋 Welcome to <b>Shree Hari Chasma Ghar</b><br>
            I'm <b>OptiCare AI</b> — ask me in English, हिंदी or ગુજરાતી.<br>
            Pick a topic below 👇
        </div>

    </div>

    <div class="default-ai-questions">
        <button type="button" onclick="askQuestion('Which frame suits me?')">✨ Suggest a frame</button>
        <button type="button" onclick="askQuestion('Frame price')">👓 Price</button>
        <button type="button" onclick="askQuestion('Eye test')">👁 Eye Test</button>
        <button type="button" onclick="askQuestion('Blue cut lens')">💻 Blue Cut</button>
        <button type="button" onclick="askQuestion('Sunglasses')">🕶️ Sunglasses</button>
        <button type="button" onclick="askQuestion('Contact lens')">🔵 Contact Lens</button>
        <button type="button" onclick="askQuestion('Kids glasses')">👶 Kids</button>
        <button type="button" onclick="askQuestion('Repair')">🔧 Repair</button>
        <button type="button" onclick="askQuestion('Timing')">🕙 Timing</button>
        <button type="button" onclick="askQuestion('Location')">📍 Location</button>
        <button type="button" onclick="askQuestion('Offers')">🎁 Offers</button>
        <button type="button" onclick="askQuestion('WhatsApp')">💬 WhatsApp</button>
    </div>

    <div class="premium-ai-input">
        <input type="text" id="aiMessageInput" placeholder="Type in English / हिंदी / ગુજરાતી..." aria-label="Type your message">
        <button id="sendAiMessage" aria-label="Send message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>
        </button>
    </div>

</div>

<!-- ===================================
     MOBILE STICKY BOTTOM BAR (mobile view only)
=================================== -->
<nav class="mobile-bottom-bar" aria-label="Quick contact actions">
    <a href="/" class="mbb-item" aria-label="Home">
        <i class="fas fa-house"></i>
        <span>Home</span>
    </a>
    <a href="tel:+918732969601" class="mbb-item" aria-label="Call us">
        <i class="fas fa-phone"></i>
        <span>Call</span>
    </a>
    <a href="https://wa.me/918732969601" target="_blank" rel="noopener" class="mbb-item mbb-wa" aria-label="Chat on WhatsApp">
        <i class="fab fa-whatsapp"></i>
        <span>WhatsApp</span>
    </a>
    <a href="https://www.google.com/maps/place/Shree+Hari+Chasma+Ghar+-+Chasma+Shop,+Sunglasses+S/data=!3m1!4b1!4m2!3m1!1s0x395e830b7c13fa3d:0x66f048eaa31a8594" target="_blank" rel="noopener" class="mbb-item" aria-label="Store location">
        <i class="fas fa-location-dot"></i>
        <span>Location</span>
    </a>
    <button type="button" class="mbb-item mbb-ai" id="mbbAiButton" aria-label="Open OptiCare AI assistant">
        <i class="fas fa-robot"></i>
        <span>Assistant</span>
    </button>
</nav>
    `;

    // Wire the bottom-bar assistant button to open the OptiCare AI chat.
    // stopPropagation prevents site.js's outside-click handler from closing it instantly.
    (function () {
        const mbbAi = document.getElementById('mbbAiButton');
        const aiBtn = document.getElementById('aiChatButton');
        if (mbbAi && aiBtn) {
            mbbAi.addEventListener('click', function (e) {
                e.stopPropagation();
                aiBtn.click();
            });
        }
    })();

    // ===== ACCESSIBILITY: <main> landmark + skip-to-content link (every page) =====
    (function () {
        const headerEl = document.getElementById('site-header');
        const footerEl = document.getElementById('site-footer');

        // Wrap page content between header and footer in a <main> landmark (if none exists)
        let mainEl = document.querySelector('main');
        if (!mainEl && headerEl && footerEl && headerEl.parentNode === footerEl.parentNode) {
            mainEl = document.createElement('main');
            let node = headerEl.nextSibling;
            while (node && node !== footerEl) {
                const next = node.nextSibling;
                mainEl.appendChild(node);
                node = next;
            }
            footerEl.parentNode.insertBefore(mainEl, footerEl);
        }
        if (mainEl) {
            if (!mainEl.id) mainEl.id = 'main-content';
            mainEl.setAttribute('tabindex', '-1');
        }

        // Skip link as the first focusable element in the page
        if (!document.querySelector('.skip-link')) {
            const skip = document.createElement('a');
            skip.href = '#' + (mainEl && mainEl.id ? mainEl.id : 'main-content');
            skip.className = 'skip-link';
            skip.textContent = 'Skip to main content';
            document.body.insertBefore(skip, document.body.firstChild);
        }
    })();
});