const fs = require('fs');
const mongoose = require('mongoose');
const colors = require('colors');
const dotenv = require('dotenv');

// Load dotenv vars
dotenv.config({ path: './config/config.env' });

// Load models
const User = require('./models/userModel');
const Product = require('./models/productModel');
const MainCategory = require('./models/categories/mainCategoryModel');
const SubCategory = require('./models/categories/subCategoryModel');
const LastCategory = require('./models/categories/lastCategoryModel');

// Connect to mongodb
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useCreateIndex: true,
  useFindAndModify: false,
  useUnifiedTopology: true
});

// Read JSON files
const users = JSON.parse(fs.readFileSync(`${__dirname}/_data/users.json`, 'utf-8'));
const products = JSON.parse(fs.readFileSync(`${__dirname}/_data/products.json`, 'utf-8'));
const maincategories = JSON.parse(fs.readFileSync(`${__dirname}/_data/categories.json`, 'utf-8'));
const subcategories = JSON.parse(fs.readFileSync(`${__dirname}/_data/subcategories.json`, 'utf-8'));
const lastcategories = JSON.parse(fs.readFileSync(`${__dirname}/_data/lastcategories.json`, 'utf-8'));

// Import into DB
const importData = async () => {
  try {
    await User.create(users);
    await Product.create(products);
    await MainCategory.create(maincategories);
    await SubCategory.create(subcategories);
    await LastCategory.create(lastcategories);

    console.log('Data imported...'.green.inverse);
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

// Delete data
const deleteData = async () => {
  try {
    await User.deleteMany();
    await Product.deleteMany();
    await MainCategory.deleteMany();
    await SubCategory.deleteMany();
    await LastCategory.deleteMany();

    console.log('Data Destroyed...'.red.inverse);
    process.exit();
  } catch (err) {
    console.log(err);
  }
};

if(process.argv[2] === '-i'){
  importData();
} else if(process.argv[2] === '-d'){
  deleteData();
}
