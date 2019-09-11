class Coin {
    constructor(coinName, granularity, threshold, enable, warningElement, settingElement) {

        this.inWarning = false
        this.coinName = coinName        // 币名
        this.granularity = granularity  // K线周期
        this.threshold = threshold      // 报警阈值
        this.enable = enable            // 是否启用该币

        this.currentCandle = {          // 当前K线状态
            time: 0,                 // 更新时间
            high: 0,                 // 最高
            low: 0,                  // 最低
            close: 0,                // 收盘价(当前价)
            volume: 0,               // 成交量
            open: 0,                 // 开盘价
            amplitude: 0,            // 振幅

        }
        this.coinNameUnderline = this.coinName.replace('-', '_') // 划线名称
        // 获取k线的地址
        this.fetchUrl = SETTINGS.URLS.base +
            SETTINGS.URLS.API.replace('<instrument>', this.coinName)

        // 市场行情地址
        this.marketUrl = SETTINGS.URLS.base +
            SETTINGS.URLS.market.replace('<instrument_underline>', this.coinNameUnderline)

        this.warning = new WarningBar(this, warningElement)
        this.settingBar = new SettingBar(this, settingElement)
    }

    getCandle() {
        // 返回数据格式
        // time	String	开始时间
        // open	String	开盘价格
        // high	String	最高价格
        // low	String	最低价格
        // close	String	收盘价格
        // volume	String	交易量
        if (!this.enable) {
            this.cancelWarning()
            return
        }
        $.ajax({
            url: this.fetchUrl,
            data: {
                'start': getCurrentISO8601(this.granularity + TIME_ZONE * 3600),
                'end': getCurrentISO8601(TIME_ZONE * 3600),
                'granularity': this.granularity,
            },
            success: (data, status) => {
                this.updateCandle(data[0])
                if (this.currentCandle.amplitude > this.threshold) {
                    this.raiseWarning()
                } else {
                    this.cancelWarning()
                }
                addAjaxSuccessCount()
            },
            error: () => {
                addAjaxErrorCount()
            }
        })
    }

    updateCandle(dataFromAjax) {
        let c = this.currentCandle
        let d = dataFromAjax
        c.time = ISO8601ToLocalStr(d[0])
        c.open = Number(d[1])
        c.high = Number(d[2])
        c.low = Number(d[3])
        c.close = Number(d[4])
        c.volume = Number(d[5])
        c.amplitude = (c.high - c.low) / c.open
        // console.log(this.currentCandle)
    }

    addLog() {
        let e = ELEMENTS.LOGGER
        let html = `<div class="alert alert-warning alert-dismissible" role="alert">
        <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span
                aria-hidden="true">&times;</span></button>
        <strong>${this.coinName}</strong> <span>${getCurrentDate()}</span>
        <span>在${Math.round(this.granularity / 60)}分钟周期K线上振幅超过${this.threshold * 100}%</span>
        </div>`
        $(e).append(html)
    }
    getAmpStr() {
        return (this.currentCandle.amplitude * 100).toFixed(2) + '%'
    }
    isRise() {
        return this.currentCandle.close > this.currentCandle.open
    }
    raiseWarning() {
        if (!this.inWarning) {
            playAlarm()
            this.warning.show()
            this.addLog()
            this.inWarning = true
        } else {
            this.warning.show()
        }
    }
    cancelWarning() {
        if (this.inWarning) {
            this.warning.hide()
        }
        this.inWarning = false
    }
}


class WarningBar {
    constructor(coin, fatherElement) {
        this.warningTime = ''
        this.warningUSDT = ''
        this.coin = coin
        this.fatherElement = fatherElement
        this.init()
    }
    init() {
        let c = this.coin
        let html = `
        <h3 class="warning-title"><a href="${c.marketUrl}">${c.coinName}</a> 发生异动，<span class="granularity">
        </span>分种K线振幅破<span class="threshold"></span>%</h3>
        <p>报警时间：<span class="warn-time"></span></p>
        <p>报警时价格(USDT)：<span class="warn-usdt"></span></p>
        <p>报警时价格(RMB)：<span class="warn-cny"></span></p>
        <p>当前周期状态：<span class="c-usdt"></span><span class="c-cny"></span>
        <span class="c-high"></span><span class="c-low"></span><span class="c-amp"></span></p>
        `
        let el = document.createElement('div')
        el.setAttribute('class', 'alert alert-success warning-item')
        el.setAttribute('role', 'alert')
        el.innerHTML = html
        this.el = el
        this.e = $(this.el)
        this.fatherElement.appendChild(el)
        this.e.hide()
    }
    show() {
        let coin = this.coin
        let e = this.e
        if (!coin.inWarning) {
            e.find('.granularity').text(coin.granularity / 60)
            e.find('.threshold').text((coin.threshold * 100).toFixed(2))
            e.find('.warn-time').text(getCurrentDate())
            e.find('.warn-usdt').text(coin.currentCandle.close)
            e.find('.warn-cny').text((coin.currentCandle.close * SETTINGS.EXCHANGE_RATE).toFixed(2))
        }

        e.find('.c-usdt').text('$USDT: ' + coin.currentCandle.close)
        e.find('.c-cny').text('¥CNY: ' + (coin.currentCandle.close * SETTINGS.EXCHANGE_RATE).toFixed(2))
        e.find('.c-high').text('HIGH: ' + coin.currentCandle.high)
        e.find('.c-low').text('LOW: ' + coin.currentCandle.low)
        e.find('.c-amp').text('振幅: ' + coin.getAmpStr())
        if (coin.isRise()) {
            this.el.setAttribute('class', 'alert alert-success warning-item')
        } else {
            this.el.setAttribute('class', 'alert alert-danger warning-item')
        }
        this.e.show()
    }
    hide() {
        this.e.hide()
    }

}

