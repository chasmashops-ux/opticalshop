
// ----------------------------------------------------------HOME PAGE start----------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {

    setTimeout(() => {

        let currentLocation = window.location.pathname;

        // remove trailing slash
        if (currentLocation.length > 1 && currentLocation.endsWith('/')) {
            currentLocation = currentLocation.slice(0, -1);
        }

        const menuItems = document.querySelectorAll('.nav-link');

        menuItems.forEach(item => {

            let itemPath = item.getAttribute('href');

            if (itemPath.length > 1 && itemPath.endsWith('/')) {
                itemPath = itemPath.slice(0, -1);
            }

            if (itemPath === currentLocation) {
                item.classList.add('active');
            }

        });

    }, 100);

});


// Initialize AOS
AOS.init({
    duration: 1000,
    once: true,
    offset: 100
});


// Stats Counter Animation
const animateCounter = (element, target) => {
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target.toLocaleString() + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current).toLocaleString();
        }
    }, 20);
};

// Trigger counter animation when stats section is visible
const statsSection = document.querySelector('.stats-section');
const statNumbers = document.querySelectorAll('.stat-number');
let statsAnimated = false;

const observerOptions = {
    threshold: 0.5
};

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting && !statsAnimated) {
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-count'));
                animateCounter(stat, target);
            });
            statsAnimated = true;
        }
    });
}, observerOptions);

if (statsSection) {
    statsObserver.observe(statsSection);
}

// Scroll to Top Button
const scrollTopBtn = document.getElementById('scrollTop');

window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});


// Prevent Default for Floating Buttons
document.querySelectorAll('.whatsapp-float, .call-float').forEach(button => {
    button.addEventListener('click', function (e) {
        // Allow default behavior (opens link/makes call)
    });
});



/* =========================================
   OPTICAL AI ASSISTANT
========================================= */

