#!/bin/bash

# VPS Setup Script for SplitBill App
# Run this script on your Ubuntu VPS to set up the environment

set -e

echo "🚀 Setting up VPS for SplitBill App..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# Install PM2
echo "📦 Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Install Nginx
echo "📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt install -y nginx
fi

# Install Certbot for SSL
echo "📦 Installing Certbot..."
if ! command -v certbot &> /dev/null; then
    sudo apt install -y certbot python3-certbot-nginx
fi

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/splitbill-app
sudo chown -R $USER:$USER /var/www/splitbill-app

# Setup PM2 startup
echo "⚙️  Setting up PM2 startup..."
pm2 startup systemd -u $USER --hp /home/$USER
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER

echo "✅ VPS setup completed!"
echo ""
echo "Next steps:"
echo "1. Copy your application files to /var/www/splitbill-app"
echo "2. Create .env file with your configuration"
echo "3. Run: cd /var/www/splitbill-app && npm install"
echo "4. Run: npx prisma generate && npx prisma db push"
echo "5. Run: npm run build"
echo "6. Run: pm2 start npm --name splitbill-app -- start"
echo "7. Copy nginx/splitbill.conf to /etc/nginx/sites-available/splitbill"
echo "8. Run: sudo ln -s /etc/nginx/sites-available/splitbill /etc/nginx/sites-enabled/"
echo "9. Run: sudo nginx -t"
echo "10. Run: sudo certbot --nginx -d indomiekor.net -d www.indomiekor.net"
echo "11. Run: sudo systemctl restart nginx"


