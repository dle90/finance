const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const express = require('express')
const cors = require('cors')

require('./db')

const { router: authRouter } = require('./routes/auth')
const { requireAdmin } = require('./middleware/auth')

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '20mb' }))

app.use('/api/auth', authRouter)

const guardWrites = (req, res, next) => {
  if (req.method === 'GET') return next()
  return requireAdmin(req, res, next)
}

app.get('/api/health', (req, res) => res.json({ ok: true }))

// TODO: mount Misa-backed finance routes here
// app.use('/api/finance', guardWrites, require('./routes/finance'))

const clientDist = path.join(__dirname, '..', 'client', 'dist')
app.use(express.static(clientDist))
app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')))

app.listen(PORT, () => console.log(`Finance API listening on :${PORT}`))
