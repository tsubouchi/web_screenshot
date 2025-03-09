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

// CORS設定を改善
const corsOptions = {
  origin: [
    'https://web-screenshot-demo-c3d64.web.app',
    'https://web-screenshot-demo-c3d64.firebaseapp.com',
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null
  ].filter(Boolean),
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Origin', 'Accept'],
  credentials: true,
  maxAge: 86400 // 24時間
};

// すべてのリクエストについてCORSを許可する（デバッグ用）
if (process.env.NODE_ENV === 'development') {
  console.log('開発モード: すべてのCORSリクエストを許可します');
  app.use(cors());
} else {
  // 本番環境では特定のオリジンのみ許可
  console.log('本番モード: 特定のオリジンのみCORSを許可します');
  app.use(cors(corsOptions));
}

// ミドルウェアの設定
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