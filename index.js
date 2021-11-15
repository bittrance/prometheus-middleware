const client = require('prom-client')
const http = require('http')

const HTTPHook = require('./http_hook')

const requestListener = async (req, res) => {
    if (req.url === '/metrics') {
        try {
            res.writeHead(200, { 'Content-Type': client.register.contentType })
            return res.end(await client.register.metrics())
        } catch (ex) {
            console.log(ex)
            res.writeHead(500, { 'Content-Type': 'text/html' })
            return res.end('Error')
        }
    }
    res.writeHead(404, { 'Content-Type': 'text/html' })
    res.end('404 not found')
}

class APM {
    constructor (config = {}) {
        this.config = config
        this.client = client
        this.server = null
    }

    init () {
        // --------------------------------------------------------------
        // Create HTTP hook
        // --------------------------------------------------------------
        HTTPHook.init(client)

        // --------------------------------------------------------------
        // prometheus stuff
        // --------------------------------------------------------------
        const collectDefaultMetrics = client.collectDefaultMetrics
        collectDefaultMetrics()
        this.server = http.createServer(requestListener)
        this.server.listen(this.config.PORT || 9050)
    }

    destroy () {
        this.server.close()
        this.client.register.clear()
    }
}

module.exports = APM