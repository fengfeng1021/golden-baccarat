import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// [新增] 自動生成 version.json 的插件
const versionPlugin = () => {
  return {
    name: 'generate-version-file',
    writeBundle() {
      // 獲取當前時間戳作為版本號
      const version = Date.now().toString();
      const versionData = { version };
      
      // 寫入到 dist/version.json (Vite 打包後的目錄)
      const outputPath = path.resolve(__dirname, 'dist', 'version.json');
      
      // 如果 dist 資料夾不存在則建立 (防呆)
      if (!fs.existsSync(path.resolve(__dirname, 'dist'))) {
        fs.mkdirSync(path.resolve(__dirname, 'dist'));
      }

      fs.writeFileSync(outputPath, JSON.stringify(versionData));
      console.log(`\n✅ Version file generated: ${version}\n`);
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    versionPlugin() // 啟用插件
  ],
  // 確保 base 路徑正確，通常是 './' 或 '/'
  base: '/golden-baccarat/',
});