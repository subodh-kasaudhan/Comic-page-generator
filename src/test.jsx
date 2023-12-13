import React, { useState } from "react";
import ImageGeneration from "./ImageGeneration";
import "./App.css";
import preview from "./assets/preview.png";
import Loader from "./Loader";

function UserInputComponent() {
  const [userInput, setUserInput] = useState("");
  const [imageData, setImageData] = useState(
    Array.from({ length: 10 }, () => ({ imageUrl: "", prompt: "", index: "" }))
  );
  const [loadingImages, setLoadingImages] = useState(Array(10).fill(false));
  const [isGenerating1, setIsGenerating1] = useState(false);
  const [isGenerating2, setIsGenerating2] = useState(false);
  const [showCaption, setShowCaption] = useState(false);
  const [canvasBackgroundColor, setCanvasBackgroundColor] =
    useState("lightgray"); // State to store canvas background color

  const [numRows, setNumRows] = useState(2);
  const [comicStrip, setComicStrip] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [captions, setCaptions] = useState(
    Array.from({ length: 10 }, () => "")
  ); // State to hold captions

  const handleCanvasColorChange = (e) => {
    setCanvasBackgroundColor(e.target.value);
  };

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

  const handleShareClick = async () => {
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
      // Handle any error that might occur while sharing
    }
  };

  function handleRemoveImage() {
    var updatedImageData = [...imageData];
    updatedImageData[currentIndex - 1] = {
      imageUrl: "",
      prompt: "",
      index: "",
    };
    setImageData(updatedImageData);
    setCurrentIndex(currentIndex - 1);
  }

  async function isBlack(imageUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous"; // Handle CORS issue if required
      img.onload = function () {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0, img.width, img.height);

        // Sample some pixels to check for black or near-black color
        const sampleSize = 5; // Number of pixels to sample
        const sampleStep = Math.floor(img.width / sampleSize);

        let isBlack = true; // Assume initially that the image is black

        for (let x = 0; x < img.width; x += sampleStep) {
          for (let y = 0; y < img.height; y += sampleStep) {
            const pixelData = ctx.getImageData(x, y, 1, 1).data;
            const [r, g, b] = pixelData;

            // Check if the pixel color is within a certain range denoting black or near-black
            if (r > 30 || g > 30 || b > 30) {
              isBlack = false;
              break;
            }
          }
          if (!isBlack) {
            break;
          }
        }

        resolve(isBlack);
      };

      img.onerror = function () {
        reject(new Error("Error loading image."));
      };

      img.src = imageUrl;
    });
  }

  async function handleImageGeneration() {
    if (currentIndex === 10) {
      setError(
        `Already generated 10 images. Please proceed with comic page generation.`
      );
      return;
    } else if (userInput.trim() === "") {
      setError(
        `Please enter text for image generation for prompt ${currentIndex + 1}.`
      );
      return;
    }

    try {
      setIsGenerating1(true);
      setLoadingImages((prevLoading) => {
        const updatedLoading = [...prevLoading];
        updatedLoading[currentIndex] = true;
        return updatedLoading;
      });

      setUserInput("");
      const generatedImageUrl = await ImageGeneration(userInput);
      const updatedImageData = [...imageData];

      for (var i = 0; i < 10; i++) {
        updatedImageData[i] = {
          imageUrl: generatedImageUrl,
          prompt: userInput,
          index: i,
        };
      }

      setImageData(updatedImageData);

      setError("");

      setCurrentIndex(currentIndex + 1);
      const isBlackImage = await isBlack(generatedImageUrl);

      if (isBlackImage) {
        setError("Generated image is completely black. Please try again.");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      setError("Error generating image. Please try again.");
    } finally {
      setLoadingImages((prevLoading) => {
        const updatedLoading = [...prevLoading];
        updatedLoading[currentIndex] = false;
        return updatedLoading;
      });
      setIsGenerating1(false);
    }
  }

  async function handleRegenerate() {
    if (currentIndex === 0) {
      setError(`Please generate an image for prompt 1 first.`);
      return;
    }

    try {
      setIsGenerating2(true);
      setLoadingImages((prevLoading) => {
        const updatedLoading = [...prevLoading];
        updatedLoading[currentIndex - 1] = true;
        return updatedLoading;
      });

      const generatedImageUrl = await ImageGeneration(
        imageData[currentIndex - 1].prompt
      );
      const updatedImageData = [...imageData];
      updatedImageData[currentIndex - 1].imageUrl = generatedImageUrl;
      setImageData(updatedImageData);
      setError("");
      const isBlackImage = await isBlack(generatedImageUrl);

      if (isBlackImage) {
        setError("Generated image is completely black. Please try again.");
      }
    } catch (error) {
      console.error("Error regenerating image:", error);
      setError("Error regenerating image. Please try again.");
    } finally {
      setLoadingImages((prevLoading) => {
        const updatedLoading = [...prevLoading];
        updatedLoading[currentIndex - 1] = false;
        return updatedLoading;
      });
      setIsGenerating2(false);
    }
  }

  async function handleGenerateComic() {
    try {
      setError(null);
      setComicStrip(null);

      const columns = Math.ceil(imageData.length / numRows); // Calculate columns based on total images and rows
      var imageWidth = 200; // Width of each square image (adjust as needed)
      var imageHeight = 200; // Height of each square image (adjust as needed)
      var bih = 200; // Width of each square image (adjust as needed)
      var biw = 200; // Height of each square image (adjust as needed)

      const loadPromises = [];
      const borderWidth = 10; // Width of the border (adjust as needed)
      const margin = 2;
      const canvasWidth = columns * (imageWidth + borderWidth);
      const canvasHeight = numRows * (imageHeight + borderWidth);
      // const maxCol = Math.floor();
      // console.log(columns);

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
        img.crossOrigin = "Anonymous"; // Handle CORS issue if required
        img.src = imageData[j].imageUrl;

        const loadPromise = new Promise((resolve, reject) => {
          img.onload = function () {
            ctx.fillStyle = canvasBackgroundColor; // Set border color
            ctx.fillRect(
              x,
              y,
              imageWidth + borderWidth,
              imageHeight + borderWidth
            );

            ctx.fillStyle = "black"; // Set border color
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

            ctx.drawImage(
              img,
              x + borderWidth / 2,
              y + borderWidth / 2,
              imageWidth,
              imageHeight
            );
            console.log(j);
            console.log(captions[j]);

            const s = captions[j];

            if (showCaption && s !== "") {
              ctx.fillStyle = "white";
              ctx.fillRect(x, y + imageHeight - 30, imageWidth, 30);
              ctx.fillStyle = "black";
              ctx.font = "12px Arial";
              ctx.fillText(s, x + 5, y + imageHeight - 10);
              console.log(j);
              console.log(s);
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
              // console.log(r);
            }
          };

          img.onerror = function () {
            reject(new Error(`Error loading image ${j + 1}`));
          };
        });

        loadPromises.push(loadPromise);
      }

      await Promise.all(loadPromises); // Wait for all images to load

      const comicStrip = canvas.toDataURL();
      setComicStrip(comicStrip);
    } catch (error) {
      setError(`Error generating comic: ${error.message}`);
    }
  }

  function handleSaveComic() {
    if (comicStrip) {
      const link = document.createElement("a");
      link.href = comicStrip;
      link.download = "comic_strip.png"; // Set the downloaded file name
      link.click();
    }
  }

  return (
    <div className="image-generation-app">
      <h1 className="shine">AI Comic Page Generator</h1>
      <input
        type="text"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        placeholder={
          currentIndex === 10
            ? "Already Generated 10 images"
            : `Enter prompt ${currentIndex + 1} for image generation`
        }
      />
      <button
        className="btn1"
        onClick={handleImageGeneration}
        disabled={isGenerating1 || isGenerating2}
      >
        {isGenerating1 ? "Generating..." : "Generate Next Image"}
      </button>
      <button
        className="btn1"
        onClick={handleRegenerate}
        disabled={isGenerating1 || isGenerating2}
      >
        {isGenerating2 ? "Generating..." : "Regenerate Current Image"}
      </button>
      <button
        className="btn2"
        disabled={currentIndex == 0 || isGenerating1 || isGenerating2}
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
                    Prompt {data.index + 1}: {data.prompt}
                  </p>
                </div>
              ) : (
                <div>
                  <img src={preview} />
                  <p className="prompts">Preview</p>
                </div>
              )}

              {loadingImages[index] && (
                <div className="loader-position1">
                  <Loader />
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
                    Prompt {data.index + 1}: {data.prompt}
                  </p>
                </div>
              ) : (
                <div>
                  <img src={preview} />
                  <p className="prompts">Preview</p>
                </div>
              )}

              {loadingImages[index + 5] && (
                <div className="loader-position2">
                  <Loader />
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
        {/* Add more options as needed */}
      </select>
      <span className="center">
        <button
          className="btn3"
          onClick={handleGenerateComic}
          disabled={currentIndex > 10 || isGenerating1 || isGenerating2}
        >
          Generate Comic
        </button>
      </span>
      <button
        className="btn4"
        onClick={handleSaveComic}
        disabled={comicStrip == null}
      >
        Save Comic Strip
      </button>
      <button
        className="btn4"
        onClick={handleShareClick}
        disabled={comicStrip == null}
      >
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
