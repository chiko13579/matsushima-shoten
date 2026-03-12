const contactForm = document.querySelector('.contact__form'); // フォームのクラス名に合わせる
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const submitBtn = this.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.textContent;

        // ローディング表示
        submitBtn.disabled = true;
        submitBtn.textContent = '送信中...';

        // データの取得
        const formData = {
            name: this.querySelector('#name').value,
            email: this.querySelector('#email').value,
            message: this.querySelector('#message') ? this.querySelector('#message').value : ''
            // 必要に応じて項目を追加
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
                    alert('お問い合わせを受け付けました。');
                    contactForm.reset();
                } else {
                    alert('送信に失敗しました: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('エラーが発生しました。');
            })
            .finally(() => {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            });
    });
}

// Scroll Animation
const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: 0.1
};

const observer = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.remove('is-hidden');
            entry.target.classList.add('is-active');
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

document.querySelectorAll('.js-fade-up').forEach(target => {
    target.classList.add('is-hidden'); // Hide only if JS is running
    observer.observe(target);
});

// Hamburger Menu
const hamburger = document.querySelector('.js-hamburger');
const nav = document.querySelector('.header__nav');

if (hamburger && nav) {
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('is-active');
        nav.classList.toggle('is-active');
    });

    // Close menu when clicking a link
    nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('is-active');
            nav.classList.remove('is-active');
        });
    });
}
