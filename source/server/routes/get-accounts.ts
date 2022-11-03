import { AxiosResponse } from 'axios'
import express, { Request, Response, Router } from 'express'
import store from '../../store/store'

const router: Router = express.Router()

export default router

router.get('/', async (req: Request, res: Response) => {
  const readResponse: AxiosResponse | string = await store.readDatabase()

  res.send(typeof readResponse === 'string' ? readResponse : readResponse.data)
})
