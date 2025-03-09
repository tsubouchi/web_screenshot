#!/bin/bash
set -e

# プロジェクト設定
PROJECT_ID=${PROJECT_ID:-"web-screenshot-demo"}
SERVICE_NAME=${SERVICE_NAME:-"web-screenshot"}
REGION=${REGION:-"asia-northeast1"}
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# 環境変数設定
MEMORY=${MEMORY:-"2Gi"}
CPU=${CPU:-"1"}
CONCURRENCY=${CONCURRENCY:-"50"}
TIMEOUT=${TIMEOUT:-"300s"}
MIN_INSTANCES=${MIN_INSTANCES:-"0"}
MAX_INSTANCES=${MAX_INSTANCES:-"10"}

echo "🔍 設定内容:"
echo "プロジェクトID: ${PROJECT_ID}"
echo "サービス名: ${SERVICE_NAME}"
echo "リージョン: ${REGION}"
echo "イメージ名: ${IMAGE_NAME}"
echo "メモリ: ${MEMORY}"
echo "CPU: ${CPU}"
echo "同時実行数: ${CONCURRENCY}"
echo "タイムアウト: ${TIMEOUT}"
echo "最小インスタンス: ${MIN_INSTANCES}"
echo "最大インスタンス: ${MAX_INSTANCES}"

# プロジェクト設定
echo "🛠️  Googleプロジェクトを設定中..."
gcloud config set project ${PROJECT_ID}

# ビルドとデプロイ
echo "🔨 Dockerイメージをビルド中..."
gcloud builds submit --tag ${IMAGE_NAME}

echo "🚀 Cloud Runにデプロイ中..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME} \
  --platform managed \
  --region ${REGION} \
  --memory ${MEMORY} \
  --cpu ${CPU} \
  --concurrency ${CONCURRENCY} \
  --timeout ${TIMEOUT} \
  --min-instances ${MIN_INSTANCES} \
  --max-instances ${MAX_INSTANCES} \
  --set-env-vars "NODE_ENV=production" \
  --allow-unauthenticated

# デプロイ完了後のURL表示
SERVICE_URL=$(gcloud run services describe ${SERVICE_NAME} --platform managed --region ${REGION} --format 'value(status.url)')
echo "✅ デプロイ完了！サービスURL: ${SERVICE_URL}" 