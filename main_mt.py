'''
nike 爬虫
1. 使用men, women, kids三个主页面进去之后，使用ajax请求进行鞋类数据的爬取
2. 通过第一步的请求，获得每一个鞋款的详尽url，获取库存
3. 使用mongdb进行数据保存
Attentions:
1. 目前默认打折商品各个尺码的价格是一致的
2. 未考虑nike对各个商品的备注，例如just in等等
'''
import pymongo
import requests
from bs4 import BeautifulSoup
from loguru import logger 
from datetime import datetime

import hashlib 

from utils import Timer, queue_monitor

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import NoSuchElementException, TimeoutException

from queue import Queue
import threading
from multiprocessing import Event

import argparse
from config import * 
import time 
from tenacity import retry, stop_after_attempt, wait_fixed


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--consumeSize", default=10, help="determine the consumer size ")
    parser.add_argument("--dbName", default="debug", help="pymongo databse name")
    parser.add_argument("--collectionName", '-cn', default="nike_MultiThread", help="databse collection name")
    parser.add_argument("--logLevel", "-l", default="DEBUG", help="logging level")
    return parser.parse_args()

def getWebdriver():
    # 创建一个ChromeOptions对象
    chrome_options = Options()
    # 在ChromeOptions中添加--headless参数
    chrome_options.add_argument('--headless')
    # TODO 设置代理IP的地址和端口号，修改IP地址
    # chrome_options.add_argument(f'--proxy-server=socks5://127.0.0.1:1083') # socks 代理
    prefs = {'profile.managed_default_content_settings.images': 2, 'permissions.default.stylesheet': 2}
    chrome_options.add_experimental_option('prefs', prefs)
    driver = webdriver.Chrome(options=chrome_options)
    return driver 

def generate_unique_id(shoeName, shoeColor):
    try:
        rsyID = 'NK' + hashlib.sha256(shoeName.encode() + shoeColor.encode()).hexdigest()[:10]
    except:
        logger.warning("ShoeName is {}, shoeColor is {}".format(shoeName, shoeColor))
        rsyID = 'NK' + hashlib.sha256(shoeName.encode()).hexdigest()[:10]
    return rsyID



def produce_main(q, urls, req_urls, consume_count):
    # TODO: parse 和 请求可以进行分离
    # 使用api请求数据
    @retry(stop=stop_after_attempt(5), wait=wait_fixed(5))
    def fetch_url(url, headers):
        return requests.get(url, headers=headers)
    
    for i in range(len(urls)):
        start = 0
        url, gender = urls[i]
        req_url = req_urls[gender]
        while True:
            logger.info("Main Page: %s, Count: %d"%(url, start))
            # response = requests.get(req_url.format(start), headers=api_headers, proxies=proxies)
            Timer.start()
            try:
                response = fetch_url(req_url.format(start), headers=api_headers)
            except Exception as e:
                logger.error("request error, producer exit, error: {}".format(e))
                break

            Timer.end()
            Timer.elapsed_time("Getting main page")
            if response.status_code == 200:
                try:
                    rjson = response.json()
                except Exception as e:
                    logger.error(f"parse main page {e}")

                if not rjson['data']['products']['products']:
                    logger.info("Main Page: %s search done"%url)
                    break
                # parse_response_json(response.json(), gender)
                for item in rjson['data']['products']['products']:
                    q.put(item)
            else:
                logger.error("Main Page Response is %d, exit"%response.status_code)
                break
            start += 24 
    for i in range(consume_count):
        q.put("EXIT")

consume_parse_count = 0
lock = threading.Lock()
def consume_main(q, thread_idx):
    ReferUrl = "https://www.nike.com"
    def parseShoeUrl(url):
        return "/".join(url.split('/')[1:])
    
    driver = getWebdriver()
    driver.implicitly_wait(TIMEOUT)

    while True:
        item = q.get()
        if isinstance(item, str) and item == 'EXIT':
            break

        shoe_name = item['title']

        # ATTENTION 存在一类只有gift card页面，需要忽略
        if shoe_name == "Nike Digital Gift Card":
            continue 

        icolorways = item['colorways']

        for subItem in icolorways:
            # shoe infomation
            image = subItem['images']['squarishURL']
            colorDes = subItem['colorDescription']
            pdqUrl = parseShoeUrl(subItem['pdpUrl'])
            skuid = pdqUrl.split("/")[-1]
            product_id = subItem['pid']

            # price 
            iprice = subItem['price']
            price_info = dict(
                currency = iprice['currency'],
                currentPrice = iprice['currentPrice'],
                discounted = iprice['discounted'],
                employeePrice = iprice['employeePrice'],
                fullPrice = iprice['fullPrice']
            )

            # parse inventory
            # Timer.start()
            inventory_list, driver = _parse_shoe_inventory(driver, pdqUrl, thread_idx)
            
            # Timer.end()
            # Timer.elapsed_time("parse shoe inventory")
            # inventory_list = []

            # collect data 
            shoe_item = dict(
                shoeName = shoe_name,
                imageUrl = image,
                colorDes =  colorDes,
                pdqUrl = ReferUrl + '/' + pdqUrl,
                pid = product_id,
                skuid = skuid,
                price = price_info,
                inventoryList = inventory_list,
                rsyID = generate_unique_id(shoe_name, colorDes)
            )
            # result = collection.insert_one(shoe_item)
            result = collection.update_one(
                {'rsyID': shoe_item['rsyID']},  # 查询条件: 根据rsyID查找文档
                {'$set': shoe_item},  # 更新操作: 使用$set操作符将查询到的文档更新为shoe_item
                upsert=True  # 如果没有找到符合查询条件的文档，则将shoe_item插入为新的文档
            )

            with lock:
                global consume_parse_count
                consume_parse_count += 1 
                logger.debug("thread idx:{}, consume parse count:{}, url is {}".format(thread_idx, consume_parse_count, shoe_item['pdqUrl']))
    
    driver.quit()

                
