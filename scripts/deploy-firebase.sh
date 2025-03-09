#!/bin/bash
set -e

# プロジェクト設定
FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID:-"web-screenshot-demo"}

# Firebaseプロジェクト設定
echo "🔄 Firebaseプロジェクトを設定中..."
firebase use ${FIREBASE_PROJECT_ID}

# Realtime Databaseルールのデプロイ
if [ -f "database.rules.json" ]; then
  echo "🛡 データベースルールをデプロイ中..."
  firebase deploy --only database
else
  echo "⚠️ database.rules.jsonが見つかりません。データベースルールのデプロイをスキップします。"
fi

# Storageルールのデプロイ
if [ -f "storage.rules" ]; then
  echo "🛡 ストレージルールをデプロイ中..."
  firebase deploy --only storage
else
  echo "⚠️ storage.rulesが見つかりません。ストレージルールのデプロイをスキップします。"
fi

# ホスティングのデプロイ
if [ -d "public" ]; then
  echo "🌐 ホスティングコンテンツをデプロイ中..."
  firebase deploy --only hosting
else
  echo "⚠️ publicディレクトリが見つかりません。ホスティングのデプロイをスキップします。"
fi

# デプロイ完了メッセージ
echo "✅ Firebaseデプロイ完了！ホスティングURL: https://${FIREBASE_PROJECT_ID}.web.app" 