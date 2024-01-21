import {FilesetResolver, GestureRecognizer, FaceLandmarker} from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js';

// const src = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js';
//   const script = document.createElement('script');
//   script.crossOrigin = 'anonymous';
//   script.src = src;
//   document.body.appendChild(script);

  const filesetResolver = await FilesetResolver.forVisionTasks(
    // path/to/wasm/root
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  const gestureRecognizer = await GestureRecognizer.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task"
    },
    runningMode: 'VIDEO',
    numHands: 2
  });

      const faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
          delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode: 'VIDEO',
        numFaces: 1
      });

  const video = document.createElement('video');
// const video = document.getElementById("webcam");
// const canvasElement = document.getElementById("output_canvas");
// const canvasCtx = canvasElement.getContext("2d");
// const gestureOutput = document.getElementById("gesture_output");

// Check if webcam access is supported.
// function hasGetUserMedia() {
//   return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
// }

// If webcam supported, add event listener to button for when user
// wants to activate it.
// if (hasGetUserMedia()) {
//   enableWebcamButton = document.getElementById("webcamButton");
//   enableWebcamButton.addEventListener("click", enableCam);
// } else {
//   console.warn("getUserMedia() is not supported by your browser");
// }

// Enable the live webcam view and start detection.
function enableCam(event) {
  // if (!gestureRecognizer) {
  //   alert("Please wait for gestureRecognizer to load");
  //   return;
  // }

  // if (webcamRunning === true) {
  //   webcamRunning = false;
  //   enableWebcamButton.innerText = "ENABLE PREDICTIONS";
  // } else {
  //   webcamRunning = true;
  //   enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  // }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
    video.play();
    console.log('fsdfsd');
    // window.requestAnimationFrame(predictWebcam);
  });
}

function callTrigger() {
  window.postMessage({type: 'gesture', data: 'squinting'});
  webcamRunning = false;
  for (const track of video.srcObject.getVideoTracks()) {
    track.stop();
  }
}


let scale = 1;

let mouseX = 0;
let mouseY = 0;

function calculateOffset() {

}

function zoomIn() {
  const x = mouseX - (zoomMe.clientWidth / 2);
  const y = mouseY - (zoomMe.clientHeight / 2);
  view.scaleAt({x, y}, 1.1);
  view.applyTo(zoomMe);
}

function zoomOut() {
  const x = mouseX - (zoomMe.clientWidth / 2);
  const y = mouseY - (zoomMe.clientHeight / 2);
  view.scaleAt({x, y}, 0.9);
  view.applyTo(zoomMe);
  // scale -= 0.1;
  // scale = Math.max(scale, 1);
  // document.body.style.transform = `scale(${scale})`;
}

const zoomer = new class {
  intervalIn = 0;
  intervalOut = 0;

  startZoomIn() {
    if (this.intervalIn) return;
    this.intervalIn = setInterval(zoomIn, 20);
  }

  startZoomOut() {
    if (this.intervalOut) return;
    this.intervalOut = setInterval(zoomOut, 20);
  }

  stopZoomIn() {
    clearInterval(this.intervalIn);
    this.intervalIn = 0;
  }

  stopZoomOut() {
    clearInterval(this.intervalOut);
    this.intervalOut = 0;
  }
}

const zoomMe = document.body;

function mouseWheelEvent(event) {
  const x = event.pageX - (zoomMe.width / 2);
  const y = event.pageY - (zoomMe.height / 2);
  if (event.deltaY < 0) {
      view.scaleAt({x, y}, 1.1);
      view.applyTo(zoomMe);
  } else {
      view.scaleAt({x, y}, 1 / 1.1);
      view.applyTo(zoomMe);
  }
  event.preventDefault();
}

