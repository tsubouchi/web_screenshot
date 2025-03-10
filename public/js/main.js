// 設定情報の初期値
let config = {
  API_BASE_URL: '',  // 初期値は空に設定し、loadConfig()で確実に設定される
  NODE_ENV: 'production',
  features: {
    enableYouTube: true,
    enableShorts: true,
    enableBatchProcessing: true
  }
};

// 重要: 強制的な設定上書き (必ず有効にする)
const FORCE_CLOUD_RUN_URL = true;
const LATEST_CLOUD_RUN_URL = 'https://web-screenshot-414448831707.asia-northeast1.run.app';
const OLD_CLOUD_RUN_URL = 'https://web-screenshot-1015153191846.asia-northeast1.run.app';

// 初期設定をログ出力
console.log('初期起動設定:', {
  初期API_BASE_URL: config.API_BASE_URL,
  強制URL設定: FORCE_CLOUD_RUN_URL,
  最新URL: LATEST_CLOUD_RUN_URL,
  ホスト名: window.location.hostname,
  パス: window.location.pathname
});

/**
 * 初期APIベースURLを決定する関数
 * ホスト名に基づいて適切なURLを判定し、ハードコーディングを最小限に抑える
 */
function determineInitialApiBaseUrl() {
  const hostname = window.location.hostname;
  console.log('ホスト名検出:', hostname);
  
  // 強制上書きが有効なら、常に最新URLを使用
  if (FORCE_CLOUD_RUN_URL) {
    console.log('⚠️ 強制URLモードが有効です - 最新のCloud Run URLを使用します');
    return LATEST_CLOUD_RUN_URL;
  }
  
  // ローカル開発環境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('ローカル環境を検出しました');
    return 'http://localhost:3000';
  }
  
  // Firebase Hosting環境（リクエスト転送を利用）
  if (hostname.includes('web-screenshot-demo-c3d64') || 
      hostname.includes('web.app') || 
      hostname.includes('firebaseapp.com')) {
    console.log('Firebase Hosting環境を検出しました - 相対パスを使用');
    // 相対パスを使用して現在のホストからAPIにアクセス
    return '';
  }
  
  // その他の環境（デフォルトのCloud Run URL）
  console.log('その他の環境 - Cloud Run URLを使用');
  return LATEST_CLOUD_RUN_URL;
}

// 設定を読み込む関数
async function loadConfig() {
  try {
    // 初期APIベースURLを設定
    if (config.API_BASE_URL === '') {
      config.API_BASE_URL = determineInitialApiBaseUrl();
    }
    
    // 強制URL設定が有効な場合は最新URLを使用
    if (FORCE_CLOUD_RUN_URL) {
      config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
      console.log('⚠️ 強制的にAPI URLを設定しました:', config.API_BASE_URL);
      return true;
    }

    // 以下は通常のフローで使用（強制設定がOFFの場合のみ実行）
    const apiUrl = config.API_BASE_URL || '';
    const configUrl = `${apiUrl}/api/config`;
    console.log('設定取得URL:', configUrl);
    
    let response;
    try {
      response = await fetch(configUrl, { 
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
        timeout: 5000 
      });
    } catch (fetchError) {
      console.warn('設定取得中にネットワークエラーが発生しました:', fetchError);
      
      // 相対パスでのリクエストが失敗した場合は、直接Cloud Run URLを試す
      if (!config.API_BASE_URL || config.API_BASE_URL === '') {
        console.log('直接Cloud Run URLへのフォールバックを試みます...');
        const directCloudRunUrl = LATEST_CLOUD_RUN_URL;
        const fallbackConfigUrl = `${directCloudRunUrl}/api/config`;
        
        try {
          response = await fetch(fallbackConfigUrl, { 
            method: 'GET',
            mode: 'cors',
            cache: 'no-cache' 
          });
          if (response.ok) {
            // 成功した場合はAPIベースURLを更新
            config.API_BASE_URL = directCloudRunUrl;
            console.log('フォールバックAPI URLに更新しました:', directCloudRunUrl);
          }
        } catch (fallbackError) {
          console.error('フォールバックの試行も失敗しました:', fallbackError);
          // エラー時でもURLを設定
          config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
          console.log('⚠️ エラー時にAPI URLを強制設定:', config.API_BASE_URL);
          return true;
        }
      } else {
        // エラー時でもURLを設定
        config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
        console.log('⚠️ エラー時にAPI URLを強制設定:', config.API_BASE_URL);
        return true;
      }
    }
    
    if (!response || !response.ok) {
      console.warn('設定の読み込みに失敗しました:', response ? response.status : 'レスポンスなし');
      // フォールバック: 直接Cloud Run URLを設定
      config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
      console.log('⚠️ レスポンスエラー時にURLを設定:', config.API_BASE_URL);
      return true;
    }
    
    // 正常なレスポンスの処理
    const configData = await response.json();
    console.log('サーバーから取得した設定:', configData);
    
    // 元の設定に上書き
    config = { ...config, ...configData };
    console.log('最終的な設定:', config);
    
    // 常に最新URLを確認・上書き
    checkAndUpdateApiUrl();
    
    return true;
  } catch (error) {
    console.error('設定の読み込み中にエラーが発生しました:', error);
    // エラー時も最新のURLを設定
    config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
    console.log('⚠️ エラー時に最新URLを設定:', config.API_BASE_URL);
    return true;
  }
}

