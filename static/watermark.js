(function () {
    const WATERMARK_ID = 'accountWatermarkLayer';
    const TIME_ZONE = 'Asia/Shanghai';
    let refreshTimer = null;

    function getCurrentUser() {
        try {
            return JSON.parse(sessionStorage.getItem('user') || '{}');
        } catch (error) {
            return {};
        }
    }

    function formatWatermarkTime() {
        return new Intl.DateTimeFormat('zh-CN', {
            timeZone: TIME_ZONE,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(new Date()).replace(/\//g, '-');
    }

    function getWatermarkText() {
        const user = getCurrentUser();
        const username = user.username || 'N/A user';
        const realName = user.real_name || 'N/A name';
        const email = user.email || 'N/A mail';
        return `${username} ${realName} ${formatWatermarkTime()}`;
    }

    function ensureLayer() {
        let layer = document.getElementById(WATERMARK_ID);
        if (layer) return layer;

        layer = document.createElement('div');
        layer.id = WATERMARK_ID;
        layer.setAttribute('aria-hidden', 'true');
        layer.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:2147483647',
            'pointer-events:none',
            'overflow:hidden',
            'display:grid',
            'grid-template-columns:repeat(auto-fill,minmax(360px,1fr))',
            'grid-auto-rows:150px',
            'align-items:center',
            'justify-items:center',
            'opacity:1'
        ].join(';');
        document.body.appendChild(layer);
        return layer;
    }

    function renderWatermark() {
        if (!document.body) return;
        const layer = ensureLayer();
        const text = getWatermarkText();
        const requiredCount = Math.max(24, Math.ceil((window.innerWidth / 360) * (window.innerHeight / 150)) + 8);

        if (layer.children.length !== requiredCount) {
            layer.innerHTML = '';
            for (let i = 0; i < requiredCount; i += 1) {
                const item = document.createElement('div');
                item.style.cssText = [
                    'transform:rotate(-22deg)',
                    'font-size:13px',
                    'font-weight:700',
                    'letter-spacing:0',
                    'color:rgba(255,0,0,0.3)',
                    'white-space:nowrap',
                    'user-select:none',
                    'text-align:center'
                ].join(';');
                layer.appendChild(item);
            }
        }

        Array.from(layer.children).forEach(item => {
            item.textContent = text;
        });
    }

    function refreshNow() {
        renderWatermark();
    }

    function startWatermark() {
        refreshNow();
        if (refreshTimer) clearInterval(refreshTimer);
        refreshTimer = setInterval(refreshNow, 1000);
    }

    document.addEventListener('DOMContentLoaded', startWatermark);
    window.addEventListener('resize', refreshNow);
    window.addEventListener('focus', refreshNow);
    document.addEventListener('visibilitychange', refreshNow);
    document.addEventListener('keyup', event => {
        const key = String(event.key || '').toLowerCase();
        const isSystemScreenshot = event.metaKey && event.shiftKey && ['3', '4', '5'].includes(key);
        if (key === 'printscreen' || isSystemScreenshot) {
            refreshNow();
        }
    });

    window.refreshAccountWatermark = refreshNow;
})();
