// 設定情報の初期値（最小限のもののみ）
let config = {
  API_BASE_URL: determineInitialApiBaseUrl(),
  NODE_ENV: 'production'
};

/**
 * 初期APIベースURLを決定する関数
 * ホスト名に基づいて適切なURLを判定し、ハードコーディングを最小限に抑える
 */
function determineInitialApiBaseUrl() {
  const hostname = window.location.hostname;
  
  // ローカル開発環境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // Firebase Hosting環境（リクエスト転送を利用）
  if (hostname.includes('web-screenshot-demo-c3d64')) {
    // 相対パスを使用して現在のホストからAPIにアクセス
    return '';
  }
  
  // その他の環境（デフォルトのCloud Run URL）
  // 注: このURLはサーバー側の/api/configエンドポイントから正確な値に更新される
  return 'https://web-screenshot-414448831707.asia-northeast1.run.app';
}

// 設定を読み込む関数
async function loadConfig() {
  try {
    // 初期APIベースURLを使用して設定を取得
    // Firebase Hosting環境では相対パスを使用し、リクエスト転送を活用
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
        const directCloudRunUrl = 'https://web-screenshot-414448831707.asia-northeast1.run.app';
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
          return false;
        }
      } else {
        return false;
      }
    }
    
    if (!response || !response.ok) {
      console.warn('設定の読み込みに失敗しました:', response ? response.status : 'レスポンスなし');
      // フォールバック: 直接Cloud Run URLを設定
      if (!config.API_BASE_URL || config.API_BASE_URL === '') {
        config.API_BASE_URL = 'https://web-screenshot-414448831707.asia-northeast1.run.app';
        console.log('APIリクエスト先をCloud Run URLに直接設定しました:', config.API_BASE_URL);
      }
      return false;
    }
    
    const configData = await response.json();
    console.log('サーバーから取得した設定:', configData);
    
    // 設定を更新
    config = { ...config, ...configData };
    console.log('更新された設定:', config);
    
    return true;
  } catch (error) {
    console.error('設定読み込みエラー:', error);
    // 重要: エラー時はCloud Run URLを直接設定
    if (!config.API_BASE_URL || config.API_BASE_URL === '') {
      config.API_BASE_URL = 'https://web-screenshot-414448831707.asia-northeast1.run.app';
      console.log('エラー時にAPIリクエスト先を直接設定しました:', config.API_BASE_URL);
    }
    return false;
  }
}