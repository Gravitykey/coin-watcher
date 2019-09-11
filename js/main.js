function saveToLocalStorage(keyName, obj) {
    window.localStorage.setItem(keyName, JSON.stringify(obj))
}
function loadFromLocalStorage(key) {
    return JSON.parse(window.localStorage.getItem(key))
}

// 默认设置
let SETTINGS = {
    'EXCHANGE_RATE': 7.0,
    'EXCHANGE_RATE_UPDATE_TIME_STR': '未远程校准',
    'URLS': {
        'base': 'https://www.okex.me',
        'API': '/api/spot/v3/instruments/<instrument>/candles',
        'market': '/market?product=<instrument_underline>',
        'exchangeRate': '/api/swap/v3/rate',
        'ticker_all': '/api/spot/v3/instruments/ticker'
    },
    'REFRESH_INTERVAL': 10,     // K线获取间隔时间，秒
    'TIME_ZONE': null,          // 时区，默认请留null
    'COIN_NAMES': ['BTC-USDT', 'LTC-USDT', 'ETH-USDT', 'ETC-USDT',
        'XRP-USDT', 'EOS-USDT', 'BCH-USDT', 'BSV-USDT', 'TRX-USDT'],
}
let COINS_INIT_SETTINGS = {
    'DEFAULT': {
        'enable': true,
        'granularity': 180,            // 默认K线预警周期
        'threshold': 0.005,            // 默认波动比例阈值
    },
}

// 时区会影响K线数据获取，此处使用系统时区
let TIME_ZONE = SETTINGS.TIME_ZONE_OFFSET ? SETTINGS.TIME_ZONE_OFFSET : - (new Date().getTimezoneOffset()) / 60
let REQ_SUCCESS = 0
let REQ_ERROR = 0
let ELEMENTS = {
    'WARNING': $('.warnings')[0],
    'SETTINGS': $('.config tbody')[0],
    'TICKERS': $('.market table')[0],
    'SETTINGS_TOGGLE_BTN': $('#settings-toggle')[0],
    'SETTINGS_PANEL': $('.config')[0],
    'SETTINGS_SAVE_BTN': $('#save-settings')[0],
    'SETTINGS_RESET_BTN': $('#reset-settings')[0],
    'SETTINGS_REFRESH': $('#refresh-interval')[0],
    'LOGGER': $('.logging .panel-body')[0],
    'ALARM': $('#alarm-toggle')[0],
    'AUDIO':$('audio')[0],
}

// 读取本地设置记录
let SETTINGS_STORAGE_NAME = 'coin_watcher_settings'
let COINS_STORAGE_NAME = 'coin_watcher_coin_settings'
SETTINGS = loadFromLocalStorage(SETTINGS_STORAGE_NAME) || SETTINGS
COINS_INIT_SETTINGS = loadFromLocalStorage(COINS_STORAGE_NAME) || COINS_INIT_SETTINGS

let ALARM_ON = false

function makeCoins(nameList, warningEl, settingEl) {
    console.log(nameList)
    let coins = []
    for (var i = 0; i < nameList.length; i++) {
        let name = nameList[i]
        console.log(name)
        let setting = COINS_INIT_SETTINGS[name] || COINS_INIT_SETTINGS['DEFAULT']
        let c = new Coin(name, setting.granularity, setting.threshold, setting.enable,
            warningEl, settingEl)
        coins.push(c)
    }
    return coins
}

let COINS = makeCoins(SETTINGS.COIN_NAMES, ELEMENTS.WARNING, ELEMENTS.SETTINGS)

let LOOP_COUNTER = 0 // 主循环驱动用的计数器

let ticker = new Ticker(COINS, ELEMENTS.TICKERS)  // Ticker是即时刷新的市场价格信息

function date2str(x, y) {
    let z = { y: x.getFullYear(), M: x.getMonth() + 1, d: x.getDate(), h: x.getHours(), m: x.getMinutes(), s: x.getSeconds() };
    return y.replace(/(y+|M+|d+|h+|m+|s+)/g, function (v) { 
        return ((v.length > 1 ? "0" : "") + eval('z.' + v.slice(-1))).slice(-(v.length > 2 ? v.length : 2)) });
}

function getCurrentISO8601(pastSeconds) {
    let t = new Date()
    if (pastSeconds) {
        let now = Math.round(new Date() / 1000)
        t = new Date((now - pastSeconds) * 1000)
    }
    let format = 'yyyy-MM-ddThh:mm:ss.000Z'
    return date2str(t, format)
}

function ISO8601ToLocalStr(isoStr) {
    let x = new Date(isoStr)
    return date2str(x, 'yyyy-MM-dd hh:mm:ss')
}

