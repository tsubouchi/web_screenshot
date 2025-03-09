// デバッグモード
const debugMode = false;

// API設定
const API_BASE_URL = 'https://web-screenshot-1015153191846.asia-northeast1.run.app';

// DOM要素の取得
const tabButtons = document.querySelectorAll('.tab-btn');
const tabContents = document.querySelectorAll('.tab-content');

// ウェブサイトフォーム
const websiteForm = document.querySelector('#website-tab');
const urlInput = document.querySelector('#url');
const screenshotBtn = document.querySelector('#screenshot-btn');

// YouTube動画フォーム
const youtubeForm = document.querySelector('#youtube-tab');
const youtubeUrlInput = document.querySelector('#youtube-url');
const timestampInput = document.querySelector('#timestamp');
const youtubeBtn = document.querySelector('#youtube-btn');

// YouTube Shortsフォーム
const shortsForm = document.querySelector('#shorts-tab');
const shortsUrlInput = document.querySelector('#shorts-url');
const shortsTimestampInput = document.querySelector('#shorts-timestamp');
const shortsBtn = document.querySelector('#shorts-btn');

// バッチキャプチャフォーム
const batchForm = document.querySelector('#batch-tab');
const batchVideoIdInput = document.querySelector('#batch-video-id');
const startSecInput = document.querySelector('#start-sec');
const endSecInput = document.querySelector('#end-sec');
const maxConcurrencyInput = document.querySelector('#max-concurrency');
const batchBtn = document.querySelector('#batch-btn');

// 結果表示
const loadingElement = document.querySelector('#loading');
const loadingText = document.querySelector('#loading-text');
const resultContainer = document.querySelector('#result-container');
const singleResult = document.querySelector('#single-result');
const batchResult = document.querySelector('#batch-result');

// 単一スクリーンショット結果
const screenshotUrl = document.querySelector('#screenshot-url');
const screenshotTime = document.querySelector('#screenshot-time');
const screenshotImg = document.querySelector('#screenshot-img');
const downloadBtn = document.querySelector('#download-btn');

// バッチスクリーンショット結果
const batchVideoInfo = document.querySelector('#batch-video-info');
const batchCountInfo = document.querySelector('#batch-count-info');
const batchWarning = document.querySelector('#batch-warning');
const screenshotsGrid = document.querySelector('#screenshots-grid');
const downloadAllBtn = document.querySelector('#download-all-btn');

// 現在のバッチディレクトリ（ZIP一括ダウンロード用）
let currentBatchDirectory = null;

// タブ切り替え
tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    // 現在アクティブなタブを非アクティブにする
    tabButtons.forEach(btn => btn.classList.remove('active'));
    tabContents.forEach(content => content.classList.remove('active'));
    
    // クリックされたタブをアクティブにする
    button.classList.add('active');
    const tabName = button.getAttribute('data-tab');
    document.querySelector(`#${tabName}-tab`).classList.add('active');
  });
});

function isValidUrl(url) {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

function isYoutubeUrl(url) {
  return url.includes('youtube.com/watch') || url.includes('youtu.be/');
}

function isShortsUrl(url) {
  return url.includes('youtube.com/shorts');
}

// URLからYouTubeビデオIDを抽出するヘルパー関数
function extractYoutubeVideoId(url) {
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
  return (match && match[7]?.length === 11) ? match[7] : null;
}

// YouTube Shorts URLからビデオIDを抽出するヘルパー関数
function extractShortsVideoId(url) {
  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  return (shortsMatch && shortsMatch[1]) ? shortsMatch[1] : null;
}

function getFilenameFromPath(path) {
  return path.split('/').pop();
}

// ウェブサイトのスクリーンショット取得
screenshotBtn.addEventListener('click', async (event) => {
  // デフォルトのフォーム送信動作を防止
  event.preventDefault();
  console.log('スクリーンショット取得ボタンがクリックされました');
  
  const url = urlInput.value.trim();
  console.log('入力URL:', url);
  
  if (!url) {
    showError('URLを入力してください');
    return;
  }
  
  if (!isValidUrl(url)) {
    showError('有効なURLを入力してください');
    return;
  }
  
  showLoading('スクリーンショットを取得中...');
  
  try {
    // リクエスト先のURLをログに出力
    const requestUrl = `${API_BASE_URL}/api/screenshot`;
    console.log('APIリクエスト先:', requestUrl);
    console.log('リクエストボディ:', { url });
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify({ url })
    });
    
    console.log('APIレスポンスステータス:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'スクリーンショットの取得に失敗しました';
      try {
        // レスポンスの内容をログに出力（デバッグ用）
        const responseText = await response.text();
        console.error('エラーレスポンス本文:', responseText);
        
        // JSONとしてパース可能か試みる
        try {
          const errorData = JSON.parse(responseText);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('JSONパースエラー:', parseError);
          // HTMLが返ってきているかどうかをチェック
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
            errorMessage = 'サーバーがHTMLを返しました。APIエンドポイントの設定を確認してください。';
          } else {
            errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
          }
        }
      } catch (textError) {
        console.error('レスポンステキスト取得エラー:', textError);
        errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    // 正常なレスポンスの場合はJSONとしてパース
    const data = await response.json();
    console.log('APIレスポンスデータ:', data);
    showResult(data);
    
  } catch (error) {
    console.error('APIリクエストエラー:', error);
    hideLoading();
    showError(error.message);
  }
});

