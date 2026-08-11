# SSL Certificates Directory

This directory is used for **manual SSL certificates**.

If you place your certificate and key files here with the exact names:
- `cert.pem`
- `key.pem`

The `./hcs.sh` boot script will automatically detect them, disable the automatic Let's Encrypt generation, and configure the proxy to serve your custom certificates.

## Automatic Mode (Default)
If you leave this folder empty (or do not provide both files), the application will default to automatically generating and renewing free SSL certificates for your domain using **Let's Encrypt (ACME)**.

*Note: The generated Let's Encrypt certificates are stored safely out of sight in a persistent Docker volume (`acme-data`), not in this folder.*
