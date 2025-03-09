import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs';

// スクリーンショットルーターをインポート
import screenshotRouter from './routes/screenshot.js';

// 環境変数の読み込み
dotenv.config();

// __dirnameを取得（ESモジュールで使用するための方法）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Expressアプリケーションを作成
const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェアの設定
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, '../public')));

// アップロードディレクトリの確認と作成
const uploadsDir = path.resolve(process.cwd(), process.env.LOCAL_STORAGE_PATH || 'data/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`アップロードディレクトリを作成しました: ${uploadsDir}`);
}

// アップロードされたファイルへのアクセスを提供
app.use('/data/uploads', express.static(uploadsDir));

// ルーターの設定
app.use('/api/screenshot', screenshotRouter);

// メインルート
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// その他のルート（404）
app.use((req, res) => {
  res.status(404).json({ error: 'ページが見つかりません' });
});

// エラーハンドリングミドルウェア
app.use((err, req, res, next) => {
  console.error('サーバーエラー:', err);
  res.status(500).json({ error: 'サーバーエラーが発生しました' });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーが起動しました: http://localhost:${PORT}`);
}); 