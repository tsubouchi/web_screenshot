import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import archiver from 'archiver';

// Firebaseサービスをインポート
import { db, storage } from '../config/firebase.js';

const router = express.Router();

// __dirnameを取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境設定
const USE_FIREBASE_STORAGE = process.env.USE_FIREBASE_STORAGE === 'true';
const SKIP_LOCAL_STORAGE = process.env.SKIP_LOCAL_STORAGE === 'true';
const LOCAL_STORAGE_PATH = process.env.LOCAL_STORAGE_PATH || 'data/uploads';
const uploadsDir = path.resolve(process.cwd(), LOCAL_STORAGE_PATH);

// ローカルストレージディレクトリがない場合は作成
if (!SKIP_LOCAL_STORAGE && !fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log(`ローカルストレージディレクトリを作成しました: ${uploadsDir}`);
}

// ファイル保存ユーティリティ関数
async function saveScreenshot(screenshotBuffer, filePath, storageOptions = {}) {
  const results = {
    localPath: null,
    firebasePath: null,
    publicUrl: null
  };
  
  // ローカルに保存
  if (!SKIP_LOCAL_STORAGE) {
    await fs.promises.writeFile(filePath, screenshotBuffer);
    results.localPath = filePath;
  }
  
  // Firebase Storageに保存
  if (USE_FIREBASE_STORAGE) {
    try {
      const { folderPath = 'websites', filename } = storageOptions;
      const fileName = filename || path.basename(filePath);
      const storagePath = `${folderPath}/${fileName}`;
      
      // バケット情報をログ出力
      const bucket = storage.bucket();
      console.log('Firebase Storageバケット情報:', {
        name: bucket.name
      });
      
      // 注: バケットの存在確認はスキップします（権限の問題があるため）
      // バケットが存在しない場合は後続の操作で別のエラーが発生します
      
      const file = bucket.file(storagePath);
      console.log('ファイル保存を開始します:', storagePath);
      
      await file.save(screenshotBuffer, {
        metadata: {
          contentType: 'image/jpeg',
        }
      });
      
      console.log('ファイル保存が完了しました');
      
      try {
        // ファイルを公開アクセス可能に設定
        await file.makePublic();
        console.log('ファイルを公開設定しました');
      } catch (publicError) {
        console.error('ファイルの公開設定に失敗しました:', publicError);
        console.log('代わりに署名付きURLを使用します');
      }
      
      // 公開URLを生成（正常に公開設定された場合は直接URL、そうでない場合は署名付きURL）
      let publicUrl;
      try {
        // バケット名を環境変数から直接取得（権限の問題を回避）
        const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
        publicUrl = `https://storage.googleapis.com/${bucketName}/${storagePath}`;
        
        console.log('生成されたURL:', publicUrl);
      } catch (urlError) {
        console.error('公開URL生成エラー:', urlError);
        
        // 代替として署名付きURLを試行
        try {
          const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: '03-01-2500' // 長期間有効なURL
          });
          publicUrl = signedUrl;
          console.log('代替として署名付きURLを生成しました:', publicUrl);
        } catch (signedUrlError) {
          console.error('署名付きURL生成エラー:', signedUrlError);
          publicUrl = null;
        }
      }
      
      results.firebasePath = storagePath;
      results.publicUrl = publicUrl;
      
      console.log(`Firebase Storageに保存しました: ${storagePath}`);
      console.log(`公開URL: ${publicUrl}`);
    } catch (error) {
      console.error('Firebase Storageへの保存に失敗しました:', error);
      console.error('エラー詳細:', JSON.stringify(error, null, 2));
      // エラーでもローカルには保存できているので処理は続行
    }
  }
  
  return results;
}

// URLバリデーション関数
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

// YouTube URLからビデオIDを抽出する関数
const extractYouTubeVideoId = (url) => {
  // YouTube ShortsのURL形式をチェック
  if (url.includes('youtube.com/shorts/')) {
    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch && shortsMatch[1]) {
      return shortsMatch[1];
    }
  }
  
  // 通常のYouTube URL形式をチェック
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
};

// YouTube Shorts URLからビデオIDを直接抽出する関数
const extractShortsVideoId = (url) => {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  return (shortsMatch && shortsMatch[1]) ? shortsMatch[1] : null;
};