document.addEventListener("DOMContentLoaded", function () {

    const aiButton =
        document.getElementById("aiChatButton");

    const aiContainer =
        document.getElementById("aiChatContainer");

    const closeChat =
        document.getElementById("closeChat");

    const chatBody =
        document.getElementById("chatBody");

    // OPEN CHAT

   if (aiButton && aiContainer) {

    aiButton.onclick = function (e) {

        e.stopPropagation();

        if (
            aiContainer.style.display === "flex"
        ) {

            aiContainer.style.display = "none";

        } else {

            aiContainer.style.display = "flex";

        }

    }

}

// CLOSE BUTTON

if (closeChat && aiContainer) {

    closeChat.onclick = function () {

        aiContainer.style.display = "none";

    }

}

// OUTSIDE CLICK CLOSE

document.addEventListener("click", function (e) {

    if (
        aiContainer &&
        aiContainer.style.display === "flex" &&
        !aiContainer.contains(e.target) &&
        !aiButton.contains(e.target)
    ) {

        aiContainer.style.display = "none";

    }

});


    // DYNAMIC ANSWERS

    const aiAnswers = [

        {
            keywords: ["frame", "price", "frame price", "glass price"],
            answer: `
            👓 <b>Premium Frames Available</b>

            ✔ Frame price starts from ₹499

            ✔ Men / Women / Kids Collection

            ✔ Stylish & Branded Frames
            `
        },

        {
            keywords: ["sunglasses", "sun glass", "goggles"],
            answer: `
            😎 <b>Premium Sunglasses Collection</b>

            ✔ UV Protection

            ✔ Stylish Fashion Collection

            ✔ Branded Sunglasses Available
            `
        },

        {
            keywords: ["lens", "contact lens", "lenses"],
            answer: `
            🔵 <b>Lens Collection</b>

            ✔ Blue Cut Lens

            ✔ Anti Glare Lens

            ✔ Zero Power Lens

            ✔ Contact Lens Available
            `
        },

        {
            keywords: ["repair", "repairing", "fix"],
            answer: `
            🔧 <b>Glasses Repair Service</b>

            Repair starts from ₹150
            `
        },

        {
            keywords: ["eye", "test", "eye test", "checkup"],
            answer: `
            👁 <b>Digital Eye Testing Available</b>

            Professional eye testing service available at store.
            `
        },

        {
            keywords: ["timing", "time", "open", "close"],
            answer: `
            🕙 <b>Shop Timing</b>

            Monday to Sunday

            10:00 AM to 9:00 PM
            `
        },

        {
            keywords: ["location", "address", "map"],
            answer: `
            📍 <b>Shree Hari Chasma Ghar</b>

            New Ranip Ahmedabad

            <br><br>

            <a href="https://maps.google.com/?q=Shree+Hari+Chasma+Ghar+new+ranip+ahmedabad"
            target="_blank">

            🗺 Open Google Map

            </a>
            `
        },

        {
            keywords: ["contact", "phone", "number", "mobile"],
            answer: `
            📞 <b>Call Us</b>

            <a href="tel:+918732969601">

            +91 8732969601

            </a>
            `
        },

        {
            keywords: ["whatsapp", "wa"],
            answer: `
            💬 <b>WhatsApp Support</b>

            <a href="https://wa.me/918732969601"
            target="_blank">

            Open WhatsApp Chat

            </a>
            `
        },

        {
            keywords: ["kids", "kid", "child"],
            answer: `
            👶 <b>Kids Collection Available</b>

            Comfortable & stylish kids glasses available.
            `
        },

        {
            keywords: ["women", "ladies", "girl"],
            answer: `
            👩 <b>Women Collection</b>

            Latest fashionable women eyewear available.
            `
        },

        {
            keywords: ["men", "man", "boys"],
            answer: `
            🧔 <b>Men Collection</b>

            Premium stylish men frame collection available.
            `
        },

        {
            keywords: ["offer", "discount", "sale"],
            answer: `
            🎁 <b>Special Offers Available</b>

            Visit store for latest discounts & combo offers.
            `
        },

        {
            keywords: ["payment", "upi", "paytm"],
            answer: `
            💳 <b>Payment Methods</b>

            ✔ Cash

            ✔ UPI

            ✔ PhonePe

            ✔ Google Pay

            ✔ Paytm
            `
        },

        {
            keywords: ["brand", "brands"],
            answer: `
            🏷 <b>Premium Brands Available</b>

            ✔ Fastrack

            ✔ Stylish Premium Collection
            `
        },

        {
            keywords: ["blue cut", "computer"],
            answer: `
            💻 <b>Blue Cut Computer Glasses</b>

            Best for mobile & computer users.
            `
        },

        {
            keywords: ["anti glare"],
            answer: `
            ✨ <b>Anti Glare Lens Available</b>

            Better night vision & eye comfort.
            `
        },

        {
            keywords: ["doctor", "optometrist"],
            answer: `
            👨‍⚕ <b>Professional Optometrist Available</b>

            Accurate eye testing & guidance available.
            `
        },

        {
            keywords: ["hello", "hi", "hey"],
            answer: `
            👋 Hello Welcome to

            <b>Shree Hari Chasma Ghar</b>

            How can I help you today?
            `
        }

    ];

    // ASK QUESTION

    window.askQuestion = function (question) {

        addUserMessage(question);

        showTyping();

        setTimeout(() => {

            removeTyping();

            let foundAnswer = false;

            const lowerQuestion =
                question.toLowerCase();

            aiAnswers.forEach(item => {

                item.keywords.forEach(keyword => {

                    if (lowerQuestion.includes(keyword)) {

                        addBotMessage(item.answer);

                        foundAnswer = true;

                    }

                });

            });

            // DEFAULT

            if (!foundAnswer) {

                addBotMessage(`

                🤖 <b>Optical AI Assistant</b>

                Sorry 😄

                Please contact shop for more details.

                <br><br>

                📞 +91 8732969601

                `);

            }

        }, 900);

    }



    const aiInput =
        document.getElementById("aiMessageInput");

    const sendBtn =
        document.getElementById("sendAiMessage");

    /* SAFETY */

    if (!aiInput || !sendBtn) {
        return;
    }

    // USER MESSAGE

    function addUserMessage(message) {

        chatBody.innerHTML += `

        <div class="user-message">

            ${message}

        </div>

        `;

        scrollBottom();

    }

    // BOT MESSAGE

    function addBotMessage(message) {

        chatBody.innerHTML += `

        <div class="bot-message">

            ${message}

        </div>

        `;

        scrollBottom();

    }

    // TYPING

    function showTyping() {

        chatBody.innerHTML += `

        <div class="typing" id="typingAnimation">

            🤖 Typing...

        </div>

        `;

        scrollBottom();

    }

    function removeTyping() {

        const typing =
            document.getElementById("typingAnimation");

        if (typing) {

            typing.remove();

        }

    }

    // AUTO SCROLL

    function scrollBottom() {

        chatBody.scrollTop =
            chatBody.scrollHeight;

    }


    /* SEND MESSAGE */

    function sendCustomMessage() {

        const message =
            aiInput.value.trim();

        if (message === "") return;

        askQuestion(message);

        aiInput.value = "";

    }

    /* BUTTON CLICK */

    sendBtn.addEventListener("click", function () {

        sendCustomMessage();

    });

    /* ENTER KEY */

    aiInput.addEventListener("keypress", function (e) {

        if (e.key === "Enter") {

            sendCustomMessage();
        }
    });

});

