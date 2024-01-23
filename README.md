# nike_spider
爬取耐克中国官网所有商品信息，包括商品名称，商品类别，当地价格，员工价格。将结果存入MongoDB。
依赖库：requests,beautifulsoup4,pymongo,time
运行py即可

# Requirements
```
python37
requests
selenium
pymongo
loguru
```
# Methods
## Method 1
使用requests 模仿ajax请求获取鞋子的数据，但不获取库存信息，速度快
执行`python main.py` 就会将数据保存到mongodb debug数据库 nike中

## Method2 
1. 基于method1方法得到每个鞋子的数据与具体的库存页面
2. 使用selenium获取库存页面对应的html，得到库存的信息



```
# 运行下面指令，数据将保存在mongdb名为debug的数据库，collection name为nike中
python main_mt.py --dbName debug --collectionName nike -l INFO

保存的数据：
|---------------------------
|--shoeName      鞋子名称
|--imageUrl      鞋子图片链接
|--colorDes      鞋子颜色
|--pdqUrl        鞋子对应链接
|--pid           product id
|--skuid    
|--price         价格
|--inventoryList 哪些尺码仍有库存
|--rsyID         unique id
|---------------------------
```

## Feature
1. 使用selenium获取库存页面的html，原因是库存页面的数据似乎直接从js生成，很难查到是从哪获取的
2. 使用selenium速度太慢，使用消费者-生产者模式，单线程获取库存页面html，多线程去解析页面html实现数据保存
3. `export_mongo_to_csv.sh`  提供了将mongodb数据导出为csv的指令
4. unique_id => rsyID 由shoeName shoeColor拼接的字符串生成的sha256作为ID

## TODO

- [ ] 目前mongodb只运行在localhost上，尚未在服务器上尝试
- [ ] 目前只支持数据的插入，对于相同鞋款尚未进行更新
    1. 使用了update_one代替， 但未进行测试