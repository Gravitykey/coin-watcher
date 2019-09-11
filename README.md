## 监控主流虚拟货币的K线大波动并做出提示


### 添加自己需要的币的行情
在main.js里 开头SETTINGS的COIN_NAMES里添加对应的名称可用币信息在此处获取

https://www.okex.me/api/spot/v3/instruments

取返回的instrument_id字段值即可，建议使用USDT结尾的币对

----------------

### 在本地使用时的跨域问题


新建一个CHROME的快捷方式，目标一栏写成类似这种

    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" --user-data-dir="D:\ChromeDebug" --test-type --disable-web-security

D:\ChromeDebug 改成合适的临时目录
这样运行起来的Chrome没有跨域限制

----------------------

### OKEX的API手册
https://www.okex.me/docs/zh/
