#!/bin/bash
set -e

echo "=========================================="
echo "  SAHAY Life-Admin OS — AWS Auto-Deploy  "
echo "=========================================="

# 1. Install Docker & Git if not already present
if ! command -v docker &> /dev/null; then
    echo ">> Installing Docker and Docker Compose..."
    sudo apt update -y
    sudo apt install -y git curl
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# 2. Configure .env file
if [ ! -f .env ]; then
    echo ">> Generating production .env..."
    cp .env.production.example .env
    if [ -n "$GEMINI_API_KEY" ]; then
        sed -i "s/your_gemini_api_key_here/$GEMINI_API_KEY/g" .env
    fi
fi

# 3. Build & start all containers
echo ">> Building and launching SAHAY containers (Frontend, Backend, PostgreSQL, Redis)..."
sudo docker compose -f docker-compose.prod.yml down --remove-orphans || true
sudo docker compose -f docker-compose.prod.yml up -d --build

# 4. Wait for Backend API to become ready
echo ">> Waiting for Backend API service to report healthy..."
for i in {1..30}; do
    if curl -s -f http://127.0.0.1/api/v1/health > /dev/null 2>&1; then
        echo ">> Backend API is UP and Healthy!"
        break
    fi
    sleep 2
done

# 5. Success summary
PUBLIC_IP=$(curl -s http://checkip.amazonaws.com || curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || hostname -I | awk '{print $1}')

echo ""
echo "=========================================="
echo "  🎉 SAHAY DEPLOYED SUCCESSFULLY ON AWS!  "
echo "=========================================="
echo "Frontend Application : http://$PUBLIC_IP"
echo "Backend API Health   : http://$PUBLIC_IP/api/v1/health"
echo "Swagger Docs         : http://$PUBLIC_IP/docs"
echo "=========================================="
sudo docker compose -f docker-compose.prod.yml ps
