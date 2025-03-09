// 設定情報の初期値（最小限のもののみ）
let config = {
  API_BASE_URL: determineInitialApiBaseUrl(),
  NODE_ENV: 'production'
};

// 強制的な設定上書き（デバッグ用）
const FORCE_CLOUD_RUN_URL = true;
const LATEST_CLOUD_RUN_URL = 'https://web-screenshot-414448831707.asia-northeast1.run.app';

// 初期設定をログ出力
console.log('初期設定値:', {
  ...config,
  hostname: window.location.hostname,
  path: window.location.pathname,
  determineFunction: determineInitialApiBaseUrl.toString()
});

/**
 * 初期APIベースURLを決定する関数
 * ホスト名に基づいて適切なURLを判定し、ハードコーディングを最小限に抑える
 */
function determineInitialApiBaseUrl() {
  const hostname = window.location.hostname;
  console.log('ホスト名検出:', hostname);
  
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
    // デバッグ用の強制URL設定
    if (FORCE_CLOUD_RUN_URL) {
      config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
      console.log('⚠️ 強制的にAPI URLを設定しました:', config.API_BASE_URL);
      return true;
    }

    // 以下は通常のフローで使用
    // 初期APIベースURLを使用して設定を取得
    const apiUrl = config.API_BASE_URL || '';
    const configUrl = `${apiUrl}/api/config`;
    console.log('設定取得URL:', configUrl);
    
    let response;
    try {
      response = await fetch(configUrl, { timeout: 5000 });
    } catch (fetchError) {
      console.warn('設定取得中にネットワークエラーが発生しました:', fetchError);
      
      // 相対パスでのリクエストが失敗した場合は、直接Cloud Run URLを試す
      if (!config.API_BASE_URL || config.API_BASE_URL === '') {
        console.log('直接Cloud Run URLへのフォールバックを試みます...');
        const directCloudRunUrl = LATEST_CLOUD_RUN_URL;
        const fallbackConfigUrl = `${directCloudRunUrl}/api/config`;
        
        try {
          response = await fetch(fallbackConfigUrl);
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
    
    // 古いURLのままだった場合は強制的に最新に更新（安全策）
    if (config.API_BASE_URL.includes('web-screenshot-1015153191846')) {
      console.warn('⚠️ 古いCloud Run URLが検出されました。最新のURLに更新します。');
      config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
    }
    
    return true;
  } catch (error) {
    console.error('設定の読み込み中にエラーが発生しました:', error);
    // エラー時も最新のURLを設定
    config.API_BASE_URL = LATEST_CLOUD_RUN_URL;
    console.log('⚠️ エラー時に最新URLを設定:', config.API_BASE_URL);
    return true;
  }
}

// スクリーンショット取得処理
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
    currentUrl = url;
    
    console.log('スクリーンショットリクエスト準備:', {
      url: url,
      API_BASE_URL: config.API_BASE_URL,
      完全URL: `${config.API_BASE_URL}/api/screenshot`
    });

    // フェッチオプション設定
    const fetchOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    };
    
    // デバッグログ
    console.log('API呼び出し開始:', `${config.API_BASE_URL}/api/screenshot`, fetchOptions);
    
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
  } catch (error) {
    console.error('スクリーンショット取得中にエラーが発生しました:', error);
    showError(error.message);
    updateUIState('error');
    throw error;
  }
}

// UI状態の更新
function updateUIState(state) {
  const submitButton = document.getElementById('submit-button');
  const spinner = document.getElementById('spinner');
  const form = document.getElementById('screenshot-form');
  
  submitButton.disabled = state === 'loading';
  spinner.style.display = state === 'loading' ? 'inline-block' : 'none';
  
  if (state === 'error') {
    form.classList.add('error');
    setTimeout(() => form.classList.remove('error'), 500);
  }
  
  console.log('UI状態を更新しました:', state);
}

// スクリーンショットの表示
function showScreenshot(imageUrl, originalUrl) {
  const resultSection = document.getElementById('result');
  const screenshotImage = document.getElementById('screenshot');
  const downloadLink = document.getElementById('download-link');
  const originalUrlElement = document.getElementById('original-url');
  
  screenshotImage.src = imageUrl;
  screenshotImage.alt = `Screenshot of ${originalUrl}`;
  downloadLink.href = imageUrl;
  originalUrlElement.textContent = originalUrl;
  originalUrlElement.href = originalUrl;
  
  resultSection.style.display = 'block';
  
  // スクロール
  setTimeout(() => {
    resultSection.scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// エラー表示
function showError(message) {
  const errorContainer = document.getElementById('error-container');
  const errorMessage = document.getElementById('error-message');
  
  errorMessage.textContent = message;
  errorContainer.style.display = 'block';
  
  // 一定時間後に消える
  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 10000);
}

// YouTubeのURLを処理する関数
function processYoutubeUrl(url) {
  try {
    // YouTubeのURLかどうかを判断
    if (!url || typeof url !== 'string') return url;
    
    // 様々なYouTube URLパターンのチェック
    if (url.includes('youtube.com/watch') || 
        url.includes('youtu.be/') || 
        url.includes('youtube.com/embed/')) {
      
      console.log('YouTubeのURLを検出しました:', url);
      return url; // そのまま返す（バックエンドで適切に処理）
    }
    
    return url; // 通常のURLはそのまま返す
  } catch (error) {
    console.warn('YouTubeのURL処理中にエラーが発生しました:', error);
    return url; // エラー時は元のURLを返す
  }
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

// URLのバリデーション
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

// 初期化処理
document.addEventListener('DOMContentLoaded', async function() {
  console.log('アプリケーション初期化を開始します');
  
  // 設定の読み込み
  try {
    await loadConfig();
    console.log('設定の読み込みが完了しました');
  } catch (error) {
    console.error('設定読み込みエラー:', error);
  }
  
  // フォームのサブミット処理
  const form = document.getElementById('screenshot-form');
  const urlInput = document.getElementById('url-input');
  
  form.addEventListener('submit', async function(event) {
    event.preventDefault(); // フォームのデフォルト送信を防止
    console.log('フォームが送信されました');
    
    try {
      const inputUrl = urlInput.value.trim();
      const processedUrl = processYoutubeUrl(inputUrl);
      
      console.log('処理されたURL:', processedUrl);
      await takeScreenshot(processedUrl);
    } catch (error) {
      console.error('フォーム送信エラー:', error);
      // エラーはtakeScreenshot内で処理されているため、ここでは何もしない
    }
  });
  
  // 例: URLパラメータからURLを取得して設定
  const urlParams = new URLSearchParams(window.location.search);
  const urlFromParam = urlParams.get('url');
  
  if (urlFromParam) {
    urlInput.value = urlFromParam;
    console.log('URLパラメータからURLを設定しました:', urlFromParam);
  }
  
  // アニメーションの追加
  setTimeout(() => {
    document.querySelector('.container').classList.add('loaded');
  }, 100);
  
  console.log('アプリケーションの初期化が完了しました');
});