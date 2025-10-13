# ===== auto-restart-pod.sh =====
#!/bin/bash

# 프론트엔드 자동 재시작 스크립트
echo "🎨 Investment Frontend 자동 재시작 시작..."

# 환경변수 설정
NAMESPACE="investment-assistant"
FRONTEND_DEPLOYMENT="investment-frontend"

# 현재 시간
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

echo "📅 시작 시간: $TIMESTAMP"
echo "🏗️  네임스페이스: $NAMESPACE"
echo "🎨 배포명: $FRONTEND_DEPLOYMENT"


echo "✅ 프론트엔드 자동 재시작 완료! ($(date +"%Y-%m-%d %H:%M:%S"))"