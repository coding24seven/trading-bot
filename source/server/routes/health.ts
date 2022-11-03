import { AxiosResponse } from 'axios'
import express, { Request, Response, Router } from 'express'
import store from '../../store/store.js'

const router: Router = express.Router()

export default router

router.get('/', async (req: Request, res: Response) => {
  const readResponse: AxiosResponse | string = await store.readDatabase()

  if (typeof readResponse === 'string') {
    res.status(500).send(readResponse)
  } else {
    res.status(200).send('Ok')
  }
})