def _parse_shoe_inventory(driver, pdpUrl, thread_idx, ReferUrl = "https://www.nike.com", max_wait_time=TIMEOUT):
    class AnyEC:
        """Use with WebDriverWait to combine expected_conditions in an OR."""
        def __init__(self, *args):
            self.ecs = args
        def __call__(self, driver):
            for fn in self.ecs:
                try:
                    if fn(driver): return True
                except:
                    pass

    getInven = []
    # right now use webdriver to get inventory
    url = ReferUrl + '/' + pdpUrl
    try:
        driver.get(url)
    except Exception as e:
        # logger.error(f"Thread idx:{thread_idx}, driver get {url} failed, exception: {e}")
        # return ["driver get url {} failed".format(url)]
        # with open("driver_error.txt", "a+") as f:
        #     f.write("url: {} error: {}\n".format(url, e))
        try:
            logger.warning("Thread idx:{} get new driver".format(thread_idx))
            # driver.delete_all_cookies()
            driver = getWebdriver()
            # time.sleep(5)
            # driver.get('chrome://settings/clearBrowserData')  # 打开浏览器的清理缓存页面
            # driver.find_element(By.CSS_SELECTOR, "[slot='button-container']")
            # driver.find_element(By.ID, 'clearBrowsingDataConfirm').click()  # 模拟键入Enter确认清理
            driver.get(url)
        except Exception as e_sub :
            logger.error(f"Thread idx:{thread_idx}, after cleaning cache, driver get {url} failed, exception: {e_sub}")
            logger.error(f"Thread idx:{thread_idx}, driver get {url} failed, exception: {e}")
            return ["driver get url {} failed".format(url)], driver
    
    try:
        # WebDriverWait(driver, max_wait_time).until(lambda driver: custom_expected_conditions(driver))
        WebDriverWait(driver, max_wait_time).until(AnyEC(
            EC.presence_of_element_located((By.ID, 'buyTools')),
            EC.presence_of_element_located((By.CSS_SELECTOR, "[data-test='comingSoon']")),
            EC.presence_of_element_located((By.CLASS_NAME, 'sold-out')),
        ))
        soup = BeautifulSoup(driver.page_source, 'lxml')
    except TimeoutException as e :
        logger.error("Thread idx:{} url is {}, Timeout exception".format(thread_idx, url))
        return [f'not avaliable now: {url}'], driver
    except Exception as e:
        print("Unexpected Error:", e)
        logger.error("Thread idx:{} url is {} raise a exception".format(thread_idx, url))
        return [f'not avaliable now: {url}'], driver
    # finally:
    #     # 避免invalid session id, 不能关闭，因为只打开了一个页面，打开之后相当于退出了driver
    #     driver.close()

    if soup.select(".sold-out"):
        logger.info("[Inventory Info] url:%s sold out"%url)
        return ['sold out'], driver
    elif soup.find(attrs={'data-test' : "comingSoon"}) is not None:
        logger.info("[Inventory Info] url:%s coming soon"%url)
        return ['coming soon'], driver
    else:
        root =  soup.find(id = 'buyTools')
        nodes = root.select('[aria-describedby="pdp-buytools-low-inventory-messaging"]')
        for node in nodes:
            # 使用该属性判断是否包含库存
            if node.has_attr('disabled'):
                continue 
            else:
                # 将含库存的尺码加进去
                getInven.append(node.next_sibling.text)
    # TODO 
    ### use requests get but cannot get form data 
    # response = requests.get(url, headers=headers, proxies=proxies)
    # response = requests.get(url, headers=headers)
    # soup = BeautifulSoup(response.text, "lxml")
    # print(soup.find(id="RightRail").prettify())
    # root =  soup.select_one('#buyTools')
    # nodes = root.select('[aria-describedby="pdp-buytools-low-inventory-messaging"]')
    return getInven, driver


