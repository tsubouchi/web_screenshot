# Node.js LTSベースのイメージ
FROM node:18-slim

ENV PORT=8080
ENV HOST=0.0.0.0
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# システムの依存関係をインストール
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable \
       fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
       libxss1 dumb-init --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリの設定
WORKDIR /app

# プロジェクトファイルをコピー
COPY package*.json ./

# 依存パッケージのインストール
RUN npm install --production

# アプリケーションコードをコピー
COPY . .

# アップロードディレクトリの作成
RUN mkdir -p data/uploads && chmod 777 data/uploads

# コンテナのヘルスチェックを設定
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT}/ || exit 1

# ポートを公開
EXPOSE ${PORT}

# 軽量な初期化プロセス（シグナルハンドリング用）
ENTRYPOINT ["dumb-init", "--"]

# アプリケーションを実行
CMD ["node", "src/index.js"] 