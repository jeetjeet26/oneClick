"""Allow running as python -m meta-ads"""
from .server import main
import asyncio

if __name__ == "__main__":
    asyncio.run(main())













