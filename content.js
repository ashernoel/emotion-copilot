let videoElement = null;
let canvasElement = null;
let stream = null;
let isProcessingDone = false; // Flag to track if processing is done
let isUserConfused = false; // Global flag for user's emotion


chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startCamera") {
        initCamera();
    }
});


async function analyzePageContent() {
  const textElements = document.querySelectorAll('h1, h2, p');
  let pageText = Array.from(textElements).map(elem => elem.textContent).join(" ");

  // Limiting text length to avoid exceeding token limits
  pageText = pageText.substring(0, 1000);

  const summary = await getSummaryFromGPT4(pageText);
  console.log("Page Summary:", summary);
  displaySummaryDialog(summary);
}

async function displaySummaryDialog(summary) {
  const earlyText = isUserConfused ? 'You are looking confused' : 'You are not looking confused, but we are making a demo, so...';
  // notify('You are looking confused', 2500);
  notify(earlyText, 2500);
  await new Promise(resolve => setTimeout(resolve, 2500));
  // Create a dialog element
  // Include confused message if user is confused
  const confusedMessage = isUserConfused ? "YOU SEEM CONFUSED! HERE IS A SUMMARY: " : "";
  const fullSummary = confusedMessage + summary;

  // Create a dialog element
  const dialog = document.createElement('div');

  dialog.style.position = 'absolute';
  dialog.style.left = '0';
  dialog.style.fontSize = '20px';
  dialog.style.backgroundColor = '#f8f8f8';
  dialog.style.borderBottom = '1px solid #ddd';
  dialog.style.padding = '60px';
  dialog.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
  dialog.style.zIndex = '10000000';
  dialog.style.background = 'transparent';

  if (window.location.href.includes("nyulmc.org")) {
    // Append the clickable link to the summary
    fullSummary = ' <a href="https://www.google.com" target="_blank">BILLING PAGE: HERE</a>';
  }

  dialog.innerText = fullSummary;
  notify(fullSummary, 1000000);
  return;

  // Determine the height of any top banner
  const topBanner = document.body.firstElementChild;
  const topBannerHeight = topBanner ? topBanner.offsetHeight : 0;
  // Adjust the top position of the dialog to be just below the banner
  dialog.style.top = `${topBannerHeight}px`;

  document.body.prepend(dialog);

  // Adjust the body's top padding to account for the new dialog height
  document.body.style.paddingTop = `${dialog.offsetHeight + topBannerHeight}px`;

  // Scroll to the top of the page to ensure the dialog is visible
  window.scrollTo(0, 0);
}


async function getSummaryFromGPT4(text) {
  const gpt4Endpoint = "https://api.openai.com/v1/chat/completions";
  const apiKey = "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"; // Replace with your API key
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  const payload = {
    model: "gpt-4-1106-preview", // Or "gpt-4-turbo" based on your choice
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: `Summarize the following text: ${text}` }
    ]
  };

  try {
    const response = await fetch(gpt4Endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling GPT-4 API:', error);
    return "Error in fetching summary";
  }
}

function notify(text, timeout = 1000) {
  const dialog = document.createElement('dialog');
  dialog.innerText = text;
  dialog.style.cssText = `
    font-size: 40px;
    transition: opacity ${timeout / 1000 / 2}s;
    opacity: 1;
  `;
  document.body.appendChild(dialog);
  dialog.showModal();
  setTimeout(() => {
    dialog.style.opacity = '0';
  }, timeout / 1.5)
  // dialog.style.opacity = '0';
  setTimeout(() => {
    dialog.close()
  }, timeout);
  return dialog;
}

async function initCamera() {
  if (window.location.href.includes("thecrimson.com") || window.location.href.includes("nyulmc.org")) {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement = document.createElement('video');
      videoElement.srcObject = stream;
      videoElement.play();

      canvasElement = document.createElement('canvas');
      document.body.appendChild(canvasElement);
      canvasElement.style.display = 'none';
      analyzePageContent();

      // Wait for 2 seconds before starting frame capture
      notify('Taking your picture in 2 seconds...');
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

  const dialog = notify('ChatGPT goes brrr...', 10000);
  
  analyzeEmotion(frame).then(emotionData => {
    dialog.close();
    displayEmotionData(emotionData);
    isProcessingDone = true;
  });
}
async function analyzeConfusion(description) {
  const gpt4Endpoint = "https://api.openai.com/v1/chat/completions";
  const apiKey = "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"; // Replace with your API key
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  const payload = {
    model: "gpt-4-1106-preview",
    messages: [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: `You receive the following description: ${description}. What is the chance that the person is CONFUSED? Please answer with ONLY a percent from 0 to 100%. That should be your whole answer.` }
    ]
  };

  try {
    console.log("Making API request to GPT-4 Completions...");
    const response = await fetch(gpt4Endpoint, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    console.log("Response from GPT-4 Completions API:", data);

    // Extract the confusion percentage and update the flag
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      const confusionMatch = data.choices[0].message.content.match(/(\d+)%/);
      if (confusionMatch && parseInt(confusionMatch[1]) > 40) {
        isUserConfused = true;
      }
    } else {
      console.log("No valid response for confusion analysis.");
    }
  } catch (error) {
    console.error('Error calling GPT-4 Completions API:', error);
  }
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
  const apiKey = "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";
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  };

  const base64Data = base64Image.replace(/^data:image\/jpeg;base64,/, '');
  const prompt = `What is in the image? Are there any obvious emotions? For example, if there are trees, do they look sad? Or do they look confused?`;

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
    // Extract description and analyze confusion
    // Extract description and analyze confusion
    const imageDescription = data.choices[0].message.content;
    await analyzeConfusion(imageDescription);  // Await the analysis

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
    // notify('You are looking confused', 1000);
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