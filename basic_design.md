# ウェブスクリーンショットサービス基本設計書

## システム概要

ウェブサイト、YouTube動画、YouTube Shortsのスクリーンショットを取得し、画像として保存・提供するウェブサービスです。

## アーキテクチャ

```
[クライアント] <--> [Express サーバー] --> [Puppeteer] --> [ウェブページ/YouTube]
                     |                           |
                     v                           v
               [Firebase] <--- [画像処理] ---> [ローカルストレージ]
```

## 技術スタック

- **バックエンド**
  - Node.js
  - Express.js
  - Puppeteer (ヘッドレスブラウザ)
  - Firebase Admin SDK (認証・データベース・ストレージ)

- **フロントエンド**
  - HTML5
  - CSS3
  - JavaScript (バニラJS)

- **データ保存**
  - Firebase Realtime Database (メタデータ)
  - Firebase Storage (画像ファイル)
  - ローカルファイルシステム (開発環境)

## コンポーネント詳細

### バックエンド

#### 1. Express サーバー

- **役割**: リクエスト処理、ルーティング、静的ファイル提供
- **実装**: `src/index.js`
- **主要機能**:
  - HTTPサーバー提供
  - APIエンドポイント定義
  - ミドルウェア設定
  - エラー処理

#### 2. スクリーンショットモジュール

- **役割**: ウェブページ/YouTubeのスクリーンショット取得
- **実装**: `src/routes/screenshot.js`
- **主要機能**:
  - URLバリデーション
  - Puppeteerブラウザ制御
  - 画像取得処理
  - YouTube処理
  - バッチ処理

#### 3. Firebase連携モジュール

- **役割**: Firebaseサービスとの連携
- **実装**: `src/config/firebase.js`
- **主要機能**:
  - Firebase初期化
  - 認証処理
  - データベース操作
  - ストレージ操作

### フロントエンド

#### 1. メインページ

- **役割**: ユーザーインターフェース提供
- **実装**: `public/index.html`
- **主要機能**:
  - タブUIの提供
  - フォーム入力
  - 結果表示

#### 2. クライアントスクリプト

- **役割**: UIイベント処理、API通信
- **実装**: `public/js/main.js`
- **主要機能**:
  - フォーム送信処理
  - APIリクエスト
  - 結果表示処理
  - ダウンロード処理
  - エラーハンドリング

#### 3. スタイル定義

- **役割**: UIデザイン
- **実装**: `public/css/style.css`
- **主要機能**:
  - レイアウト定義
  - タブ切り替え
  - ボタンスタイル
  - 結果表示スタイル

## 主要機能詳細

### 1. ウェブサイトスクリーンショット

- **処理フロー**:
  1. ユーザーがURLを入力
  2. サーバーでPuppeteerを起動
  3. 指定URLに接続
  4. ページロード完了まで待機
  5. スクリーンショットを取得
  6. 画像を保存（ローカル/Firebase）
  7. 保存先URLをクライアントに返却

- **実装詳細**:
  - Puppeteerの設定:
    - ヘッドレスモード: true
    - ビューポート: 1280x800
    - タイムアウト: 30秒
  - 保存形式: JPEG (90%品質)

### 2. YouTube動画スクリーンショット

- **処理フロー**:
  1. ユーザーがYouTube URLとタイムスタンプを入力
  2. サーバーでPuppeteerを起動
  3. YouTube URLに接続
  4. 動画プレーヤーが読み込まれるまで待機
  5. 指定タイムスタンプにシーク
  6. スクリーンショットを取得
  7. 画像を保存（ローカル/Firebase）
  8. 保存先URLをクライアントに返却

- **実装詳細**:
  - YouTubeビデオID抽出機能
  - カスタムビューポート: 1280x720
  - 動画要素のセレクタ: video

### 3. YouTube Shortsスクリーンショット

- **処理フロー**:
  1. ユーザーがYouTube Shorts URLとタイムスタンプを入力
  2. サーバーでPuppeteerを起動
  3. YouTube Shorts URLに接続
  4. 動画プレーヤーが読み込まれるまで待機
  5. 指定タイムスタンプにシーク
  6. スクリーンショットを取得
  7. 画像を保存（ローカル/Firebase）
  8. 保存先URLをクライアントに返却

- **実装詳細**:
  - ShortsビデオID抽出機能
  - 縦型ビューポート: 540x960
  - Shorts専用セレクタ

### 4. バッチキャプチャ

