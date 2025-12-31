#!/bin/bash

# Certificate Extraction Script for API Gateway
# This script extracts the SSL certificate from your API Gateway endpoint
# and generates the SHA256 fingerprint needed for certificate pinning

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if URL is provided
if [ -z "$1" ]; then
    print_error "Usage: $0 <API_GATEWAY_URL>"
    echo ""
    echo "Example:"
    echo "  $0 https://xxxxx.execute-api.us-east-1.amazonaws.com/prod"
    echo ""
    echo "The URL should be your API Gateway endpoint (without /api at the end)"
    exit 1
fi

API_URL="$1"

# Remove trailing slash if present
API_URL="${API_URL%/}"

# Extract hostname and port
if [[ $API_URL =~ ^https?://([^:/]+)(:([0-9]+))? ]]; then
    HOSTNAME="${BASH_REMATCH[1]}"
    PORT="${BASH_REMATCH[3]:-443}"
else
    print_error "Invalid URL format: $API_URL"
    exit 1
fi

print_info "Extracting certificate from: $API_URL"
print_info "Hostname: $HOSTNAME"
print_info "Port: $PORT"
echo ""

# Create temporary directory
TMP_DIR=$(mktemp -d)
CERT_FILE="$TMP_DIR/certificate.pem"
CHAIN_FILE="$TMP_DIR/chain.pem"

# Cleanup function
cleanup() {
    rm -rf "$TMP_DIR"
}
trap cleanup EXIT

# Extract certificate chain
print_info "Connecting to server and extracting certificate chain..."
if ! openssl s_client -connect "$HOSTNAME:$PORT" -showcerts < /dev/null 2>/dev/null | \
     openssl x509 -outform PEM > "$CERT_FILE" 2>/dev/null; then
    print_error "Failed to connect to $HOSTNAME:$PORT"
    print_error "Make sure the URL is correct and the server is accessible"
    exit 1
fi

# Extract full chain (for backup pins)
print_info "Extracting full certificate chain..."
openssl s_client -connect "$HOSTNAME:$PORT" -showcerts < /dev/null 2>/dev/null | \
    sed -n '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/p' > "$CHAIN_FILE" 2>/dev/null || true

# Generate SHA256 fingerprints
print_info "Generating SHA256 fingerprints..."
echo ""

# Main certificate fingerprint
MAIN_FINGERPRINT=$(openssl x509 -in "$CERT_FILE" -fingerprint -sha256 -noout | cut -d'=' -f2 | tr -d ':')
MAIN_PIN="sha256/$MAIN_FINGERPRINT"

print_success "Main Certificate Pin:"
echo "  $MAIN_PIN"
echo ""

# Extract intermediate certificates for backup pins
print_info "Extracting intermediate certificates for backup pins..."
INTERMEDIATE_COUNT=$(grep -c "BEGIN CERTIFICATE" "$CHAIN_FILE" || echo "0")

if [ "$INTERMEDIATE_COUNT" -gt 1 ]; then
    print_info "Found $INTERMEDIATE_COUNT certificates in chain"
    echo ""
    print_success "Backup Certificate Pins:"
    
    # Extract each certificate from the chain
    csplit -f "$TMP_DIR/cert-" -b "%02d.pem" "$CHAIN_FILE" '/-----BEGIN CERTIFICATE-----/' '{*}' > /dev/null 2>&1 || true
    
    BACKUP_PINS=()
    for cert_file in "$TMP_DIR"/cert-*.pem; do
        if [ -f "$cert_file" ] && [ "$cert_file" != "$CERT_FILE" ]; then
            INTERMEDIATE_FINGERPRINT=$(openssl x509 -in "$cert_file" -fingerprint -sha256 -noout 2>/dev/null | cut -d'=' -f2 | tr -d ':' || echo "")
            if [ -n "$INTERMEDIATE_FINGERPRINT" ] && [ "$INTERMEDIATE_FINGERPRINT" != "$MAIN_FINGERPRINT" ]; then
                BACKUP_PIN="sha256/$INTERMEDIATE_FINGERPRINT"
                BACKUP_PINS+=("$BACKUP_PIN")
                echo "  $BACKUP_PIN"
            fi
        fi
    done
    echo ""
else
    print_warning "Only one certificate found. Consider adding backup pins for certificate rotation."
    echo ""
fi

# Display certificate information
print_info "Certificate Information:"
openssl x509 -in "$CERT_FILE" -noout -subject -dates 2>/dev/null | sed 's/^/  /'
echo ""

# Generate code snippet
print_success "Add these pins to src/utils/security.tsx:"
echo ""
echo "export const CERTIFICATE_PINS: string[] = ["
echo "  '$MAIN_PIN',"
for pin in "${BACKUP_PINS[@]}"; do
    echo "  '$pin',"
done
echo "];"
echo ""
echo "export const CERTIFICATE_PINNING_ENABLED = true;"
echo ""

print_warning "Important Notes:"
echo "  1. Add these pins to src/utils/security.tsx in the CERTIFICATE_PINS array"
echo "  2. Set CERTIFICATE_PINNING_ENABLED = true after adding pins"
echo "  3. Keep backup pins for smooth certificate rotation"
echo "  4. Test the app after enabling pinning to ensure it works"
echo "  5. When your certificate rotates, extract new pins and update the array"
echo ""

print_success "Certificate extraction complete!"

