const path = require('path');
const fs = require('fs');
const ErrorResponse = require('./errorResponse')

module.exports = class ImageService {

	uploadImage = async (file, uploadPath, getPath, next) => {
		file.name = `photo_${new Date().getTime() + 3}_${file.md5}${path.parse(file.name).ext}`
		const filePath = `${uploadPath}/${file.name}`
		const directPath = `${getPath}/${file.name}`

		await file.mv(filePath)
		return directPath
	}

	uploadProductImages = async (totalImages, files, next) => {
		let images = []
		for (const file of files) {
			const imagePath = await this.uploadImage(file, process.env.PRODUCT_IMAGE_UPLOAD_PATH, process.env.PRODUCT_IMAGE_GET_PATH, next);
			images.push(imagePath)
		}
		return images
	}

	uploadReviewImage = async (file, next) => {
		let imagePath = await this.uploadImage(file, process.env.REVIEW_IMAGE_UPLOAD_PATH, process.env.REVIEW_IMAGE_GET_PATH, next);
		return imagePath
	}

	uploadUserImage = async (file, next) => {
		let imagePath = await this.uploadImage(file, process.env.USER_IMAGE_UPLOAD_PATH, process.env.USER_IMAGE_GET_PATH, next);
		return imagePath
	}

	uploadComplaintImage = async (file, next) => {
		let imagePath = await this.uploadImage(file, process.env.COMPLAINT_IMAGE_UPLOAD_PATH, process.env.COMPLAINT_IMAGE_GET_PATH, next);
		return imagePath
	}

	deleteImages = (images) => {
		for (let filePath of images) {
			filePath = `./public/${filePath}`
			if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
		}
	}

}
