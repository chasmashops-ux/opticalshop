document.addEventListener("DOMContentLoaded", function () {

    // ===== HEADER =====
    document.getElementById("site-header").innerHTML = `
     <!-- Premium Navigation -->
    <nav class="navbar navbar-expand-lg">
        <div class="container">
            <a href="/">
                <img src="/assets/images/Logo.png"  alt="Shree Hari chasma Ghar logo" title="Shree Hari Chasma Ghar" class="shcg-logo"> 
            </a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse" id="navbarNav">
                <ul class="navbar-nav ms-auto align-items-lg-center">
                    <li class="nav-item">
                        <a class="nav-link" href="/">Home</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="eyeglasses.html">EyeGlasses</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="sunglasses.html">SunGlasses</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="contactlenses.html">Contact Lenses</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="services.html">Services</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="about.html">About</a>
                    </li>
                    <li class="nav-item">
                        <a class="nav-link" href="contact.html">Contact Us</a>
                    </li>
                    <li class="nav-item">
                        <a class="btn btn-book" href="tel:+918732969601">Book Eye Test</a>
                    </li>
                </ul>
            </div>
        </div>
    </nav>
    `;

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
                            <a href="https://twitter.com/hari_ghar" target="_blank" class="social-link">
                                <i class="fab fa-twitter"></i>
                            </a>
                            <a href="https://www.facebook.com/shriharichasmaghar" target="_blank" class="social-link">
                                <i class="fab fa-facebook-f"></i>
                            </a>
                            <a href="https://www.linkedin.com/in/shree-hari-chasma-ghar/" target="_blank" class="social-link">
                                <i class="fab fa-linkedin-in"></i>
                            </a>
                            <a href="https://www.instagram.com/shreeharichasmagharindia/" target="_blank" class="social-link">
                                <i class="fab fa-instagram"></i>
                            </a>
                        </div>
                    </div>
                    
                    <div class="col-lg-3 col-md-6">
                        <h4 class="footer-title">Quick Links</h4>
                        <ul class="footer-links">
                            <li><a href="/"><i class="fas fa-chevron-right"></i> Home</a></li>
                            <li><a href="eyeglasses.html"><i class="fas fa-chevron-right"></i> EyeGlasses</a></li>
                            <li><a href="sunglasses.html"><i class="fas fa-chevron-right"></i> SunGlasses</a></li>
                            <li><a href="contact-lenses.html"><i class="fas fa-chevron-right"></i> Contact Lenses</a></li>
                            <li><a href="services.html"><i class="fas fa-chevron-right"></i> Services</a></li>
                            <li><a href="about.html"><i class="fas fa-chevron-right"></i> About</a></li>
                            <li><a href="contact.html"><i class="fas fa-chevron-right"></i> Contact Us</a></li>
                        </ul>
                    </div>
                    
                    <div class="col-lg-3 col-md-6">
                        <h4 class="footer-title">Popular Links</h4>
                        <ul class="footer-links">
                            <li><a href="professionaloptometryservice.html"><i class="fas fa-chevron-right"></i> Professional Optometry Service</a></li>
                            <li><a href="myopiamanagement.html"><i class="fas fa-chevron-right"></i> Myopia Management</a></li>
                            <li><a href="opticalservicesglasses.html"><i class="fas fa-chevron-right"></i> Optical Services Glasses</a></li>
                            <li><a href="visionscreening.html"><i class="fas fa-chevron-right"></i> Vision Screening</a></li>
                            <li><a href="lensesforprescription.html"><i class="fas fa-chevron-right"></i> Lenses for Prescription</a></li>
                            <li><a href="glassesrepair.html"><i class="fas fa-chevron-right"></i> Glasses Repair</a></li>
                            <li><a href="faq.html"><i class="fas fa-chevron-right"></i> FAQ</a></li>
                            <li><a href="googlereviews.html"><i class="fas fa-chevron-right"></i> Google Reviews</a></li>
                        </ul>
                    </div>
                    
                    <div class="col-lg-3 col-md-6">
                        <h4 class="footer-title">Contact Details</h4>
                        <div class="footer-contact">
                            <p><i class="fas fa-map-marker-alt"></i> 5 Sun Residency, Anand Party Plot Rd, near Manki Circle, New Ranip, Ahmedabad, Gujarat 382470</p>
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
                    <a href="privacypolicy.html" class="me-2">Privacy Policy</a><br>
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
     FLOATING AI ASSISTANT
=================================== -->

<div class="floating-ai-wrapper">

    <!-- Hover Message -->

    <div class="ai-hover-message">
        👋 Hi, I'm Optical AI Assistant
    </div>

    <!-- AI Button -->

    <div class="premium-ai-button" id="aiChatButton">

        <div class="pulse-ring"></div>

        <img src="assets/images/ai-robot.svg"
             alt="AI Assistant">

    </div>

</div>

<!-- CHAT WINDOW -->

<div class="premium-ai-chat" id="aiChatContainer">

    <!-- HEADER -->

    <div class="premium-ai-header">

        <div class="ai-header-left">

            <img src="assets/images/ai-robot.svg"
                 alt="AI Assistant">

            <div>
                <h4>Optical AI Assistant</h4>
                <span>Online Now</span>
            </div>

        </div>

        <button id="closeChat">✕</button>

    </div>

    <!-- BODY -->

    <div class="premium-ai-body" id="chatBody">

        <div class="bot-message">

            👋 Welcome to
            <b>Shree Hari Chasma Ghar</b>

            <br><br>

            Please select a question 👇

        </div>

    </div>

    <!-- QUESTIONS -->

    <div class="default-ai-questions">

        <button onclick="askQuestion('Frame price')">👓 Frame Price</button>

        <button onclick="askQuestion('Sunglasses')">😎 Sunglasses</button>

        <button onclick="askQuestion('Lens')">🔵 Lens</button>

        <button onclick="askQuestion('Eye test')">👁 Eye Test</button>

        <button onclick="askQuestion('Repair')">🔧 Repair</button>

        <button onclick="askQuestion('Location')">📍 Location</button>

        <button onclick="askQuestion('Timing')">🕙 Timing</button>

        <button onclick="askQuestion('Contact')">📞 Contact</button>

        <button onclick="askQuestion('WhatsApp')">💬 WhatsApp</button>

        <button onclick="askQuestion('Kids glasses')">👶 Kids</button>

        <button onclick="askQuestion('Women collection')">👩 Women</button>

        <button onclick="askQuestion('Men collection')">🧔 Men</button>

        <button onclick="askQuestion('Offers')">🎁 Offers</button>

        <button onclick="askQuestion('Payment')">💳 Payment</button>

        <button onclick="askQuestion('Blue cut lens')">💻 Blue Cut</button>

        <button onclick="askQuestion('Anti glare')">✨ Anti Glare</button>

    </div>
    <!-- MESSAGE INPUT -->

    <!-- ADD THIS -->
    <div class="premium-ai-input">

        <input type="text"
               id="aiMessageInput"
               placeholder="Ask anything about glasses...">

        <button id="sendAiMessage">

            <i class="fas fa-paper-plane"></i>

        </button>

    </div>

</div>

  
    `;
});