const path = require('path')
const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const morgan = require('morgan')
const fileupload = require('express-fileupload')
const errorHandler = require('./middleware/error')
const colors = require('colors')
const connectDB = require('./config/db')

//Load env vars
dotenv.config()

// Connect to Database
connectDB()

const app = express()

// Body Parser
app.use(express.json())

// Load dev middlewares
if(process.env.NODE_ENV === 'development'){
  app.use(morgan('dev'))
}

// File Upload
app.use(fileupload())

// Enable CORS
app.use(cors())

// Set static folder
app.use(express.static(path.join(__dirname, 'public')))

// Registr routes
app.use('/api/v1/auth', require('./apps/auth/auth.controller'))
app.use('/api/v1/users', require('./apps/users/users.controller'))
app.use('/api/v1/products', require('./apps/products/products.controller'))
app.use('/api/v1/category', require('./apps/categories/category.controller'))
app.use('/api/v1/orders', require('./apps/orders/orders.controller'))
app.use('/api/v1/reviews', require('./apps/reviews/reviews.controller'))
app.use('/api/v1/complaints', require('./apps/complaints/complaints.controller'))
app.use('/api/v1/order-config', require('./apps/orderConfig/orderConfig.controller'))
app.use('/api/v1/transaction', require('./apps/transactions/transaction.controller'))

app.use(errorHandler)

const PORT = process.env.PORT || 5000

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.white.bold)
})


// Hande unhandled promise rejection
// process.on('unhandledRejection', (err, promise) => {
//   console.log(`Error: ${err.message}`.red.bold)
//   // Close server & exit process
//   // server.close(() => process.exit(1))
// })
