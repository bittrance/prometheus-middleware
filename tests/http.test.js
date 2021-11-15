const APM = require('../index')
const http = require('http')

const httpRequest = (params) => {
    return new Promise((resolve, reject) => {
        const req = http.request(params, (res) => {
            // reject on bad status
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error('statusCode=' + res.statusCode))
            }
            // cumulate data
            let body = []
            res.on('data', (chunk) => {
                body.push(chunk)
            })
            // resolve on end
            res.on('end', () => {
                try {
                    body = Buffer.concat(body).toString()
                } catch (e) {
                    reject(e)
                }
                resolve(body)
            })
        })
        // reject on request error
        req.on('error', (err) => {
            reject(err)
        })
        // IMPORTANT
        req.end()
    })
}

describe('retry', () => {
    let apm
    let app
    beforeAll((done) => {
        apm = new APM()
        apm.init()

        app = require('fastify')()

        // Declare a route
        app.get('/test', async (request, reply) => {
            reply.send('OK')
        })
        app.listen(3000, () => {
            done()
        })
    })

    afterAll(() => {
        apm.destroy()
        app.close()
    })

    it('should expose http response time', async () => {
        for (let i = 0; i < 10; i++) {
            await httpRequest('http://localhost:3000/test')
        }

        const data = await httpRequest('http://localhost:9050/metrics')
        expect(data.indexOf('http_request_duration_seconds_count{method="GET",route="/test",status="200"} 10') > -1).toEqual(true)
    })

    it('should return 404', async () => {
        try {
            await httpRequest('http://localhost:9050/unknown')
            throw new Error('This test should have thrown an error !!!!')
        } catch (err) {
            expect(err.message).toEqual('statusCode=404')
        }
    })

    it('should return 500', async () => {
        apm.client.register.metrics = () => { return new Promise((resolve, reject) => { reject(new Error('error')) }) }
        try {
            await httpRequest('http://localhost:9050/metrics')
            throw new Error('This test should have thrown an error !!!!')
        } catch (err) {
            expect(err.message).toEqual('statusCode=500')
        }
    })
})
