import os

from dotenv import load_dotenv
from sqlalchemy import text
from werkzeug.security import generate_password_hash

from run import app, db


load_dotenv()


def create_admin():
    email = os.getenv("ADMIN_EMAIL", "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD", "")
    name = os.getenv("ADMIN_NAME", "ShopSmart Admin").strip()

    if not email or not password:
        raise RuntimeError(
            "Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env"
        )

    if len(password) < 8:
        raise RuntimeError(
            "ADMIN_PASSWORD must contain at least 8 characters"
        )

    with app.app_context():
        existing = db.session.execute(
            text("SELECT user_id FROM users WHERE email = :email"),
            {"email": email}
        ).first()

        if existing:
            db.session.execute(
                text("""
                    UPDATE users
                    SET name = :name,
                        password = :password,
                        role = 'admin'
                    WHERE email = :email
                """),
                {
                    "name": name,
                    "email": email,
                    "password": generate_password_hash(password)
                }
            )
            db.session.commit()
            print("Admin account updated.")
            return

        db.session.execute(
            text("""
                INSERT INTO users (name, email, password, role)
                VALUES (:name, :email, :password, 'admin')
            """),
            {
                "name": name,
                "email": email,
                "password": generate_password_hash(password)
            }
        )
        db.session.commit()
        print("Admin account created.")


if __name__ == "__main__":
    create_admin()
