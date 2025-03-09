import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// __dirnameを取得（ESモジュールで使用するための方法）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * データベースURLが正しい形式かチェックし、必要であれば末尾のスラッシュを追加
 */
function normalizeDatabaseUrl(url) {
  if (!url) return '';
  return url.endsWith('/') ? url : `${url}/`;
}

// サービス変数を宣言
let auth;
let db;
let storage;
let app;

// Cloud Run環境用のより柔軟な初期化
try {
  console.log('Firebase初期化を開始...');
  console.log('環境変数:', {
    PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    DATABASE_URL: process.env.FIREBASE_DATABASE_URL, 
    STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    NODE_ENV: process.env.NODE_ENV
  });
  
  // 初期化方法1: サービスアカウントのJSONファイルが存在する場合
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
    if (fs.existsSync(serviceAccountPath)) {
      console.log('サービスアカウントJSONファイルを使用: ', serviceAccountPath);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccountPath),
        databaseURL: normalizeDatabaseUrl(process.env.FIREBASE_DATABASE_URL),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('サービスアカウントJSONファイルで初期化成功');
    }
  } catch (jsonError) {
    console.log('サービスアカウントJSONファイルでの初期化に失敗:', jsonError.message);
  }
  
  // 初期化方法2: 環境変数が提供されている場合
  if (!app && process.env.FIREBASE_ADMIN_PROJECT_ID && process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    console.log('環境変数を使用してFirebaseを初期化');
    try {
      const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
      
      // Google Cloud環境のデフォルト認証情報を使用
      app = admin.initializeApp({
        projectId: projectId,
        databaseURL: normalizeDatabaseUrl(process.env.FIREBASE_DATABASE_URL),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('環境変数で初期化成功');
    } catch (envError) {
      console.error('環境変数による初期化に失敗:', envError.message);
      throw envError;
    }
  }
  
  // 初期化方法3: アプリケーションのデフォルト認証情報を使用
  if (!app) {
    console.log('アプリケーションのデフォルト認証情報を使用');
    try {
      app = admin.initializeApp({
        databaseURL: normalizeDatabaseUrl(process.env.FIREBASE_DATABASE_URL),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET
      });
      console.log('デフォルト認証情報で初期化成功');
    } catch (defaultError) {
      console.error('デフォルト認証情報による初期化に失敗:', defaultError.message);
      throw defaultError;
    }
  }

  console.log('Firebase初期化完了');
  
  // サービスの初期化
  auth = app.auth();
  db = app.database();
  storage = app.storage();

  // 開発環境の場合、テスト接続を実行
  if (process.env.NODE_ENV === 'development') {
    // 明示的にStorageバケットを取得して存在確認
    const bucket = admin.storage().bucket();
    console.log(`Firebaseストレージバケット: ${bucket.name}`);

    // データベース接続テスト（開発環境のみ）
    try {
      const ref = db.ref('system_test');
      console.log('Firebase Realtimeデータベースに接続テスト中...');
      ref.set({
        timestamp: Date.now(),
        message: 'Connection test successful'
      })
      .then(() => {
        console.log('Firebase Realtimeデータベース接続成功');
        // テストデータを削除
        return ref.remove();
      })
      .then(() => {
        console.log('テストデータを削除しました');
      })
      .catch(error => {
        console.error('Firebase Realtimeデータベーステストエラー:', error);
      });
    } catch (dbError) {
      console.error('Firebase Realtimeデータベーステストエラー:', dbError);
    }

    // ストレージ接続テスト（開発環境のみ）
    try {
      const testFile = Buffer.from('Firebase Storage connection test');
      const file = bucket.file('system_test.txt');
      
      file.save(testFile)
        .then(() => {
          console.log('Firebase Storage接続成功');
          // テストファイルを削除
          return file.delete();
        })
        .then(() => {
          console.log('テストファイルを削除しました');
        })
        .catch(error => {
          console.error('Firebase Storageテストエラー:', error);
        });
    } catch (storageError) {
      console.error('Firebase Storageテストエラー:', storageError);
    }
  }
} catch (error) {
  console.error('Firebaseの初期化に失敗しました:', error);
  console.error('エラーの詳細:', JSON.stringify(error, null, 2));
  console.error('環境変数:', {
    PROJECT_ID: process.env.FIREBASE_ADMIN_PROJECT_ID,
    CLIENT_EMAIL: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    DATABASE_URL: process.env.FIREBASE_DATABASE_URL,
    STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET,
    NODE_ENV: process.env.NODE_ENV
  });
  throw error;
}

// サービスをエクスポート
export { auth, db, storage };
export default app; 