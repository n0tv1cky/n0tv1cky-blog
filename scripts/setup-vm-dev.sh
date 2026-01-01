#!/bin/bash
# Quick VM IP configuration script for development

set -e

echo "=================================="
echo "VM Development Setup"
echo "=================================="
echo ""

# Get current IP
CURRENT_IP=$(hostname -I | awk '{print $1}' 2>/dev/null || echo "")

if [ -z "$CURRENT_IP" ]; then
    echo "Could not detect VM IP automatically."
    echo "Please enter your VM IP address manually:"
    read VM_IP
else
    echo "Detected VM IP: $CURRENT_IP"
    echo ""
    echo "Options:"
    echo "1) Use detected IP: $CURRENT_IP"
    echo "2) Use localhost (local development)"
    echo "3) Enter custom IP"
    echo ""
    read -p "Choose option (1-3): " choice
    
    case $choice in
        1)
            VM_IP=$CURRENT_IP
            ;;
        2)
            VM_IP="localhost"
            ;;
        3)
            read -p "Enter custom IP: " VM_IP
            ;;
        *)
            echo "Invalid option. Using localhost."
            VM_IP="localhost"
            ;;
    esac
fi

echo ""
echo "Configuring development environment for: $VM_IP"
echo ""

# Update .env.dev
if [ -f .env.dev ]; then
    echo "Updating .env.dev..."
    
    # Backup original
    cp .env.dev .env.dev.backup
    
    # Update HOST variable (the single source of truth)
    sed -i "s|^HOST=.*|HOST=$VM_IP|g" .env.dev
    
    echo "✓ .env.dev updated"
else
    echo "Error: .env.dev not found!"
    exit 1
fi

echo ""
echo "=================================="
echo "Configuration Complete!"
echo "=================================="
echo ""
echo "URLs configured:"
echo "  Frontend: http://$VM_IP:3000"
echo "  Backend:  http://$VM_IP:8000"
echo ""

if [ "$VM_IP" != "localhost" ]; then
    echo "Firewall setup (if needed):"
    echo "  sudo ufw allow 3000/tcp comment 'Next.js dev'"
    echo "  sudo ufw allow 8000/tcp comment 'FastAPI dev'"
    echo ""
fi

echo "To start development:"
echo "  sudo docker compose -f compose.dev.yaml up --build"
echo ""
echo "Access from your browser:"
echo "  http://$VM_IP:3000"
echo ""