- **処理フロー**:
  1. ユーザーがYouTube Shorts ID、開始秒数、終了秒数、並列処理数を入力
  2. サーバーで並列処理用のキューを作成
  3. 各秒数について並列でPuppeteerを起動
  4. スクリーンショットを取得
  5. 画像をバッチディレクトリに保存
  6. 結果をまとめてクライアントに返却

- **実装詳細**:
  - Promise.allで並列処理
  - 重複フレーム検出機能
  - エラーハンドリング
  - 最大並列数制限

### 5. 画像保存

- **処理フロー**:
  1. スクリーンショットをバッファとして取得
  2. 環境設定に基づき保存先を決定
  3. ローカルストレージに保存（オプション）
  4. Firebase Storageに保存（オプション）
  5. 保存先情報を返却

- **実装詳細**:
  - ローカルパス生成: `{LOCAL_STORAGE_PATH}/{filename}`
  - Firebase Storageパス: `{folderPath}/{filename}`
  - 公開URL生成: Firebase Storage公開URLまたはローカルパス

### 6. 直接ダウンロード機能

- **処理フロー**:
  1. ユーザーが「Firebase画像をダウンロード」ボタンをクリック
  2. クライアントJSがFirebase URLから画像をフェッチ
  3. Blobとして取得
  4. 一時的なダウンロードリンクを作成
  5. クリックイベントを実行
  6. リソースを解放

- **実装詳細**:
  - Fetch APIによる画像取得
  - URL.createObjectURLによるBlobURL生成
  - ダウンロード時の進捗表示
  - エラーハンドリング

## データモデル

### 1. スクリーンショットエントリ (Firebase Realtime Database)

```json
{
  "screenshots": {
    "{screenshot_id}": {
      "id": "unique-id",
      "url": "https://example.com",
      "video_id": "youtube-id (optional)",
      "timestamp": 30,
      "is_shorts": true,
      "storage_path": "screenshots/filename.jpg",
      "public_url": "https://storage.googleapis.com/...",
      "local_path": "/data/uploads/filename.jpg",
      "created_at": "2023-03-15T12:30:45Z"
    }
  }
}
```

### 2. バッチキャプチャエントリ (Firebase Realtime Database)

```json
{
  "batches": {
    "{video_id}": {
      "{batch_id}": {
        "video_id": "youtube-id",
        "start_sec": 0,
        "end_sec": 60,
        "storage_directory": "batches/{video_id}/{batch_id}",
        "local_directory": "/data/uploads/{batch_id}",
        "screenshot_count": 61,
        "created_at": "2023-03-15T12:30:45Z",
        "items": {
          "0": { "timestamp": 0, "path": "0s.jpg", "success": true },
          "1": { "timestamp": 1, "path": "1s.jpg", "success": true },
          "...": {}
        }
      }
    }
  }
}
```

## API仕様

### 1. スクリーンショット取得 API

- **エンドポイント**: `POST /api/screenshot`
- **リクエスト**:
  ```json
  {
    "url": "https://example.com",
    "timestamp": 30
  }
  ```
- **レスポンス**:
  ```json
  {
    "status": "success",
    "data": {
      "id": "unique-id",
      "url": "https://example.com",
      "timestamp": 30,
      "image_url": "https://storage.googleapis.com/...",
      "path": "/data/uploads/filename.jpg",
      "publicUrl": "https://storage.googleapis.com/..."
    }
  }
  ```

### 2. バッチキャプチャ API

- **エンドポイント**: `POST /api/screenshot/batch`
- **リクエスト**:
  ```json
  {
    "videoId": "youtube-id",
    "startSec": 0,
    "endSec": 60,
    "maxConcurrency": 5
  }
  ```
- **レスポンス**:
  ```json
  {
    "status": "success",
    "data": {
      "batch_id": "batch-id",
      "video_id": "youtube-id",
      "start_sec": 0,
      "end_sec": 60,
      "total_frames": 61,
      "valid_count": 30,
      "error_count": 0,
      "has_duplicates": true,
      "batch_directory": "/data/uploads/batch-id",
      "firebase_path": "batches/youtube-id/batch-id",
      "screenshots": [
        {
          "timestamp": 0,
          "success": true,
          "image_url": "https://storage.googleapis.com/...",
          "path": "/data/uploads/batch-id/0s.jpg"
        },
        "..."
      ]
    }
  }
  ```

### 3. ZIP一括ダウンロード API

- **エンドポイント**: `GET /api/screenshot/download-zip/:directory`
- **レスポンス**: ZIPファイル

## キャッシュ戦略