// YouTube動画のスクリーンショット取得
youtubeBtn.addEventListener('click', async (event) => {
  // デフォルトのフォーム送信動作を防止
  event.preventDefault();
  console.log('YouTube動画スクリーンショット取得ボタンがクリックされました');
  
  const url = youtubeUrlInput.value.trim();
  const timestamp = timestampInput.value.trim();
  console.log('YouTube URL:', url, 'タイムスタンプ:', timestamp);
  
  if (!url) {
    showError('YouTube URLを入力してください');
    return;
  }
  
  if (!isYoutubeUrl(url)) {
    showError('有効なYouTube URLを入力してください');
    return;
  }
  
  showLoading('YouTube動画のスクリーンショットを取得中...');
  
  try {
    // リクエスト先のURLをログに出力
    const requestUrl = `${API_BASE_URL}/api/screenshot`;
    console.log('APIリクエスト先:', requestUrl);
    console.log('リクエストボディ:', { url, timestamp });
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify({ url, timestamp })
    });
    
    console.log('APIレスポンスステータス:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'スクリーンショットの取得に失敗しました';
      try {
        // レスポンスの内容をログに出力（デバッグ用）
        const responseText = await response.text();
        console.error('エラーレスポンス本文:', responseText);
        
        // JSONとしてパース可能か試みる
        try {
          const errorData = JSON.parse(responseText);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('JSONパースエラー:', parseError);
          // HTMLが返ってきているかどうかをチェック
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
            errorMessage = 'サーバーがHTMLを返しました。APIエンドポイントの設定を確認してください。';
          } else {
            errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
          }
        }
      } catch (textError) {
        console.error('レスポンステキスト取得エラー:', textError);
        errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    // 正常なレスポンスの場合はJSONとしてパース
    const data = await response.json();
    console.log('APIレスポンスデータ:', data);
    showResult(data);
    
  } catch (error) {
    console.error('APIリクエストエラー:', error);
    hideLoading();
    showError(error.message);
  }
});

// YouTube Shortsのスクリーンショット取得
shortsBtn.addEventListener('click', async (event) => {
  // デフォルトのフォーム送信動作を防止
  event.preventDefault();
  console.log('YouTube Shortsスクリーンショット取得ボタンがクリックされました');
  
  const url = shortsUrlInput.value.trim();
  const timestamp = shortsTimestampInput.value.trim();
  console.log('Shorts URL:', url, 'タイムスタンプ:', timestamp);
  
  if (!url) {
    showError('YouTube Shorts URLを入力してください');
    return;
  }
  
  if (!isShortsUrl(url)) {
    showError('有効なYouTube Shorts URLを入力してください');
    return;
  }
  
  showLoading('YouTube Shortsのスクリーンショットを取得中...');
  
  try {
    // リクエスト先のURLをログに出力
    const requestUrl = `${API_BASE_URL}/api/screenshot`;
    console.log('APIリクエスト先:', requestUrl);
    console.log('リクエストボディ:', { url, timestamp });
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify({ url, timestamp })
    });
    
    console.log('APIレスポンスステータス:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'スクリーンショットの取得に失敗しました';
      try {
        // レスポンスの内容をログに出力（デバッグ用）
        const responseText = await response.text();
        console.error('エラーレスポンス本文:', responseText);
        
        // JSONとしてパース可能か試みる
        try {
          const errorData = JSON.parse(responseText);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('JSONパースエラー:', parseError);
          // HTMLが返ってきているかどうかをチェック
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
            errorMessage = 'サーバーがHTMLを返しました。APIエンドポイントの設定を確認してください。';
          } else {
            errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
          }
        }
      } catch (textError) {
        console.error('レスポンステキスト取得エラー:', textError);
        errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    // 正常なレスポンスの場合はJSONとしてパース
    const data = await response.json();
    console.log('APIレスポンスデータ:', data);
    showResult(data);
    
  } catch (error) {
    console.error('APIリクエストエラー:', error);
    hideLoading();
    showError(error.message);
  }
});

