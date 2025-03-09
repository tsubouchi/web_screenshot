// デバッグモード
const debugMode = false;

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
screenshotBtn.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  
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
    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'スクリーンショットの取得に失敗しました');
    }
    
    const data = await response.json();
    showResult(data);
    
  } catch (error) {
    hideLoading();
    showError(error.message);
  }
});

// YouTube動画のスクリーンショット取得
youtubeBtn.addEventListener('click', async () => {
  const url = youtubeUrlInput.value.trim();
  const timestamp = timestampInput.value.trim();
  
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
    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, timestamp })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'スクリーンショットの取得に失敗しました');
    }
    
    const data = await response.json();
    showResult(data);
    
  } catch (error) {
    hideLoading();
    showError(error.message);
  }
});

// YouTube Shortsのスクリーンショット取得
shortsBtn.addEventListener('click', async () => {
  const url = shortsUrlInput.value.trim();
  const timestamp = shortsTimestampInput.value.trim();
  
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
    const response = await fetch('/api/screenshot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url, timestamp })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'スクリーンショットの取得に失敗しました');
    }
    
    const data = await response.json();
    showResult(data);
    
  } catch (error) {
    hideLoading();
    showError(error.message);
  }
});

// バッチキャプチャの実行
batchBtn.addEventListener('click', async () => {
  const videoIdOrUrl = batchVideoIdInput.value.trim();
  const startSec = startSecInput.value.trim();
  const endSec = endSecInput.value.trim();
  const maxConcurrency = maxConcurrencyInput.value.trim();
  
  let videoId = videoIdOrUrl;
  
  // URLが入力された場合、ビデオIDを抽出
  if (videoIdOrUrl.includes('youtube.com') || videoIdOrUrl.includes('youtu.be')) {
    if (isShortsUrl(videoIdOrUrl)) {
      videoId = extractShortsVideoId(videoIdOrUrl);
    } else if (isYoutubeUrl(videoIdOrUrl)) {
      videoId = extractYoutubeVideoId(videoIdOrUrl);
    }
    
    if (!videoId) {
      showError('入力されたURLから有効なYouTube動画IDを抽出できませんでした');
      return;
    }
  }
  
  if (!videoId) {
    showError('YouTube Shorts IDまたはURLを入力してください');
    return;
  }
  
  if (isNaN(startSec) || isNaN(endSec) || parseInt(startSec) < 0 || parseInt(endSec) <= parseInt(startSec)) {
    showError('有効な秒数範囲を指定してください（開始は0以上、終了は開始より大きい値）');
    return;
  }
  
  if (parseInt(endSec) - parseInt(startSec) > 60) {
    showError('連続キャプチャは最大60秒範囲に制限されています');
    return;
  }
  
  showLoading(`YouTube Shortsの連続キャプチャを実行中... (${startSec}秒から${endSec}秒まで)`);
  
  try {
    const response = await fetch('/api/screenshot/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        videoId, 
        startSec: parseInt(startSec), 
        endSec: parseInt(endSec),
        maxConcurrency: parseInt(maxConcurrency) || 5
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'バッチキャプチャに失敗しました');
    }
    
    const data = await response.json();
    showBatchResult(data);
    
  } catch (error) {
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
    const zipUrl = `/api/screenshot/download-zip/${batchDirName}`;
    
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