// API URLを確認し、必要に応じて更新する関数
function checkAndUpdateApiUrl() {
  // 古いURLが含まれている場合は強制的に最新に更新
  if (config.API_BASE_URL.includes('web-screenshot-1015153191846')) {
    console.warn('⚠️ 古いCloud Run URLが検出されました。最新のURLに更新します。');
    config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
  }
  
  // 空の場合も最新URLに設定
  if (!config.API_BASE_URL || config.API_BASE_URL === '') {
    console.warn('⚠️ 空のAPI URLが検出されました。最新のURLに更新します。');
    config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
  }
  
  console.log('最終API URL確認:', config.API_BASE_URL);
}

// 初期化処理
document.addEventListener('DOMContentLoaded', async function() {
  console.log('アプリケーション初期化を開始します');
  
  // 設定の読み込み
  try {
    await loadConfig();
    console.log('設定の読み込みが完了しました - API URL:', config.API_BASE_URL);
  } catch (error) {
    console.error('設定読み込みエラー:', error);
    // エラー時も続行するために最新URLを設定
    config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
  }
  
  // 重要: URLを再確認
  checkAndUpdateApiUrl();
  
  // タブ切り替え機能をセットアップ
  setupTabs();
  
  // ウェブサイトスクリーンショットボタン
  const screenshotBtn = document.getElementById('screenshot-btn');
  if (screenshotBtn) {
    screenshotBtn.addEventListener('click', async function() {
      // ボタンがクリックされたことをログ
      console.log('スクリーンショット取得ボタンがクリックされました');
      
      const urlInput = document.getElementById('url');
      if (!urlInput) {
        showError('URL入力フィールドが見つかりません');
        return;
      }
      
      const url = urlInput.value.trim();
      if (!url) {
        showError('URLを入力してください');
        return;
      }
      
      // 入力URLをログ
      console.log('入力URL:', url);
      
      // 最新のAPI URLを確認
      checkAndUpdateApiUrl();
      console.log('APIリクエスト先:', config.API_BASE_URL);
      
      try {
        await takeScreenshot(url);
      } catch (error) {
        console.error('スクリーンショット取得エラー:', error);
        showError(`エラー: ${error.message || 'スクリーンショット取得に失敗しました'}`);
      }
    });
  } else {
    console.warn('ウェブサイト取得ボタンが見つかりません');
  }
  
  // YouTube動画スクリーンショットボタン
  const youtubeBtn = document.getElementById('youtube-btn');
  if (youtubeBtn) {
    youtubeBtn.addEventListener('click', async function() {
      const youtubeUrlInput = document.getElementById('youtube-url');
      const timestampInput = document.getElementById('timestamp');
      
      if (!youtubeUrlInput) {
        showError('YouTube URL入力フィールドが見つかりません');
        return;
      }
      
      const youtubeUrl = youtubeUrlInput.value.trim();
      const timestamp = timestampInput ? parseInt(timestampInput.value) || 0 : 0;
      
      if (!youtubeUrl) {
        showError('YouTube URLを入力してください');
        return;
      }
      
      // 最新のAPI URLを確認
      checkAndUpdateApiUrl();
      
      try {
        console.log('YouTube動画スクリーンショットリクエスト:', { youtubeUrl, timestamp });
        await takeYoutubeScreenshot(youtubeUrl, timestamp);
      } catch (error) {
        console.error('YouTube動画スクリーンショット取得エラー:', error);
        showError(`エラー: ${error.message || 'YouTube動画のスクリーンショット取得に失敗しました'}`);
      }
    });
  } else {
    console.warn('YouTube動画取得ボタンが見つかりません');
  }
  
  // YouTube Shortsスクリーンショットボタン
  const shortsBtn = document.getElementById('shorts-btn');
  if (shortsBtn) {
    shortsBtn.addEventListener('click', async function() {
      const shortsUrlInput = document.getElementById('shorts-url');
      const shortsTimestampInput = document.getElementById('shorts-timestamp');
      
      if (!shortsUrlInput) {
        showError('YouTube Shorts URL入力フィールドが見つかりません');
        return;
      }
      
      const shortsUrl = shortsUrlInput.value.trim();
      const timestamp = shortsTimestampInput ? parseInt(shortsTimestampInput.value) || 0 : 0;
      
      if (!shortsUrl) {
        showError('YouTube Shorts URLを入力してください');
        return;
      }
      
      // 最新のAPI URLを確認
      checkAndUpdateApiUrl();
      
      try {
        console.log('YouTube Shortsスクリーンショットリクエスト:', { shortsUrl, timestamp });
        await takeShortsScreenshot(shortsUrl, timestamp);
      } catch (error) {
        console.error('YouTube Shortsスクリーンショット取得エラー:', error);
        showError(`エラー: ${error.message || 'YouTube Shortsのスクリーンショット取得に失敗しました'}`);
      }
    });
  } else {
    console.warn('YouTube Shorts取得ボタンが見つかりません');
  }
  
  // バッチ処理ボタン
  const batchBtn = document.getElementById('batch-btn');
  if (batchBtn) {
    batchBtn.addEventListener('click', async function() {
      const batchVideoIdInput = document.getElementById('batch-video-id');
      const startSecInput = document.getElementById('start-sec');
      const endSecInput = document.getElementById('end-sec');
      const maxConcurrencyInput = document.getElementById('max-concurrency');
      
      if (!batchVideoIdInput) {
        showError('動画ID入力フィールドが見つかりません');
        return;
      }
      
      const videoId = batchVideoIdInput.value.trim();
      const startSec = startSecInput ? parseInt(startSecInput.value) || 0 : 0;
      const endSec = endSecInput ? parseInt(endSecInput.value) || 60 : 60;
      const maxConcurrency = maxConcurrencyInput ? parseInt(maxConcurrencyInput.value) || 5 : 5;
      
      if (!videoId) {
        showError('YouTube Shorts IDまたはURLを入力してください');
        return;
      }
      
      // 最新のAPI URLを確認
      checkAndUpdateApiUrl();
      
      try {
        console.log('バッチ処理リクエスト:', { videoId, startSec, endSec, maxConcurrency });
        await takeBatchScreenshots(videoId, startSec, endSec, maxConcurrency);
      } catch (error) {
        console.error('バッチ処理エラー:', error);
        showError(`エラー: ${error.message || 'バッチ処理に失敗しました'}`);
      }
    });
  } else {
    console.warn('バッチ処理ボタンが見つかりません');
  }
  
  // URLパラメータからURLを取得して設定
  const urlParams = new URLSearchParams(window.location.search);
  const urlFromParam = urlParams.get('url');
  
  if (urlFromParam) {
    const urlInput = document.getElementById('url');
    if (urlInput) {
      urlInput.value = urlFromParam;
      console.log('URLパラメータからURLを設定しました:', urlFromParam);
    }
  }
  
  // アニメーションの追加
  setTimeout(() => {
    const container = document.querySelector('.container');
    if (container) {
      container.classList.add('loaded');
    }
  }, 100);
  
  // エラー表示領域の初期化
  initializeErrorContainer();
  
  console.log('アプリケーションの初期化が完了しました');
});

