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
DB_PORT=5432
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
    # nc -z ile portun gerçekten açık olup olmadığını kontrol et (lsof bazen yetki nedeniyle göremeyebilir)
    if nc -z localhost "$port" >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  Port $port meşgul, temizleniyor...${NC}"
        
        # 1. Standart lsof ile bulup öldür
        local pid=$(lsof -ti tcp:"$port" 2>/dev/null)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null
        fi
        
        # 2. Eğer hala meşgulse ve port 5432 ise (Sistem Postgres'i olabilir)
        sleep 1
        if nc -z localhost "$port" >/dev/null 2>&1; then
            if [ "$port" == "5432" ]; then
                # EDB Postgres (v18) gibi sistem servislerini kontrol et
                if [ -f /Library/LaunchDaemons/postgresql-18.plist ]; then
                    echo -e "${YELLOW}🐘 Sistem Postgres (v18) tespit edildi. Kapatmak için sudo gerekebilir...${NC}"
                    sudo launchctl unload /Library/LaunchDaemons/postgresql-18.plist 2>/dev/null
                    # Alternatif olarak stop komutu
                    sudo launchctl stop postgresql-18 2>/dev/null
                fi
                
                # Diğer olası postgres process'lerini ps ile bulup öldürmeyi dene
                local ps_pid=$(ps aux | grep -i "postgres" | grep -v "grep" | awk '{print $2}' | head -n 1)
                if [ -n "$ps_pid" ]; then
                    kill -9 $ps_pid 2>/dev/null
                fi
            fi
        fi

        # Son kontrol
        if nc -z localhost "$port" >/dev/null 2>&1; then
            echo -e "${RED}❌ Port $port hala kapatılamadı. Lütfen manuel kontrol et.${NC}"
        else
            echo -e "${GREEN}✅ Port $port temizlendi.${NC}"
        fi
    else
        echo -e "${GREEN}✅ Port $port müsait.${NC}"
    fi
}

# Portları temizle
echo -e "${YELLOW}🔍 Portlar kontrol ediliyor...${NC}"
for port in "$BACKEND_PORT" "$CHATBOT_PORT" "$FRONTEND_PORT" "$DB_PORT"; do
    kill_port "$port"
done

echo -e "${YELLOW}🔍 Eski kullanılmayan portlar kontrol ediliyor...${NC}"
for port in "${LEGACY_PORTS[@]}"; do
    kill_port "$port"
done

# 1. Veritabanı Kontrolü
echo -e "${YELLOW}🐘 Veritabanı kontrol ediliyor...${NC}"
if nc -z localhost "$DB_PORT" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Postgres zaten çalışıyor (native/sistem servisi).${NC}"
elif docker info >/dev/null 2>&1; then
    if docker ps | grep -q ecommerce_db; then
        echo -e "${GREEN}✅ Veritabanı (Docker) zaten çalışıyor.${NC}"
    else
        echo -e "${YELLOW}🐳 Veritabanı Docker ile başlatılıyor...${NC}"
        docker-compose up -d postgres
        echo -e "${YELLOW}⏳ Postgres hazır olana kadar bekleniyor...${NC}"
        until docker exec ecommerce_db pg_isready -U postgres &>/dev/null; do
            sleep 1
        done
        echo -e "${GREEN}✅ Postgres hazır.${NC}"
    fi
else
    echo -e "${RED}❌ Postgres çalışmıyor ve Docker bulunamadı. Lütfen Postgres'i başlat.${NC}"
    exit 1
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
