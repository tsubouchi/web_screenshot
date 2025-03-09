# ウェブスクリーンショットサービス

ウェブサイト、YouTube動画、YouTube Shortsのスクリーンショットを簡単に取得できるサービスです。

## デプロイ情報

- **フロントエンド (Firebase Hosting)**: https://web-screenshot-demo-c3d64.web.app
- **バックエンド (Google Cloud Run)**: https://web-screenshot-1015153191846.asia-northeast1.run.app
- **Firebase プロジェクトID**: web-screenshot-demo-c3d64
- **GCP プロジェクトID**: global-brook-453206-b9

### プロジェクト構成の注意点

このプロジェクトでは、FirebaseプロジェクトとGCPプロジェクトが異なります。Firebase HostingからCloud RunへのAPIリクエストの転送では、`firebase.json`ファイルにて直接URLを指定する方式を採用しています。

```json
// firebase.jsonの重要な設定
{
  "hosting": {
    "rewrites": [
      {
        "source": "/api/**",
        "destination": "https://web-screenshot-1015153191846.asia-northeast1.run.app/api/**"
      }
    ]
  }
}
```

## 主な機能

- **ウェブサイトキャプチャ**: 任意のURLを入力してウェブページのスクリーンショットを取得
- **YouTube動画キャプチャ**: YouTube動画の特定時間のスクリーンショットを取得
- **YouTube Shortsキャプチャ**: YouTube Shortsの特定時間のスクリーンショットを取得
- **Shorts連続キャプチャ**: YouTube Shortsの指定秒数範囲内のスクリーンショットを一括取得
- **画像の保存**:
  - ローカルストレージへの保存
  - Firebase Storageへの保存
  - 直接ダウンロード機能

## システム要件

- Node.js 16.x以上
- NPM 7.x以上
- Firebase認証情報（スクリーンショットの保存に使用）

## インストール方法

1. リポジトリをクローン
```
git clone <リポジトリURL>
cd screenshot-service
```

2. 依存パッケージをインストール
```
npm install
```

3. 環境変数を設定
```
cp .env.sample .env
```
`.env`ファイルに適切な値を設定してください（下記「環境設定」セクション参照）

4. アプリケーションを起動
```
npm start
```

5. ブラウザで以下のURLにアクセス
```
http://localhost:3000
```

## デプロイ方法

### 前提条件

- Node.js 16.x以上
- npm 7.x以上
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud SDK
- Firebase、GCPアカウント（権限設定済み）

### バックエンド (Cloud Run) のデプロイ

1. Google Cloud CLIにログイン
```
gcloud auth login
```

2. プロジェクトを設定
```
gcloud config set project global-brook-453206-b9
```

3. 必要なAPIを有効化
```
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

4. serviceAccountKey.jsonファイルが正しく配置されていることを確認

5. Cloud Runにデプロイ
```
gcloud run deploy web-screenshot --source . --platform managed --region asia-northeast1 --allow-unauthenticated --memory 2Gi --timeout=5m --set-env-vars="NODE_ENV=production,PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true,PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable,FIREBASE_ADMIN_PROJECT_ID=web-screenshot-demo-c3d64,FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@web-screenshot-demo-c3d64.iam.gserviceaccount.com,FIREBASE_DATABASE_URL=https://web-screenshot-demo-c3d64-default-rtdb.firebaseio.com/,FIREBASE_STORAGE_BUCKET=web-screenshot-demo-c3d64.firebasestorage.app,USE_FIREBASE_STORAGE=true,SKIP_LOCAL_STORAGE=true,LOCAL_STORAGE_PATH=data/uploads"
```

6. デプロイが完了すると、サービスURLが表示されます
```
Service URL: https://web-screenshot-1015153191846.asia-northeast1.run.app
```

### フロントエンド (Firebase Hosting) のデプロイ

1. firebase.jsonを正しく設定
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
        "destination": "https://web-screenshot-1015153191846.asia-northeast1.run.app/api/**"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

2. Firebase CLIにログイン
```
firebase login
```

3. プロジェクトを選択
```
firebase use web-screenshot-demo-c3d64
```

4. Hostingをデプロイ
```
firebase deploy --only hosting
```

5. デプロイが完了すると、Hosting URLが表示されます
```
Hosting URL: https://web-screenshot-demo-c3d64.web.app
```

## トラブルシューティング

### Cloud Runデプロイ時の注意点

- **メモリ割り当て**: Puppeteerは多くのメモリを必要とするため、最低2GBのメモリ割り当て(`--memory 2Gi`)を推奨
- **タイムアウト設定**: スクリーンショット取得に時間がかかる場合があるため、デフォルトより長いタイムアウト(`--timeout=5m`)を設定
- **環境変数**: 必要な環境変数をすべて設定する
- **認証情報**: serviceAccountKey.jsonが正しく設定されているか確認

### Firebase Hostingとの連携時の注意点

- **プロジェクトID不一致**: GCPプロジェクトとFirebaseプロジェクトが異なる場合は、`firebase.json`の`run`セクションでの連携は失敗します。代わりにCloud RunサービスのURLを直接指定する方法を使用してください。
- **URLフォーマット**: Cloud RunサービスのURLは正確に指定してください（末尾のスラッシュの有無に注意）
- **CORS設定**: 異なるドメイン間での通信になるため、CORS設定が必要な場合があります

### Firebase Storage Bucket名の注意点

- バケット名は通常 `PROJECT_ID.firebasestorage.app` 形式です
- 設定が間違っていると画像URLが正しく生成されないため注意が必要です

## 環境設定

`.env`ファイルに以下の環境変数を設定してください：

```
# アプリ設定
PORT=3000
NODE_ENV=development