// エラー表示領域の初期化
function initializeErrorContainer() {
  // エラー表示エリアがなければ作成
  let errorContainer = document.getElementById('error-container');
  
  if (!errorContainer) {
    errorContainer = document.createElement('div');
    errorContainer.id = 'error-container';
    errorContainer.className = 'error-container hidden';
    
    const errorMessage = document.createElement('div');
    errorMessage.id = 'error-message';
    errorMessage.className = 'error-message';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'error-close-btn';
    closeButton.textContent = '×';
    closeButton.onclick = function() {
      errorContainer.classList.add('hidden');
    };
    
    errorContainer.appendChild(errorMessage);
    errorContainer.appendChild(closeButton);
    
    document.body.appendChild(errorContainer);
    
    // スタイルも追加
    const style = document.createElement('style');
    style.textContent = `
      .error-container {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: #f44336;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 1000;
        min-width: 300px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .error-container.hidden {
        display: none;
      }
      .error-message {
        flex-grow: 1;
        margin-right: 15px;
      }
      .error-close-btn {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }
}

// 一般的なスクリーンショット取得処理
async function takeScreenshot(url) {
  try {
    // バリデーション
    if (!url) {
      throw new Error('URLが入力されていません');
    }

    if (!isValidUrl(url)) {
      throw new Error('有効なURLを入力してください');
    }

    // UI更新
    updateUIState('loading');
    
    // 最新のAPI URLを確認
    checkAndUpdateApiUrl();
    
    // リクエスト詳細をログ
    console.log('スクリーンショットリクエスト準備:', {
      url: url,
      API_BASE_URL: config.API_BASE_URL,
      完全URL: `${config.API_BASE_URL}/api/screenshot`
    });

    // リクエストボディ
    const requestBody = { url };
    console.log('リクエストボディ:', requestBody);

    // フェッチオプション設定
    const fetchOptions = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    };
    
    // リクエストヘッダー
    console.log('リクエストヘッダー:', fetchOptions.headers);
    
    // デバッグログ
    console.log('API呼び出し開始:', `${config.API_BASE_URL}/api/screenshot`);
    
    try {
      // APIリクエスト実行
      const response = await fetch(`${config.API_BASE_URL}/api/screenshot`, fetchOptions);
      
      // レスポンスチェック
      if (!response.ok) {
        console.error('APIエラーレスポンス:', response.status, response.statusText);
        let errorText;
        try {
          // JSONエラーの場合
          const errorData = await response.json();
          errorText = errorData.error || `エラー: ${response.status} ${response.statusText}`;
        } catch (e) {
          // テキストエラーの場合
          try {
            errorText = await response.text();
            console.log('エラーレスポンステキスト:', errorText);
            // HTMLレスポンスの場合は要約
            if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
              errorText = `HTML レスポンス (${errorText.length} 文字) - API エンドポイントが正しく設定されていない可能性があります`;
            }
          } catch (textError) {
            errorText = `エラー: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorText);
      }

      // 正常なレスポンスの処理
      const data = await response.json();
      console.log('スクリーンショット API レスポンス:', data);
      
      if (!data.publicUrl) {
        throw new Error('スクリーンショットの URL が見つかりません');
      }
      
      // 結果を表示
      showScreenshot(data.publicUrl, url);
      updateUIState('success');
      saveToHistory(url, data.publicUrl);
      
      return data;
    } catch (fetchError) {
      console.error('APIリクエストエラー:', fetchError);
      
      // CORSエラーの場合は特別なメッセージ
      if (fetchError.message.includes('NetworkError') || 
          fetchError.message.includes('Failed to fetch') ||
          fetchError.message.includes('CORS')) {
        throw new Error('CORSエラー: APIサーバーにアクセスできません。サーバー側のCORS設定を確認してください。');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('スクリーンショット取得中にエラーが発生しました:', error);
    showError(error.message);
    updateUIState('error');
    throw error;
  }
}