class SettingBar {
    constructor(coin, fatherElement) {
        this.coin = coin
        this.fatherElement = fatherElement
        this.init()
    }
    init() {
        let c = this.coin
        let html = `\
        <th scope="row"><input type="checkbox" class="enableCoin"></th>\
        <td>${c.coinName}</td>\
        <td>\
            <input type="radio" name="granularity-${c.coinName}" class="optionsRadios" value="180" >3min\
            <input type="radio" name="granularity-${c.coinName}" class="optionsRadios" value="300" >5min\
            <input type="radio" name="granularity-${c.coinName}" class="optionsRadios" value="900">15min\
        </td>\
        <td><input type="number" min="0" max="5" step="0.1" class="threshold"> %</td>\
        `
        let el = document.createElement('tr')
        el.innerHTML = html
        this.el = el
        // $('.config tbody')[0].appendChild(el)
        this.fatherElement.appendChild(el)
    }
    loadSettingFromEl() {
        let e = $(this.el)
        let coin = this.coin
        let enable = e.find('.enableCoin').prop('checked')
        let granularity = e.find("input[type='radio']:checked").val()
        let threshold = e.find('.threshold').val() / 100
        console.log(enable, granularity, threshold)
        coin.enable = enable
        coin.granularity = granularity
        coin.threshold = threshold
    }
    setSettingToEl() {
        let c = this.coin
        let e = $(this.el)
        e.find('.enableCoin').prop('checked', c.enable)
        // 先清空再重选
        e.find("input[name='granularity']").prop('checked', false)
        e.find("input[value='" + c.granularity + "']").prop('checked', true)
        e.find('.threshold').val(c.threshold * 100)
    }
}

class Ticker {
    constructor(coins, fatherElement) {
        this.coins = coins
        this.fatherElement = fatherElement
        this.init()
    }
    init() {
        let coinNamesList = []
        let coinDict = {}
        let coins = this.coins
        for (var i = 0; i < coins.length; i++) {
            if (coins[i].enable) {
                coinNamesList.push(coins[i].coinName)
                coinDict[coins[i].coinName] = coins[i]
            }
        }

        this.coinNamesList = coinNamesList
        this.coinDict = coinDict
        this.elements = {}

        // 创建DOM
        let tbodyEl = document.createElement('tbody')
        for (var i = 0; i < coins.length; i++) {
            let c = coins[i]
            if (!c.enable) {
                continue
            }
            let row = `
                    <td>${c.coinName}</th>
                    <td class="last"></td>
                    <td><span class="change label label-success">0%</span></td>
                    <td class="high"></td>
                    <td class="low"></td>
                    <td><a target="_blank" href="${c.marketUrl}">查看</a></td>
                    <td class="amp"></td>
                `
            let el = document.createElement('tr')
            el.setAttribute('class', "TICK-" + c.coinName)
            el.innerHTML = row
            this.elements[c.coinName] = el
            tbodyEl.appendChild(el)
        }
        this.tbodyEl = tbodyEl
        // $('.market table')[0].appendChild(tbodyEl)
        this.fatherElement.appendChild(tbodyEl)

    }
    rebuild() {
        this.tbodyEl.remove()
        this.init()
    }
    updateTickers(data) {
        let nl = this.coinNamesList
        for (var i = 0, len = data.length; i < len; i++) {
            let item = data[i]
            if (nl.indexOf(item.instrument_id) == -1) {
                continue
            }
            let el = this.elements[item.instrument_id]
            let coin = this.coinDict[item.instrument_id]
            this.updateEl(coin, el, item)
        }
    }
    updateEl(coin, el, item) {
        let e = $(el)
        e.find('.last').text(this.makeUSDCNYpair(item.last))
        e.find('.change').text(this.makeChangestr(item.last, item.open_24h))
        e.find('.change')[0].setAttribute('class', Number(item.last) > Number(item.open_24h) ? "change label label-success" : "change label label-danger")
        e.find('.high').text(this.makeUSDCNYpair(item.high_24h))
        e.find('.low').text(this.makeUSDCNYpair(item.low_24h))
        e.find('.amp').text(coin.getAmpStr())
    }
    makeUSDCNYpair(usdtprice) {
        return `$ ${Number(usdtprice).toFixed(2)} / ¥ ${(Number(usdtprice) * SETTINGS.EXCHANGE_RATE).toFixed(2)}`
    }
    makeChangestr(last, open) {
        last = Number(last)
        open = Number(open)
        let change = ((last - open) / open) * 100

        return (change > 0 ? '+' : '') + change.toFixed(2) + '%'
    }

    fetch() {
        $.ajax({
            url: SETTINGS.URLS.base + SETTINGS.URLS.ticker_all,
            success: (data, status) => {
                this.updateTickers(data)
                addAjaxSuccessCount()
            },
            error: () => {
                addAjaxErrorCount()
            }
        })
    }
}