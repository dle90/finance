// One-off: create an admin user + admin role in the empty `finance` DB.
// Run with: node server/scripts/seed-admin.js
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const User = require('../models/User')
const RolePermission = require('../models/RolePermission')

async function main() {
  await mongoose.connect(process.env.MONGODB_URI)

  const adminRole = await RolePermission.findByIdAndUpdate(
    'admin',
    {
      _id: 'admin',
      name: 'Quản trị viên',
      scope: 'group',
      permissions: ['*'],
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  console.log('role:', adminRole._id)

  const user = await User.findByIdAndUpdate(
    'admin',
    {
      _id: 'admin',
      password: 'admin123',
      role: 'admin',
      displayName: 'Quản trị viên',
      employmentStatus: 'active',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  console.log('user:', user._id, '/ password: admin123')

  await mongoose.disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