// YouTube URLかどうかを判定する関数
const isYoutubeUrl = (url) => {
  return url.includes('youtube.com') || url.includes('youtu.be');
};

// YouTube Shorts URLかどうかを判定する関数
const isShortsUrl = (url) => {
  return url.includes('youtube.com/shorts');
};

// 基本的なスクリーンショット取得エンドポイント
router.post('/', async (req, res) => {
  try {
    const { url, timestamp } = req.body;
    
    // URLのバリデーション
    if (!url || !isValidUrl(url)) {
      return res.status(400).json({ error: '有効なURLを入力してください' });
    }
    
    let videoId = null;
    let isYoutube = isYoutubeUrl(url);
    let isShorts = isShortsUrl(url);
    
    // YouTube動画の場合はビデオIDを抽出
    if (isYoutube) {
      videoId = extractYouTubeVideoId(url);
      if (!videoId) {
        return res.status(400).json({ error: '有効なYouTube URLを入力してください' });
      }
    }
    
    console.log(`スクリーンショットリクエスト: ${url}`);
    console.log(`YouTube動画: ${isYoutube ? 'はい' : 'いいえ'}, Shorts: ${isShorts ? 'はい' : 'いいえ'}`);
    
    // Puppeteerブラウザを起動
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: isShorts ? { width: 540, height: 960 } : null
    });
    
    const page = await browser.newPage();
    
    // ビューポートサイズを設定
    if (!isShorts) {
      await page.setViewport({ width: 1280, height: 800 });
    }
    
    // ページに移動
    await page.goto(url, { waitUntil: 'networkidle2' });
    
    // YouTube動画の場合、特定の処理を行う
    if (isYoutube && timestamp) {
      await processYoutubeVideo(page, timestamp, isShorts);
    }
    
    // スクリーンショットを撮影
    const screenshotId = uuidv4();
    const fileName = isYoutube 
      ? `${videoId}_${timestamp || 0}s_${screenshotId}.jpg` 
      : `screenshot_${screenshotId}.jpg`;
    
    const filePath = path.join(uploadsDir, fileName);
    
    // スクリーンショットをバッファとして取得
    const screenshotBuffer = await page.screenshot({ 
      fullPage: !isYoutube,  // 通常のウェブサイトは全画面、YouTubeは表示領域のみ
      type: 'jpeg',
      quality: 90
    });
    
    await browser.close();
    
    // スクリーンショットを保存（ローカルおよび/またはFirebase）
    const folderPath = isYoutube ? (isShorts ? 'shorts' : 'youtube') : 'websites';
    const storageResult = await saveScreenshot(screenshotBuffer, filePath, {
      folderPath,
      filename: fileName
    });
    
    console.log('ストレージ保存結果:', storageResult);
    
    // Firebaseデータベースにメタデータを保存
    let databaseEntry = null;
    if (USE_FIREBASE_STORAGE) {
      try {
        const screenshotsRef = db.ref('screenshots');
        const newScreenshotRef = screenshotsRef.push();
        
        const metadata = {
          id: screenshotId,
          url: url,
          video_id: videoId,
          timestamp: timestamp ? parseInt(timestamp, 10) : null,
          is_shorts: isShorts,
          storage_path: storageResult.firebasePath,
          public_url: storageResult.publicUrl,
          local_path: storageResult.localPath,
          created_at: new Date().toISOString(),
          ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown'
        };
        
        await newScreenshotRef.set(metadata);
        databaseEntry = { ...metadata, key: newScreenshotRef.key };
        console.log('Firebaseデータベースに保存しました:', newScreenshotRef.key);
      } catch (error) {
        console.error('Firebaseデータベースへの保存に失敗しました:', error);
      }
    }
    
    // レスポンスを構築
    const result = {
      id: screenshotId,
      url: url,
      video_id: videoId,
      timestamp: timestamp ? parseInt(timestamp, 10) : null,
      is_shorts: isShorts,
      created_at: new Date().toISOString()
    };
    
    // パスとURLを設定
    if (storageResult.publicUrl) {
      result.image_url = storageResult.publicUrl;
      result.firebase_path = storageResult.firebasePath;
      // 明示的にpublicUrlもレスポンスに含める
      result.publicUrl = storageResult.publicUrl;
    }
    
    if (storageResult.localPath) {
      result.path = `/data/uploads/${fileName}`;
      result.local_path = storageResult.localPath;
    }
    
    // 成功レスポンスを返す
    return res.json({
      status: 'success',
      data: result
    });
    
  } catch (error) {
    console.error('スクリーンショット取得エラー:', error);
    res.status(500).json({ error: 'スクリーンショットの取得に失敗しました' });
  }
});

