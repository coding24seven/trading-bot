import express from 'express'
import { AddressInfo, Socket } from 'net'
import catchAll from './routes/catch-all.js'
import getDatabase from './routes/get-database.js'
import health from './routes/health.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

function startAppServer(port: number, hostName: string): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, hostName, function (this: Socket) {
      const addressInfo = this.address() as AddressInfo

      console.log(
        'App server has started on:',
        addressInfo.address + ':' + addressInfo.port
      )
      resolve()
    })

    /*
     * must be placed down the bottom of the file for the routing to work
     */
    app.use('/', getDatabase)
    app.use('/health', health)
    app.use(catchAll)
  })
}

export default startAppServer
