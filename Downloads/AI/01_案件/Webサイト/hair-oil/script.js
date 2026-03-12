document.addEventListener('DOMContentLoaded', () => {
    // Header Scroll Effect
    const header = document.querySelector('.header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('is-scrolled');
        } else {
            header.classList.remove('is-scrolled');
        }
    });

    // Mobile Menu
    const menuBtn = document.querySelector('.header__menu-btn');
    const nav = document.querySelector('.header__nav');
    const navLinks = document.querySelectorAll('.header__nav-link');

    menuBtn.addEventListener('click', () => {
        nav.classList.toggle('is-active');
        menuBtn.classList.toggle('is-active');

        const lines = menuBtn.querySelectorAll('.header__menu-line');
        if (menuBtn.classList.contains('is-active')) {
            lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            lines[1].style.transform = 'rotate(-45deg) translate(5px, -5px)';
        } else {
            lines[0].style.transform = 'none';
            lines[1].style.transform = 'none';
        }
    });

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            nav.classList.remove('is-active');
            menuBtn.classList.remove('is-active');
            const lines = menuBtn.querySelectorAll('.header__menu-line');
            lines[0].style.transform = 'none';
            lines[1].style.transform = 'none';
        });
    });

    // Scroll Animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.section__title, .concept__text, .ingredient-card, .step, .product__info');
    animatedElements.forEach(el => {
        el.classList.add('fade-in');
        observer.observe(el);
    });

    // Quantity Selector
    const minusBtn = document.querySelector('.minus');
    const plusBtn = document.querySelector('.plus');
    const qtyInput = document.querySelector('.product__qty input');

    if (minusBtn && plusBtn && qtyInput) {
        minusBtn.addEventListener('click', () => {
            let val = parseInt(qtyInput.value);
            if (val > 1) qtyInput.value = val - 1;
        });

        plusBtn.addEventListener('click', () => {
            let val = parseInt(qtyInput.value);
            if (val < 10) qtyInput.value = val + 1;
        });
    }
});