// YouTube動画のタイムスタンプ処理関数
async function processYoutubeVideo(page, timestamp, isShorts) {
  try {
    // タイムスタンプが数値であることを確認
    const targetSecond = parseInt(timestamp, 10);
    if (isNaN(targetSecond)) {
      console.warn('無効なタイムスタンプ:', timestamp);
      return;
    }
    
    console.log(`動画を${targetSecond}秒にシークします...`);
    
    // 動画がロードされるのを待つ
    await page.waitForSelector('video', { timeout: 10000 });
    
    // JavaScriptを使用して動画の再生位置を設定
    await page.evaluate((targetSecond) => {
      const video = document.querySelector('video');
      if (video) {
        video.currentTime = targetSecond;
        if (!video.paused) video.pause();
        return true;
      }
      return false;
    }, targetSecond);
    
    // 動画フレームが更新されるまで少し待機
    await page.waitForTimeout(1000);
    
    console.log(`${targetSecond}秒にシークしました`);
    
  } catch (error) {
    console.error('YouTube動画処理エラー:', error);
    throw error;
  }
}

// バッチキャプチャ結果をFirebaseに保存
router.post('/batch', async (req, res) => {
  try {
    let { videoId, startSec = 0, endSec = 60, maxConcurrency = 5 } = req.body;
    
    // videoIdがURL形式で渡された場合、ビデオIDを抽出
    if (videoId && (videoId.includes('youtube.com') || videoId.includes('youtu.be'))) {
      const extractedId = isShortsUrl(videoId) 
        ? extractShortsVideoId(videoId) 
        : extractYouTubeVideoId(videoId);
      
      if (extractedId) {
        videoId = extractedId;
      } else {
        return res.status(400).json({ error: '有効なYouTube URLからビデオIDを抽出できませんでした' });
      }
    }
    
    if (!videoId) {
      return res.status(400).json({ error: 'YouTube動画IDは必須です' });
    }
    
    // 秒数を整数に変換
    const startSecInt = parseInt(startSec, 10);
    const endSecInt = parseInt(endSec, 10);
    const maxConcurrencyInt = parseInt(maxConcurrency, 10) || 5;
    
    if (isNaN(startSecInt) || isNaN(endSecInt) || startSecInt < 0 || endSecInt <= startSecInt) {
      return res.status(400).json({ 
        error: '有効な秒数範囲を指定してください（startSecは0以上、endSecはstartSecより大きい値）' 
      });
    }
    
    // 秒数の配列を作成
    const secondsToCapture = Array.from(
      { length: endSecInt - startSecInt + 1 }, 
      (_, i) => startSecInt + i
    );
    
    const url = `https://www.youtube.com/shorts/${videoId}`;
    console.log(`バッチキャプチャ開始: ${url}, ${startSecInt}秒から${endSecInt}秒まで`);
    
    // バッチIDを生成
    const batchId = `shorts_${videoId}_${Date.now()}`;
    
    // 保存用のディレクトリ作成
    const batchDirPath = path.join(uploadsDir, batchId);
    
    if (!SKIP_LOCAL_STORAGE && !fs.existsSync(batchDirPath)) {
      fs.mkdirSync(batchDirPath, { recursive: true });
    }
    
    // Firebaseにバッチメタデータを保存
    let batchRef = null;
    if (USE_FIREBASE_STORAGE) {
      try {
        const batchesRef = db.ref('batches');
        batchRef = batchesRef.child(batchId);
        
        await batchRef.set({
          video_id: videoId,
          url: url,
          start_sec: startSecInt,
          end_sec: endSecInt,
          max_concurrency: maxConcurrencyInt,
          total_frames: secondsToCapture.length,
          status: 'processing',
          created_at: new Date().toISOString(),
          ip_address: req.ip || req.headers['x-forwarded-for'] || 'unknown'
        });
        
        console.log(`バッチメタデータを保存しました: ${batchId}`);
      } catch (error) {
        console.error('Firebaseデータベースへの保存に失敗しました:', error);
        // エラーでも処理は続行
      }
    }
    
    // 並列処理を制限してキャプチャ
    const captureResults = [];
    const processedTimestamps = new Set(); // 重複検出用
    
    // チャンクに分割して処理
    for (let i = 0; i < secondsToCapture.length; i += maxConcurrencyInt) {
      const chunk = secondsToCapture.slice(i, i + maxConcurrencyInt);
      console.log(`バッチ処理中: ${i} から ${i + chunk.length - 1} / ${secondsToCapture.length - 1}`);
      
      const promises = chunk.map(second => captureYouTubeFrame(videoId, second, batchDirPath, processedTimestamps));
      const results = await Promise.all(promises);
      
      captureResults.push(...results);
    }
    
    console.log(`バッチキャプチャ完了: ${captureResults.length}枚のスクリーンショットを取得`);
    
    // バッチ処理の統計
    const validResults = captureResults.filter(result => result.success);
    const errorResults = captureResults.filter(result => !result.success);
    const hasDuplicates = captureResults.length !== processedTimestamps.size;
    
    // Firebase上のバッチ情報を更新
    if (USE_FIREBASE_STORAGE && batchRef) {
      try {
        await batchRef.update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          valid_count: validResults.length,
          error_count: errorResults.length,
          has_duplicates: hasDuplicates,
          result_summary: `${validResults.length}枚の有効な画像、${errorResults.length}枚のエラー`
        });
      } catch (error) {
        console.error('バッチ情報更新に失敗しました:', error);
      }
    }
    
    // 結果オブジェクトを構築
    const responseData = {
      batch_id: batchId,
      video_id: videoId,
      start_sec: startSecInt,
      end_sec: endSecInt,
      total_frames: captureResults.length,
      valid_count: validResults.length,
      error_count: errorResults.length,
      has_duplicates: hasDuplicates
    };
    
    // パスとURLの設定
    if (!SKIP_LOCAL_STORAGE) {
      responseData.batch_directory = `/data/uploads/${batchId}`;
    }
    
    if (USE_FIREBASE_STORAGE) {
      responseData.firebase_path = `batches/${videoId}/${batchId}`;
      responseData.database_ref = batchRef ? batchRef.toString() : null;
    }
    
    // 警告メッセージを追加
    if (hasDuplicates) {
      responseData.info = '一部のフレームで重複が検出されました。';
    }
    
    if (errorResults.length > 0) {
      responseData.info = (responseData.info || '') + `${errorResults.length}枚の画像でエラーが発生しました。`;
    }
    
    // スクリーンショット結果の配列を追加
    responseData.screenshots = captureResults;
    
    // 結果をレスポンスとして返す
    return res.json({
      status: 'success',
      data: responseData
    });
    
  } catch (error) {
    console.error('バッチキャプチャエラー:', error);
    res.status(500).json({ error: 'バッチキャプチャに失敗しました' });
  }
});

