#!/bin/bash

# AWS Lightsail Deployment Script
# Prerequisites: AWS CLI installed and configured (aws configure)

set -e

echo "🚀 Deploying Recipe App to AWS Lightsail"
echo "========================================"

# Configuration
INSTANCE_NAME="recipe-app-$(date +%s)"
REGION="us-east-1"  # Change to your preferred region
BLUEPRINT_ID="amazon_linux_2"
BUNDLE_ID="nano_2_0"  # $3.50/month - upgrade to micro_2_0 ($5) or small_2_0 ($10) for production

echo "Creating Lightsail instance: $INSTANCE_NAME"

# Create Lightsail instance
aws lightsail create-instances \
  --instance-names "$INSTANCE_NAME" \
  --availability-zone "${REGION}a" \
  --blueprint-id "$BLUEPRINT_ID" \
  --bundle-id "$BUNDLE_ID" \
  --region "$REGION"

echo "Waiting for instance to be running..."
aws lightsail wait instance-running \
  --instance-name "$INSTANCE_NAME" \
  --region "$REGION"

echo "Opening ports 80, 443, 3000..."
aws lightsail open-instance-public-ports \
  --port-info fromPort=80,toPort=80,protocol=tcp \
  --instance-name "$INSTANCE_NAME" \
  --region "$REGION"

aws lightsail open-instance-public-ports \
  --port-info fromPort=443,toPort=443,protocol=tcp \
  --instance-name "$INSTANCE_NAME" \
  --region "$REGION"

aws lightsail open-instance-public-ports \
  --port-info fromPort=3000,toPort=3000,protocol=tcp \
  --instance-name "$INSTANCE_NAME" \
  --region "$REGION"

# Get instance IP
INSTANCE_IP=$(aws lightsail get-instance \
  --instance-name "$INSTANCE_NAME" \
  --region "$REGION" \
  --query 'instance.publicIpAddress' \
  --output text)

echo ""
echo "✅ Instance created successfully!"
echo "=================================="
echo "Instance Name: $INSTANCE_NAME"
echo "Public IP: $INSTANCE_IP"
echo ""
echo "Next steps:"
echo "1. SSH into instance:"
echo "   aws lightsail get-instance-access-details --instance-name $INSTANCE_NAME --region $REGION"
echo ""
echo "2. Or use the browser-based SSH from AWS Console"
echo ""
echo "3. Run the setup commands (see deploy-lightsail-setup.sh)"
echo ""
echo "4. Access your API at: http://$INSTANCE_IP:3000/health"
