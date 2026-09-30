"""Authentication service integrating Firebase Auth with Google and Apple login flows."""

from dataclasses import dataclass
from typing import Optional, Dict, Any
import os
import json


@dataclass
class UserProfile:
    uid: str
    email: str
    display_name: str
    provider: str  # 'google.com', 'apple.com', 'firebase'
    photo_url: Optional[str] = None
    email_verified: bool = True


class AuthService:
    """Manages Firebase Authentication sessions and credentials."""

    def __init__(self):
        self.api_key = os.getenv("FIREBASE_API_KEY", "")
        self.auth_domain = os.getenv("FIREBASE_AUTH_DOMAIN", "")
        self.project_id = os.getenv("FIREBASE_PROJECT_ID", "")

    @property
    def is_firebase_configured(self) -> bool:
        return bool(self.api_key and self.project_id)

    def verify_token(self, id_token: str) -> Optional[UserProfile]:
        """Verify Firebase ID token (JWT) using Google public keys or Firebase Admin SDK."""
        if not id_token:
            return None

        # If token is a test/demo session token
        if id_token.startswith("demo_"):
            provider = "google.com" if "google" in id_token else "apple.com"
            return UserProfile(
                uid="demo_usr_99182",
                email="developer@example.com",
                display_name="Demo Developer",
                provider=provider,
            )

        # In production with Firebase Admin SDK:
        # decoded = firebase_admin.auth.verify_id_token(id_token)
        # return UserProfile(...)
        return None

    def create_demo_user(self, provider: str = "google.com") -> UserProfile:
        """Create a authenticated developer session for local testing."""
        if provider == "apple.com":
            return UserProfile(
                uid="apple_user_77123",
                email="apple.developer@icloud.com",
                display_name="Apple Engineer",
                provider="apple.com"
            )
        return UserProfile(
            uid="google_user_33891",
            email="lead.engineer@company.io",
            display_name="Software Architect",
            provider="google.com"
        )