// YouTube動画のスクリーンショット取得
async function takeYoutubeScreenshot(youtubeUrl, timestamp) {
  try {
    // バリデーション
    if (!youtubeUrl) {
      throw new Error('YouTube URLが入力されていません');
    }

    if (!isValidYoutubeUrl(youtubeUrl)) {
      throw new Error('有効なYouTube URLを入力してください');
    }

    // UI更新
    updateUIState('loading');
    
    // 最新のAPI URLを確認
    checkAndUpdateApiUrl();
    
    console.log('YouTube スクリーンショットリクエスト準備:', {
      youtubeUrl: youtubeUrl,
      timestamp: timestamp,
      API_BASE_URL: config.API_BASE_URL,
      完全URL: `${config.API_BASE_URL}/api/youtube/screenshot`
    });

    // フェッチオプション設定
    const fetchOptions = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: youtubeUrl, timestamp: timestamp })
    };
    
    // デバッグログ
    console.log('YouTube API呼び出し開始:', `${config.API_BASE_URL}/api/youtube/screenshot`, fetchOptions);
    
    try {
      // APIリクエスト実行
      const response = await fetch(`${config.API_BASE_URL}/api/youtube/screenshot`, fetchOptions);
      
      // レスポンスチェック
      if (!response.ok) {
        console.error('YouTube APIエラーレスポンス:', response.status, response.statusText);
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.error || `エラー: ${response.status} ${response.statusText}`;
        } catch (e) {
          try {
            errorText = await response.text();
            if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
              errorText = `HTML レスポンス (${errorText.length} 文字) - API エンドポイントが正しく設定されていない可能性があります`;
            }
          } catch (textError) {
            errorText = `エラー: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorText);
      }

      // 正常なレスポンスの処理
      const data = await response.json();
      console.log('YouTube スクリーンショット API レスポンス:', data);
      
      if (!data.publicUrl) {
        throw new Error('スクリーンショットの URL が見つかりません');
      }
      
      // 結果を表示
      showScreenshot(data.publicUrl, youtubeUrl);
      updateUIState('success');
      saveToHistory(youtubeUrl, data.publicUrl);
      
      return data;
    } catch (fetchError) {
      // CORSエラーの場合は特別なメッセージ
      if (fetchError.message.includes('NetworkError') || 
          fetchError.message.includes('Failed to fetch') ||
          fetchError.message.includes('CORS')) {
        throw new Error('CORSエラー: APIサーバーにアクセスできません。サーバー側のCORS設定を確認してください。');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('YouTube スクリーンショット取得中にエラーが発生しました:', error);
    showError(error.message);
    updateUIState('error');
    throw error;
  }
}

// YouTube Shortsのスクリーンショット取得
async function takeShortsScreenshot(shortsUrl, timestamp) {
  try {
    // バリデーション
    if (!shortsUrl) {
      throw new Error('YouTube Shorts URLが入力されていません');
    }

    if (!isValidShortsUrl(shortsUrl)) {
      throw new Error('有効なYouTube Shorts URLを入力してください');
    }

    // UI更新
    updateUIState('loading');
    
    // 最新のAPI URLを確認
    checkAndUpdateApiUrl();
    
    console.log('Shorts スクリーンショットリクエスト準備:', {
      shortsUrl: shortsUrl,
      timestamp: timestamp,
      API_BASE_URL: config.API_BASE_URL,
      完全URL: `${config.API_BASE_URL}/api/youtube/screenshot` // ShortsもYouTubeエンドポイントを使用
    });

    // フェッチオプション設定
    const fetchOptions = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: shortsUrl, timestamp: timestamp })
    };
    
    // デバッグログ
    console.log('Shorts API呼び出し開始:', `${config.API_BASE_URL}/api/youtube/screenshot`, fetchOptions);
    
    try {
      // APIリクエスト実行 - ShortsもYouTubeエンドポイントを使用
      const response = await fetch(`${config.API_BASE_URL}/api/youtube/screenshot`, fetchOptions);
      
      // レスポンスチェック
      if (!response.ok) {
        console.error('Shorts APIエラーレスポンス:', response.status, response.statusText);
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.error || `エラー: ${response.status} ${response.statusText}`;
        } catch (e) {
          try {
            errorText = await response.text();
            if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
              errorText = `HTML レスポンス (${errorText.length} 文字) - API エンドポイントが正しく設定されていない可能性があります`;
            }
          } catch (textError) {
            errorText = `エラー: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorText);
      }

      // 正常なレスポンスの処理
      const data = await response.json();
      console.log('Shorts スクリーンショット API レスポンス:', data);
      
      if (!data.publicUrl) {
        throw new Error('スクリーンショットの URL が見つかりません');
      }
      
      // 結果を表示
      showScreenshot(data.publicUrl, shortsUrl);
      updateUIState('success');
      saveToHistory(shortsUrl, data.publicUrl);
      
      return data;
    } catch (fetchError) {
      // CORSエラーの場合は特別なメッセージ
      if (fetchError.message.includes('NetworkError') || 
          fetchError.message.includes('Failed to fetch') ||
          fetchError.message.includes('CORS')) {
        throw new Error('CORSエラー: APIサーバーにアクセスできません。サーバー側のCORS設定を確認してください。');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('Shorts スクリーンショット取得中にエラーが発生しました:', error);
    showError(error.message);
    updateUIState('error');
    throw error;
  }
}

