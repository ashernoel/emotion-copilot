let videoElement = null;
let canvasElement = null;
let stream = null;
let isProcessingDone = false; // Flag to track if processing is done
async function initCamera() {
  if (window.location.href.includes("thecrimson.com")) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.play();

      canvasElement = document.createElement('canvas');
      document.body.appendChild(canvasElement);
      canvasElement.style.display = 'none';

      // Wait for 2 seconds before starting frame capture
      setTimeout(startFrameCapture, 2000);
    } catch (error) {
      console.error('Camera access denied:', error);
    }
  }
}

function startFrameCapture() {
  if (!isProcessingDone) {
    processFrame();
  }
}

function processFrame() {
  if (!videoElement) {
    console.error('Camera not initialized');
    return;
  }

  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;
  canvasElement.getContext('2d').drawImage(videoElement, 0, 0);

  const frame = canvasElement.toDataURL('image/jpeg', 0.7); // Adjust quality as needed
  
  // Add this line to download the image for debugging
  downloadImage(frame, 'captured-frame.jpeg');

  analyzeEmotion(frame).then(emotionData => {
    displayEmotionData(emotionData);
    isProcessingDone = true;
  });
}

// Function to download the image
function downloadImage(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

async function analyzeEmotion(base64Image) {
  const apiKey = process.env.OPENAI_API_KEY;
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  // Remove the 'data:image/jpeg;base64,' part from the base64 string
  const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, '');

  const payload = {
    "model": "gpt-4-vision-preview",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "What is in this image?"
          },
          {
            "type": "image_url",
            "image_url": {
              "url": `data:image/jpeg;base64,${base64Data}`
            }
          }
        ]
      }
    ],
    "max_tokens": 300
  };

  try {
    console.log("Making API request to GPT-4 Vision...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log("Received response from GPT-4 Vision API:", data);
    return parseEmotionResponse(data);
  } catch (error) {
    console.error('Error calling GPT-4 Vision API:', error);
    return null;
  }
}

function parseEmotionResponse(apiResponse) {
  // Assuming the API response has the necessary structure
  if (apiResponse.choices && apiResponse.choices[0] && apiResponse.choices[0].message) {
    return apiResponse.choices[0].message;
  } else {
    // Return a default message or structure if the expected data isn't present
    return { content: "No emotion data found." };
  }
}


function displayEmotionData(emotionData) {
    // Create a container for emotion data if it doesn't exist
    let emotionBox = document.getElementById('emotionBox');
    if (!emotionBox) {
        emotionBox = document.createElement('div');
        emotionBox.id = 'emotionBox';
        emotionBox.style.position = 'fixed';
        emotionBox.style.bottom = '10px';
        emotionBox.style.right = '10px';
        emotionBox.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
        emotionBox.style.border = '1px solid #ddd';
        emotionBox.style.padding = '10px';
        emotionBox.style.borderRadius = '8px';
        emotionBox.style.fontSize = '14px';
        emotionBox.style.color = 'black';
        emotionBox.style.zIndex = '1000'; // Ensure it's above most elements
        document.body.appendChild(emotionBox);
    }

    // Safely check if emotionData and the nested properties exist
  if (emotionData && emotionData.content) {
    emotionBox.textContent = emotionData.content;
  } else {
    emotionBox.textContent = "Could not extract emotion data.";
  }
}

initCamera();