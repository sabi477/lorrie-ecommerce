#!/bin/bash

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🚀 Lorrie Ecommerce Geliştirme Ortamı Başlatılıyor...${NC}"

BACKEND_PORT=8080
CHATBOT_PORT=8000
FRONTEND_PORT=4200
LEGACY_PORTS=(8081)

# Scriptin bulunduğu dizine git (her yerden çalışabilmesi için)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Hata yönetimi ve temizlik
cleanup() {
    echo -e "\n${YELLOW}🛑 Tüm servisler durduruluyor...${NC}"
    # Arka plandaki tüm process'leri öldür
    kill $(jobs -p) 2>/dev/null
    echo -e "${GREEN}✅ Temizlendi. Görüşürüz!${NC}"
    exit
}

trap cleanup SIGINT SIGTERM

# Port temizleme fonksiyonu
kill_port() {
    local port=$1
    local pid
    pid=$(lsof -ti tcp:"$port" 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "${YELLOW}⚠️  Port $port meşgul (PID: $pid), temizleniyor...${NC}"
        kill -9 $pid 2>/dev/null
        sleep 1
        echo -e "${GREEN}✅ Port $port temizlendi.${NC}"
    else
        echo -e "${GREEN}✅ Port $port müsait.${NC}"
    fi
}

# Portları temizle
echo -e "${YELLOW}🔍 Portlar kontrol ediliyor...${NC}"
for port in "$BACKEND_PORT" "$CHATBOT_PORT" "$FRONTEND_PORT"; do
    kill_port "$port"
done

echo -e "${YELLOW}🔍 Eski kullanılmayan portlar kontrol ediliyor...${NC}"
for port in "${LEGACY_PORTS[@]}"; do
    kill_port "$port"
done

# 1. Veritabanı Kontrolü
echo -e "${YELLOW}🐘 Veritabanı kontrol ediliyor...${NC}"
if docker ps | grep -q ecommerce_db; then
    echo -e "${GREEN}✅ Veritabanı (Postgres) zaten çalışıyor.${NC}"
else
    echo -e "${YELLOW}🐳 Veritabanı başlatılıyor...${NC}"
    docker-compose up -d postgres
    echo -e "${YELLOW}⏳ Postgres hazır olana kadar bekleniyor...${NC}"
    until docker exec ecommerce_db pg_isready -U postgres &>/dev/null; do
        sleep 1
    done
    echo -e "${GREEN}✅ Postgres hazır.${NC}"
fi

# 2. Backend (Spring Boot)
echo -e "${BLUE}☕ Backend (Spring Boot) başlatılıyor...${NC}"
(cd backend/springboot && ./mvnw clean spring-boot:run) &
BACKEND_PID=$!

# 3. Chatbot (FastAPI)
echo -e "${BLUE}🤖 Chatbot (FastAPI) başlatılıyor...${NC}"
# Uvicorn yüklü mü kontrol et, değilse python -m ile dene
(cd ai-chatbot && SPRING_BOOT_URL=http://localhost:$BACKEND_PORT python3 -m uvicorn main:app --reload --port "$CHATBOT_PORT") &
CHATBOT_PID=$!

# 4. Frontend (Angular)
echo -e "${BLUE}🅰️ Frontend (Angular) başlatılıyor...${NC}"
(cd frontend && npm start) &
FRONTEND_PID=$!

echo -e "${GREEN}──────────────────────────────────────────${NC}"
echo -e "${GREEN}✅ Tüm servisler ayağa kalkıyor!${NC}"
echo -e "${BLUE}🔗 Frontend: http://localhost:$FRONTEND_PORT${NC}"
echo -e "${BLUE}🔗 Backend:  http://localhost:$BACKEND_PORT${NC}"
echo -e "${BLUE}🔗 Chatbot:  http://localhost:$CHATBOT_PORT${NC}"
echo -e "${GREEN}──────────────────────────────────────────${NC}"
echo -e "${YELLOW}Logları yukarıda görebilirsin. Kapatmak için CTRL+C bas.${NC}"

# Tüm process'lerin bitmesini bekle
wait