// バッチキャプチャの実行
batchBtn.addEventListener('click', async (event) => {
  // デフォルトのフォーム送信動作を防止
  event.preventDefault();
  console.log('バッチキャプチャ実行ボタンがクリックされました');
  
  const videoId = batchVideoIdInput.value.trim();
  const startSec = parseInt(startSecInput.value.trim() || '0');
  const endSec = parseInt(endSecInput.value.trim() || '5');
  const maxConcurrency = parseInt(maxConcurrencyInput.value.trim() || '5');
  
  console.log('バッチキャプチャパラメータ:', { videoId, startSec, endSec, maxConcurrency });
  
  if (!videoId) {
    showError('YouTube Shorts IDまたはURLを入力してください');
    return;
  }
  
  if (isNaN(startSec) || isNaN(endSec) || startSec < 0 || endSec <= startSec) {
    showError('有効な秒数範囲を指定してください');
    return;
  }
  
  if (endSec - startSec > 60) {
    showError('秒数範囲は最大60秒までです');
    return;
  }
  
  showLoading('バッチキャプチャ実行中...');
  
  try {
    // ビデオIDの抽出（URLが入力された場合）
    let finalVideoId = videoId;
    if (videoId.includes('youtube.com')) {
      // URL形式をチェック
      if (isShortsUrl(videoId)) {
        finalVideoId = extractShortsVideoId(videoId);
      } else if (isYoutubeUrl(videoId)) {
        finalVideoId = extractYoutubeVideoId(videoId);
      }
      
      if (!finalVideoId) {
        throw new Error('無効なYouTube URLです');
      }
    }
    
    // リクエスト先のURLをログに出力
    const requestUrl = `${API_BASE_URL}/api/screenshot/batch`;
    console.log('バッチAPIリクエスト先:', requestUrl);
    console.log('リクエストボディ:', { videoId: finalVideoId, startSec, endSec, maxConcurrency });
    
    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': window.location.origin
      },
      body: JSON.stringify({ 
        videoId: finalVideoId,
        startSec, 
        endSec,
        maxConcurrency
      })
    });
    
    console.log('APIレスポンスステータス:', response.status);
    
    if (!response.ok) {
      let errorMessage = 'バッチキャプチャに失敗しました';
      try {
        // レスポンスの内容をログに出力（デバッグ用）
        const responseText = await response.text();
        console.error('エラーレスポンス本文:', responseText);
        
        // JSONとしてパース可能か試みる
        try {
          const errorData = JSON.parse(responseText);
          if (errorData && errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (parseError) {
          console.error('JSONパースエラー:', parseError);
          // HTMLが返ってきているかどうかをチェック
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html>')) {
            errorMessage = 'サーバーがHTMLを返しました。APIエンドポイントの設定を確認してください。';
          } else {
            errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
          }
        }
      } catch (textError) {
        console.error('レスポンステキスト取得エラー:', textError);
        errorMessage = `サーバーエラー: ${response.status} ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    // 正常なレスポンスの場合はJSONとしてパース
    const data = await response.json();
    console.log('バッチAPIレスポンスデータ:', data);
    showBatchResult(data);
    
  } catch (error) {
    console.error('バッチAPIリクエストエラー:', error);
    hideLoading();
    showError(error.message);
  }
});

// ZIP一括ダウンロード
downloadAllBtn.addEventListener('click', async () => {
  if (!currentBatchDirectory) {
    showError('ダウンロード可能なディレクトリがありません');
    return;
  }
  
  try {
    // バッチディレクトリ名を取得（パスから抽出）
    const batchDirName = currentBatchDirectory.split('/data/uploads/')[1] || currentBatchDirectory;
    const zipUrl = `${API_BASE_URL}/api/screenshot/download-zip/${batchDirName}`;
    
    window.open(zipUrl, '_blank');
  } catch (error) {
    showError('ZIP形式でのダウンロードに失敗しました');
  }
});

// ヘルパー関数
function showLoading(message) {
  loadingText.textContent = message || 'スクリーンショットを取得中...';
  loadingElement.classList.remove('hidden');
  resultContainer.classList.add('hidden');
}

function hideLoading() {
  loadingElement.classList.add('hidden');
}

function showResult(data) {
  hideLoading();
  resultContainer.classList.remove('hidden');
  
  // レスポンス形式の確認
  const responseData = data.status === 'success' && data.data ? data.data : data;
  
  // バッチ処理かどうかを判定
  if (responseData.batch_directory) {
    return showBatchResult(data);
  }
  
  // 単一スクリーンショット表示
  singleResult.classList.remove('hidden');
  batchResult.classList.add('hidden');
  
  // URLの表示
  screenshotUrl.textContent = `URL: ${responseData.url || '不明'}`;
  
  // タイムスタンプ表示（存在する場合）
  if (responseData.timestamp !== null && responseData.timestamp !== undefined) {
    screenshotTime.textContent = `タイムスタンプ: ${responseData.timestamp}秒`;
    screenshotTime.classList.remove('hidden');
  } else {
    screenshotTime.classList.add('hidden');
  }
  
  // 画像URLの取得
  const imageUrl = getImageUrl(responseData);
  
  if (imageUrl) {
    // 画像表示
    screenshotImg.src = imageUrl;
    screenshotImg.alt = `${responseData.url || ''}のスクリーンショット`;
    
    // 古いイベントリスナーを削除 (重複防止)
    if (downloadBtn.oldClickListener) {
      downloadBtn.removeEventListener('click', downloadBtn.oldClickListener);
      downloadBtn.oldClickListener = null;
    }
    
    // 画像の種類に基づいてダウンロードボタンのテキストを変更
    const isFirebaseUrl = imageUrl.includes('firebasestorage') || imageUrl.includes('storage.googleapis.com');
    if (isFirebaseUrl) {
      // Firebase画像用のダウンロードボタン設定
      downloadBtn.textContent = 'Firebase画像をダウンロード';
      downloadBtn.classList.add('firebase-download');
      
      // クリックイベントを設定
      const clickHandler = function(event) {
        event.preventDefault();
        event.stopPropagation();
        const filename = getFilenameFromPath(imageUrl);
        downloadFirebaseImage(imageUrl, filename, event.target);
        return false;
      };
      
      // イベントリスナーを保存 (後で削除できるように)
      downloadBtn.oldClickListener = clickHandler;
      
      // イベントリスナーを設定
      downloadBtn.addEventListener('click', clickHandler);
      
      // href属性は残しておく（JSが無効な場合のフォールバック）
      downloadBtn.href = imageUrl;
      downloadBtn.download = getFilenameFromPath(imageUrl);
      
    } else {
      // 通常の画像ダウンロード設定
      downloadBtn.textContent = 'ダウンロード';
      downloadBtn.classList.remove('firebase-download');
      downloadBtn.href = imageUrl;
      downloadBtn.download = getFilenameFromPath(imageUrl);
    }
    
    downloadBtn.style.display = 'inline-block';
    
    // ログ出力（デバッグ用）
    console.log('表示画像URL:', imageUrl);
    console.log('レスポンスデータ:', responseData);
  } else {
    console.error('画像URLが見つかりません:', responseData);
    showError('画像URLが見つかりません');
  }
}

function showBatchResult(data) {
  hideLoading();
  resultContainer.classList.remove('hidden');
  
  // レスポンス形式の確認
  const responseData = data.status === 'success' && data.data ? data.data : data;
  
  singleResult.classList.add('hidden');
  batchResult.classList.remove('hidden');
  
  const videoId = responseData.video_id;
  currentBatchDirectory = responseData.batch_directory;
  
  // ビデオ情報
  batchVideoInfo.textContent = `YouTube Shorts ID: ${videoId}`;
  
  // カウント情報
  const totalCount = responseData.screenshot_count || 0;
  const validCount = responseData.valid_count || 0;
  const duplicateCount = responseData.duplicate_count || 0;
  
  batchCountInfo.textContent = `合計: ${totalCount}フレーム（有効: ${validCount}、重複: ${duplicateCount}）`;
  
  // 警告表示（重複がある場合）
  if (responseData.has_duplicates && responseData.info) {
    batchWarning.textContent = responseData.info;
    batchWarning.classList.remove('hidden');
  } else {
    batchWarning.classList.add('hidden');
  }
  
  // スクリーンショットグリッドをクリア
  screenshotsGrid.innerHTML = '';
  
  // スクリーンショットを表示
  if (responseData.screenshots && responseData.screenshots.length > 0) {
    responseData.screenshots.forEach(screenshot => {
      const item = document.createElement('div');
      item.className = 'screenshot-item';
      
      if (!screenshot.success) {
        item.classList.add('error');
        item.innerHTML = `
          <div class="error-message">${screenshot.error || 'エラー'}</div>
          <div class="screenshot-details">
            <p>${screenshot.timestamp}秒</p>
          </div>
        `;
      } else {
        const imagePath = getImageUrl(screenshot);
        const isFirebaseUrl = imagePath.includes('firebasestorage') || imagePath.includes('storage.googleapis.com');
        const downloadClass = isFirebaseUrl ? 'firebase-download' : 'download-link';
        const downloadText = isFirebaseUrl ? 'Firebase画像をダウンロード' : 'ダウンロード';
        const filename = `${screenshot.timestamp}s.jpg`;
        
        item.innerHTML = `
          <img src="${imagePath}" alt="${screenshot.timestamp}秒のスクリーンショット">
          <div class="screenshot-details">
            <p>${screenshot.timestamp}秒</p>
            <a href="${imagePath}" class="${downloadClass}" download="${filename}">${downloadText}</a>
          </div>
        `;
        
        // ダウンロードリンクにイベントを追加（DOMが構築された後に設定）
        setTimeout(() => {
          const downloadLink = item.querySelector(`.${downloadClass}`);
          if (downloadLink && isFirebaseUrl) {
            // 古いイベントリスナーがあれば削除
            if (downloadLink.oldClickListener) {
              downloadLink.removeEventListener('click', downloadLink.oldClickListener);
            }
            
            // 新しいイベントリスナーを作成
            const clickHandler = function(event) {
              event.preventDefault();
              event.stopPropagation(); // イベントの伝播を停止
              downloadFirebaseImage(imagePath, filename, event.target);
              return false;
            };
            
            // イベントリスナーを保存して設定
            downloadLink.oldClickListener = clickHandler;
            downloadLink.addEventListener('click', clickHandler);
          }
        }, 0);
      }
      
      screenshotsGrid.appendChild(item);
    });
  } else {
    screenshotsGrid.innerHTML = '<p>スクリーンショットがありません</p>';
  }
}

function showError(message) {
  alert(message);
}

// 画像URLを正規化するヘルパー関数
function getImageUrl(data) {
  // 複数のフィールド名をチェック
  let imageUrl = data.image_url || data.screenshot_url || data.path || data.filepath || data.publicUrl;
  
  if (imageUrl) {
    // 絶対URLの場合（https://で始まる場合）はそのまま使用
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // URLが/で始まっていない場合は/data/uploadsプレフィックスを追加
    if (!imageUrl.startsWith('/')) {
      imageUrl = '/data/uploads/' + imageUrl;
    } else if (imageUrl.includes('//data/uploads/')) {
      // 重複した/data/uploads/を修正
      imageUrl = imageUrl.replace('//data/uploads/', '/data/uploads/');
    }
  }
  
  return imageUrl;
}

// Firebase画像を直接ダウンロードする関数
async function downloadFirebaseImage(url, filename, targetElement = null) {
  try {
    if (debugMode) console.log('ダウンロード開始:', url, filename, targetElement);
    
    // ロード中表示
    let loadingText = null;
    
    if (targetElement) {
      loadingText = document.createElement('span');
      loadingText.className = 'download-loading';
      loadingText.textContent = 'ダウンロード中...';
      targetElement.appendChild(loadingText);
    }
    
    // 画像をフェッチ
    const response = await fetch(url);
    if (!response.ok) throw new Error('画像の取得に失敗しました');
    
    // Blobとして取得
    const blob = await response.blob();
    
    // ダウンロード用のリンクを作成
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = downloadUrl;
    a.download = filename || 'screenshot.jpg';
    document.body.appendChild(a);
    
    // ダウンロード実行
    a.click();
    
    // クリーンアップ
    window.URL.revokeObjectURL(downloadUrl);
    document.body.removeChild(a);
    
    // ロード表示を削除
    if (loadingText && targetElement) {
      targetElement.removeChild(loadingText);
    }
    
    if (debugMode) console.log('ダウンロード完了:', filename);
    return true;
  } catch (error) {
    console.error('ダウンロードエラー:', error);
    showError(`ダウンロードに失敗しました: ${error.message}`);
    return false;
  }
}