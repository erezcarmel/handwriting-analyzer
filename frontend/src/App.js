import React, { useState } from 'react';
import './style.css';

const App = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [text, setText] = useState('');
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageUpload = (event) => {
    setSelectedImage(event.target.files[0]);
  };

  const handleTextChange = (event) => {
    setText(event.target.value);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    const formData = new FormData();
    formData.append('image', selectedImage);

    try {
      const response = await fetch(`http://localhost:5000/api/extract-and-synthesize?text=${text}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const blob = await response.blob();
      const imageObjectURL = URL.createObjectURL(blob);
      setGeneratedImage(imageObjectURL);
    } catch (error) {
      console.error('Error generating image:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="main">
      <div className="form">
        <h1>Handwriting Text Synthesizer</h1>
        <div className="container">
          <label htmlFor="file-upload">Upload handwriting image</label>
          <input type="file" id="file-upload" onChange={handleImageUpload}/>
        </div>

        <div className="container">
          <label htmlFor="text">Write text to show</label>
          <input type="text" id="text" placeholder="Enter your text..." onChange={handleTextChange}/>
        </div>

        <button onClick={handleSubmit}>Generate Handwriting</button>
      </div>

      {isLoading && <p>Generating handwriting image, please wait...</p>}

      {generatedImage && (
        <div>
          <h2>Generated Text Image:</h2>
          <img src={generatedImage} alt="Generated Handwriting" />
        </div>
      )}

      <footer>
        <p>Developed by <a href="https://www.linkedin.com/in/erezcarmel" target="_blank">Erez Carmel</a></p>
      </footer>
    </div>
  );
};

export default App;
