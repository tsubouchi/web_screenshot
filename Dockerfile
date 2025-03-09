# Node.js LTSベースのイメージ
FROM node:18-slim

# Puppeteerの依存関係をインストール
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 作業ディレクトリの設定
WORKDIR /app

# package.jsonとpackage-lock.jsonのコピー
COPY package*.json ./

# 依存パッケージのインストール
RUN npm install --production

# ソースコードのコピー
COPY . .

# ディレクトリが存在しない場合は作成
RUN mkdir -p data/uploads

# 環境変数を設定
ENV PORT=8080
ENV NODE_ENV=production
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# アプリケーションを実行するポートを公開
EXPOSE 8080

# アプリケーションを起動
CMD ["node", "src/index.js"] 