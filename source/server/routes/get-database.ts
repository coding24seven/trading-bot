import { AxiosResponse } from 'axios'
import express, { Request, Response, Router } from 'express'
import store from '../../store/store.js'

const router: Router = express.Router()

export default router

router.get('/', async (req: Request, res: Response) => {
  if (req.query.x !== 'x') {
    res.send('Maintenance in progress. Check later.')

    return
  }

  const readResponse: AxiosResponse | string = await store.readDatabase()

  res.send(typeof readResponse === 'string' ? readResponse : readResponse.data)
})
