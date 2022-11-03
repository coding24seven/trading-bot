import express, { Request, Response, Router } from 'express'

const router: Router = express.Router()

export default router

router.get('*', (req: Request, res: Response) => {
  const error: string[] = [
    'Unhandled URL parameter caught. Resource ',
    req.path,
    ' requested but unavailable for serving.',
  ]

  const errorAsString: string = error.join('')

  res.status(404).send(errorAsString)

  console.error(errorAsString)
})
