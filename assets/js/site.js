
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

                    if(itemPath === currentLocation){
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
            button.addEventListener('click', function(e) {
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

    aiButton.onclick = function () {

        aiContainer.style.display = "flex";

    }

    // CLOSE CHAT

    closeChat.onclick = function () {

        aiContainer.style.display = "none";

    }

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

            ✔ RayBan Style

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

    if(!aiInput || !sendBtn){
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

    function sendCustomMessage(){

        const message =
        aiInput.value.trim();

        if(message === "") return;

        askQuestion(message);

        aiInput.value = "";

    }

    /* BUTTON CLICK */

    sendBtn.addEventListener("click", function(){

        sendCustomMessage();

    });

    /* ENTER KEY */

    aiInput.addEventListener("keypress", function(e){

        if(e.key === "Enter"){

            sendCustomMessage();
        }
    });

});

AOS.init({
 disable: window.innerWidth < 768
});



   // ----------------------------------------------------------Reviews page----------------------------------------------------
