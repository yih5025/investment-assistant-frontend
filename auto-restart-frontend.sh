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

# Pod 재시작
echo "🔄 프론트엔드 Pod 재시작 중..."
kubectl rollout restart deployment/$FRONTEND_DEPLOYMENT -n $NAMESPACE

if [ $? -eq 0 ]; then
    echo "✅ 프론트엔드 재시작 명령 성공"
    
    # 재시작 상태 확인
    echo "⏳ 재시작 상태 확인 중..."
    kubectl rollout status deployment/$FRONTEND_DEPLOYMENT -n $NAMESPACE --timeout=300s
    
    if [ $? -eq 0 ]; then
        echo "🎉 프론트엔드 재시작 완료!"
        echo "🌐 웹사이트 접속: http://localhost:30333"
        echo "🔍 로그 확인: kubectl logs -n $NAMESPACE deployment/$FRONTEND_DEPLOYMENT -c frontend --tail=20"
    else
        echo "❌ 프론트엔드 재시작 시간 초과"
        exit 1
    fi
else
    echo "❌ 프론트엔드 재시작 실패"
    exit 1
fi

echo "✅ 프론트엔드 자동 재시작 완료! ($(date +"%Y-%m-%d %H:%M:%S"))"