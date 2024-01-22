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

from utils import Timer

from selenium import webdriver
from selenium.webdriver.chrome.options import Options

from queue import Queue
import threading

def getWebdriver():
    # 创建一个ChromeOptions对象
    chrome_options = Options()
    # 在ChromeOptions中添加--headless参数
    chrome_options.add_argument('--headless')
    # TODO 设置代理IP的地址和端口号，修改IP地址
    # chrome_options.add_argument(f'--proxy-server=socks5://127.0.0.1:1083') # socks 代理
    driver = webdriver.Chrome(options=chrome_options)
    return driver 
driver = getWebdriver()

proxy = '127.0.0.1:1083'
proxies = {
    'http': 'socks5://' + proxy,
    'https': 'socks5://' + proxy
}
api_headers = {
    "Origin"     :  "https://www.nike.com",
    "Referer"    :  "https://www.nike.com",
    "User-Agent" :  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

}

headers = {
    "User-Agent" :  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept" : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Encoding" : "gzip, deflate, br",
    # "Cookie" : 'AnalysisUserId=122.224.10.164.675821704209402511; anonymousId=31AB795F03C1CB8DDE84057C7BF036B8; NIKE_COMMERCE_COUNTRY=US; NIKE_COMMERCE_LANG_LOCALE=en_US; _gcl_au=1.1.1929977943.1704238148; _scid=1b5aae8c-50f7-4f7e-9c24-a2f8ebe5a05f; _rdt_uuid=1704238148817.29cbb606-93c9-49bf-9c36-8889ab243e7e; _fbp=fb.1.1704238149280.688899059; _tt_enable_cookie=1; _ttp=ra9SGULipltKvX5N3gKdY3rooZc; CONSUMERCHOICE=us/en_us; CONSUMERCHOICE_SESSION=t; bluecoreNV=false; EU_COOKIE_LAW_CONSENT=false; EU_COOKIE_LAW_CONSENT_legacy=false; audience_segmentation_performed=true; _gid=GA1.2.1087678932.1705826082; cid=undefined%7Cundefined; s_ecid=MCMID%7C84599167501876255651933743590873226894; AMCV_F0935E09512D2C270A490D4D%40AdobeOrg=1994364360%7CMCIDTS%7C19744%7CMCMID%7C84599167501876255651933743590873226894%7CMCAAMLH-1706447036%7C3%7CMCAAMB-1706447036%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1705849436s%7CNONE%7CMCAID%7CNONE%7CvVersion%7C3.4.0; AKA_A2=A; geoloc=cc=CN,rc=ZJ,tp=vhigh,tz=GMT+8,la=30.00,lo=120.58; bm_sz=3C94B01DBA15C8859B697714F7D5DB5E~YAAQpArgevpP3xWNAQAA6I6eLhYVh+jvF4FCmo+5XQldOM00MsuFtzpaonwB3g4/T7faO7gpUqgjrbU3s+bA7pRXy80zUe2mUDjReiK9rs/NStLUWBmsq+74Q7rhlJ6FUvuhGR6WA/b/lzSsChcrBi+7GY/pEc3amkLtcCWYjA07eZ6VTu3CVA+8njjwIsGoH4cc/SUAqtSTusUWRpBBp6gPN/OchIZZ9HafOV8C1joZ3rF0jE+0DTEAxBbxDpRTLlpXek+UvguAkLiFCdB70o2+uQWgtGcNUK9lWLY+Y7JvNdBKJ1rojji55wpgvcHlDu/KDFc1J5zTHepUZhoVb1IGlYQvycHIphN8oTo3X/5eQS7Eqd4F1n+q43zgPwcxCw7yPr3QKrz/U7TU+zMfahtxHGVbNbE9DY2LqYKblBd+GBQfjiKbIXu686P4E6Js~3425846~4338486; bm_mi=014EAE0CD13417C534506B321F62E514~YAAQrgrgepd8xhWNAQAAjZKeLhbG64FULhP/FM2O22AN/01sIAMzuFTfYQQqiW6G5LFiv+iwGsx6Dx8c0p3az1FvrbPgKt++cc0Pmmus5i2LWtxxeD7p2M7SHzGgEsCGiqQQuPVHZqbDgGKa+2exBRESTMZ/WC/N+rQLWKufvxAfTNvhiK9EMnOkqm2VctNmqqdwuAKr7Ojw9obHopCET+r5nJ2+A9LfN+5sC3aOkDudj6OhFa4djEex2Jbn7gkawI8o5ZJDIYvvgz8qEHFHSuog7xRRnUYke7chMSFk8hng5TQzD7YmwaMYIprZBNnDQkDJs+PJsJ4=~1; ak_bmsc=C5F120E1D4FE2C136BE7C23D275058F2~000000000000000000000000000000~YAAQrgrgerV8xhWNAQAAQ5yeLhbg7VAjRMmATjhoNIPKMOZ12cpLHManJqzbCnJ7Quxa1MnerdDo+5mWmzwbkHfd5tRjDuLVuT9zK5zyY4s+gvJpMyJuSZeIL4QPd+3Y8r3UuFJzXRzWA5O+7wyrsm4gG/Y0VCWXSFVpM4QKCSjGld9tqGfCiqKtWb88kdR6eVXConR3k7zLYCkXBggRKwT9Q+MU92CZENpx9ApDMuK7hw92cDSn72W29zgT0ofhwMZJxMY25W3XtZV7oZ5hNXr5O+EuCZrFcB9lVqrXNAE/Z1SHdDf3pn8JodG8Umc4mBXz7hjrY81hdzpnuvZzvfj+sHBiRbIUPY2fT4k5hJVP7ygJuXPy3EfL7TqSpxezdt5CgwdGUdWPudsCFY5Se5f7jEnCff1wdBosbvT/BmZ+04ri1Pb5kbK4xM0f+y5ed8c4JnSJiUdLFmw6mnbNvH2U2PfKH1U/wBqXfQoo2TIyPgf/DskZBrwFBB8DcC8aeXR+v2k8D/DOIqsF5y6YJQ==; bm_sv=123C10F416A307A972E5A32F0E5F6E8F~YAAQfOBb2kbUMPSMAQAAFH6vLhbqu+Q3NB2XIkc4BVvHabY4VfIQFMxCyI0FcR1rDsJxzZxhDtYTHxTwyjQUKKpmOYGiVkt0uytTWuPwzRnZ48IVjhZc38XIDMRdob+E9z2kHNE/vnL/I4NfHemPg6T5ap5wfl1WJ1KwJ6FWaMf21gSJv4uz2c/sreAl9fbbSKfulAPBNhG4SJaKfuTj0tTFgkKa1dNYRL42/dSVebKXk7fIWR8aOc6AUtL96wY=~1; _ga=GA1.2.1809890065.1704238148; bc_nike_triggermail=%7B%22distinct_id%22%3A%20%2218ccc827093f49-03588575fce149-26001951-154ac4-18ccc8270941c43%22%2C%22bc_persist_updated%22%3A%201704238462637%2C%22g_search_engine%22%3A%20%22google%22%7D; _uetsid=f38a66e0b83711ee96befb2e7bbda301; _uetvid=ba3412e0a9c611eea89ff99e761216d0; _scid_r=1b5aae8c-50f7-4f7e-9c24-a2f8ebe5a05f; cto_bundle=BLMz-19YSkM5NnRyWjBBbFMwMjRUN1daZDNIVlhWS2VCd3AxSSUyQkJlOTRjM216c2lMTjMlMkJTZXUlMkJXJTJGZ3UlMkY2aTNzRnRjdiUyQmlTVGlZREJLa2pPY0Z0SndhWUJQcUR1SjJybHBEVSUyQkE4QVBlS25YdnY4aFVuWHhEV3J5aXFnT01KakxlN0ZoM0hod3RzOUVOQXFRM3BLalRFWGY1USUzRCUzRA; _ga_QTVTHYLBQS=GS1.1.1705884175.7.1.1705885284.24.0.0; _abck=2610DE5E41B276145F4A8A5E3EB02C52~-1~YAAQdeBb2vsBIRONAQAAIgXELgtCb8Kmrrb3C9Xn6F7jm04IKPe2+W0/UpKuGlrlqhZXhqLPukPcT6Ae5AH6vvUockHhGpV9ZPe5W40okGuny48OI2MS2KORISadbSfH0UWEja1YWeH5x2Lc242tqLFYapWswrqXovuryLQSew8l33mQyVj4OJ0nN6NkUow27h0097LxSqRUHr8WSsrxTNHTXck0hab81UvYZT0U7+Rpxg96fC/+W4fnsA35bpEqBHbn1MhYzEy5wWrfDLxVF+22izt6qi/9QH/r3X8z7NVLHEEscSG/ZahiF5DPhiGKzc/aaU7ELG3K67YZCZ7D4XsxCxYTN1t1+sHWgH+jfR1Guyu8zDvrLaARzykaYOtbU9enHoZI6uNXppuwBqfagjl0oj4F0Pa5Lk4OXTPP0iyP+hHPbL2naLmhPmXJ2KVqESVkopG5HYOVPNSjg8v5uJgoDMQTXuNG2IO2LPWe7ysboxWFDoOKRSgchH3aFKRJhgoanqBhLtgvg7rPTZsPrzvC5LzbSAI=~-1~-1~-1; RT="z=1&dm=nike.com&si=743f121a-97af-41c9-b6ad-22b59df2aeab&ss=lro81t7k&sl=0&tt=0&bcn=%2F%2F684d0d49.akstat.io%2F"'
}


