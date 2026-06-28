
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
    if (!scrollTopBtn) return;
    if (window.scrollY > 500) {
        scrollTopBtn.classList.add('show');
    } else {
        scrollTopBtn.classList.remove('show');
    }
});

if (scrollTopBtn) {
    scrollTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}


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


    // ===============================================
    //  OptiCare AI — multilingual smart assistant
    // ===============================================

    const STORE = {
        phone: "+91 8732969601",
        whatsapp: "https://wa.me/918732969601",
        map: "https://maps.google.com/?q=Shree+Hari+Chasma+Ghar+new+ranip+ahmedabad",
        hours: "Mon–Sun, 10 AM – 9 PM"
    };

    // ---- Language detection (native script + romanized hints) ----
    const HI_HINTS = ["kitna", "kitne", "kya", "kaha", "kahan", "chahiye", "batao", "kaise", "kaun", "kaunsa", "konsa", "nahi", "haan", "accha", "theek", "paisa", "kimat", "mujhe", "aankh", "chasma", "chashma"];
    const GU_HINTS = ["ketla", "ketli", "kem", "cho", "che", "sastu", "saru", "joiye", "aapo", "kyare", "kona", "kevi", "bhav", "tame", "mane"];
    function detectLang(t) {
        if (/[઀-૿]/.test(t)) return "gu";
        if (/[ऀ-ॿ]/.test(t)) return "hi";
        const s = " " + t.toLowerCase() + " ";
        const gu = GU_HINTS.reduce((n, w) => n + (s.includes(" " + w + " ") ? 1 : 0), 0);
        const hi = HI_HINTS.reduce((n, w) => n + (s.includes(" " + w + " ") ? 1 : 0), 0);
        if (gu > 0 && gu >= hi) return "gu";
        if (hi > 0) return "hi";
        return "en";
    }
    function L(a, lang) { return (a && (a[lang] || a.en)) || ""; }

    // ---- Knowledge base (keys matched as substrings; includes native-script keys) ----
    const KB = [
        { k: ["frame", "frames", "chasma", "chashma", "chshma", "glasses", "spectacle", "spectacles", "eyeglass", "eye glass", "specs", "चश्मा", "चशमा", "फ्रेम", "ચશ્મા", "ફ્રેમ"], a: {
            en: "👓 <b>Eyeglasses &amp; Frames</b><br>Full-rim, half-rim &amp; rimless frames for men, women &amp; kids — with Blue-Cut, Anti-Glare &amp; power lenses. Frames from <b>₹499</b>.",
            hi: "👓 <b>चश्मा व फ्रेम</b><br>पुरुष, महिला व बच्चों के लिए फुल-रिम, हाफ-रिम व रिमलेस फ्रेम — Blue-Cut, Anti-Glare व पावर लेंस के साथ। फ्रेम <b>₹499</b> से।",
            gu: "👓 <b>ચશ્મા અને ફ્રેમ</b><br>પુરુષ, સ્ત્રી અને બાળકો માટે ફુલ-રિમ, હાફ-રિમ અને રિમલેસ ફ્રેમ — Blue-Cut, Anti-Glare અને પાવર લેન્સ સાથે. ફ્રેમ <b>₹499</b> થી." } },
        { k: ["hello", "hii", "hey", "namaste", "namaskar", "kem cho", "ram ram", "good morning", "good evening", "નમસ્તે", "नमस्ते", "કેમ છો"], a: {
            en: "👋 Welcome to <b>Shree Hari Chasma Ghar</b>!<br>I'm <b>OptiCare AI</b>. How can I help with glasses, lenses or eye care today?",
            hi: "👋 <b>Shree Hari Chasma Ghar</b> में आपका स्वागत है!<br>मैं <b>OptiCare AI</b> हूँ। चश्मा, लेंस या आई-केयर में कैसे मदद करूँ?",
            gu: "👋 <b>Shree Hari Chasma Ghar</b> માં આપનું સ્વાગત છે!<br>હું <b>OptiCare AI</b> છું. ચશ્મા, લેન્સ કે આઇ-કેરમાં કેવી રીતે મદદ કરું?" } },
        { k: ["price", "cost", "rate", "charge", "how much", "kitna", "kitne", "ketla", "ketli", "bhav", "kimat", "kimmat", "कीमत", "कितने", "दाम", "કિંમત", "ભાવ", "કેટલા"], a: {
            en: "💰 <b>Pricing</b><br>Price depends on • Frame • Lens type • Brand • Coating.<br>Tell me your need and I'll suggest the best value. Frames from <b>₹499</b>. 👓",
            hi: "💰 <b>कीमत</b><br>कीमत निर्भर है • फ्रेम • लेंस • ब्रांड • कोटिंग पर।<br>बताइए क्या चाहिए, सबसे अच्छा विकल्प सुझाऊँगा। फ्रेम <b>₹499</b> से। 👓",
            gu: "💰 <b>કિંમત</b><br>કિંમત આધાર રાખે • ફ્રેમ • લેન્સ • બ્રાન્ડ • કોટિંગ પર.<br>કહો શું જોઈએ, શ્રેષ્ઠ વિકલ્પ સૂચવીશ. ફ્રેમ <b>₹499</b> થી. 👓" } },
        { k: ["computer", "laptop", "screen", "coding", "office work", "digital", "blue cut", "blue light", "bluecut"], a: {
            en: "💻 For long screen time I recommend <b>Blue Cut lenses</b>.<br>They reduce digital eye strain and improve comfort. Add Anti-Glare for best results. 👓",
            hi: "💻 ज़्यादा स्क्रीन उपयोग के लिए <b>Blue Cut लेंस</b> सही हैं।<br>ये डिजिटल आई-स्ट्रेन कम करते हैं। Anti-Glare के साथ और बेहतर। 👓",
            gu: "💻 વધુ સ્ક્રીન વપરાશ માટે <b>Blue Cut લેન્સ</b> શ્રેષ્ઠ છે.<br>ડિજિટલ આઇ-સ્ટ્રેન ઘટાડે છે. Anti-Glare સાથે વધુ સારું. 👓" } },
        { k: ["night drive", "night driving", "driving at night", "headlight", "glare at night"], a: {
            en: "🌙 For night driving I recommend <b>Anti-Reflection (AR) lenses</b>.<br>They cut headlight glare for clearer, safer vision. 🚗",
            hi: "🌙 रात की ड्राइविंग के लिए <b>Anti-Reflection (AR) लेंस</b> सुझाता हूँ।<br>हेडलाइट की चमक कम कर साफ़ दृष्टि देते हैं। 🚗",
            gu: "🌙 રાત્રે ડ્રાઇવિંગ માટે <b>Anti-Reflection (AR) લેન્સ</b> સૂચવું છું.<br>હેડલાઇટની ઝગઝગાટ ઘટાડી સ્પષ્ટ દ્રષ્ટિ આપે છે. 🚗" } },
        { k: ["outdoor", "sunlight", "dhoop", "bright light", "beach"], a: {
            en: "😎 For outdoor use, <b>Polarized Sunglasses</b> are best.<br>They block glare and give UV400 protection. ☀️",
            hi: "😎 बाहर उपयोग के लिए <b>Polarized Sunglasses</b> सबसे अच्छे हैं।<br>ग्लेयर रोकते और UV400 सुरक्षा देते हैं। ☀️",
            gu: "😎 બહાર વપરાશ માટે <b>Polarized Sunglasses</b> શ્રેષ્ઠ છે.<br>ઝગઝગાટ રોકે અને UV400 સુરક્ષા આપે. ☀️" } },
        { k: ["reading", "padhna", "padhne", "vanchva", "near vision", "newspaper"], a: {
            en: "📖 For reading comfort I suggest <b>Reading Glasses</b> after a quick eye test, so the power is exact. 👓",
            hi: "📖 पढ़ने के लिए <b>Reading Glasses</b> सुझाता हूँ — पहले छोटा आई-टेस्ट ताकि पावर सही रहे। 👓",
            gu: "📖 વાંચન માટે <b>Reading Glasses</b> સૂચવું — પહેલા નાનો આઇ-ટેસ્ટ જેથી પાવર સચોટ રહે. 👓" } },
        { k: ["eye test", "eye check", "checkup", "check up", "power check", "number", "aankh", "vision test", "आँख", "आंख", "आँखों", "नंबर", "पावर", "આંખ", "આંખો", "નંબર", "પાવર"], a: {
            en: "👁 <b>Computerized Eye Testing</b> is available in-store.<br>Accurate power check by our optometrist. Walk in or call to book. 📞 " + STORE.phone,
            hi: "👁 स्टोर पर <b>कंप्यूटराइज़्ड आई-टेस्ट</b> उपलब्ध है।<br>हमारे ऑप्टोमेट्रिस्ट से सटीक पावर जाँच। आइए या कॉल करें। 📞 " + STORE.phone,
            gu: "👁 સ્ટોર પર <b>કમ્પ્યુટરાઇઝ્ડ આઇ-ટેસ્ટ</b> ઉપલબ્ધ છે.<br>અમારા ઓપ્ટોમેટ્રિસ્ટ દ્વારા સચોટ પાવર તપાસ. આવો અથવા કૉલ કરો. 📞 " + STORE.phone } },
        { k: ["sunglass", "sun glass", "goggle", "shades"], a: {
            en: "🕶️ <b>Sunglasses Collection</b><br>• UV400 protection • Polarized options • Branded &amp; trendy styles for men, women &amp; kids.",
            hi: "🕶️ <b>Sunglasses कलेक्शन</b><br>• UV400 सुरक्षा • Polarized विकल्प • पुरुष, महिला व बच्चों के ब्रांडेड ट्रेंडी स्टाइल।",
            gu: "🕶️ <b>Sunglasses કલેક્શન</b><br>• UV400 સુરક્ષા • Polarized વિકલ્પ • પુરુષ, સ્ત્રી અને બાળકો માટે બ્રાન્ડેડ ટ્રેન્ડી સ્ટાઇલ." } },
        { k: ["contact lens", "contact lenses", "color lens", "colour lens", "soft lens"], a: {
            en: "👁 <b>Contact Lenses</b><br>• Daily / monthly • Clear &amp; colour options • Comfortable, branded.<br>We guide you on safe usage &amp; cleaning.",
            hi: "👁 <b>Contact Lenses</b><br>• डेली / मंथली • क्लियर व कलर • आरामदायक, ब्रांडेड।<br>सुरक्षित उपयोग व सफ़ाई की पूरी जानकारी।",
            gu: "👁 <b>Contact Lenses</b><br>• ડેઇલી / મંથલી • ક્લિયર અને કલર • આરામદાયક, બ્રાન્ડેડ.<br>સલામત વપરાશ અને સફાઈ માટે માર્ગદર્શન." } },
        { k: ["anti glare", "antiglare", "ar coating", "anti reflective", "anti-reflective", "coating"], a: {
            en: "✨ <b>Anti-Glare / AR coating</b> reduces reflections and improves night vision &amp; screen comfort. Recommended on most lenses.",
            hi: "✨ <b>Anti-Glare / AR कोटिंग</b> रिफ्लेक्शन कम करती है, रात व स्क्रीन के लिए बेहतर। ज़्यादातर लेंस पर सुझावित।",
            gu: "✨ <b>Anti-Glare / AR કોટિંગ</b> પ્રતિબિંબ ઘટાડે, રાત અને સ્ક્રીન માટે સારું. મોટાભાગના લેન્સ પર સૂચવેલ." } },
        { k: ["progressive", "bifocal", "multifocal", "varifocal"], a: {
            en: "🔭 <b>Progressive / Bifocal lenses</b> give clear near &amp; far vision in one lens. Best fitted after an eye test.",
            hi: "🔭 <b>Progressive / Bifocal लेंस</b> एक ही लेंस में पास-दूर साफ़ दृष्टि देते हैं। आई-टेस्ट के बाद बेहतर फिटिंग।",
            gu: "🔭 <b>Progressive / Bifocal લેન્સ</b> એક જ લેન્સમાં નજીક-દૂર સ્પષ્ટ દ્રષ્ટિ આપે. આઇ-ટેસ્ટ પછી શ્રેષ્ઠ ફિટિંગ." } },
        { k: ["kids", "kid ", "child", "children", "baccha", "bachcha"], a: {
            en: "👶 <b>Kids Eyewear</b><br>Light, durable &amp; flexible frames, plus blue-cut for screen time. Comfortable fits for school kids.",
            hi: "👶 <b>बच्चों के चश्मे</b><br>हल्के, मज़बूत व लचीले फ्रेम, स्क्रीन के लिए ब्लू-कट भी। स्कूल बच्चों के लिए आरामदायक।",
            gu: "👶 <b>બાળકોના ચશ્મા</b><br>હળવા, મજબૂત અને ફ્લેક્સિબલ ફ્રેમ, સ્ક્રીન માટે બ્લુ-કટ પણ. શાળાના બાળકો માટે આરામદાયક." } },
        { k: ["women", "ladies", "girl", "female"], a: {
            en: "👩 <b>Women's Collection</b><br>Trendy frames &amp; sunglasses — cat-eye, oversized, rimless &amp; more.",
            hi: "👩 <b>महिला कलेक्शन</b><br>ट्रेंडी फ्रेम व सनग्लास — कैट-आई, ओवरसाइज़्ड, रिमलेस। नवीनतम फैशन।",
            gu: "👩 <b>મહિલા કલેક્શન</b><br>ટ્રેન્ડી ફ્રેમ અને સનગ્લાસ — કેટ-આઇ, ઓવરસાઇઝ્ડ, રિમલેસ. નવીનતમ ફેશન." } },
        { k: ["men", "gents", "male", "boys"], a: {
            en: "🧔 <b>Men's Collection</b><br>Premium frames — full-rim, half-rim, rimless, titanium &amp; TR90. Stylish and durable.",
            hi: "🧔 <b>पुरुष कलेक्शन</b><br>प्रीमियम फ्रेम — फुल-रिम, हाफ-रिम, रिमलेस, टाइटेनियम व TR90।",
            gu: "🧔 <b>પુરુષ કલેક્શન</b><br>પ્રીમિયમ ફ્રેમ — ફુલ-રિમ, હાફ-રિમ, રિમલેસ, ટાઇટેનિયમ અને TR90." } },
        { k: ["repair", "fix", "broken", "nose pad", "screw", "tuta", "frame repair", "adjust"], a: {
            en: "🔧 <b>Repair Service</b><br>Frame fixing, nose-pad &amp; screw replacement, fitting &amp; adjustments. Quick service from <b>₹150</b>.",
            hi: "🔧 <b>रिपेयर सर्विस</b><br>फ्रेम फिक्सिंग, नोज़-पैड व स्क्रू बदलना, फिटिंग। तेज़ सर्विस <b>₹150</b> से।",
            gu: "🔧 <b>રિપેર સર્વિસ</b><br>ફ્રેમ ફિક્સિંગ, નોઝ-પેડ અને સ્ક્રૂ બદલવા, ફિટિંગ. ઝડપી સર્વિસ <b>₹150</b> થી." } },
        { k: ["timing", "time", "open", "close", "hours", "samay", "working hours", "kitne baje", "समय", "टाइम", "खुला", "સમય", "ટાઇમ", "ખુલે"], a: {
            en: "🕙 <b>Store Hours</b><br>" + STORE.hours + ".<br>Visit us anytime in these hours! 😊",
            hi: "🕙 <b>स्टोर समय</b><br>सोम–रवि, सुबह 10 – रात 9 बजे।<br>इन घंटों में कभी भी आइए! 😊",
            gu: "🕙 <b>સ્ટોર સમય</b><br>સોમ–રવિ, સવારે 10 – રાત્રે 9.<br>આ સમયમાં ગમે ત્યારે આવો! 😊" } },
        { k: ["location", "address", "where", "kahan", "kaha", "map", "direction", "reach", "near me", "पता", "कहाँ", "कहां", "સરનામું", "ક્યાં", "ઠેકાણું"], a: {
            en: "📍 <b>Shree Hari Chasma Ghar</b><br>5 Sun Residency, near Manki Circle, New Ranip, Ahmedabad.<br><a href='" + STORE.map + "' target='_blank' rel='noopener'>🗺 Open in Google Maps</a>",
            hi: "📍 <b>Shree Hari Chasma Ghar</b><br>5 Sun Residency, मानकी सर्कल के पास, New Ranip, Ahmedabad.<br><a href='" + STORE.map + "' target='_blank' rel='noopener'>🗺 गूगल मैप खोलें</a>",
            gu: "📍 <b>Shree Hari Chasma Ghar</b><br>5 Sun Residency, માંકી સર્કલ પાસે, New Ranip, Ahmedabad.<br><a href='" + STORE.map + "' target='_blank' rel='noopener'>🗺 ગૂગલ મેપ ખોલો</a>" } },
        { k: ["contact", "phone", "mobile", "call", "sampark"], a: {
            en: "📞 <b>Call us:</b> <a href='tel:+918732969601'>" + STORE.phone + "</a><br>We're happy to help! 😊",
            hi: "📞 <b>कॉल करें:</b> <a href='tel:+918732969601'>" + STORE.phone + "</a><br>हम मदद के लिए तैयार हैं! 😊",
            gu: "📞 <b>કૉલ કરો:</b> <a href='tel:+918732969601'>" + STORE.phone + "</a><br>અમે મદદ માટે તૈયાર છીએ! 😊" } },
        { k: ["whatsapp", "whats app", "wa chat"], a: {
            en: "💬 <b>WhatsApp us:</b> <a href='" + STORE.whatsapp + "' target='_blank' rel='noopener'>Start Chat</a> 📲",
            hi: "💬 <b>WhatsApp करें:</b> <a href='" + STORE.whatsapp + "' target='_blank' rel='noopener'>चैट शुरू करें</a> 📲",
            gu: "💬 <b>WhatsApp કરો:</b> <a href='" + STORE.whatsapp + "' target='_blank' rel='noopener'>ચેટ શરૂ કરો</a> 📲" } },
        { k: ["payment", "upi", "paytm", "phonepe", "google pay", "gpay", "cash", "card", "emi"], a: {
            en: "💳 <b>Payment Options</b><br>Cash • UPI • PhonePe • Google Pay • Paytm • Cards.",
            hi: "💳 <b>भुगतान विकल्प</b><br>कैश • UPI • PhonePe • Google Pay • Paytm • कार्ड।",
            gu: "💳 <b>ચુકવણી વિકલ્પ</b><br>કેશ • UPI • PhonePe • Google Pay • Paytm • કાર્ડ." } },
        { k: ["offer", "discount", "sale", "scheme", "deal", "coupon"], a: {
            en: "🎁 <b>Offers</b><br>We run seasonal discounts &amp; combo deals on frames + lenses. Visit or call for today's best offer!",
            hi: "🎁 <b>ऑफर</b><br>फ्रेम + लेंस पर सीज़नल डिस्काउंट व कॉम्बो डील। आज का बेस्ट ऑफर जानने आइए या कॉल करें!",
            gu: "🎁 <b>ઓફર</b><br>ફ્રેમ + લેન્સ પર સીઝનલ ડિસ્કાઉન્ટ અને કૉમ્બો ડીલ. આજનો બેસ્ટ ઓફર જાણવા આવો કે કૉલ કરો!" } },
        { k: ["brand", "fastrack", "rayban", "ray ban", "titan", "vincent chase"], a: {
            en: "🏷️ <b>Brands</b><br>Branded frames &amp; sunglasses including Fastrack and premium quality collections." } },
        { k: ["warranty", "guarantee", "guaranty"], a: {
            en: "🛡️ Genuine products come with brand warranty where applicable. Please ask in-store for product-specific warranty details." } },
        { k: ["exchange", "return", "replace", "refund"], a: {
            en: "🔄 For exchange/return please visit the store with your bill. Our team will guide you on the applicable policy for your product." } },
        { k: ["delivery", "home delivery", "courier", "shipping"], a: {
            en: "🚚 Visit our New Ranip store to pick your eyewear. For delivery options, please call us at " + STORE.phone + "." } },
        { k: ["doctor", "optometrist", "specialist"], a: {
            en: "👨‍⚕️ Our professional optometrist gives accurate testing &amp; guidance. For any serious eye symptoms, please consult an eye doctor.",
            hi: "👨‍⚕️ हमारे प्रोफेशनल ऑप्टोमेट्रिस्ट सटीक जाँच व सलाह देते हैं। गंभीर लक्षणों में नेत्र चिकित्सक से सलाह लें।",
            gu: "👨‍⚕️ અમારા પ્રોફેશનલ ઓપ્ટોમેટ્રિસ્ટ સચોટ તપાસ અને માર્ગદર્શન આપે. ગંભીર લક્ષણોમાં આંખના ડૉક્ટરની સલાહ લો." } },
        { k: ["thank", "thanks", "dhanyavad", "aabhar", "aabhaar"], a: {
            en: "🙏 You're welcome! Anything else about glasses, lenses or eye care? 😊",
            hi: "🙏 आपका स्वागत है! चश्मा, लेंस या आई-केयर में और कुछ? 😊",
            gu: "🙏 આપનું સ્વાગત છે! ચશ્મા, લેન્સ કે આઇ-કેરમાં બીજું કંઈ? 😊" } }
    ];

    const FRAME_TRIGGERS = ["which frame", "frame suit", "suits me", "frame suggestion", "recommend frame", "frame recommendation", "best frame for me", "konsa frame", "kaunsa frame", "face shape", "suggest frame", "suggest a frame"];

    const FALLBACK = {
        en: "🤖 I'm your <b>Optical Assistant</b>. I can help with glasses, lenses, eye care &amp; store info.<br>Try: <i>price</i>, <i>eye test</i>, <i>blue cut</i>, <i>sunglasses</i>, or <i>which frame suits me</i>.<br>📞 " + STORE.phone,
        hi: "🤖 मैं आपका <b>ऑप्टिकल असिस्टेंट</b> हूँ। चश्मा, लेंस, आई-केयर व स्टोर जानकारी में मदद कर सकता हूँ।<br>पूछें: <i>price</i>, <i>eye test</i>, <i>blue cut</i>, <i>sunglasses</i>।<br>📞 " + STORE.phone,
        gu: "🤖 હું તમારો <b>ઓપ્ટિકલ આસિસ્ટન્ટ</b> છું. ચશ્મા, લેન્સ, આઇ-કેર અને સ્ટોર માહિતીમાં મદદ કરી શકું.<br>પૂછો: <i>price</i>, <i>eye test</i>, <i>blue cut</i>, <i>sunglasses</i>.<br>📞 " + STORE.phone
    };

    // ---- Face-shape recommendation ----
    const FACE_REC = {
        round: "angular rectangular or wayfarer frames",
        square: "round or oval frames to soften features",
        oval: "almost any style — aviator or rectangular look great",
        heart: "bottom-heavy or aviator frames",
        long: "tall, oversized or deep frames",
        diamond: "oval, cat-eye or rimless frames"
    };

    // ---- Guided frame-finder flow ----
    let aiFlow = null;
    const FRAME_STEPS = [
        { key: "who",    q: { en: "Great! Let's find your perfect frame. 👓<br>Who is it for?", hi: "बढ़िया! आइए सही फ्रेम चुनें। 👓<br>किसके लिए है?", gu: "સરસ! ચાલો યોગ્ય ફ્રેમ શોધીએ. 👓<br>કોના માટે છે?" }, chips: ["Male", "Female", "Kids"] },
        { key: "age",    q: { en: "Got it 👍 What's the age group?", hi: "ठीक है 👍 उम्र क्या है?", gu: "સમજ્યું 👍 ઉંમર કેટલી છે?" }, chips: ["Under 18", "18–40", "40+"] },
        { key: "face",   q: { en: "And your face shape?", hi: "आपके चेहरे का आकार?", gu: "તમારા ચહેરાનો આકાર?" }, chips: ["Round", "Square", "Oval", "Heart", "Long", "Diamond"] },
        { key: "budget", q: { en: "Finally, your budget? 💰", hi: "आखिर में, बजट? 💰", gu: "છેલ્લે, બજેટ? 💰" }, chips: ["Under ₹1000", "₹1000–2500", "₹2500+"] }
    ];
    function startFrameFlow(lang) { aiFlow = { step: 0, data: {} }; askFrameStep(lang); }
    function askFrameStep(lang) {
        const s = FRAME_STEPS[aiFlow.step];
        addBotMessage(L(s.q, lang));
        renderChips(s.chips);
    }
    function handleFlow(answer, lang) {
        const step = FRAME_STEPS[aiFlow.step];
        if (step) aiFlow.data[step.key] = answer;
        aiFlow.step++;
        if (aiFlow.step < FRAME_STEPS.length) { askFrameStep(lang); return; }
        const d = aiFlow.data;
        const faceKey = Object.keys(FACE_REC).find(k => (d.face || "").toLowerCase().includes(k));
        const rec = FACE_REC[faceKey] || "a versatile rectangular or oval frame";
        const out = {
            en: "✨ <b>My recommendation</b><br>For a <b>" + (d.face || "—") + "</b> face (" + (d.who || "—") + ", " + (d.age || "—") + "), try <b>" + rec + "</b>.<br>Budget " + (d.budget || "—") + ": we have great matches. 👓<br>Come in for a free try-on &amp; eye test, or call <a href='tel:+918732969601'>" + STORE.phone + "</a>.",
            hi: "✨ <b>मेरी सलाह</b><br><b>" + (d.face || "—") + "</b> चेहरे के लिए (" + (d.who || "—") + ", " + (d.age || "—") + ") <b>" + rec + "</b> आज़माएँ।<br>बजट " + (d.budget || "—") + ": बढ़िया विकल्प मौजूद। 👓<br>फ्री ट्राय-ऑन व आई-टेस्ट के लिए आइए, या कॉल करें <a href='tel:+918732969601'>" + STORE.phone + "</a>।",
            gu: "✨ <b>મારી ભલામણ</b><br><b>" + (d.face || "—") + "</b> ચહેરા માટે (" + (d.who || "—") + ", " + (d.age || "—") + ") <b>" + rec + "</b> અજમાવો.<br>બજેટ " + (d.budget || "—") + ": સરસ વિકલ્પ ઉપલબ્ધ. 👓<br>ફ્રી ટ્રાય-ઓન અને આઇ-ટેસ્ટ માટે આવો, અથવા કૉલ કરો <a href='tel:+918732969601'>" + STORE.phone + "</a>."
        };
        addBotMessage(L(out, lang));
        aiFlow = null;
    }

    // ---- Quick-reply chips ----
    function renderChips(options) {
        if (!options || !options.length) return;
        const wrap = document.createElement("div");
        wrap.className = "ai-quick-chips";
        options.forEach(o => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "ai-chip";
            b.textContent = o;
            b.addEventListener("click", () => askQuestion(o));
            wrap.appendChild(b);
        });
        chatBody.appendChild(wrap);
        scrollBottom();
    }

    // ---- Intent matching (longest-key wins) ----
    function matchIntent(ql) {
        let best = null, score = 0;
        for (const item of KB) {
            let s = 0;
            for (const k of item.k) { if (ql.includes(k)) s += k.trim().length; }
            if (s > score) { score = s; best = item; }
        }
        return score > 0 ? best : null;
    }

    // ---- Main entry point ----
    window.askQuestion = function (raw) {
        const question = (raw == null ? "" : String(raw)).trim();
        if (!question) return;
        addUserMessage(question);
        showTyping();
        const lang = detectLang(question);
        setTimeout(() => {
            removeTyping();
            if (aiFlow) { handleFlow(question, lang); return; }
            const ql = " " + question.toLowerCase() + " ";
            if (FRAME_TRIGGERS.some(k => ql.includes(k))) { startFrameFlow(lang); return; }
            const hit = matchIntent(ql);
            addBotMessage(hit ? L(hit.a, lang) : L(FALLBACK, lang));
        }, 650);
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
            <span></span><span></span><span></span>
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

// Eyeglasses Catalog and Try-On
const isSunglassesCatalog = document.body?.dataset?.catalog === 'sunglasses' || window.location.pathname.includes('/sunglasses');

const sunglassesTemplates = [
    { category: 'Aviator', title: 'Aviator Sun Frame', meta: 'Polarized UV400', price: '₹2,199', image: '/assets/images/Home.jpg', badge: 'Trending' },
    { category: 'Wayfarer', title: 'Wayfarer Classic', meta: 'Premium Tinted Lens', price: '₹2,499', image: '/assets/images/women.png', badge: 'New' },
    { category: 'Round', title: 'Round Retro Frame', meta: 'Matte Finish', price: '₹1,899', image: '/assets/images/men.png', badge: 'Best Seller' },
    { category: 'Cat-Eye', title: 'Cat-Eye Glam Frame', meta: 'Fashion Sunglass', price: '₹2,699', image: '/assets/images/feature.png', badge: 'Popular' },
    { category: 'Sports', title: 'Sport Shield Frame', meta: 'Wraparound Protection', price: '₹2,999', image: '/assets/images/kid.png', badge: 'Sports' }
];

const eyeglassTemplates = isSunglassesCatalog ? sunglassesTemplates : [
    { category: 'Women', title: 'Classic Women Frame', meta: 'Blue Cut Lens', price: '₹1,499', image: '/assets/images/women.png', badge: 'New' },
    { category: 'Men', title: 'Men Aviator Frame', meta: 'UV Protection', price: '₹1,699', image: '/assets/images/men.png', badge: 'Best Seller' },
    { category: 'Kids', title: 'Kids Fun Frame', meta: 'Lightweight Fit', price: '₹999', image: '/assets/images/kid.png', badge: 'Kids' },
    { category: 'Sunglasses', title: 'Gradient Sunglass Frame', meta: 'Polarized UV400', price: '₹2,199', image: '/assets/images/Home.jpg', badge: 'Trending' },
    { category: 'Blue Cut', title: 'Blue Cut Computer Frame', meta: 'Anti Glare', price: '₹1,599', image: '/assets/images/feature.png', badge: 'Popular' }
];

const eyeglassFrames = Array.from({ length: isSunglassesCatalog ? 320 : 520 }, (_, index) => {
    const template = eyeglassTemplates[index % eyeglassTemplates.length];
    const variantIndex = Math.floor(index / eyeglassTemplates.length) + 1;
    return {
        id: index + 1,
        category: template.category,
        title: `${template.title} ${variantIndex}`,
        meta: template.meta,
        price: template.price,
        image: template.image,
        badge: template.badge,
        sku: `SHC-${1000 + index}`
    };
});

const productsPerPage = 15;
let currentFramePage = 1;
let activeFrameCategory = 'All';
let currentStream = null;

function getFilteredFrames() {
    if (activeFrameCategory === 'All') {
        return eyeglassFrames;
    }
    return eyeglassFrames.filter(frame => frame.category === activeFrameCategory);
}

function renderProductGrid() {
    const container = document.getElementById('productGrid');
    const filtered = getFilteredFrames();
    const total = filtered.length;
    const start = (currentFramePage - 1) * productsPerPage;
    const pageItems = filtered.slice(start, start + productsPerPage);

    container.innerHTML = pageItems.map(frame => `
        <div class="col-sm-6 col-lg-4 col-xl-3" data-aos="fade-up">
            <div class="product-card">
                <div class="product-image">
                    <img src="${frame.image}" alt="${frame.title}" loading="lazy">
                    <span class="product-badge">${frame.badge}</span>
                </div>
                <div class="product-details">
                    <h3 class="product-title">${frame.title}</h3>
                    <p class="product-meta">${frame.meta} • ${frame.category}</p>
                    <p class="product-price">${frame.price}</p>
                    <div class="product-actions">
                        <button class="tryon-card-btn" onclick="openTryOn(${frame.id})"><i class="fas fa-camera"></i> Try On</button>
                        <span class="product-sku">${frame.sku}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    document.getElementById('visibleCount').textContent = pageItems.length;
    document.getElementById('totalCount').textContent = total;
    document.getElementById('activeCategory').textContent = activeFrameCategory;
    renderFramesPagination(total);
}

function renderFramesPagination(totalFrames) {
    const pagination = document.getElementById('paginationControls');
    const totalPages = Math.max(1, Math.ceil(totalFrames / productsPerPage));
    let html = '';

    for (let page = 1; page <= totalPages; page++) {
        html += `
            <button class="pagination-button ${page === currentFramePage ? 'active' : ''}" onclick="changeFramePage(${page})">${page}</button>
        `;
    }

    pagination.innerHTML = html;
}

function changeFramePage(page) {
    currentFramePage = page;
    renderProductGrid();
    const collectionSection = document.getElementById('eyeglass-collection');
    if (collectionSection) {
        window.scrollTo({ top: collectionSection.offsetTop - 100, behavior: 'smooth' });
    }
}

function setFrameCategory(category) {
    activeFrameCategory = category;
    currentFramePage = 1;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === category);
    });
    renderProductGrid();
}

// Expose frame data for the virtual try-on engine (assets/js/tryon.js)
window.eyeglassFrames = eyeglassFrames;

// Delegate to the face-tracking try-on engine (falls back gracefully if unloaded)
window.openTryOn = function (id) {
    if (window.OptiTryOn && typeof window.OptiTryOn.open === 'function') {
        window.OptiTryOn.open(id);
    }
};

function setupEyeglassesCatalog() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => setFrameCategory(btn.dataset.category));
    });

    renderProductGrid();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEyeglassesCatalog);
} else {
    setupEyeglassesCatalog();
}

window.setFrameCategory = setFrameCategory;
window.changeFramePage = changeFramePage;
