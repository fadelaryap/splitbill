# Setup VPS Permissions untuk User agrowtek

Panduan untuk setup permissions agar user `agrowtek` bisa deploy aplikasi.

## Opsi 1: Setup Permissions di /var/www (Recommended untuk Production)

### Step 1: Buat Direktori dan Set Ownership

```bash
# Login sebagai root atau dengan sudo
ssh -i fadelaryap.pem agrowtek@your-vps-ip
sudo su

# Buat direktori
mkdir -p /var/www/splitbill-app

# Set ownership ke user agrowtek
chown -R agrowtek:agrowtek /var/www/splitbill-app

# Set permissions
chmod -R 755 /var/www/splitbill-app

# Exit root
exit
```

### Step 2: Verifikasi Akses

```bash
# Test sebagai user agrowtek
cd /var/www/splitbill-app
touch test.txt
rm test.txt

# Jika berhasil, berarti akses sudah benar
```

### Step 3: Setup PM2 untuk User agrowtek

```bash
# Pastikan PM2 terinstall untuk user agrowtek
npm install -g pm2

# Setup PM2 startup
pm2 startup systemd -u agrowtek --hp /home/agrowtek

# Follow instructions yang muncul (biasanya perlu run command dengan sudo)
```

---

## Opsi 2: Gunakan Home Directory (Lebih Mudah, Kurang Ideal)

Jika tidak bisa akses `/var/www`, bisa pakai home directory user.

### Step 1: Update GitHub Actions Workflow

Workflow sudah diupdate untuk otomatis fallback ke home directory jika `/var/www` tidak accessible.

### Step 2: Setup di Home Directory

```bash
# Login sebagai agrowtek
ssh -i fadelaryap.pem agrowtek@your-vps-ip

# Buat direktori aplikasi
mkdir -p ~/splitbill-app
cd ~/splitbill-app

# Setup aplikasi
git clone <your-repo-url> .
npm install
npx prisma generate
npx prisma db push
npm run build

# Start dengan PM2
pm2 start npm --name "splitbill-app" -- start
pm2 save
```

### Step 3: Update Nginx Configuration

Jika pakai home directory, update Nginx config:

```bash
sudo nano /etc/nginx/sites-available/splitbill
```

Ubah proxy_pass ke port yang benar (biasanya tetap 3000):

```nginx
location / {
    proxy_pass http://localhost:3000;
    # ... rest of config
}
```

---

## Opsi 3: Setup dengan Sudo (Hybrid)

Bisa setup permissions hanya untuk direktori aplikasi saja.

### Step 1: Buat Direktori dengan Sudo

```bash
# Login sebagai agrowtek
ssh -i fadelaryap.pem agrowtek@your-vps-ip

# Buat direktori dengan sudo
sudo mkdir -p /var/www/splitbill-app
sudo chown -R agrowtek:agrowtek /var/www/splitbill-app
sudo chmod -R 755 /var/www/splitbill-app
```

### Step 2: Setup Sudoers (Optional - untuk otomatis)

Jika ingin user agrowtek bisa create directory tanpa password:

```bash
# Edit sudoers (HATI-HATI!)
sudo visudo

# Tambahkan baris ini (ganti agrowtek dengan username yang benar):
agrowtek ALL=(ALL) NOPASSWD: /bin/mkdir -p /var/www/splitbill-app
agrowtek ALL=(ALL) NOPASSWD: /bin/chown -R agrowtek\:agrowtek /var/www/splitbill-app
```

**PENTING**: Hati-hati edit sudoers, salah edit bisa lock out akses!

---

## Rekomendasi

**Untuk Production:**
- **Opsi 1** (Setup permissions di /var/www) - Best practice
- Direktori `/var/www` adalah standard untuk web applications
- Lebih mudah untuk maintenance dan backup

**Untuk Development/Testing:**
- **Opsi 2** (Home directory) - Lebih mudah
- Tidak perlu setup permissions
- Workflow sudah support fallback otomatis

---

## Verifikasi Setup

Setelah setup, test dengan:

```bash
# Test akses
cd /var/www/splitbill-app  # atau ~/splitbill-app
ls -la

# Test write
touch test.txt
rm test.txt

# Test PM2
pm2 status
pm2 logs splitbill-app
```

---

## Troubleshooting

### Error: Permission Denied

```bash
# Cek ownership
ls -la /var/www/splitbill-app

# Fix ownership
sudo chown -R agrowtek:agrowtek /var/www/splitbill-app
```

### Error: Cannot create directory

```bash
# Cek permissions parent directory
ls -ld /var/www

# Fix jika perlu
sudo chmod 755 /var/www
```

### Error: PM2 not found

```bash
# Install PM2 untuk user agrowtek
npm install -g pm2

# Atau install dengan sudo (tidak recommended)
sudo npm install -g pm2
```

---

## Quick Setup Script

Jalankan script ini di VPS (sebagai root atau dengan sudo):

```bash
#!/bin/bash
# Setup permissions untuk user agrowtek

APP_DIR="/var/www/splitbill-app"
USER="agrowtek"

# Buat direktori
mkdir -p "$APP_DIR"

# Set ownership
chown -R "$USER:$USER" "$APP_DIR"

# Set permissions
chmod -R 755 "$APP_DIR"

echo "✅ Setup completed! Directory: $APP_DIR"
echo "✅ Owner: $USER"
echo "✅ Permissions: 755"
```

Save sebagai `setup-permissions.sh` dan jalankan:
```bash
chmod +x setup-permissions.sh
sudo ./setup-permissions.sh
```


