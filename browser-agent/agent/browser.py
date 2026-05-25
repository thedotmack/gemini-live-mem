"""Async Playwright wrapper for the interactive browser agent.

A single chromium Page is launched lazily on first use so the module can be
imported (and the server can run in demo mode) without chromium installed.

Playwright async API: https://playwright.dev/python/docs/api/class-playwright
"""

from __future__ import annotations

import base64


class BrowserController:
    """Drives a single chromium Page. Lazy-launches on first use."""

    def __init__(self) -> None:
        self._playwright = None
        self._browser = None
        self._page = None

    async def start(self) -> None:
        """Launch chromium and open a single page. Idempotent."""
        if self._page is not None:
            return
        # Imported here (not at module top) so demo mode never requires
        # playwright/chromium to be installed.
        from playwright.async_api import async_playwright

        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(headless=True)
        self._page = await self._browser.new_page()

    async def _ensure(self):
        if self._page is None:
            await self.start()
        return self._page

    async def navigate(self, url: str) -> None:
        page = await self._ensure()
        await page.goto(url, wait_until="domcontentloaded")

    async def click(self, selector: str) -> None:
        page = await self._ensure()
        await page.click(selector)

    async def type_text(self, selector: str, text: str) -> None:
        page = await self._ensure()
        await page.fill(selector, text)

    async def screenshot(self) -> str:
        """Return a `data:image/png;base64,...` data URL of the current page."""
        page = await self._ensure()
        png_bytes = await page.screenshot(type="png")
        b64 = base64.b64encode(png_bytes).decode("ascii")
        return f"data:image/png;base64,{b64}"

    async def current(self) -> dict:
        """Return {url, title} for the current page."""
        page = await self._ensure()
        return {"url": page.url, "title": await page.title()}

    async def close(self) -> None:
        if self._browser is not None:
            await self._browser.close()
            self._browser = None
        if self._playwright is not None:
            await self._playwright.stop()
            self._playwright = None
        self._page = None
