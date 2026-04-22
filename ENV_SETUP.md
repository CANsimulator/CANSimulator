# Environment Variables Setup

This guide explains how to use environment variables in the CAN Simulator project.

## Quick Start

### 1. Create `.env.local` file
```bash
cp .env.example .env.local
```

### 2. Edit `.env.local` with your values
```bash
# Windows
notepad .env.local

# macOS/Linux
nano .env.local
```

### 3. Load environment variables

#### For Node.js/Frontend (Automatic)
Vite automatically loads `.env.local` variables with `VITE_` prefix:
```typescript
import { env } from './src/config/env';
console.log(env.devServerUrl); // Uses VITE_DEV_SERVER_* from .env.local
```

#### For Python Scripts
```python
from config import settings
print(settings.DEV_SERVER_URL)  # Uses DEV_SERVER_* from .env.local
```

#### For Testing Scripts
```bash
# Using environment variables directly
DEV_SERVER_PORT=5173 python tests/verify_panning.py

# Or set in .env.local and it's loaded automatically
python tests/verify_panning.py
```

## Environment Variables Reference

### Frontend (Vite)
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL | (required) |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key | (required) |
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key | (required) |
| `VITE_RAZORPAY_PLAN_PRO` | Razorpay Pro plan ID | (required) |
| `VITE_RAZORPAY_PLAN_TEAM` | Razorpay Team plan ID | (required) |
| `VITE_API_BASE_URL` | API base URL | `http://localhost:5173` |
| `VITE_API_TIMEOUT` | API request timeout (ms) | `30000` |
| `VITE_DEV_SERVER_HOST` | Dev server host | `localhost` |
| `VITE_DEV_SERVER_PORT` | Dev server port | `5173` |
| `VITE_CAN_INTERFACE` | CAN interface name | `can0` |
| `VITE_CAN_BAUDRATE` | CAN baudrate | `500000` |
| `VITE_SIMULATOR_DEBUG` | Enable debug logging | `false` |

### Backend/Testing (Python)
| Variable | Description | Default |
|----------|-------------|---------|
| `DEV_SERVER_HOST` | Dev server hostname | `localhost` |
| `DEV_SERVER_PORT` | Dev server port | `5173` |
| `BACKEND_HOST` | Backend server hostname | `localhost` |
| `BACKEND_PORT` | Backend server port | `3000` |
| `API_BASE_URL` | API base URL | `http://localhost:5173` |
| `API_TIMEOUT` | API timeout (seconds) | `30` |
| `CAN_INTERFACE` | CAN interface name | `can0` |
| `CAN_BAUDRATE` | CAN baudrate | `500000` |
| `SIMULATOR_DEBUG` | Enable debug mode | `False` |
| `SIMULATOR_HEADLESS` | Headless browser mode | `True` |
| `CACHE_DIR` | Cache directory path | `./cache` |
| `DATA_DIR` | Data directory path | `./data` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `LOG_FILE` | Log file path | (optional) |

## Using Environment Variables in Code

### Frontend (TypeScript/React)
```typescript
// ✅ Use the env config module
import { env } from '@/config/env';

function MyComponent() {
  return <div>Server: {env.devServerUrl}</div>;
}

// Or access raw values
const url = import.meta.env.VITE_SUPABASE_URL;
```

### Python Scripts
```python
# ✅ Use the settings singleton
from config import settings

print(f"Server: {settings.DEV_SERVER_URL}")
print(f"Timeout: {settings.API_TIMEOUT}s")
print(f"Debug: {settings.SIMULATOR_DEBUG}")

# Create URLs easily
test_url = settings.get_playwright_url('/CANSimulator/physical')
```

### Running Tests with Environment Variables
```bash
# Method 1: Use .env.local (recommended)
python tests/verify_panning.py

# Method 2: Export variables before running
$env:DEV_SERVER_PORT=5173
$env:SIMULATOR_HEADLESS=$true
python tests/verify_panning.py

# Method 3: Pass via command line (Windows PowerShell)
$env:SIMULATOR_DEBUG="True"; python tests/verify_panning.py
```

## .env.local (Git-ignored)
**Never commit `.env.local` to git!** It's already in `.gitignore` but important to remember:
- Contains sensitive credentials (Supabase keys, Razorpay keys)
- Different per developer/environment
- Different for staging/production

## Example .env.local Configuration

```
# Frontend
VITE_SUPABASE_URL=https://project123.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_RAZORPAY_KEY_ID=rzp_test_1234567890
VITE_RAZORPAY_PLAN_PRO=plan_pro_2024
VITE_RAZORPAY_PLAN_TEAM=plan_team_2024

# Development
DEV_SERVER_PORT=5173
DEV_SERVER_HOST=localhost
API_TIMEOUT=30

# CAN Simulator
CAN_INTERFACE=can0
CAN_BAUDRATE=500000
SIMULATOR_DEBUG=False
SIMULATOR_HEADLESS=False

# Logging
LOG_LEVEL=DEBUG
LOG_FILE=./logs/simulator.log
```

## Loading env Variables Without python-dotenv

If you don't have `python-dotenv` installed, environment variables are still available via the OS:

```python
import os

# Manual loading (if .env.local doesn't auto-load)
def load_env_file(filepath='.env.local'):
    """Load .env file manually."""
    if not os.path.exists(filepath):
        return
    with open(filepath) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

load_env_file()
```

## Troubleshooting

### "Environment variable not found"
- Make sure `.env.local` exists (run `cp .env.example .env.local`)
- Verify the variable name matches exactly (case-sensitive on Linux/Mac)
- For frontend vars, they must start with `VITE_` to be exposed

### Python scripts not seeing env variables
- Ensure you're importing from `config` module: `from config import settings`
- Check that your terminal/IDE has loaded the environment (reload if needed)
- Use `python -c "import os; print(os.getenv('DEV_SERVER_PORT'))"` to debug

### Tests failing with wrong URLs
- Check `settings.DEV_SERVER_URL` matches your running server
- Verify port is not already in use: `lsof -i :5173` (Unix) or `netstat -ano | findstr 5173` (Windows)

## Next Steps

1. ✅ Copy `.env.example` to `.env.local`
2. ✅ Fill in your Supabase and Razorpay credentials
3. ✅ Run tests: `python tests/verify_panning.py`
4. ✅ Verify frontend loads: `npm run dev`
