#!/bin/bash
# Script de déploiement complet pour Trading Journal Pro
# À exécuter sur le serveur (ssh admin@44.192.92.5)

set -e  # Arrêter si une commande échoue

echo "=============================================="
echo " DEPLOIEMENT TRADING JOURNAL PRO"
echo "=============================================="

# ============================================
# ETAPE 1 : UPDATE ET INSTALLATION DES PAQUETS
# ============================================
echo ""
echo "[1/8] Update système et installation des paquets..."
sudo apt update -y
sudo apt install -y curl git nano nginx ufw gnupg2

# ============================================
# ETAPE 2 : INSTALLATION NODE.JS
# ============================================
echo ""
echo "[2/8] Installation de Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Installer PM2
echo "Installation de PM2..."
sudo npm install -g pm2

# ============================================
# ETAPE 3 : INSTALLATION MONGODB
# ============================================
echo ""
echo "[3/8] Installation de MongoDB..."

# Nettoyer si installation précédente cassée
sudo rm -f /etc/apt/sources.list.d/mongodb-org-8.0.list 2>/dev/null || true

# Installer MongoDB depuis le repo Debian
sudo apt install -y mongodb || true

# Vérifier si MongoDB est vraiment installé
if ! command -v mongod &> /dev/null; then
    echo "MongoDB non dans les repos Debian, installation alternative..."
    # Installation via Docker ou téléchargement direct non disponible,
    # essayer de récupérer le paquet deb manuellement
    wget -q https://fastdl.mongodb.org/linux/mongodb-linux-x86_64-debian12-8.0.9.tgz -O /tmp/mongodb.tgz 2>/dev/null || true
fi

# Lancer MongoDB
sudo systemctl start mongodb 2>/dev/null || true
sudo systemctl enable mongodb 2>/dev/null || true
sudo systemctl start mongod 2>/dev/null || true
sudo systemctl enable mongod 2>/dev/null || true

# Wait pour MongoDB
echo "Attente de MongoDB..."
sleep 3
sudo systemctl status mongodb || sudo systemctl status mongod || echo "MongoDB status à vérifier"

# ============================================
# ETAPE 4 : TRANSFERT DU PROJET LOCAL (à faire manuellement avant)
# ============================================
echo ""
echo "[4/8] Mise en place du projet..."

# Le dossier du projet doit exister, sinon créer une notice
if [ ! -d "/var/www/journal2" ]; then
    echo ""
    echo "! IMPORTANT : Le dossier /var/www/journal2 n'existe pas."
    echo "  Tu dois d'abord transférer ton projet avec :"
    echo "  scp -i ~/.ssh/mood\\ \\(1\\).pem -r /chemin/vers/ton/projet/* admin@44.192.92.5:/var/www/journal2/"
    echo ""
    exit 1
fi

# Installer les déps
sudo chown -R admin:admin /var/www/journal2
cd /var/www/journal2
npm run install:backend || (cd backend && npm install)

# ============================================
# ETAPE 5 : CONFIGURATION BACKEND
# ============================================
echo ""
echo "[5/8] Configuration du backend..."

# Générer un JWT secret
JWT_SECRET=$(openssl rand -hex 32)

cd /var/www/journal2
if [ ! -f "backend/.env" ]; then
    echo "Création du fichier .env..."
    cat > backend/.env << EOF
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/trading-journal
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=votre-email@gmail.com
EMAIL_FROM="Trading Journal Pro <votre-email@gmail.com>"
EMAIL_PASSWORD=votre-app-password
EOF
    echo "! IMPORTANT : Édite backend/.env pour configurer ton email correctement"
fi

# ============================================
# ETAPE 6 : CONFIGURATION NGINX
# ============================================
echo ""
echo "[6/8] Configuration Nginx..."

sudo tee /etc/nginx/sites-available/journal2 > /dev/null << 'EOF'
server {
    listen 80;
    server_name 44.192.92.5;

    client_max_body_size 50M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    access_log /var/log/nginx/journal2.access.log;
    error_log /var/log/nginx/journal2.error.log;
}
EOF

sudo rm -f /etc/nginx/sites-enabled/journal2
sudo ln -sf /etc/nginx/sites-available/journal2 /etc/nginx/sites-enabled/journal2
sudo rm -f /etc/nginx/sites-enabled/default

# Vérifier config nginx
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# ============================================
# ETAPE 7 : FIREWALL
# ============================================
echo ""
echo "[7/8] Configuration du firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable || true

# ============================================
# ETAPE 8 : DEMARRAGE DU BACKEND AVEC PM2
# ============================================
echo ""
echo "[8/8] Démarrage du backend..."

cd /var/www/journal2
sudo pm2 stop journal2 2>/dev/null || true
sudo pm2 delete journal2 2>/dev/null || true
sudo pm2 start backend/server.js --name "journal2"
sudo pm2 startup systemd -u admin --hp /home/admin 2>/dev/null || true
sudo pm2 save

# ============================================
# RESUME
# ============================================
echo ""
echo "=============================================="
echo "  DEPLOIEMENT TERMINÉ !"
echo "=============================================="
echo ""
echo "  URL d'accès : http://44.192.92.5"
echo ""
echo "  Commandes utiles :"
echo "    - pm2 status              : statut du backend"
echo "    - pm2 logs                : logs du backend"
echo "    - sudo systemctl status nginx  : statut de nginx"
echo "    - sudo journalctl -u nginx -f  : logs de nginx"
echo ""
echo "  Fichiers importants :"
echo "    - /var/www/journal2/backend/.env         : config backend"
echo "    - /etc/nginx/sites-available/journal2    : config nginx"
echo "    - /var/log/nginx/journal2.error.log       : logs erreurs nginx"
echo ""
echo "=============================================="
