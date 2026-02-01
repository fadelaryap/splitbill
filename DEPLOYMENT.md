# Deployment Guide - SplitBill App

Panduan lengkap untuk deploy aplikasi SplitBill ke VPS Ubuntu dengan GitHub Actions.

## Prerequisites

- VPS Ubuntu 20.04+ dengan akses root/sudo
- Domain name yang sudah diarahkan ke IP VPS (indomiekor.net)
- GitHub repository untuk aplikasi
- Akses SSH ke VPS

## Step 1: Setup VPS Awal

### 1.1 Login ke VPS

```bash
ssh user@your-vps-ip
```

### 1.2 Jalankan Setup Script

```bash
# Upload setup script ke VPS atau clone repo
git clone <your-repo-url>
cd splitbill-app
chmod +x scripts/setup-vps.sh
./scripts/setup-vps.sh
```

Script ini akan menginstall:
- Node.js 18
- PM2
- Nginx
- Certbot

### 1.3 Setup Aplikasi Manual (Pertama Kali)

```bash
# Buat direktori aplikasi
sudo mkdir -p /var/www/splitbill-app
sudo chown -R $USER:$USER /var/www/splitbill-app

# Clone repository
cd /var/www
git clone <your-repo-url> splitbill-app
cd splitbill-app

# Buat file .env
nano .env
```

Isi `.env`:
```env
DATABASE_URL="file:./prod.db"
JWT_SECRET="generate-random-secret-here-min-32-chars"
NEXTAUTH_URL="https://indomiekor.net"
```

Generate JWT secret:
```bash
openssl rand -base64 32
```

```bash
# Install dependencies
npm install

# Setup database
npx prisma generate
npx prisma db push

# Build aplikasi
npm run build

# Start dengan PM2
pm2 start npm --name "splitbill-app" -- start
pm2 save
```

## Step 2: Setup GitHub Actions

### 2.1 Generate SSH Key untuk Deployment

Di local machine atau VPS:

```bash
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy
```

### 2.2 Copy Public Key ke VPS

```bash
# Di local machine
cat ~/.ssh/github_actions_deploy.pub | ssh user@your-vps-ip "cat >> ~/.ssh/authorized_keys"
```

Atau manual:
```bash
# Di VPS
nano ~/.ssh/authorized_keys
# Paste public key
```

### 2.3 Setup GitHub Secrets

Buka GitHub repository → Settings → Secrets and variables → Actions

Tambahkan secrets berikut:

| Secret Name | Value | Contoh |
|------------|-------|--------|
| `VPS_HOST` | IP atau domain VPS | `123.456.789.0` atau `indomiekor.net` |
| `VPS_USER` | Username SSH | `root` atau `ubuntu` |
| `VPS_SSH_KEY` | Private SSH key | Isi dari `~/.ssh/github_actions_deploy` |
| `VPS_PORT` | Port SSH | `22` (default) |
| `DATABASE_URL` | Database connection string | `file:./prod.db` |
| `JWT_SECRET` | JWT secret key | Random string 32+ chars |
| `NEXTAUTH_URL` | Domain aplikasi | `https://indomiekor.net` |

**Cara mendapatkan private key:**
```bash
cat ~/.ssh/github_actions_deploy
# Copy seluruh output (termasuk -----BEGIN dan -----END)
```

## Step 3: Setup Nginx

### 3.1 Copy Konfigurasi Nginx

```bash
# Di VPS
cd /var/www/splitbill-app
sudo cp nginx/splitbill.conf /etc/nginx/sites-available/splitbill
```

### 3.2 Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/splitbill /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Hapus default jika ada
sudo nginx -t  # Test konfigurasi
sudo systemctl restart nginx
```

### 3.3 Setup SSL (Let's Encrypt)

```bash
# Pastikan domain sudah mengarah ke IP VPS
# Cek dengan: nslookup indomiekor.net

# Get SSL certificate
sudo certbot --nginx -d indomiekor.net -d www.indomiekor.net

# Test auto-renewal
sudo certbot renew --dry-run
```

## Step 4: Test Deployment

### 4.1 Push ke GitHub

```bash
git add .
git commit -m "Initial deployment setup"
git push origin main
```

### 4.2 Monitor GitHub Actions

1. Buka GitHub repository
2. Klik tab "Actions"
3. Lihat workflow "Deploy to VPS"
4. Tunggu sampai selesai (biasanya 2-5 menit)

### 4.3 Cek Aplikasi

```bash
# Cek PM2 status
pm2 status

# Cek logs
pm2 logs splitbill-app

# Cek Nginx
sudo systemctl status nginx

# Test domain
curl https://indomiekor.net
```

## Step 5: Monitoring & Maintenance

### 5.1 PM2 Commands

```bash
# Lihat status
pm2 status

# Lihat logs
pm2 logs splitbill-app

# Restart aplikasi
pm2 restart splitbill-app

# Stop aplikasi
pm2 stop splitbill-app

# Monitor resources
pm2 monit
```

### 5.2 Database Backup

```bash
# Backup SQLite database
cp /var/www/splitbill-app/prod.db /var/www/splitbill-app/backups/prod-$(date +%Y%m%d-%H%M%S).db
```

### 5.3 Update Aplikasi

Cukup push ke GitHub, deployment otomatis:

```bash
git add .
git commit -m "Update features"
git push origin main
```

## Troubleshooting

### Error: Permission Denied

```bash
# Fix permissions
sudo chown -R $USER:$USER /var/www/splitbill-app
```

### Error: Port 3000 Already in Use

```bash
# Kill process
pm2 delete splitbill-app
# Start again
pm2 start npm --name "splitbill-app" -- start
```

### Error: Database Locked

```bash
# Restart aplikasi
pm2 restart splitbill-app
```

### Error: SSL Certificate Expired

```bash
# Renew certificate
sudo certbot renew
sudo systemctl restart nginx
```

### Check Nginx Logs

```bash
sudo tail -f /var/log/nginx/splitbill-error.log
sudo tail -f /var/log/nginx/splitbill-access.log
```

## Security Checklist

- [ ] Firewall configured (UFW)
- [ ] SSH key authentication only
- [ ] SSL certificate installed
- [ ] Strong JWT secret
- [ ] Database file permissions secured
- [ ] PM2 running as non-root user
- [ ] Regular backups configured

## Firewall Setup (Optional but Recommended)

```bash
# Install UFW
sudo apt install ufw

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Backup Strategy

### Automated Backup Script

Create `/var/www/splitbill-app/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/www/splitbill-app/backups"
mkdir -p $BACKUP_DIR
cp /var/www/splitbill-app/prod.db $BACKUP_DIR/prod-$(date +%Y%m%d-%H%M%S).db
# Keep only last 7 days
find $BACKUP_DIR -name "prod-*.db" -mtime +7 -delete
```

Add to crontab:
```bash
crontab -e
# Add: 0 2 * * * /var/www/splitbill-app/scripts/backup.sh
```

## Support

Jika ada masalah, cek:
1. GitHub Actions logs
2. PM2 logs: `pm2 logs splitbill-app`
3. Nginx logs: `sudo tail -f /var/log/nginx/splitbill-error.log`
4. Application logs di console