if __name__ == '__main__':
    args = parse_args()
    logger.add("logs/debug.log", level=args.logLevel, rotation="1 day")
    # logger.add("logs/{}.log".format(datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
    #            level='DEBUG')
    
    urls = [
        ['https://www.nike.com/w/mens-shoes-nik1zy7ok', 'men'],
        ['https://www.nike.com/w/womens-shoes-5e1x6zy7ok', 'women'],
        ['https://www.nike.com/w/kids-shoes-v4dhzy7ok', 'kids']
    ]

    # TODO： 换个时间爬一下，看一下请求里面是否有时间的东西
    req_urls = dict(
        men = "https://api.nike.com/cic/browse/v2?queryid=products&anonymousId=31AB795F03C1CB8DDE84057C7BF036B8&country=us&endpoint=%2Fproduct_feed%2Frollup_threads%2Fv2%3Ffilter%3Dmarketplace(US)%26filter%3Dlanguage(en)%26filter%3DemployeePrice(true)%26filter%3DattributeIds(16633190-45e5-4830-a068-232ac7aea82c%2C0f64ecc7-d624-4e91-b171-b83a03dd8550)%26anchor%3D{}%26consumerChannelId%3Dd9a5bc42-4b9c-4976-858a-f159cf99c647%26count%3D24&language=en&localizedRangeStr=%7BlowestPrice%7D%20%E2%80%94%20%7BhighestPrice%7D",
        women = "https://api.nike.com/cic/browse/v2?queryid=products&anonymousId=31AB795F03C1CB8DDE84057C7BF036B8&country=us&endpoint=%2Fproduct_feed%2Frollup_threads%2Fv2%3Ffilter%3Dmarketplace(US)%26filter%3Dlanguage(en)%26filter%3DemployeePrice(true)%26filter%3DattributeIds(7baf216c-acc6-4452-9e07-39c2ca77ba32%2C16633190-45e5-4830-a068-232ac7aea82c)%26anchor%3D{}%26consumerChannelId%3Dd9a5bc42-4b9c-4976-858a-f159cf99c647%26count%3D24&language=en&localizedRangeStr=%7BlowestPrice%7D%20%E2%80%94%20%7BhighestPrice%7D",
        kids = "https://api.nike.com/cic/browse/v2?queryid=products&anonymousId=31AB795F03C1CB8DDE84057C7BF036B8&country=us&endpoint=%2Fproduct_feed%2Frollup_threads%2Fv2%3Ffilter%3Dmarketplace(US)%26filter%3Dlanguage(en)%26filter%3DemployeePrice(true)%26filter%3DattributeIds(16633190-45e5-4830-a068-232ac7aea82c%2C145ce13c-5740-49bd-b2fd-0f67214765b3)%26anchor%3D{}%26consumerChannelId%3Dd9a5bc42-4b9c-4976-858a-f159cf99c647%26count%3D24&language=en&localizedRangeStr=%7BlowestPrice%7D%20%E2%80%94%20%7BhighestPrice%7D"
    )

    # agent setting 
    # proxy = '127.0.0.1:1083'
    # proxies = {
    #     'http': 'socks5://' + proxy,
    #     'https': 'socks5://' + proxy
    # }

    api_headers = {
        "Origin"     :  "https://www.nike.com",
        "Referer"    :  "https://www.nike.com",
        "User-Agent" :  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",

    }
    headers = {
        "User-Agent" :  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Encoding" : "gzip, deflate, br",
    }


    # database setting 
    dbClient = pymongo.MongoClient(host="localhost", port=27017)
    db = dbClient[args.dbName]
    collection = db[args.collectionName]
    # unique id 
    collection.create_index("rsyID", unique=True)

    # debug 
    q = Queue(maxsize=QUEUESIZE)
    # launch consumer threads
    consume_thread_list = []
    for i in range(CRAWL_THREAD_NUM):
        t = threading.Thread(target=consume_main, args=(q, i))
        t.start()
        consume_thread_list.append(t)
    
    # launch produce threads
    produce_thread_list = [] 
    for i in range(1):
        t = threading.Thread(target=produce_main, args=(q, urls, req_urls, CRAWL_THREAD_NUM,))
        t.start()
        produce_thread_list.append(t)

    monitor_running = threading.Event()
    monitor_thread = threading.Thread(target=queue_monitor, args=(q, QUEUESIZE//2, QUEUESIZE//4, monitor_running))
    monitor_running.set()
    monitor_thread.start()

    for i in range(len(produce_thread_list)):
        produce_thread_list[i].join()
    for i in range(len(consume_thread_list)):
        consume_thread_list[i].join()
    monitor_running.clear() 
    monitor_thread.join()