const view = (() => {
  const matrix = [1, 0, 0, 1, 0, 0]; // current view transform
  var m = matrix;             // alias
  var scale = 1;              // current scale
  const pos = { x: 0, y: 0 }; // current position of origin
  var dirty = true;
  const API = {
    applyTo(el) {
      // console.log('Doing stuff');
      if (dirty) { this.update() }
      el.style.transform = `matrix(${m[0]},${m[1]},${m[2]},${m[3]},${m[4]},${m[5]})`;
    },
    update() {
      dirty = false;
      m[3] = m[0] = scale;
      m[2] = m[1] = 0;
      m[4] = pos.x;
      m[5] = pos.y;
    },
    pan(amount) {
      if (dirty) { this.update() }
       pos.x += amount.x;
       pos.y += amount.y;
       dirty = true;
    },
    scaleAt(at, amount) { // at in screen coords
      if (scale === 1 && amount < 1) return;
      if (scale === 3 && amount > 1) return;
      if (dirty) { this.update() }
      scale *= amount;
      scale = Math.min(scale, 3);
      scale = Math.max(scale, 1);
      pos.x = at.x - (at.x - pos.x) * amount;
      pos.y = at.y - (at.y - pos.y) * amount;
      dirty = true;
    },
  };
  return API;
})();

document.addEventListener('mousemove', (e) => {
  mouseX = e.pageX;
  mouseY = e.pageY;

  // console.log(mouseX, mouseY, e);
});

let lastVideoTime = -1;
let results = undefined;
let gestureResults = undefined;
let webcamRunning = true;
let runningMode = "IMAGE";

let squintCount = 0;
let browCount = 0;
let counter = 0;

async function predictWebcam() {
  // console.log(123);

  // const webcamElement = document.getElementById("webcam");
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    // await gestureRecognizer.setOptions({ runningMode: "VIDEO" });
  }
  let nowInMs = Date.now();

  if (video.currentTime !== lastVideoTime) {
    counter++;
    lastVideoTime = video.currentTime;
    if (counter % 2 === 0) {
      results = faceLandmarker.detectForVideo(video, nowInMs);
    }
    if (counter % 5 === 0) {
      gestureResults = gestureRecognizer.recognizeForVideo(video, nowInMs);
    }
  }

  // console.log(results.faceBlendshapes);

  if (results?.faceBlendshapes?.length) {
    const blendshapes = results.faceBlendshapes[0];
    const categories = blendshapes.categories;
    const squintLeft = categories.find((c) => c.categoryName === "eyeSquintLeft");
    const squintRight = categories.find((c) => c.categoryName === "eyeSquintRight");

    const browLeft = categories.find((c) => c.categoryName === "browOuterUpLeft");
    const browRight = categories.find((c) => c.categoryName === "browOuterUpRight");

    // console.log(squintLeft.score, squintRight.score);

      if (squintLeft.score > 0.5 && squintRight.score > 0.5) {
        squintCount++;
        if (squintCount > 5) {
          zoomer.startZoomIn();
          // zoomIn();
          console.log("Squinting!");
        }
        // callTrigger();
      } else {
        zoomer.stopZoomIn();
        squintCount = 0;
      }
      if (browLeft.score > 0.5 || browRight.score > 0.5) {
        browCount++;
        if (browCount > 5) {
          zoomer.startZoomOut();
          // zoomOut();
          console.log("Brow up!");
        }
      } else {
        zoomer.stopZoomOut();
        browCount = 0;
      }
  }


// 4
// :
// {index: 4, score: 0.0017264753114432096, categoryName: 'browOuterUpLeft', displayName: ''}
// 5
// :
// {index: 5, score: 0.00041029020212590694, categoryName: 'browOuterUpRight', displayName: ''}

  // console.log(results, results.gestures);
  if (gestureResults?.gestures?.length) {
    const gestures = gestureResults.gestures[0];
    const gesture = gestures.find((g) => g.categoryName === 'Thumb_Up');
    if (gesture && gesture.score > 0.6) {
      window.postMessage({type: 'gesture', data: gesture.categoryName});
      webcamRunning = false;
      for (const track of video.srcObject.getVideoTracks()) {
        track.stop();
      }
      document.body.style.transform = 'unset';
    }
    console.log(gestureResults);
  }
  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}

enableCam();