// UI状態の更新
function updateUIState(state) {
  const loadingElement = document.getElementById('loading');
  const resultContainer = document.getElementById('result-container');
  const singleResult = document.getElementById('single-result');
  const batchResult = document.getElementById('batch-result');
  
  if (state === 'loading') {
    if (loadingElement) loadingElement.classList.remove('hidden');
    if (resultContainer) resultContainer.classList.add('hidden');
  } else if (state === 'success') {
    if (loadingElement) loadingElement.classList.add('hidden');
    if (resultContainer) resultContainer.classList.remove('hidden');
  } else if (state === 'error') {
    if (loadingElement) loadingElement.classList.add('hidden');
  }
  
  console.log('UI状態を更新しました:', state);
}

// スクリーンショットの表示
function showScreenshot(imageUrl, originalUrl) {
  const resultContainer = document.getElementById('result-container');
  const singleResult = document.getElementById('single-result');
  const batchResult = document.getElementById('batch-result');
  const screenshotImg = document.getElementById('screenshot-img');
  const downloadBtn = document.getElementById('download-btn');
  const screenshotUrl = document.getElementById('screenshot-url');
  const screenshotTime = document.getElementById('screenshot-time');
  
  if (resultContainer && singleResult && batchResult) {
    singleResult.classList.remove('hidden');
    batchResult.classList.add('hidden');
  }
  
  if (screenshotImg) {
    screenshotImg.src = imageUrl;
    screenshotImg.alt = `Screenshot of ${originalUrl}`;
  }
  
  if (downloadBtn) {
    downloadBtn.href = imageUrl;
    downloadBtn.download = imageUrl.split('/').pop();
  }
  
  if (screenshotUrl) {
    screenshotUrl.textContent = `URL: ${originalUrl}`;
  }
  
  if (screenshotTime) {
    screenshotTime.textContent = `撮影日時: ${new Date().toLocaleString()}`;
  }
}

