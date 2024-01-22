# SFT 前端代码

## 如何跑前端代码

clone完这个repo之后（`git clone https://github.com/xuqianzhi/sft.git`），首先在根目录下create一个file，叫做`.env`，将微信发送的discord api key放到 `.env` file里面之后，跑：

### `npm install`
### `npm start`

前端会在 `http://localhost:3000`跑起来。

在`src/App.js`里可以切换显示的table。

## GOAT后端server

前端会从 `http://localhost:3001` 来fetch GOAT平台的api。所以跑前端的同时后端也要跑。

将微信上发的`server.js`放在一个文件夹里，然后跑:
### `npm init`

将生成的`package.json`替换为微信里发的`package.json`，然后跑:
### `npm install`
### `npm start`

后端GOAT server会在 `http://localhost:3001`跑起来。

注：GOAT API会有使用次数上限，所以注意不要把使用GOAT API放在infinite loop里