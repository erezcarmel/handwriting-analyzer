const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');

const app = express();
const port = 5000;

app.use(cors());

const upload = multer({ dest: 'uploads/' });

app.post('/api/extract-and-synthesize', upload.single('image'), (req, res) => {
	const targetText = req.query.text;
	const imagePath = req.file.path;

	const config = {
		tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz ',
		psm: 7,
	};

	Tesseract.recognize(imagePath, 'eng', { config })
		.then(({ data: { symbols } }) => {
			if (!symbols || symbols.length === 0) {
				return res.status(400).json({ error: 'No characters recognized.' });
			}

			const characterImages = [];

			const promises = symbols.map((symbol) => {
				const { bbox, text } = symbol;
				// console.log(`Processing character: ${text}`);

				return sharp(imagePath)
					.extract({ left: bbox.x0, top: bbox.y0, width: bbox.x1 - bbox.x0, height: bbox.y1 - bbox.y0 })
					.greyscale()
					.threshold(128)
					.blur(1)
					.toBuffer()
					.then((data) => {
						characterImages.push({ character: text, image: data });
					})
					.catch((error) => {
						console.error(`Error processing character ${text}:`, error);
					});
			});

			Promise.all(promises).then(() => {
				let currentLeftPosition = 0;

				console.log('Extracted characters:', characterImages.map((ci) => ci.character).join(', '));

				const textImages = targetText.split('').map((char) => {
					if (char === ' ') {
						currentLeftPosition += 50;
						return null;
					}

					const charImage = characterImages.find((ci) => ci.character === char);
					if (!charImage) {
						console.warn(`Character not found: ${char}`);
						return null;
					}

					const compositeItem = {
						input: charImage.image,
						left: currentLeftPosition,
						top: 0,
					};

					currentLeftPosition += 50;

					return compositeItem;
				}).filter(Boolean);

				const totalWidth = currentLeftPosition;
				const imageHeight = 200;

				sharp({
					create: {
						width: totalWidth,
						height: imageHeight,
						channels: 3,
						background: { r: 255, g: 255, b: 255 },
					},
				})
					.composite(textImages)
					.png()
					.toBuffer()
					.then((outputBuffer) => {
						res.set('Content-Type', 'image/png');
						res.send(outputBuffer);
					})
					.catch((error) => {
						console.error('Error generating image:', error);
						res.status(500).json({ error: 'Image generation failed' });
					});
			});
		})
		.catch((error) => {
			console.error('Error extracting characters:', error);
			res.status(500).json({ error: 'Character extraction failed' });
		})
		.finally(() => {
			fs.unlink(imagePath, (err) => {
				if (err) console.error('Error deleting file:', err);
			});
		});
});

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