- **Firebase Storage**: 公開URLは長期間有効で自動的にCDNキャッシュを活用
- **ブラウザキャッシュ**: クライアント側で適切なキャッシュヘッダーを設定
- **重複検出**: バッチ処理では連続するフレームの重複を検出して効率化

## エラー処理

- **クライアント側**:
  - 入力バリデーション
  - API通信エラー処理
  - ダウンロードエラー処理
  - ユーザーへのエラー表示

- **サーバー側**:
  - URL検証エラー
  - ブラウザ起動失敗
  - ページ読み込み失敗
  - タイムアウト
  - ストレージエラー
  - Firebase接続エラー

## セキュリティ考慮事項

- **入力バリデーション**: すべてのユーザー入力をサーバー側で検証
- **アクセス制限**: Firebase Storageの適切なセキュリティルール設定
- **環境変数**: 機密情報は環境変数で管理
- **CORS設定**: 適切なオリジン制限
- **バケット設定**: 必要最小限の公開アクセス設定

## 拡張可能性

- **認証機能**: ユーザー認証の追加
- **画像処理**: 画像の加工・編集機能
- **OCR処理**: キャプチャした画像からテキスト抽出
- **自動化**: 定期的なスクリーンショット取得
- **API拡張**: 他のサービスとの連携
- **モバイル対応**: レスポンシブデザインのさらなる強化

## パフォーマンス最適化

- **並列処理**: バッチ処理の並列度調整
- **画像サイズ**: 画質と容量のバランス調整
- **クライアントキャッシュ**: 適切なキャッシュ戦略
- **リソース管理**: Puppeteerインスタンスの効率的管理
- **Firebase最適化**: データ構造とクエリの最適化 

## デプロイアーキテクチャ

本サービスは以下のコンポーネントを使用して本番環境にデプロイします：

```
[ユーザー] --> [Firebase Hosting] --> [HTML/CSS/JS]
                     |
                     v
              [Google Cloud Run] --> [Express サーバー]
                     |
                     v
              [Firebase Services]
              - Realtime Database
              - Storage
```

### 1. Firebase Hosting (フロントエンド)

- **役割**: 静的ファイルのホスティング、APIリクエストのルーティング
- **構成ファイル**: `firebase.json`
- **主要設定**:
  - 公開ディレクトリ: `public/`
  - Cloud Runへのリクエスト転送設定
  - キャッシュ設定

### 2. Google Cloud Run (バックエンド)

- **役割**: スクリーンショットサービスの実行環境
- **構成ファイル**: `Dockerfile`
- **主要設定**:
  - コンテナイメージ: Node.js 18ベース
  - Puppeteerの依存関係インストール設定
  - 適切なメモリ割り当て
  - スケーリング設定

### 3. Firebase設定ファイル

#### firebase.json
```json
{
  "database": {
    "rules": "database.rules.json"
  },
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "web-screenshot",
          "region": "asia-northeast1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### database.rules.json
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

#### storage.rules
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // 開発環境なので、すべてのアクセスを許可する
      allow read, write;
    }
  }
}
```

### 4. デプロイ手順

#### Firebase Hostingデプロイ
```bash
# Firebase CLIをインストール
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクト初期化（初回のみ）
firebase init

# デプロイ
firebase deploy --only hosting
```

#### Google Cloud Runデプロイ
```bash
# Google Cloud SDKをインストール・設定

# サービスをデプロイ
gcloud run deploy web-screenshot \
  --source . \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --project=YOUR_PROJECT_ID
```

### 5. デプロイ時の注意点

- **Firebase Storage Bucket名**: バケット名は`PROJECT_ID.firebasestorage.app`形式で設定
- **Firebase Database URL**: トレイリングスラッシュ（/）を含める
- **Cloud RunからFirebaseへの認証**: サービスアカウント権限の設定
- **環境変数**: 本番環境用の環境変数をCloud Run設定に追加
- **APIルーティング**: Firebase HostingからCloud Runへの正しいルーティング設定

### 6. APIアクセスエラーのトラブルシューティング

- **Cloud Run Admin API**: APIが有効化されていることを確認
- **サービス名・リージョン**: firebase.jsonの設定と実際のデプロイ先が一致しているか確認
- **CORS設定**: 適切なCORS設定がされているか確認
- **権限設定**: 必要なサービスアカウント権限が付与されているか確認

### 7. 追加必要なFirebase設定

- **Firebase Authentication**: 必要に応じて認証設定を追加
- **セキュリティルール**: 本番環境ではより厳格なルールを設定
- **クロスリージョン設定**: 必要に応じてマルチリージョン設定を検討