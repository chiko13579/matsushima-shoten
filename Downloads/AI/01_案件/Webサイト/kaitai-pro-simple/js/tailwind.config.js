tailwind.config = {
    theme: {
        extend: {
            fontFamily: {
                sans: ['"Noto Sans JP"', 'sans-serif'],
                lato: ['"Lato"', 'sans-serif'],
                serif: ['"Shippori Mincho"', 'serif'],
            },
            colors: {
                'brand-blue': '#48C78E',      /* アクセントの明るいグリーン */
                'brand-light': '#F0FDF4',     /* 背景の薄いグリーン */
                'brand-dark': '#164E3B',      /* メインの深緑 */
                'text-body': '#164E3B',       /* 本文も深緑ベースで統一 */
            },
            borderRadius: {
                '4xl': '3rem',
                '5xl': '5rem',
                'super': '80px',
            },
            boxShadow: {
                'soft': '0 20px 60px -20px rgba(72, 199, 142, 0.15)',
            },
            maxWidth: {
                'screen-3xl': '1600px',
            },
            letterSpacing: {
                'base': '0.06em',
                'wide': '0.1em',
                'widest': '0.2em',
            },
            lineHeight: {
                'relaxed': '2.0',
                'normal': '1.6',
            }
        }
    }
}
