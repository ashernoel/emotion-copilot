let videoElement = null;
let canvasElement = null;
let stream = null;
let isProcessingDone = false; // Flag to track if processing is done

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startCamera") {
        initCamera();
    }
});

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
  const apiKey = "";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, '');
  const prompt = `Carefully examine the person sitting in front of the computer screen. Pay close attention to their body language and facial expressions, with a particular focus on the eyes and forehead. Look for any signs of squinting or other subtle indicators in their expression and posture that might suggest confusion. Based on these observations, determine whether the person is confused by what they are seeing on the screen. Conclude your analysis with a JSON response containing a single key, 'confused', indicating whether the person is confused (True) or not (False)`;

  const payload = {
    "model": "gpt-4-vision-preview",
    "messages": [
      {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": prompt
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
    const confusedBool = checkIfConfused(data);
    console.log("Received response from GPT-4 Vision API:", data);
    return parseEmotionResponse(data);
  } catch (error) {
    console.error('Error calling GPT-4 Vision API:', error);
    return null;
  }
}

function checkIfConfused(apiResponse) {
  if (apiResponse && apiResponse.choices && apiResponse.choices[0] && apiResponse.choices[0].message) {
    let messageContent = apiResponse.choices[0].message.content;
    messageContent = messageContent.replace(/True/g, 'true').replace(/False/g, 'false');
    try {
      const jsonResponse = JSON.parse(messageContent.match(/\{.*\}/s)[0]);
      if (typeof jsonResponse.confused === 'boolean') {
        return jsonResponse.confused;
      }
    } catch (error) {
      console.error("Error parsing JSON from message content:", error);
    }
  }
  return false;
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

function extractWebPageContent() {
  const title = document.title;
  const description = document.querySelector('meta[name="description"]').getAttribute('content');
  const keywords = document.querySelector('meta[name="keywords"]').getAttribute('content');
  const url = window.location.href;

  return {
    title,
    description,
    keywords,
    url
  };
}


initCamera();