// バッチ処理結果の表示
function showBatchResults(data, videoId) {
  const resultContainer = document.getElementById('result-container');
  const singleResult = document.getElementById('single-result');
  const batchResult = document.getElementById('batch-result');
  const batchVideoInfo = document.getElementById('batch-video-info');
  const batchCountInfo = document.getElementById('batch-count-info');
  const screenshotsGrid = document.getElementById('screenshots-grid');
  const downloadAllBtn = document.getElementById('download-all-btn');
  
  if (resultContainer && singleResult && batchResult) {
    singleResult.classList.add('hidden');
    batchResult.classList.remove('hidden');
  }
  
  if (batchVideoInfo) {
    batchVideoInfo.textContent = `動画ID: ${videoId}`;
  }
  
  if (batchCountInfo) {
    batchCountInfo.textContent = `${data.urls.length}件のスクリーンショットを生成しました`;
  }
  
  if (screenshotsGrid) {
    screenshotsGrid.innerHTML = '';
    
    data.urls.forEach((url, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'screenshot-item';
      
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Screenshot ${index + 1}`;
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.className = 'download-item-btn';
      downloadLink.download = url.split('/').pop();
      downloadLink.textContent = `${index + 1}秒目`;
      
      itemDiv.appendChild(img);
      itemDiv.appendChild(downloadLink);
      screenshotsGrid.appendChild(itemDiv);
    });
  }
  
  if (downloadAllBtn) {
    downloadAllBtn.onclick = () => {
      if (data.zipUrl) {
        window.location.href = data.zipUrl;
      } else {
        showError('ZIP URLが提供されていません');
      }
    };
  }
}

// エラー表示
function showError(message) {
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  
  if (!errorContainer || !errorMessage) {
    console.error('エラー表示用のHTML要素が見つかりません');
    alert(`エラー: ${message}`);
    return;
  }
  
  errorMessage.textContent = message;
  errorContainer.classList.remove('hidden');
  
  // 一定時間後に消える
  setTimeout(() => {
    errorContainer.classList.add('hidden');
  }, 10000);
}

// 履歴に保存
function saveToHistory(originalUrl, screenshotUrl) {
  try {
    // 既存の履歴を取得
    let history = JSON.parse(localStorage.getItem('screenshotHistory') || '[]');
    
    // 新しいエントリを追加
    history.unshift({
      originalUrl,
      screenshotUrl,
      timestamp: new Date().toISOString()
    });
    
    // 最大10件に制限
    if (history.length > 10) {
      history = history.slice(0, 10);
    }
    
    // 保存
    localStorage.setItem('screenshotHistory', JSON.stringify(history));
    console.log('履歴に保存しました', { originalUrl, screenshotUrl });
  } catch (error) {
    console.warn('履歴の保存に失敗しました:', error);
  }
}

// YouTube URLからIDを抽出
function extractYoutubeId(url) {
  if (!url) return null;
  
  // すでにIDだけの場合
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) {
    return url;
  }
  
  // 通常のURLからIDを抽出
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|shorts\/|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  return (match && match[2].length === 11) ? match[2] : null;
}

// YouTubeのURL検証
function isValidYoutubeUrl(url) {
  return url.match(/^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/i) !== null;
}

// YouTube ShortsのURL検証
function isValidShortsUrl(url) {
  return url.match(/^(https?:\/\/)?(www\.)?(youtube\.com\/shorts\/)[a-zA-Z0-9_-]{11}/i) !== null;
}

// 通常URLの検証
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// タブ切り替え機能のセットアップ
function setupTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  if (!tabBtns.length || !tabContents.length) {
    console.warn('タブ要素が見つかりません');
    return;
  }
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // アクティブなタブボタンを更新
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      // タブコンテンツを更新
      const tabId = btn.getAttribute('data-tab');
      tabContents.forEach(content => {
        content.classList.remove('active');
      });
      
      const activeTab = document.getElementById(`${tabId}-tab`);
      if (activeTab) {
        activeTab.classList.add('active');
      }
    });
  });
}

// バッチ処理のスクリーンショット取得
async function takeBatchScreenshots(videoId, startSec, endSec, maxConcurrency) {
  try {
    // バリデーション
    if (!videoId) {
      throw new Error('動画IDが入力されていません');
    }

    // YouTubeの動画IDを抽出
    const extractedId = extractYoutubeId(videoId);
    if (!extractedId) {
      throw new Error('有効なYouTube ShortsのIDまたはURLを入力してください');
    }

    // UI更新
    updateUIState('loading');
    const loadingText = document.getElementById('loading-text');
    if (loadingText) {
      loadingText.textContent = 'バッチ処理を実行中...';
    }
    
    // 最新のAPI URLを確認
    checkAndUpdateApiUrl();
    
    console.log('バッチ処理リクエスト準備:', {
      videoId: extractedId,
      startSec,
      endSec,
      maxConcurrency,
      API_BASE_URL: config.API_BASE_URL,
      完全URL: `${config.API_BASE_URL}/api/youtube/batch` // YouTubeエンドポイントを使用
    });

    // フェッチオプション設定
    const fetchOptions = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        videoId: extractedId,
        startSec,
        endSec,
        maxConcurrency
      })
    };
    
    try {
      // APIリクエスト実行 - YouTubeエンドポイントを使用
      const response = await fetch(`${config.API_BASE_URL}/api/youtube/batch`, fetchOptions);
      
      // レスポンスチェック
      if (!response.ok) {
        let errorText;
        try {
          const errorData = await response.json();
          errorText = errorData.error || `エラー: ${response.status} ${response.statusText}`;
        } catch (e) {
          try {
            errorText = await response.text();
            if (errorText.includes('<!DOCTYPE') || errorText.includes('<html')) {
              errorText = `HTML レスポンス (${errorText.length} 文字) - API エンドポイントが正しく設定されていない可能性があります`;
            }
          } catch (textError) {
            errorText = `エラー: ${response.status} ${response.statusText}`;
          }
        }
        throw new Error(errorText);
      }

      // 正常なレスポンスの処理
      const data = await response.json();
      console.log('バッチ処理 API レスポンス:', data);
      
      if (!data.urls || data.urls.length === 0) {
        throw new Error('スクリーンショットの URL が見つかりません');
      }
      
      // 結果を表示
      showBatchResults(data, videoId);
      updateUIState('success');
      
      return data;
    } catch (fetchError) {
      // CORSエラーの場合は特別なメッセージ
      if (fetchError.message.includes('NetworkError') || 
          fetchError.message.includes('Failed to fetch') ||
          fetchError.message.includes('CORS')) {
        throw new Error('CORSエラー: APIサーバーにアクセスできません。サーバー側のCORS設定を確認してください。');
      }
      
      throw fetchError;
    }
  } catch (error) {
    console.error('バッチ処理中にエラーが発生しました:', error);
    showError(error.message);
    updateUIState('error');
    throw error;
  }
}