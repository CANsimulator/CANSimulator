import sys
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

# Add parent directory to path to import config
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from config import settings
except ImportError:
    # Fallback defaults if config.py doesn't exist yet
    class MockSettings:
        DEV_SERVER_HOST = os.getenv('DEV_SERVER_HOST', 'localhost')
        DEV_SERVER_PORT = int(os.getenv('DEV_SERVER_PORT', 5173))
        DEV_SERVER_URL = f'http://{DEV_SERVER_HOST}:{DEV_SERVER_PORT}'
        SIMULATOR_HEADLESS = os.getenv('SIMULATOR_HEADLESS', 'True').lower() == 'true'
    settings = MockSettings()


def test_panning():
    headless = settings.SIMULATOR_HEADLESS
    dev_url = f"{settings.DEV_SERVER_URL}/CANSimulator/physical"
    
    print(f"[TEST] Panning test starting...")
    print(f"[CONFIG] Dev server: {settings.DEV_SERVER_URL}")
    print(f"[CONFIG] Target URL: {dev_url}")
    print(f"[CONFIG] Headless mode: {headless}")
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        # Navigate to the physical layer page
        print(f"[BROWSER] Navigating to {dev_url}...")
        try:
            page.goto(dev_url, timeout=30000)
            page.wait_for_load_state('networkidle')
        except Exception as e:
            print(f"[ERROR] Navigation failed: {e}")
            browser.close()
            sys.exit(1)
        
        canvas = page.locator('canvas[role="img"]')
        try:
            canvas.wait_for(state='visible', timeout=10000)
        except Exception as e:
            print("Canvas not found!")
            browser.close()
            sys.exit(1)
            
        # Get canvas center and move away from possible markers (trigger line is usually near center V)
        box = canvas.bounding_box()
        cx = box['x'] + box['width'] * 0.7 
        cy = box['y'] + box['height'] * 0.8
        
        def get_cursor():
            return page.evaluate("window.getComputedStyle(document.querySelector('canvas[role=\"img\"]')).cursor")

        print(f"Initial cursor: {get_cursor()}")

        # 1. Left-click drag (No Ctrl) - Should NOT pan, cursor should stay crosshair
        print("Testing Left-click (no Ctrl)...")
        page.mouse.move(cx, cy)
        page.mouse.down(button='left')
        page.mouse.move(cx + 50, cy + 50)
        cursor_during = get_cursor()
        page.mouse.up(button='left')
        print(f"Cursor during left-click drag: {cursor_during}")
        if cursor_during == 'grabbing':
            print("FAILURE: Left-click (no Ctrl) caused panning!")
            sys.exit(1)

        # 2. Ctrl + Left-click drag - Should pan, cursor should be 'grabbing'
        print("\nTesting Ctrl + Left-click...")
        page.keyboard.down('Control')
        # Move mouse to trigger update
        page.mouse.move(cx + 1, cy + 1)
        cursor_held = get_cursor()
        print(f"Cursor with Ctrl held: {cursor_held}")
        
        page.mouse.down(button='left')
        # Move mouse to trigger update in handlePointerMove
        page.mouse.move(cx + 10, cy + 10)
        cursor_panning = get_cursor()
        page.mouse.move(cx + 50, cy + 50)
        page.mouse.up(button='left')
        page.keyboard.up('Control')
        print(f"Cursor during Ctrl+Left drag: {cursor_panning}")
        
        # Note: 'grab' might only show if mouse moves after Ctrl is pressed
        if cursor_held != 'grab':
            print(f"WARNING: Ctrl held showed {cursor_held} instead of 'grab'")
            # This might happen if move event didn't fire correctly in headless, 
            # but let's see.
            
        if cursor_panning != 'grabbing':
            print("FAILURE: Ctrl+Left drag did not show 'grabbing' cursor")
            sys.exit(1)

        # 3. Right-click drag - Should pan
        print("\nTesting Right-click...")
        page.mouse.move(cx, cy)
        page.mouse.down(button='right')
        cursor_right = get_cursor()
        page.mouse.move(cx + 50, cy + 50)
        page.mouse.up(button='right')
        print(f"Cursor during Right drag: {cursor_right}")
        if cursor_right != 'grabbing':
            print("FAILURE: Right drag did not pan!")
            sys.exit(1)

        print("\nSUCCESS: All panning controls verified.")
        browser.close()

if __name__ == "__main__":
    test_panning()