# ストレージ設定
LOCAL_STORAGE_PATH=data/uploads
SKIP_LOCAL_STORAGE=false
USE_FIREBASE_STORAGE=true

# Firebase設定
FIREBASE_ADMIN_PROJECT_ID=web-screenshot-demo-c3d64
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@web-screenshot-demo-c3d64.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
FIREBASE_DATABASE_URL=https://web-screenshot-demo-c3d64-default-rtdb.firebaseio.com/
FIREBASE_STORAGE_BUCKET=web-screenshot-demo-c3d64.firebasestorage.app

# Firebase Hosting
FIREBASE_HOSTING_URL=https://web-screenshot-demo-c3d64.web.app
```

## 使い方

### ウェブサイトのスクリーンショット

1. 「ウェブサイト」タブを選択
2. URLを入力（例: `https://example.com`）
3. 「スクリーンショット取得」ボタンをクリック

### YouTube動画のスクリーンショット

1. 「YouTube動画」タブを選択
2. YouTube動画のURLを入力
3. タイムスタンプを秒数で指定（オプション）
4. 「スクリーンショット取得」ボタンをクリック

### YouTube Shortsのスクリーンショット

1. 「YouTube Shorts」タブを選択
2. YouTube ShortsのURLを入力
3. タイムスタンプを秒数で指定（オプション）
4. 「スクリーンショット取得」ボタンをクリック

### Shorts連続キャプチャ

1. 「Shorts連続キャプチャ」タブを選択
2. YouTube Shorts IDまたはURLを入力
3. 開始秒数と終了秒数を指定（最大60秒範囲）
4. 並列処理数を指定（デフォルト: 5）
5. 「連続キャプチャ実行」ボタンをクリック

### 画像のダウンロード

- 単一スクリーンショット：「Firebase画像をダウンロード」ボタンをクリック
- バッチスクリーンショット：各サムネイル下の「Firebase画像をダウンロード」ボタンをクリック
- バッチ全体：「全てZIPでダウンロード」ボタンをクリック

## ファイル構成

```
screenshot-service/
├── .dockerignore           # Dockerビルド時に除外するファイル
├── .env                    # 環境変数（非公開）
├── .env.sample             # 環境変数のサンプル
├── .firebase/              # Firebaseデプロイ用一時ファイル
├── .gitignore              # Gitの除外ファイル設定
├── Dockerfile              # コンテナビルド設定
├── README.md               # このドキュメント
├── basic_design.md         # 詳細設計書
├── cors-config.json        # CORS設定
├── data/                   # ローカルデータディレクトリ
│   └── uploads/            # スクリーンショット保存先
├── database.rules.json     # Firebaseデータベースルール
├── firebase.json           # Firebase設定ファイル
├── node_modules/           # 依存パッケージ
├── package.json            # NPM依存関係
├── package-lock.json       # 依存パッケージのバージョン固定
├── public/                 # 静的ファイル（フロントエンド）
│   ├── css/                # スタイルシート
│   ├── js/                 # クライアントサイドJavaScript
│   └── index.html          # メインページHTML
├── scripts/                # デプロイスクリプト等
├── serviceAccountKey.json  # Firebase認証情報（非公開）
├── src/                    # サーバーサイドコード
│   ├── config/             # 設定ファイル
│   │   └── firebase.js     # Firebase設定
│   ├── routes/             # APIルート
│   │   └── screenshot.js   # スクリーンショット関連API
│   └── index.js            # アプリエントリーポイント
└── storage.rules           # Firebaseストレージルール
```

## APIエンドポイント

- `POST /api/screenshot` - スクリーンショットを作成
- `POST /api/screenshot/batch` - バッチスクリーンショットを作成
- `GET /api/screenshot/download-zip/:directory` - バッチディレクトリをZIPでダウンロード

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。詳細はLICENSEファイルを参照してください。

## 謝辞

このプロジェクトは以下のオープンソースライブラリを使用しています：

- Express
- Puppeteer
- Firebase Admin SDK
- dotenv
- その他のライブラリについてはpackage.jsonを参照

## 開発者向け情報

詳細な設計ドキュメントは[basic_design.md](./basic_design.md)を参照してください。 