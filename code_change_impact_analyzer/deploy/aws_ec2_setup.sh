#!/usr/bin/env bash
# ==============================================================================
# AWS EC2 Setup Script for Code Change Impact Analyzer
# Ubuntu 22.04 LTS / 24.04 LTS
# ==============================================================================
set -e

echo "==> Updating system packages..."
sudo apt-get update -y && sudo apt-get upgrade -y

echo "==> Installing Python 3.10+, pip, venv, git, nginx, and certbot..."
sudo apt-get install -y python3 python3-pip python3-venv git nginx certbot python3-certbot-nginx

echo "==> Setting up application directory..."
APP_DIR="/home/ubuntu/code_change_impact_analyzer"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

echo "==> Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip setuptools wheel
pip install -r requirements.txt

echo "==> Setting up systemd service..."
sudo cp deploy/code_change_impact_analyzer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable code_change_impact_analyzer
sudo systemctl start code_change_impact_analyzer

echo "==> Configuring Nginx..."
sudo cp deploy/nginx.conf /etc/nginx/sites-available/code_change_impact_analyzer
sudo ln -sf /etc/nginx/sites-available/code_change_impact_analyzer /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo "==> Setup completed successfully!"
echo "To configure SSL/TLS via Let's Encrypt, run:"
echo "sudo certbot --nginx -d yourdomain.com"