// YouTube Shorts 1フレームキャプチャ関数
async function captureYouTubeFrame(videoId, second, batchDirPath, processedTimestamps) {
  try {
    console.log(`${second}秒のフレームをキャプチャしています...`);
    
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      defaultViewport: { width: 540, height: 960 }
    });
    
    const page = await browser.newPage();
    
    // Shortsページに移動（クエリパラメータなしのシンプルなURL）
    const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;
    
    try {
      await page.goto(shortsUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
    } catch (navigationError) {
      console.error(`ページ移動エラー: ${navigationError.message}`);
      await browser.close();
      return { 
        timestamp: second, 
        error: `ページ移動に失敗しました: ${navigationError.message}`, 
        success: false 
      };
    }
    
    // 動画がロードされるのを待つ
    try {
      await page.waitForSelector('video', { timeout: 15000 });
    } catch (selectorError) {
      console.error(`動画要素が見つかりません: ${selectorError.message}`);
      await browser.close();
      return { 
        timestamp: second, 
        error: "動画要素が見つかりません", 
        success: false 
      };
    }
    
    // 動画を指定の秒数にシーク
    const seekResult = await page.evaluate((targetSecond) => {
      try {
        const video = document.querySelector('video');
        if (video) {
          video.currentTime = targetSecond;
          if (!video.paused) video.pause();
          return { success: true };
        }
        return { success: false, error: "動画要素が見つかりません" };
      } catch (evalError) {
        return { success: false, error: evalError.message };
      }
    }, second);
    
    if (!seekResult.success) {
      await browser.close();
      return { 
        timestamp: second, 
        error: seekResult.error || "動画のシークに失敗しました", 
        success: false 
      };
    }
    
    // フレームが更新されるのを待つ
    await page.waitForTimeout(1000);
    
    // スクリーンショットを撮影
    const fileName = `${second}s.jpg`;
    const filePath = path.join(batchDirPath, fileName);
    
    let screenshotBuffer;
    try {
      // スクリーンショットをバッファとして取得
      screenshotBuffer = await page.screenshot({ 
        type: 'jpeg',
        quality: 90
      });
    } catch (screenshotError) {
      console.error(`スクリーンショット取得エラー: ${screenshotError.message}`);
      await browser.close();
      return { 
        timestamp: second, 
        error: `スクリーンショット取得に失敗しました: ${screenshotError.message}`, 
        success: false 
      };
    }
    
    await browser.close();
    
    // スクリーンショットを保存（ローカルおよび/またはFirebase）
    const batchFolder = path.basename(batchDirPath);
    const storageResult = await saveScreenshot(screenshotBuffer, filePath, {
      folderPath: `batches/${videoId}/${batchFolder}`,
      filename: fileName
    });
    
    console.log(`${second}秒のスクリーンショット取得完了: ${storageResult.localPath || storageResult.firebasePath}`);
    
    // 重複検出用にタイムスタンプを記録
    processedTimestamps.add(second);
    
    // 結果をFirebaseデータベースに保存（オプション）
    if (USE_FIREBASE_STORAGE) {
      try {
        const batchItemsRef = db.ref(`batch_items/${videoId}/${batchFolder}`);
        await batchItemsRef.child(String(second)).set({
          timestamp: second,
          storage_path: storageResult.firebasePath,
          public_url: storageResult.publicUrl,
          local_path: storageResult.localPath,
          created_at: new Date().toISOString()
        });
      } catch (dbError) {
        console.error(`データベース保存エラー: ${dbError.message}`);
        // エラーでも処理は続行
      }
    }
    
    // 結果を返す
    const result = { 
      timestamp: second, 
      success: true
    };
    
    // パスとURLを設定
    if (storageResult.publicUrl) {
      result.image_url = storageResult.publicUrl;
      result.firebase_path = storageResult.firebasePath;
    }
    
    if (storageResult.localPath) {
      result.path = `/data/uploads/${batchFolder}/${fileName}`;
      result.local_path = storageResult.localPath;
    }
    
    return result;
    
  } catch (error) {
    console.error(`${second}秒のフレームキャプチャに失敗:`, error);
    return { 
      timestamp: second, 
      error: error.message, 
      success: false 
    };
  }
}

