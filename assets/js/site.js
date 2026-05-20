
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
   PREMIUM IMAGE SLIDER
========================================= */

const slides = document.querySelectorAll('.feature-slide');

let currentSlide = 0;

setInterval(() => {

    slides[currentSlide].classList.remove('active');
    slides[currentSlide].classList.add('prev');

    currentSlide++;

    if(currentSlide >= slides.length){
        currentSlide = 0;
    }

    slides.forEach(slide => {

        if(slide !== slides[currentSlide]){
            slide.classList.remove('active');
        }

    });

    slides[currentSlide].classList.remove('prev');
    slides[currentSlide].classList.add('active');

}, 4000);




   // ----------------------------------------------------------HOME PAGE End----------------------------------------------------