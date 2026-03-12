document.addEventListener('DOMContentLoaded', () => {
    // Mobile Menu Toggle
    const menuBtn = document.querySelector('.header__menu-btn');
    const nav = document.querySelector('.header__nav');
    const navLinks = document.querySelectorAll('.header__nav-link');

    menuBtn.addEventListener('click', () => {
        nav.classList.toggle('is-active');
        menuBtn.classList.toggle('is-active');

        // Simple animation for menu lines
        const lines = menuBtn.querySelectorAll('.header__menu-line');
        if (menuBtn.classList.contains('is-active')) {
            lines[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
            lines[1].style.opacity = '0';
            lines[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';

            // Show nav
            nav.style.display = 'block';
            nav.style.position = 'absolute';
            nav.style.top = '100%';
            nav.style.left = '0';
            nav.style.width = '100%';
            nav.style.backgroundColor = 'rgba(10, 10, 10, 0.95)';
            nav.style.padding = '2rem';
            nav.style.textAlign = 'center';
        } else {
            lines[0].style.transform = 'none';
            lines[1].style.opacity = '1';
            lines[2].style.transform = 'none';

            // Hide nav (reset to CSS default)
            nav.style.display = '';
            nav.style.position = '';
            nav.style.top = '';
            nav.style.left = '';
            nav.style.width = '';
            nav.style.backgroundColor = '';
            nav.style.padding = '';
            nav.style.textAlign = '';
        }
    });

    // Close menu when link is clicked
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 768) {
                nav.classList.remove('is-active');
                menuBtn.classList.remove('is-active');

                const lines = menuBtn.querySelectorAll('.header__menu-line');
                lines[0].style.transform = 'none';
                lines[1].style.opacity = '1';
                lines[2].style.transform = 'none';

                nav.style.display = '';
                nav.style.position = '';
                nav.style.top = '';
                nav.style.left = '';
                nav.style.width = '';
                nav.style.backgroundColor = '';
                nav.style.padding = '';
                nav.style.textAlign = '';
            }
        });
    });

    // Smooth Scroll for Anchor Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - headerHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Scroll Animation (Intersection Observer)
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

    // Add fade-in class to elements we want to animate
    const animatedElements = document.querySelectorAll('.section__title, .section__subtitle, .concept__text-box, .trainer-card, .plan-card, .access__content, .contact__form-wrapper');

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // Handle the animation class
    const style = document.createElement('style');
    style.innerHTML = `
        .is-visible {
            opacity: 1 !important;
            transform: translateY(0) !important;
        }
    `;
    document.head.appendChild(style);

    // Contact Form Handling
    const contactForm = document.querySelector('.contact__form');
    if (contactForm) {
        contactForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.textContent;

            // 1. Validation (Simple check)
            const name = this.querySelector('#name').value;
            const email = this.querySelector('#email').value;
            const message = this.querySelector('#message').value;

            if (!name || !email || !message) {
                alert('すべての項目を入力してください。');
                return;
            }

            // 2. Loading State
            submitBtn.disabled = true;
            submitBtn.textContent = '送信中...';
            submitBtn.style.opacity = '0.7';
            submitBtn.style.cursor = 'not-allowed';

            // 3. Send Request to send_mail.php
            const formData = {
                name: name,
                email: email,
                type: this.querySelector('#type').value,
                message: message
            };

            fetch('send_mail.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 4. Success State
                        submitBtn.textContent = '送信完了';
                        submitBtn.style.backgroundColor = '#d4af37'; // Gold
                        submitBtn.style.color = '#000';

                        // Show success message
                        const successMsg = document.createElement('div');
                        successMsg.className = 'contact__success-message';
                        successMsg.innerHTML = `
                        <h4 style="color: #d4af37; margin-bottom: 0.5rem;">お問い合わせありがとうございます</h4>
                        <p style="font-size: 0.9rem; color: #ccc;">担当者より折り返しご連絡させていただきます。</p>
                    `;
                        successMsg.style.textAlign = 'center';
                        successMsg.style.marginTop = '1rem';
                        successMsg.style.padding = '1rem';
                        successMsg.style.border = '1px solid #d4af37';
                        successMsg.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
                        successMsg.style.animation = 'fadeIn 0.5s ease';

                        contactForm.appendChild(successMsg);
                        contactForm.reset();

                        // Reset button after delay
                        setTimeout(() => {
                            submitBtn.disabled = false;
                            submitBtn.textContent = originalBtnText;
                            submitBtn.style.opacity = '1';
                            submitBtn.style.cursor = 'pointer';
                            submitBtn.style.backgroundColor = ''; // Reset to CSS default
                            submitBtn.style.color = ''; // Reset to CSS default

                            // Remove success message
                            if (successMsg.parentNode) {
                                successMsg.remove();
                            }
                        }, 5000);
                    } else {
                        throw new Error(data.message || '送信に失敗しました。');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('エラーが発生しました: ' + error.message);

                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.cursor = 'pointer';
                });
        });
    }
});