function getCurrentDate() {
    let x = new Date()
    return date2str(x, 'yyyy-MM-dd hh:mm:ss')
}


function addAjaxSuccessCount() {
    REQ_SUCCESS++
}

function addAjaxErrorCount() {
    REQ_ERROR++
}

function refreshSettingPanel() {
    COINS.forEach((coin) => {
        coin.settingBar.setSettingToEl()
    })
    $('#refresh-interval').val(SETTINGS.REFRESH_INTERVAL)
}

let refreshRunningStatus = function () {
    let begin = [$('.running-begin')[0], null]
    let rate = [$('.ex-rate')[0], null]
    let rate_t = [$('.ex-rate-time')[0], null]
    let req_success = [$('.req-success')[0], null]
    let req_error = [$('.req-error')[0], null]
    let tz = [$('.time-zone')[0], null]

    return function () {
        if (!begin[1]) {
            begin[1] = getCurrentDate()
            begin[0].innerText = begin[1]
        }
        if (rate[1] != SETTINGS.EXCHANGE_RATE) {
            rate[1] = SETTINGS.EXCHANGE_RATE
            rate[0].innerText = rate[1]
        }
        if (rate_t[1] != SETTINGS.EXCHANGE_RATE_UPDATE_TIME_STR) {
            rate_t[1] = SETTINGS.EXCHANGE_RATE_UPDATE_TIME_STR
            rate_t[0].innerText = rate_t[1]
        }
        if (req_success[1] != REQ_SUCCESS) {
            req_success[1] = REQ_SUCCESS
            req_success[0].innerText = req_success[1]
        }
        if (req_error[1] != REQ_ERROR) {
            req_error[1] = REQ_ERROR
            req_error[0].innerText = req_error[1]
        }
        if (tz[1] != TIME_ZONE) {
            tz[1] = TIME_ZONE
            tz[0].innerText = tz[1]
        }
    }
}()

function bindButtions() {
    // 开关设置面板按钮
    let e = $(ELEMENTS.SETTINGS_TOGGLE_BTN)
    e.click(function () {
        refreshSettingPanel()
        $(ELEMENTS.SETTINGS_PANEL).toggle()
    })
    // 保存设置按钮
    let s = $(ELEMENTS.SETTINGS_SAVE_BTN)
    s.click(function () {
        COINS.forEach((c) => {
            c.settingBar.loadSettingFromEl()

            // 同步设置到数组
            let o = {}
            o['enable'] = c.enable
            o['granularity'] = c.granularity
            o['threshold'] = c.threshold
            COINS_INIT_SETTINGS[c.coinName] = o
        })
        SETTINGS.REFRESH_INTERVAL = Number(ELEMENTS.SETTINGS_REFRESH.value)
        ticker.rebuild()
        saveToLocalStorage(SETTINGS_STORAGE_NAME, SETTINGS)
        saveToLocalStorage(COINS_STORAGE_NAME, COINS_INIT_SETTINGS)
        $(ELEMENTS.SETTINGS_PANEL).hide()
    })

    // 重置设置按钮
    let r = $(ELEMENTS.SETTINGS_RESET_BTN)
    r.click(function () {
        refreshSettingPanel()
    })

    // 声音按钮
    let a = $(ELEMENTS.ALARM)
    a.click(function () {
        if (ALARM_ON) {
            ALARM_ON = false
            a.attr('class', 'btn btn-default')
            a.text('声音提醒：已关闭')
        } else {
            ALARM_ON = true
            a.attr('class', 'btn btn-success')
            a.text('声音提醒：已开启')
            // playAlarm()
        }
    })
}

function playAlarm(){
    if(ALARM_ON){
        ELEMENTS.AUDIO.play()
    }
}

function getExchangeRate() {
    $.get(SETTINGS.URLS.base + SETTINGS.URLS.exchangeRate, function (data, status) {
        SETTINGS.EXCHANGE_RATE = data.rate
        SETTINGS.EXCHANGE_RATE_UPDATE_TIME_STR = getCurrentDate()
    })
}
function mainLoop() {
    if (LOOP_COUNTER % SETTINGS.REFRESH_INTERVAL == 0) {
        for (var i = 0; i < COINS.length; i++) {
            COINS[i].getCandle()
        }
        LOOP_COUNTER = 0
    }
    if (LOOP_COUNTER % 2 == 0) {
        ticker.fetch()
        refreshRunningStatus()
    }
    LOOP_COUNTER++;
}
function __main__() {
    bindButtions()
    getExchangeRate()
    setInterval(mainLoop, 1000)
}

__main__()