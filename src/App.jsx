import React, { useState } from "react";
import "./App.css";
import preview from "./assets/preview.png";

function UserInputComponent() {
  const [imageData, setImageData] = useState(
    Array.from({ length: 10 }, () => ({ imageUrl: "", prompt: "", index: "" }))
  );
  const [showCaption, setShowCaption] = useState(false);
  const [numRows, setNumRows] = useState(2);
  const [comicStrip, setComicStrip] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [canvasBackgroundColor, setCanvasBackgroundColor] = useState("gray");

  // const [selectedImage, setSelectedImage] = useState(null);

  const [captions, setCaptions] = useState(
    Array.from({ length: 10 }, () => "")
  );

  const handleFileChange = (e) => {
    // console.log("hi");
    const file = e.target.files[0];
    if (!file || currentIndex >= 10) {
      setError("No file chosen or reached maximum limit");
      return;
    }

    setError(null);
    const updatedImageData = [...imageData];
    const emptyIndex = updatedImageData.findIndex(
      (data) => data.imageUrl === ""
    );

    if (emptyIndex !== -1) {
      const prompt = file.name;
      updatedImageData[emptyIndex] = {
        imageUrl: URL.createObjectURL(file),
        prompt,
        index: currentIndex,
      };
      setImageData(updatedImageData);
      setCurrentIndex(currentIndex + 1);
      // setSelectedImage(null); // Reset selected image after placement
      e.target.value = null;
    } else {
      setError("No more placeholders available");
    }
  };

  const handleCanvasColorChange = (e) => {
    setCanvasBackgroundColor(e.target.value);
  };

  // Function to convert data URL to Blob
  const dataURLtoBlob = (dataURL) => {
    const byteString = atob(dataURL.split(",")[1]);
    const mimeString = dataURL.split(",")[0].split(":")[1].split(";")[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  // Share click handler
  const handleShareClick = async () => {
    if (!comicStrip) {
      setError("First generate the comic strip");
      return;
    }
    try {
      if (navigator.share) {
        // If navigator.share is supported
        await navigator.share({
          title: "Shared Image",
          files: [
            new File([dataURLtoBlob(comicStrip)], "shared_image.png", {
              type: "image/png",
            }),
          ],
        });
      } else {
        // Fallback for browsers that don't support navigator.share
        const shareUrl = encodeURIComponent(comicStrip);
        const shareText = "Check out this image!";
        const shareViaTwitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
        window.open(shareViaTwitterUrl, "_blank");
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  // Image removal handler
  function handleRemoveImage() {
    if (currentIndex == 0) {
      setError("No image found. Upload an image first");
      return;
    }
    var updatedImageData = [...imageData];
    updatedImageData[currentIndex - 1] = {
      imageUrl: "",
      prompt: "",
      index: "",
    };
    setImageData(updatedImageData);
    setCurrentIndex(currentIndex - 1);
  }
  // Comic generation logic
  async function handleGenerateComic() {
    try {
      setError(null);
      setComicStrip(null);

      const columns = Math.ceil(imageData.length / numRows);
      var imageWidth = 200;
      var imageHeight = 200;
      var bih = 200;
      var biw = 200;

      const loadPromises = [];
      const borderWidth = 10;
      const margin = 2;
      const canvasWidth = columns * (imageWidth + borderWidth);
      const canvasHeight = numRows * (imageHeight + borderWidth);

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = canvasWidth;
      if (numRows == 2 || numRows == 5) {
        canvas.height = canvasHeight;
      } else if (numRows == 3) {
        canvas.height = 733.34 + (numRows + 1) * borderWidth;
        bih = (canvasWidth - 3 * borderWidth) / 3;
        biw = bih;
      } else if (numRows == 4) {
        canvas.height = 1001 + (numRows + 1) * borderWidth;
        bih = (canvasWidth - 2 * borderWidth) / 2;
        biw = bih;
      }

      imageHeight = bih;
      imageWidth = biw;

      let x = 0;
      let y = 0;
      let r = 0;

      for (let j = 0; j < imageData.length; j++) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageData[j].imageUrl;

        const loadPromise = new Promise((resolve, reject) => {
          img.onload = function () {
            //canvas color from color picker input of user
            ctx.fillStyle = canvasBackgroundColor;
            ctx.fillRect(
              x,
              y,
              imageWidth + borderWidth,
              imageHeight + borderWidth
            );
            // Drawing border of each image
            ctx.fillStyle = "black";
            ctx.fillRect(
              x + borderWidth / 2 - margin,
              y + borderWidth / 2 - margin / 2,
              margin,
              imageHeight + margin
            );

            ctx.fillRect(
              x + borderWidth / 2 - margin,
              y + borderWidth / 2 - margin,
              imageWidth + 2 * margin,
              margin
            );

            ctx.fillRect(
              x + imageWidth + borderWidth - margin - (3 * margin) / 2,
              y + borderWidth / 2 - margin / 2,
              margin,
              imageHeight + margin
            );

            ctx.fillRect(
              x + borderWidth / 2 - margin,
              y + imageWidth + borderWidth - margin - (3 * margin) / 2,
              imageWidth + 2 * margin,
              margin
            );
            // Drawing actual image
            ctx.drawImage(
              img,
              x + borderWidth / 2,
              y + borderWidth / 2,
              imageWidth,
              imageHeight
            );

            const s = captions[j];
            // Finally drawing Caption over each image in canvas
            //only if caption string is not empty
            if (showCaption && s !== "") {
              ctx.fillStyle = "white";
              ctx.fillRect(x, y + imageHeight - 30, imageWidth, 30);
              ctx.fillStyle = "black";
              ctx.font = "12px Arial";
              ctx.fillText(s, x + 5, y + imageHeight - 10);
            }

            resolve();

            x += imageWidth + borderWidth;
            if (x >= canvas.width) {
              x = 0;
              y += imageHeight + borderWidth;
              r++;
              if (r % 2 == 1) {
                imageHeight = 200;
                imageWidth = 200;
              } else {
                imageHeight = bih;
                imageWidth = biw;
              }
            }
          };

          img.onerror = function () {
            reject(new Error(`Error loading image ${j + 1}`));
          };
        });

        loadPromises.push(loadPromise);
      }
      // Wait for all images to load
      await Promise.all(loadPromises);
      //Swt the comic strip using setComicStrip
      const comicStrip = canvas.toDataURL();
      setComicStrip(comicStrip);
    } catch (error) {
      setError(`Error generating comic: ${error.message}`);
    }
  }

  // Saving the comic strip
  function handleSaveComic() {
    if (comicStrip) {
      const link = document.createElement("a");
      link.href = comicStrip;
      link.download = "comic_strip.png";
      link.click();
    } else {
      setError("First generate the comic strip");
      return;
    }
  }

  return (
    <div className="image-generation-app">
      <h1 className="shine">Comic Page Generator</h1>

      <input
        type="file"
        id="fileInput"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <label>
        <button
          className="btn1"
          onClick={() => document.getElementById("fileInput").click()}
        >
          Upload Next Image
        </button>
      </label>

      <button
        className="btn2"
        // disabled={currentIndex == 0 || isGenerating1 || isGenerating2}
        onClick={() => handleRemoveImage()}
      >
        Remove Last Image
      </button>
      {error && <p className="error-message">{error}</p>}
      <div className="image-container">
        <div className="row">
          {imageData.slice(0, 5).map((data, index) => (
            <div key={index} className="image-item">
              {data.imageUrl ? (
                <div>
                  <img
                    src={data.imageUrl}
                    alt={`Generated Image ${index + 1}`}
                  />
                  <p className="prompts">
                    File {data.index + 1}: {data.prompt}
                  </p>
                </div>
              ) : (
                <div>
                  <img src={preview} />
                  <p className="prompts">Preview</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="row">
          {imageData.slice(5, 10).map((data, index) => (
            <div key={index} className="image-item">
              {data.imageUrl ? (
                <div>
                  <img
                    src={data.imageUrl}
                    alt={`Generated Image ${index + 6}`}
                  />
                  <p className="prompts">
                    File {data.index + 1}: {data.prompt}
                  </p>
                </div>
              ) : (
                <div>
                  <img src={preview} />
                  <p className="prompts">Preview</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <label htmlFor="numRows">Select Number of Rows:</label>
      <select
        id="numRows"
        value={numRows}
        onChange={(e) => setNumRows(parseInt(e.target.value))}
      >
        <option value="2">2 rows</option>
        <option value="3">3 rows</option>
        <option value="4">4 rows</option>
        <option value="5">5 rows</option>
      </select>
      <span className="center">
        <button className="btn3" onClick={handleGenerateComic}>
          Generate Comic
        </button>
      </span>
      <button
        className="btn4"
        onClick={handleSaveComic}
        // disabled={comicStrip == null}
      >
        Save Comic Strip
      </button>
      <button className="btn4" onClick={handleShareClick}>
        Share Image
      </button>
      <br></br>
      <span>
        <label htmlFor="canvasColor">Choose Canvas Background Color:</label>
        <input
          type="color"
          id="canvasColor"
          value={canvasBackgroundColor}
          onChange={handleCanvasColorChange}
        />
      </span>
      <label htmlFor="showCaption">Show Caption</label>
      <input
        id="showCaption"
        type="checkbox"
        checked={showCaption}
        onChange={(e) => setShowCaption(e.target.checked)}
      />
      {showCaption && (
        <div className="caption-inputs">
          {[...Array(10)].map((_, index) => (
            <input
              key={index}
              type="text"
              placeholder={`Caption for Image ${index + 1}`}
              value={captions[index]}
              onChange={(e) => {
                const updatedCaptions = [...captions];
                updatedCaptions[index] = e.target.value;
                setCaptions(updatedCaptions);
              }}
            />
          ))}
        </div>
      )}
      {comicStrip && (
        <div className="center">
          <img
            src={comicStrip}
            alt="Generated Comic Strip"
            className="comic-canvas"
          />
        </div>
      )}
    </div>
  );
}

export default UserInputComponent;
