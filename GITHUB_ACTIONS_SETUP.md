# Setup GitHub Actions Secrets - Panduan Lengkap

Panduan detail untuk mengkonfigurasi GitHub Actions secrets untuk deployment otomatis ke VPS.

## Secrets yang Diperlukan

### 1. VPS_HOST
**Value**: IP address VPS atau domain
- Contoh: `123.456.789.0` atau `indomiekor.net`
- **Rekomendasi**: Pakai IP address untuk lebih cepat dan reliable

### 2. VPS_USER
**Value**: Username SSH untuk login ke VPS
- **Opsi**:
  - `agrowtek` - Jika ini user yang biasa dipakai untuk login
  - `root` - Jika ingin pakai root (tidak direkomendasikan untuk security)
- **Rekomendasi**: Pakai `agrowtek` jika user tersebut sudah ada dan memiliki akses ke `/var/www/splitbill-app`

### 3. VPS_PORT
**Value**: Port SSH
- Default: `22`
- **Rekomendasi**: Pakai `22` kecuali VPS dikonfigurasi dengan port custom

### 4. VPS_SSH_KEY
**Value**: Private SSH key untuk authentication
- **Opsi A (Recommended)**: Buat SSH key dedicated untuk GitHub Actions
- **Opsi B**: Pakai existing key (fadelaryap.pem) - kurang aman tapi lebih mudah

### 5. DATABASE_URL
**Value**: Connection string database
- SQLite: `file:./prod.db`
- PostgreSQL: `postgresql://user:password@localhost:5432/splitbill?schema=public`

### 6. JWT_SECRET
**Value**: Random secret untuk JWT tokens
- Generate dengan: `openssl rand -base64 32`
- Minimal 32 karakter

### 7. NEXTAUTH_URL
**Value**: URL domain aplikasi
- Contoh: `https://indomiekor.net`

---

## Opsi 1: Pakai Existing SSH Key (Lebih Mudah)

Jika Anda sudah punya key pair `fadelaryap.pem` yang dipakai untuk login ke VPS:

### Step 1: Convert .pem ke format yang bisa dipakai

```bash
# Di local machine (Windows)
# Buka PowerShell atau Git Bash

# Convert .pem ke format standard (jika perlu)
# File .pem biasanya sudah dalam format yang benar
```

### Step 2: Copy Private Key ke GitHub Secrets

1. Buka file `fadelaryap.pem` dengan text editor
2. Copy **SEMUA** isinya termasuk:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   [isi key]
   -----END RSA PRIVATE KEY-----
   ```
3. Paste ke GitHub Secret `VPS_SSH_KEY`

### Step 3: Pastikan Public Key ada di VPS

```bash
# SSH ke VPS dengan key yang ada
ssh -i fadelaryap.pem agrowtek@your-vps-ip

# Cek apakah public key sudah di authorized_keys
cat ~/.ssh/authorized_keys

# Jika belum ada, tambahkan public key dari fadelaryap.pem
# (Extract public key dari private key)
ssh-keygen -y -f fadelaryap.pem >> ~/.ssh/authorized_keys
```

### Step 4: Test SSH Connection

```bash
# Test dari local machine
ssh -i fadelaryap.pem agrowtek@your-vps-ip

# Jika berhasil, berarti key bisa dipakai
```

**Kelemahan Opsi 1:**
- Key yang sama dipakai untuk personal access dan CI/CD
- Jika key compromised, semua akses terpengaruh
- Kurang secure untuk production

---

## Opsi 2: Buat SSH Key Dedicated untuk GitHub Actions (Recommended)

Ini lebih aman karena key terpisah untuk CI/CD.

### Step 1: Generate SSH Key Baru di VPS

```bash
# SSH ke VPS
ssh -i fadelaryap.pem agrowtek@your-vps-ip

# Generate key pair baru
ssh-keygen -t rsa -b 4096 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# Ini akan membuat:
# - ~/.ssh/github_actions_deploy (private key)
# - ~/.ssh/github_actions_deploy.pub (public key)
```

### Step 2: Tambahkan Public Key ke authorized_keys

```bash
# Di VPS
cat ~/.ssh/github_actions_deploy.pub >> ~/.ssh/authorized_keys

# Set permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Step 3: Download Private Key ke Local Machine

```bash
# Dari VPS, copy private key
cat ~/.ssh/github_actions_deploy

# Copy output lengkap (termasuk BEGIN dan END)
# Paste ke file lokal atau langsung ke GitHub Secret
```

**Atau download via SCP:**

```bash
# Dari local machine (Windows dengan Git Bash atau WSL)
scp -i fadelaryap.pem agrowtek@your-vps-ip:~/.ssh/github_actions_deploy ./github_actions_deploy

# Buka file dan copy isinya
cat github_actions_deploy
```

