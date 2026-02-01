#!/bin/bash

# Deployment script for SplitBill App
# This script should be run on the VPS server

set -e

APP_DIR="/var/www/splitbill-app"
SERVICE_NAME="splitbill-app"

echo "🚀 Starting deployment..."

cd $APP_DIR || exit 1

# Pull latest changes (if using git directly)
# git pull origin main

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️  Running database migrations..."
npx prisma db push --skip-generate || true

# Build application
echo "🏗️  Building application..."
npm run build

# Restart PM2 process
echo "🔄 Restarting application..."
pm2 restart $SERVICE_NAME || pm2 start npm --name $SERVICE_NAME -- start

# Save PM2 configuration
pm2 save

echo "✅ Deployment completed successfully!"

