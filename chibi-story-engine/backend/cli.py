"""Operator commands: python -m backend.cli <command>."""
from __future__ import annotations

import argparse
import getpass
import os
import sys

from .db import Database
from .services import auth
from .settings import get_settings


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="backend.cli")
    sub = parser.add_subparsers(dest="command", required=True)
    cu = sub.add_parser("create-user", help="create a user; the password is read from CSAE_USER_PASSWORD or a prompt")
    cu.add_argument("email")
    cu.add_argument("--role", default="admin", choices=["admin", "producer", "reviewer", "viewer"])
    serve = sub.add_parser("serve", help="run the API server")
    serve.add_argument("--host", default="127.0.0.1")
    serve.add_argument("--port", type=int, default=8000)
    args = parser.parse_args(argv)

    settings = get_settings()
    if args.command == "create-user":
        password = os.environ.get("CSAE_USER_PASSWORD") or getpass.getpass("Password: ")
        if len(password) < 10:
            print("Password must be at least 10 characters", file=sys.stderr)
            return 2
        db = Database(settings.database_url)
        with db.transaction() as session:
            user = auth.create_user(session, args.email, password, args.role)
            print(f"created {user.role} {user.email}")
        return 0
    if args.command == "serve":
        import uvicorn

        from .app import create_app
        uvicorn.run(create_app(settings), host=args.host, port=args.port, log_config=None)
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
