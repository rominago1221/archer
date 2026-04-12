"""Shared test configuration — credentials from environment variables."""
import os

# Test credentials — loaded from environment, with fallbacks for CI
TEST_US_EMAIL = os.environ.get("TEST_US_EMAIL", "test@jasper.legal")
TEST_US_PASSWORD = os.environ.get("TEST_US_PASSWORD", "JasperPro2026!")
TEST_BE_EMAIL = os.environ.get("TEST_BE_EMAIL", "belgium@jasper.legal")
TEST_BE_PASSWORD = os.environ.get("TEST_BE_PASSWORD", "JasperPro2026!")
TEST_ATTORNEY_EMAIL = os.environ.get("TEST_ATTORNEY_EMAIL", "attorney@jasper.com")
TEST_ATTORNEY_PASSWORD = os.environ.get("TEST_ATTORNEY_PASSWORD", "attorney123")
TEST_ADMIN_SECRET = os.environ.get("TEST_ADMIN_SECRET", "jasper-admin-2026")

US_PRO_USER = {"email": TEST_US_EMAIL, "password": TEST_US_PASSWORD}
BELGIUM_PRO_USER = {"email": TEST_BE_EMAIL, "password": TEST_BE_PASSWORD}
ATTORNEY_USER = {"email": TEST_ATTORNEY_EMAIL, "password": TEST_ATTORNEY_PASSWORD}
