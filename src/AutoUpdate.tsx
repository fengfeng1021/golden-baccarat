import { useEffect, useRef } from 'react';

export const AutoUpdate = () => {
    // 用 ref 記錄首次加載時的版本號，避免重新渲染導致邏輯錯誤
    const currentVersion = useRef<string | null>(null);

    const checkUpdate = async () => {
        try {
            // 1. 加上時間戳參數 (?t=...) 確保瀏覽器不讀取快取，強制向伺服器請求最新檔案
            const response = await fetch(`./version.json?t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache',
                    'Expires': '0',
                },
            });

            if (!response.ok) return;

            const data = await response.json();
            const latestVersion = data.version;

            // 2. 初始化：如果是第一次執行，把抓到的版本當作當前版本
            if (currentVersion.current === null) {
                currentVersion.current = latestVersion;
                console.log('App loaded version:', latestVersion);
                return;
            }

            // 3. 比對：如果伺服器版本與當前記憶體中的版本不同，執行更新
            if (latestVersion !== currentVersion.current) {
                console.log('New version found! Updating...');
                
                // 清除所有可能的快取 (Service Worker 緩存, LocalStorage 等視需求而定)
                if ('caches' in window) {
                    const names = await caches.keys();
                    await Promise.all(names.map(name => caches.delete(name)));
                }

                // 強制重新加載頁面 (true 表示強制從伺服器重抓)
                window.location.reload();
            } else {
                console.log('App is up to date.');
            }
        } catch (error) {
            console.error('Update check failed:', error);
        }
    };

    useEffect(() => {
        // 1. App 剛掛載時檢查一次
        checkUpdate();

        // 2. 監聽 "visibilitychange" 事件
        // 當使用者按 Home 鍵離開，再點 App 圖示回來時，會觸發此事件
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                checkUpdate();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        // (可選) 每 60 秒自動檢查一次，防止使用者一直開著不關
        const interval = setInterval(checkUpdate, 60 * 1000);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            clearInterval(interval);
        };
    }, []);

    // 這個組件不需要渲染任何畫面
    return null;
};