// ZIP一括ダウンロードエンドポイント
router.get('/download-zip/:batchDir', async (req, res) => {
  try {
    const { batchDir } = req.params;
    
    // ディレクトリパスの検証（ディレクトリトラバーサル対策）
    const sanitizedBatchDir = path.basename(batchDir);
    const dirPath = path.join(uploadsDir, sanitizedBatchDir);
    
    // ディレクトリが存在するか確認
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: '指定されたディレクトリが見つかりません' });
    }
    
    // ディレクトリ内のファイルを取得
    const files = fs.readdirSync(dirPath).filter(file => 
      file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')
    );
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'ディレクトリに画像ファイルが見つかりません' });
    }
    
    // レスポンスヘッダーを設定
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedBatchDir}.zip"`);
    
    // archiverインスタンスを作成
    const archive = archiver('zip', {
      zlib: { level: 9 } // 最高の圧縮レベル
    });
    
    // アーカイブエラーハンドリング
    archive.on('error', (err) => {
      console.error('ZIP作成エラー:', err);
      res.status(500).end();
    });
    
    // パイプでレスポンスに直接出力
    archive.pipe(res);
    
    // ファイルをZIPに追加
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      archive.append(fs.createReadStream(filePath), { name: file });
    }
    
    // 完了してレスポンスを終了
    await archive.finalize();
    
  } catch (error) {
    console.error('ZIPダウンロードエラー:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'ZIPダウンロードに失敗しました' });
    }
  }
});

export default router; 