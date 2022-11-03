import express from 'express'
import catchAll from './routes/catch-all'
import getAccounts from './routes/get-accounts.js'

const app = express()
app.use(express.json({ limit: '1mb' }))

function startAppServer(port: number, hostName: string): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, hostName, function () {
      console.log(
        'App server has started on:',
        this.address().address + ':' + this.address().port
      )
      resolve()
    })

    /*
     * must be placed down the bottom of the file for the routing to work
     */
    app.use('/', getAccounts)
    app.use(catchAll)
  })
}

export default startAppServer
