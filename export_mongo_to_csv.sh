mongoexport --db=debug --collection=nike --type=csv --fields=shoeName,imageUrl,colorDes,pdqUrl,price,inventoryList,pid --out=./nike_data.csv

mongoexport --db=debug --collection=nike_MultiThread --type=csv --fields=shoeName,imageUrl,colorDes,pdqUrl,price,inventoryList,pid --out=./nike_data.mt.csv