AOS.init({
    disable: window.innerWidth < 768
});




const slides =
document.querySelectorAll('.hero-slide');

const dots =
document.querySelectorAll('.hero-dot');


if (slides.length > 0 && dots.length > 0) {

    let currentSlide = 0;

    function showSlide(index) {

        slides.forEach((slide) => {

            slide.classList.remove('active');

        });

        dots.forEach((dot) => {

            dot.classList.remove('active');

        });

        if (slides[index]) {

            slides[index].classList.add('active');

        }

        if (dots[index]) {

            dots[index].classList.add('active');

        }

    }

    function nextSlide() {

        currentSlide++;

        if (currentSlide >= slides.length) {

            currentSlide = 0;

        }

        showSlide(currentSlide);

    }

    setInterval(nextSlide, 5000);

    dots.forEach((dot, index) => {

        dot.addEventListener('click', () => {

            currentSlide = index;

            showSlide(currentSlide);

        });

    });

}

// ----------------------------------------------------------service page----------------------------------------------------




const services = [

    {
        text:'professional-optometry-service.html',
        icon:'fa-eye',
        title:'Professional Optometry Service',
        desc:'Advanced professional optometry services with accurate eye analysis and premium vision care.'
    },

    {
         text:'optical-shop-in-new-ranip-ahmedabad.html',
        icon:'fa-glasses',
        title:'Optical Shop In New Ranip Ahmedabad',
        desc:'Complete optical solutions including frames, lenses and eye testing services in New Ranip Ahmedabad.'
    },

    {
        text:'best-optician-in-new-ranip.html',
        icon:'fa-star',
        title:'Best Optician In New Ranip',
        desc:'Professional optician services with quality eyewear and accurate eye number checking.'
    },

    {
        text:'chasma-store-in-ranip-ahmedabad.html',
        icon:'fa-glasses',
        title:'Chasma Store In Ranip Ahmedabad',
        desc:'Latest spectacle frames and branded eyewear collection available near Ranip Ahmedabad.'
    },

    {
        text:'eyeglasses-store-in-new-ranip.html',
        icon:'fa-eye',
        title:'Eyeglasses Store In New Ranip',
        desc:'Stylish eyeglasses for men, women and kids with affordable premium quality.'
    },

    {
        text:'spectacles-shop-in-ranip.html',
        icon:'fa-glasses',
        title:'Spectacles Shop In Ranip',
        desc:'Modern spectacle frames with comfortable fitting and premium lenses.'
    },

    {
        text:'computer-glasses-in-ranip.html',
        icon:'fa-laptop',
        title:'Computer Glasses In Ranip',
        desc:'Blue cut computer glasses to reduce eye strain and screen fatigue.'
    },

    {
        text:'blue-cut-glasses-store-ahmedabad.html',
        icon:'fa-laptop-medical',
        title:'Blue Cut Glasses Store Ahmedabad',
        desc:'Premium blue light protection glasses for office and mobile users.'
    },

    {
        text:'reading-glasses-shop-in-ranip.html',
        icon:'fa-book-reader',
        title:'Reading Glasses Shop In Ranip',
        desc:'Comfortable reading glasses for daily use available in Ranip Ahmedabad.'
    },

    {
        text:'progressive-lens-optical-shop.html',
        icon:'fa-eye',
        title:'Progressive Lens Optical Shop',
        desc:'Advanced progressive lenses for clear near and distance vision.'
    },

    {
        text:'stylish-spectacle-frames-ahmedabad.html',
        icon:'fa-gem',
        title:'Stylish Spectacle Frames Ahmedabad',
        desc:'Trendy and fashionable spectacle frames collection for all age groups.'
    },

    {
        text:'kids-eyeglasses-store-in-new-ranip.html',
        icon:'fa-child',
        title:'Kids Eyeglasses Store In New Ranip',
        desc:'Durable and lightweight eyeglasses specially designed for kids.'
    },

    {
        text:'men-spectacle-frames-ahmedabad.html',
        icon:'fa-user-tie',
        title:'Men Spectacle Frames Ahmedabad',
        desc:'Latest men’s spectacle frame collection with stylish premium designs.'
    },

    {
        text:'women-spectacle-frames-ranip.html',
        icon:'fa-female',
        title:'Women Spectacle Frames Ranip',
        desc:'Elegant and fashionable women eyewear collection available in Ahmedabad.'
    },


    {
        text:'affordable-chasma-shop-in-ranip.html',
        icon:'fa-tags',
        title:'Affordable Chasma Shop In Ranip',
        desc:'Budget-friendly eyeglasses, frames and sunglasses store in Ranip Ahmedabad.'
    },

    {
        text:'premium-optical-store-in-new-ranip.html',
        icon:'fa-store',
        title:'Premium Optical Store In New Ranip',
        desc:'Premium quality optical products and eye care services in Ahmedabad.'
    },

    {
        text:'contact-lens-store-in-ahmedabad.html',
        icon:'fa-eye',
        title:'Contact Lens Store In Ahmedabad',
        desc:'Soft and comfortable contact lenses available for daily and monthly use.'
    },

    {
        text:'color-contact-lens-shop-ranip.html',
        icon:'fa-palette',
        title:'Color Contact Lens Shop Ranip',
        desc:'Stylish color contact lenses for fashionable looks in Ahmedabad.'
    },

    {
        text:'eye-lens-store-near-ranip.html',
        icon:'fa-eye',
        title:'Eye Lens Store Near Ranip',
        desc:'Wide range of eye lenses and contact lens accessories available.'
    },

    {
        text:'sunglasses-store-in-new-ranip.html',
        icon:'fa-sun',
        title:'Sunglasses Store In New Ranip',
        desc:'Latest branded sunglasses collection with UV protection.'
    },

    {
        text:'uv-protection-sunglasses-store.html',
        icon:'fa-shield-alt',
        title:'UV Protection Sunglasses Store',
        desc:'UV protection sunglasses to protect eyes from harmful sunlight and dust.'
    },

    {
        text:'men-sunglasses-store-ranip.html',
        icon:'fa-user',
        title:'Men Sunglasses Store Ranip',
        desc:'Modern men sunglasses collection with stylish and premium designs.'
    },

    {
        text:'women-sunglasses-shop-ahmedabad.html',
        icon:'fa-female',
        title:'Women Sunglasses Shop Ahmedabad',
        desc:'Fashionable women sunglasses available in multiple trendy styles.'
    },

    {
        text:'kids-sunglasses-store-new-ranip.html',
        icon:'fa-child',
        title:'Kids Sunglasses Store New Ranip',
        desc:'Comfortable and protective sunglasses collection specially for kids.'
    },

    {
        text:'stylish-goggles-shop-in-ranip.html',
        icon:'fa-glasses',
        title:'Stylish Goggles Shop In Ranip',
        desc:'Trendy goggles and sunglasses collection available in Ahmedabad.'
    },

    {
        text:'sports-sunglasses-ahmedabad.html',
        icon:'fa-football-ball',
        title:'Sports Sunglasses Ahmedabad',
        desc:'Durable sports sunglasses suitable for riding and outdoor activities.'
    },

    {
        text:'polarized-sunglasses-store.html',
        icon:'fa-adjust',
        title:'Polarized Sunglasses Store',
        desc:'Polarized sunglasses for better visibility and reduced sunlight glare.'
    },

    {
        text:'designer-sunglasses-shop-ahmedabad.html',
        icon:'fa-gem',
        title:'Designer Sunglasses Shop Ahmedabad',
        desc:'Premium designer sunglasses collection for stylish modern looks.'
    },

    {
        text:'free-eye-checkup-in-new-ranip.html',
        icon:'fa-heartbeat',
        title:'Free Eye Checkup In New Ranip',
        desc:'Free eye testing and vision checking services available in Ahmedabad.'
    },

    {
        text:'computerized-eye-testing-ranip.html',
        icon:'fa-microscope',
        title:'Computerized Eye Testing Ranip',
        desc:'Advanced computerized eye testing for accurate power checking.'
    },

    {
        text:'vision-testing-optical-shop-ahmedabad.html',
        icon:'fa-eye',
        title:'Vision Testing Optical Shop Ahmedabad',
        desc:'Professional vision testing services with modern eye checking equipment.'
    },

    {
        text:'eye-number-checking-in-ranip.html',
        icon:'fa-search',
        title:'Eye Number Checking In Ranip',
        desc:'Accurate eye number checking and optical consultation services.'
    },

    {
        text:'digital-eye-test-center-ahmedabad.html',
        icon:'fa-desktop',
        title:'Digital Eye Test Center Ahmedabad',
        desc:'Digital eye testing services for clear and accurate vision analysis.'
    },

    {
        text:'power-glasses-shop-in-new-ranip.html',
        icon:'fa-glasses',
        title:'Power Glasses Shop In New Ranip',
        desc:'Customized power glasses with high quality lenses.'
    },

    {
        text:'high-power-lens-optical-shop.html',
        icon:'fa-eye',
        title:'High Power Lens Optical Shop',
        desc:'Specialized optical shop for high power lenses and comfortable vision.'
    },

    {
        text:'anti-glare-glasses-store-ahmedabad.html',
        icon:'fa-moon',
        title:'Anti Glare Glasses Store Ahmedabad',
        desc:'Anti glare glasses for computer users and night driving protection.'
    },

    {
        text:'photochromic-glasses-in-ranip.html',
        icon:'fa-adjust',
        title:'Photochromic Glasses In Ranip',
        desc:'Photochromic glasses that adjust automatically in sunlight and indoor lighting.'
    },

    {
        text:'imported-frames-store-ahmedabad.html',
        icon:'fa-star',
        title:'Imported Frames Store Ahmedabad',
        desc:'Imported stylish spectacle frames collection available in Ahmedabad.'
    },

    {
        text:'optical-accessories-store-ranip.html',
        icon:'fa-toolbox',
        title:'Optical Accessories Store Ranip',
        desc:'All types of optical accessories including cases and cleaners.'
    },

    {
        text:'frame-repair-optical-shop-ahmedabad.html',
        icon:'fa-tools',
        title:'Frame Repair Optical Shop Ahmedabad',
        desc:'Quick and reliable spectacle frame repair services.'
    },

    {
        text:'spectacle-repair-in-new-ranip.html',
        icon:'fa-screwdriver',
        title:'Spectacle Repair In New Ranip',
        desc:'Professional eyeglass repair services including fitting and screw replacement.'
    },

    {
        text:'nose-pad-replacement-optical-shop.html',
        icon:'fa-circle',
        title:'Nose Pad Replacement Optical Shop',
        desc:'Comfortable nose pad replacement services for spectacle frames.'
    },

    {
        text:'optical-shop-near-chandkheda.html',
        icon:'fa-map-marker-alt',
        title:'Optical Shop Near Chandkheda',
        desc:'Trusted optical and eyewear services near Chandkheda Ahmedabad.'
    },

    {
        text:'optical-store-near-gota-ahmedabad.html',
        icon:'fa-map-marker-alt',
        title:'Optical Store Near Gota Ahmedabad',
        desc:'Affordable eyewear and sunglasses collection near Gota Ahmedabad.'
    },

    {
        text:'best-chasma-shop-near-nirnay-nagar.html',
        icon:'fa-map-marker-alt',
        title:'Best Chasma Shop Near Nirnay Nagar',
        desc:'Modern optical store near Nirnay Nagar with stylish eyewear collection.'
    },

    {
        text:'optical-shop-near-sabarmati-ahmedabad.html',
        icon:'fa-map-marker-alt',
        title:'Optical Shop Near Sabarmati Ahmedabad',
        desc:'Complete eye care and eyewear solutions near Sabarmati Ahmedabad.'
    }

];

