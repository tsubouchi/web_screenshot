import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config();

// 現在のファイルのディレクトリパスを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Firebase Admin SDKの設定
let firebaseAdminConfig;

// データベースURLの検証・正規化関数
function normalizeDatabaseUrl(url) {
  if (!url) return null;
  
  // URLの末尾にスラッシュを追加（なければ）
  return url.endsWith('/') ? url : `${url}/`;
}

if (process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
  // 環境変数から設定（本番環境向け）
  console.log('環境変数からFirebase設定を読み込みます');
  firebaseAdminConfig = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    databaseURL: normalizeDatabaseUrl(process.env.FIREBASE_DATABASE_URL),
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
    })
  };
} else {
  // JSONファイルから設定（開発環境向け）
  try {
    // 複数の可能なファイル名を試す
    const possibleKeyFiles = [
      'serviceAccountKey.json',
      'firebase-admin-key.json'
    ];
    
    let serviceAccount = null;
    
    for (const keyFile of possibleKeyFiles) {
      try {
        const filePath = join(rootDir, keyFile);
        const fileContent = readFileSync(filePath, 'utf8');
        serviceAccount = JSON.parse(fileContent);
        console.log(`サービスアカウントキーを読み込みました: ${keyFile}`);
        break;
      } catch (e) {
        console.log(`${keyFile} からの読み込みに失敗しました`);
      }
    }
    
    if (!serviceAccount) {
      console.warn('サービスアカウントキーファイルが見つからないため、環境変数のダミー設定を使用します');
      // ダミー設定
      serviceAccount = {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
      };
    }
    
    firebaseAdminConfig = {
      credential: admin.credential.cert(serviceAccount),
      databaseURL: normalizeDatabaseUrl(process.env.FIREBASE_DATABASE_URL)
    };
  } catch (error) {
    console.error('Firebase設定の読み込みに失敗しました:', error);
    process.exit(1);
  }
}

// Firebase Storageバケット名の設定
if (process.env.FIREBASE_STORAGE_BUCKET) {
  firebaseAdminConfig.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  console.log(`Firebase Storage バケット名を設定: ${process.env.FIREBASE_STORAGE_BUCKET}`);
}

// 開発モードの場合、設定内容を表示
if (process.env.NODE_ENV === 'development') {
  console.log('Firebase設定:', {
    projectId: firebaseAdminConfig.projectId || '設定なし',
    databaseURL: firebaseAdminConfig.databaseURL || '設定なし',
    storageBucket: firebaseAdminConfig.storageBucket || '設定なし'
  });
}

// Firebaseアプリが既に初期化されていないことを確認
let firebaseApp;
try {
  // Firebaseアプリを初期化
  firebaseApp = admin.initializeApp(firebaseAdminConfig);
  console.log('Firebase Adminを初期化しました');
  
  // 明示的にStorageバケットを取得して存在確認
  const bucket = admin.storage().bucket();
  console.log(`StorageBucketに接続しました: ${bucket.name}`);
  
  // 権限の問題があるため、バケットの存在確認は行わない
  // 代わりに単純なファイル操作でバケットの動作確認を行う
  try {
    // テスト用の空ファイルを作成
    const testFile = bucket.file('system_test.txt');
    const stream = testFile.createWriteStream({
      metadata: {
        contentType: 'text/plain',
      }
    });
    
    stream.on('error', (err) => {
      console.error('Firebase Storageテスト失敗:', err);
    });
    
    stream.on('finish', () => {
      console.log('Firebase Storageテスト成功: ファイル書き込みOK');
      
      // テストファイルを削除（オプション）
      testFile.delete().catch((err) => {
        console.log('テストファイル削除中にエラー:', err);
      });
    });
    
    stream.end('Test content');
  } catch (error) {
    console.error('Firebase Storageテストエラー:', error);
  }
} catch (error) {
  // 既に初期化されている場合はそのアプリを取得
  console.warn('Firebase Adminは既に初期化されています:', error.message);
  firebaseApp = admin.app();
}

// サービスをエクスポート
export const auth = admin.auth();
export const db = admin.database();
export const storage = admin.storage();

// データベース接続テスト
if (process.env.NODE_ENV === 'development') {
  try {
    const testRef = db.ref('system_test');
    testRef.set({
      test_time: new Date().toISOString(),
      message: 'Firebase Realtime Database接続テスト'
    }).then(() => {
      console.log('Firebase Realtime Database接続テスト: 成功');
      // テストデータを削除
      return testRef.remove();
    }).catch(error => {
      console.error('Firebase Realtime Database接続テスト: 失敗', error);
    });
  } catch (error) {
    console.error('Firebase Realtime Database接続テスト実行エラー:', error);
  }
}

export default firebaseApp; 