### Step 4: Copy Private Key ke GitHub Secret

1. Buka GitHub repository → Settings → Secrets and variables → Actions
2. Klik "New repository secret"
3. Name: `VPS_SSH_KEY`
4. Value: Paste seluruh isi private key (termasuk `-----BEGIN RSA PRIVATE KEY-----` dan `-----END RSA PRIVATE KEY-----`)
5. Klik "Add secret"

### Step 5: Test Connection

```bash
# Test dari local machine dengan key baru
ssh -i github_actions_deploy agrowtek@your-vps-ip

# Jika berhasil, berarti setup benar
```

**Keuntungan Opsi 2:**
- Key terpisah untuk CI/CD
- Lebih secure
- Bisa di-revoke tanpa mempengaruhi personal access
- Best practice untuk production

---

## Konfigurasi Lengkap GitHub Secrets

Setelah memilih opsi, setup semua secrets:

| Secret Name | Value | Contoh |
|------------|-------|--------|
| `VPS_HOST` | IP VPS | `123.456.789.0` |
| `VPS_USER` | Username SSH | `agrowtek` |
| `VPS_PORT` | Port SSH | `22` |
| `VPS_SSH_KEY` | Private SSH key | `-----BEGIN RSA PRIVATE KEY-----...` |
| `DATABASE_URL` | Database connection | `file:./prod.db` |
| `JWT_SECRET` | JWT secret | Generate dengan `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Domain URL | `https://indomiekor.net` |

---

## Verifikasi Setup

### 1. Test SSH dari Local

```bash
# Dengan existing key
ssh -i fadelaryap.pem agrowtek@your-vps-ip

# Atau dengan key baru
ssh -i github_actions_deploy agrowtek@your-vps-ip
```

### 2. Test GitHub Actions

1. Push perubahan kecil ke repository
2. Buka GitHub → Actions tab
3. Lihat workflow "Deploy to VPS"
4. Cek logs untuk memastikan tidak ada error

### 3. Cek Permissions di VPS

Pastikan user `agrowtek` punya akses ke direktori aplikasi:

```bash
# Di VPS
sudo mkdir -p /var/www/splitbill-app
sudo chown -R agrowtek:agrowtek /var/www/splitbill-app

# Test write access
touch /var/www/splitbill-app/test.txt
rm /var/www/splitbill-app/test.txt
```

---

## Troubleshooting

### Error: Permission Denied (publickey)

**Penyebab**: SSH key tidak match atau tidak ada di authorized_keys

**Solusi**:
```bash
# Di VPS, cek authorized_keys
cat ~/.ssh/authorized_keys

# Pastikan public key dari private key yang dipakai ada di sini
# Extract public key dari private key:
ssh-keygen -y -f /path/to/private/key
```

### Error: Could not resolve hostname

**Penyebab**: VPS_HOST salah atau tidak bisa diakses

**Solusi**: 
- Pastikan IP address benar
- Test dengan: `ping your-vps-ip`
- Atau pakai IP langsung daripada domain

### Error: Permission Denied (directory)

**Penyebab**: User tidak punya akses ke `/var/www/splitbill-app`

**Solusi**:
```bash
# Di VPS
sudo chown -R agrowtek:agrowtek /var/www/splitbill-app
sudo chmod -R 755 /var/www/splitbill-app
```

### Error: PM2 command not found

**Penyebab**: PM2 tidak terinstall atau tidak di PATH

**Solusi**:
```bash
# Install PM2 globally
sudo npm install -g pm2

# Atau install untuk user agrowtek
npm install -g pm2
```

---

## Rekomendasi Final

**Untuk setup Anda:**

1. **VPS_HOST**: IP address VPS (lebih reliable)
2. **VPS_USER**: `agrowtek` (jika user ini sudah ada dan punya akses)
3. **VPS_PORT**: `22` (default)
4. **VPS_SSH_KEY**: 
   - **Opsi A (Cepat)**: Pakai `fadelaryap.pem` yang existing
   - **Opsi B (Aman)**: Buat key baru dedicated untuk GitHub Actions

**Saran**: Untuk production, lebih baik buat key baru (Opsi 2) untuk security yang lebih baik.

---

## Quick Setup Checklist

- [ ] VPS_HOST: IP address VPS
- [ ] VPS_USER: `agrowtek`
- [ ] VPS_PORT: `22`
- [ ] VPS_SSH_KEY: Private key (existing atau baru)
- [ ] DATABASE_URL: `file:./prod.db` atau PostgreSQL
- [ ] JWT_SECRET: Generated dengan `openssl rand -base64 32`
- [ ] NEXTAUTH_URL: `https://indomiekor.net`
- [ ] Test SSH connection dari local
- [ ] Test GitHub Actions workflow
- [ ] Verify deployment berhasil



