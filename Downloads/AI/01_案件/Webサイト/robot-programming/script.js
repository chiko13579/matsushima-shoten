document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuBtn = document.querySelector('.header__menu-btn');
    const nav = document.querySelector('.header__nav');
    const menuLines = document.querySelectorAll('.header__menu-line');

    menuBtn.addEventListener('click', () => {
        nav.classList.toggle('is-active');

        // Animate Hamburger
        if (nav.classList.contains('is-active')) {
            menuLines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            menuLines[1].style.opacity = '0';
            menuLines[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            menuLines[0].style.transform = 'none';
            menuLines[1].style.opacity = '1';
            menuLines[2].style.transform = 'none';
        }
    });

    // Close menu when link is clicked
    document.querySelectorAll('.header__nav-item a').forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('is-active');
            menuLines[0].style.transform = 'none';
            menuLines[1].style.opacity = '1';
            menuLines[2].style.transform = 'none';
        });
    });

    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Scroll Animation (Fade In)
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.section__title, .course-card, .voice-card').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });
});