const servicesPerPage = 9;

let currentPage = 1;

function renderServices(page){

    const container =
    document.getElementById('servicesContainer');

    container.innerHTML = '';

    const start =
    (page - 1) * servicesPerPage;

    const end =
    start + servicesPerPage;

    const paginatedItems =
    services.slice(start,end);

    paginatedItems.forEach((service,index)=>{

        container.innerHTML += `

        <div class="col-lg-4 col-md-6"
             data-aos="fade-up"
             data-aos-delay="${index * 100}">

            <div class="modern-service-card">

                <div class="service-icon-modern">

                    <i class="fas ${service.icon}"></i>

                </div>

                <h3 class="service-title-modern">

                    ${service.title}

                </h3>

                <p class="service-desc-modern">

                    ${service.desc}

                </p>

                <a href="/services/${service.text}"
                   class="service-btn-modern">

                    Learn More

                    <i class="fas fa-arrow-right"></i>

                </a>

            </div>

        </div>

        `;

    });

}

function renderPagination(){

    const pagination =
    document.getElementById('pagination');

    pagination.innerHTML = '';

    const totalPages =
    Math.ceil(services.length / servicesPerPage);

    for(let i=1;i<=totalPages;i++){

        pagination.innerHTML += `

        <button class="page-btn
                ${i === currentPage ? 'active':''}"

                onclick="changePage(${i})">

            ${i}

        </button>

        `;
    }

}

function changePage(page){

    currentPage = page;

    renderServices(currentPage);

    renderPagination();

    window.scrollTo({

        top:
        document.getElementById('services').offsetTop - 100,

        behavior:'smooth'

    });

}


const servicesContainer =
document.getElementById('servicesContainer');

if(servicesContainer){

    renderServices(currentPage);

    renderPagination();

}