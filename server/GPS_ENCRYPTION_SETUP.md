# GPS Password Encryption Setup

## Overview
GPS passwords are now encrypted using AES-256-CBC encryption before storing in the database. This protects sensitive GPS credentials from unauthorized access.

## Environment Variable Required

Add the following environment variable to your `.env` file:

```bash
GPS_ENCRYPTION_KEY=your_64_character_hex_key_here
```

## Generating Encryption Key

Use Node.js to generate a secure 256-bit (32 bytes) encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output a 64-character hexadecimal string. Copy this value and add it to your `.env` file.

Example output:
```
a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

## Configuration

1. Generate the key (see above)
2. Add to `.env` file:
   ```bash
   GPS_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
   ```
3. Restart the server

## Backwards Compatibility

- If `GPS_ENCRYPTION_KEY` is not set, passwords will be stored in plain text (with a warning)
- Existing plain text passwords will continue to work
- New passwords will be encrypted if the key is configured
- Decryption handles both encrypted and plain text passwords gracefully

## Security Notes

- **Keep the encryption key secret** - treat it like a database password
- **Never commit the key to git** - use environment variables only
- **Backup the key securely** - losing it means encrypted passwords cannot be decrypted
- **Rotate the key periodically** - requires re-encrypting all GPS passwords

## Implementation Details

- Algorithm: AES-256-CBC
- Key size: 256 bits (32 bytes)
- Encrypted format: `{iv}:{encryptedData}` (hex encoded)
- IV (Initialization Vector): 16 bytes, randomly generated per encryption
- Storage field: `gps_password` VARCHAR(256) in vehicles table

## Migration Notes

If you have existing GPS passwords in the database:

1. They will continue to work as plain text
2. When a vehicle is updated, the password will be re-encrypted if the key is configured
3. For bulk migration, run a script to re-encrypt all existing passwords:

```javascript
// Example migration script
import { vehicleService } from './modules/fleet/services/vehicle.service.js';
import { vehicleRepository } from './modules/fleet/repositories/vehicle.repository.js';

const vehicles = await vehicleRepository.findAllWithRelations();
for (const vehicle of vehicles) {
  if (vehicle.gpsPassword && !vehicle.gpsPassword.includes(':')) {
    // Plain text password, re-encrypt it
    await vehicleService.update(vehicle.id, {
      gpsPassword: vehicle.gpsPassword
    });
  }
}
```

## Testing

Test encryption/decryption:

```bash
# Set the key in .env
GPS_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2

# Create a vehicle with GPS password
POST /api/vehicles
{
  "plateNumber": "TEST-001",
  "gpsPassword": "mySecretPassword123"
}

# Verify in database: password should be in format "hexIV:hexEncrypted"
# Retrieve vehicle: password should be decrypted back to original
GET /api/vehicles/{id}
```