# database setting 
dbClient = pymongo.MongoClient(host="localhost", port=27017)
db = dbClient['debug']
collection = db['nike']
# try:
#     collection.create_index("pid", unique=True)
# except pymongo.errors.DuplicateKeyError as e:
#     print("DuplicateKeyError:", e)

def main(url, req_url, gender):
    # TODO: parse 和 请求可以进行分离
    # 使用api请求数据
    start = 0
    while True:
        logger.info("Main Page: %s, Count: %d"%(url, start))
        # response = requests.get(req_url.format(start), headers=api_headers, proxies=proxies)
        Timer.start()
        response = requests.get(req_url.format(start), headers=api_headers)
        Timer.end()
        Timer.elapsed_time("Getting main page")
        if response.status_code == 200:
            rjson = response.json()
            if not rjson['data']['products']['products']:
                logger.info("Main Page: %s search done"%url)
                break
            parse_response_json(response.json(), gender)
        start += 24 

def parse_response_json(rjson, gender):
    def parseShoeUrl(url):
        return "/".join(url.split('/')[1:])
        
    for item in rjson['data']['products']['products']:
        # product name 
        shoe_name = item['title']
        icolorways = item['colorways']
        # url = "/".join(item['url'].split('/')[1:]) # url format is "{countryLang}/t/blazer-phantom-mid-mens-shoes-fKkXKb/DX5800-101" countryLang is unesserary 
        for subItem in icolorways:
            # shoe infomation
            image = subItem['images']['squarishURL']
            colorDes = subItem['colorDescription']
            pdqUrl = parseShoeUrl(subItem['pdpUrl'])

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
            # inventory_list = parse_shoe_inventory(pdqUrl)
            # Timer.end()
            # Timer.elapsed_time("parse shoe inventory")
            inventory_list = []

            # collect data 
            shoe_item = dict(
                shoeName = shoe_name,
                imageUrl = image,
                colorDes =  colorDes,
                pdqUrl = pdqUrl,
                pid = product_id,
                price = price_info,
                inventoryList = inventory_list
            )
            result = collection.insert_one(shoe_item)
                
def parse_shoe_inventory(pdpUrl, ReferUrl = "https://www.nike.com"):
    getInven = []
    # right now use webdriver to get inventory
    url = ReferUrl + '/' + pdpUrl
    driver.get(url)
    soup = BeautifulSoup(driver.page_source, 'lxml')
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
    return getInven

 
if __name__ == '__main__':
    logger.add("logs/debug.log", level='DEBUG')
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

    # debug 
    for i in range(3):
        Timer.start()
        url, gender = urls[i]
        main(url, req_urls[gender], gender)
        Timer.end()
        Timer.elapsed_time(f"main func url:{url}")