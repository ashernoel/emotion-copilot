
function startZenAudio() {
  const url = chrome.runtime.getURL("/zen.mp3");
  const audio = document.createElement('audio');
  audio.src = url;
  document.body.appendChild(audio);
  audio.play();
  audio.style.display = 'none';
  audio.loop = true;
}

function addButterflies() {
  const src = chrome.runtime.getURL("/butterfly.webp");
  for (let i = 0; i < 10; i++) {
    const image = document.createElement('img');
    image.src = src;

    let x = Math.random() * window.innerWidth;
    let y  = Math.random() * window.innerHeight;

    image.classList.add('butterfly');
    image.style.left = `${x}px`;
    image.style.top = `${y}px`;
    document.body.appendChild(image);

    setInterval(() => {
      x += Math.random()* 10 - 5;
      y += Math.random()* 10 - 5;
      image.style.left = `${x}px`;
      image.style.top = `${y}px`;
    }, 30);
  }
}

async function startGestureRecognition() {
  // const src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js';
  // const script = document.createElement('script');
  // script.origin = 'anonymous';
  // script.src = src;
  // document.body.appendChild(script);

  const myScript = document.createElement('script');
  myScript.src = chrome.runtime.getURL("/client.js");
  myScript.type = 'module';
  document.body.appendChild(myScript);

  // const vision = await FilesetResolver.forVisionTasks(
  //   // path/to/wasm/root
  //   "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm "
  // );
  // const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
  //   baseOptions: {
  //     modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task"
  //   },
  //   numHands: 2
  // });
}

// startGestureRecognition();
// window.addEventListener()

const button = document.createElement('button');
button.addEventListener('click', () => {
  startGestureRecognition();
  let triggered = false;
  window.addEventListener('message', (m) => {
    if (triggered) return;
    // console.log(m);
    if (m.data.type === 'gesture') {
      addButterflies();
      startZenAudio();
      triggered = true;
    }
  });
  // startZenAudio();
  // addButterflies();
}, {once: true});
button.textContent = 'Start demo';
button.style.position = 'fixed';
button.style.right = '10px';
button.style.top = '10px';
button.style.zIndex = 1000000;
document.body.appendChild(button);

// doMagic();
