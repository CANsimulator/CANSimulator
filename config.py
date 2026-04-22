"""
Environment configuration for CAN Simulator Python scripts.
Handles loading and validation of environment variables.

Usage:
    from config import settings
    dev_url = settings.DEV_SERVER_URL
    port = settings.DEV_SERVER_PORT
"""

import os
from pathlib import Path
from typing import Optional
from dataclasses import dataclass


def get_env_str(key: str, default: str = '') -> str:
    """Get string environment variable with optional default."""
    return os.getenv(key, default)


def get_env_int(key: str, default: int = 0) -> int:
    """Get integer environment variable with optional default."""
    try:
        return int(os.getenv(key, default))
    except (ValueError, TypeError):
        return default


def get_env_bool(key: str, default: bool = False) -> bool:
    """Get boolean environment variable with optional default."""
    value = os.getenv(key, str(default)).lower()
    return value in ('true', '1', 'yes', 'on')


@dataclass
class Settings:
    """Application settings loaded from environment variables."""

    # ============================================================
    # Frontend/Dev Server
    # ============================================================
    DEV_SERVER_HOST: str = get_env_str('DEV_SERVER_HOST', 'localhost')
    DEV_SERVER_PORT: int = get_env_int('DEV_SERVER_PORT', 5173)
    
    @property
    def DEV_SERVER_URL(self) -> str:
        """Construct full dev server URL."""
        return f'http://{self.DEV_SERVER_HOST}:{self.DEV_SERVER_PORT}'

    # ============================================================
    # API Configuration
    # ============================================================
    API_BASE_URL: str = get_env_str('API_BASE_URL', 'http://localhost:5173')
    API_TIMEOUT: int = get_env_int('API_TIMEOUT', 30)  # seconds

    # ============================================================
    # Backend Configuration
    # ============================================================
    BACKEND_HOST: str = get_env_str('BACKEND_HOST', 'localhost')
    BACKEND_PORT: int = get_env_int('BACKEND_PORT', 3000)
    
    @property
    def BACKEND_URL(self) -> str:
        """Construct full backend URL."""
        return f'http://{self.BACKEND_HOST}:{self.BACKEND_PORT}'

    # ============================================================
    # CAN Simulator Settings
    # ============================================================
    CAN_INTERFACE: str = get_env_str('CAN_INTERFACE', 'can0')
    CAN_BAUDRATE: int = get_env_int('CAN_BAUDRATE', 500000)
    SIMULATOR_DEBUG: bool = get_env_bool('SIMULATOR_DEBUG', False)
    SIMULATOR_HEADLESS: bool = get_env_bool('SIMULATOR_HEADLESS', True)

    # ============================================================
    # Storage and Caching
    # ============================================================
    CACHE_DIR: Path = Path(get_env_str('CACHE_DIR', './cache'))
    DATA_DIR: Path = Path(get_env_str('DATA_DIR', './data'))

    # ============================================================
    # Logging
    # ============================================================
    LOG_LEVEL: str = get_env_str('LOG_LEVEL', 'INFO')
    LOG_FILE: Optional[Path] = Path(get_env_str('LOG_FILE', '')) if get_env_str('LOG_FILE') else None

    def __post_init__(self):
        """Create necessary directories."""
        self.CACHE_DIR.mkdir(parents=True, exist_ok=True)
        self.DATA_DIR.mkdir(parents=True, exist_ok=True)
        if self.LOG_FILE:
            self.LOG_FILE.parent.mkdir(parents=True, exist_ok=True)

    def get_playwright_url(self, path: str = '') -> str:
        """Construct Playwright navigation URL."""
        url = self.DEV_SERVER_URL
        if path:
            url = f"{url}/{path.lstrip('/')}"
        return url

    def __repr__(self) -> str:
        """Pretty print settings."""
        return (
            f'Settings(\n'
            f'  DEV_SERVER_URL={self.DEV_SERVER_URL}\n'
            f'  API_BASE_URL={self.API_BASE_URL}\n'
            f'  CAN_INTERFACE={self.CAN_INTERFACE}\n'
            f'  CAN_BAUDRATE={self.CAN_BAUDRATE}\n'
            f'  SIMULATOR_HEADLESS={self.SIMULATOR_HEADLESS}\n'
            f')'
        )


# Singleton settings instance
settings = Settings()

if __name__ == '__main__':
    # Print current configuration
    print(settings)
