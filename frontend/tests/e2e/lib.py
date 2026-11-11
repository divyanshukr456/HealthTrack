import time, json, os
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

BASE = os.environ.get("FRONTEND_URL", "http://localhost:5500/")
API_BASE = os.environ.get("API_URL", "http://localhost:5000")
SHOTS = os.environ.get("SHOTS_DIR", os.path.join(os.path.dirname(__file__), "screenshots"))
os.makedirs(SHOTS, exist_ok=True)
passed, failed = [], []

def make_driver(w=1360, h=900):
    o = Options(); o.add_argument("-headless")
    if os.environ.get("FIREFOX_BIN"): o.binary_location = os.environ["FIREFOX_BIN"]
    d = webdriver.Firefox(options=o, service=Service(os.environ.get("GECKODRIVER", "geckodriver"), log_output=os.devnull))
    d.set_window_size(w, h); d.implicitly_wait(0)
    return d

def check(name, cond, extra=""):
    (passed if cond else failed).append(name)
    print(("  PASS " if cond else "  FAIL ") + name + ("" if cond else f"  -> {extra}"))

def wait(d, fn, t=10, msg=""):
    try: return WebDriverWait(d, t).until(fn)
    except Exception: return None

def q(d, sel): return d.find_elements(By.CSS_SELECTOR, sel)
def one(d, sel): return d.find_element(By.CSS_SELECTOR, sel)
def vis(d, sel):
    e = q(d, sel); return bool(e) and e[0].is_displayed()
def text(d, sel):
    e = q(d, sel); return e[0].text if e else ""

def setv(d, sel, value):
    el = one(d, sel)
    d.execute_script("""const e=arguments[0],v=arguments[1];
      if(e.type==='checkbox'){e.checked=!!v}else{e.value=v}
      e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));""", el, value)

def type_(d, sel, value):
    el = one(d, sel); el.clear(); el.send_keys(value)

def click(d, sel):
    el = one(d, sel); d.execute_script("arguments[0].scrollIntoView({block:'center'})", el); el.click()

def goto(d, page): d.get(BASE + page)

def url_has(d, frag, t=10): return wait(d, lambda x: frag in x.current_url, t) is not None

def shot(d, name): d.save_screenshot(os.path.join(SHOTS, f"{name}.png"))

def wait_text(d, sel, t=10):
    return wait(d, lambda x: (q(x, sel) and q(x, sel)[0].text.strip()), t)
