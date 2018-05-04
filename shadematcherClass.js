(function () {
    var i = 0,
        vendors = ['ms', 'moz', 'webkit', 'o'];

    while (i < vendors.length && !window.requestAnimationFrame) {
        window.requestAnimationFrame = window[vendors[i] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame =
            window[vendors[i] + 'CancelAnimationFrame'] || window[vendors[i] + 'CancelRequestAnimationFrame'];
        i++;
    }
    if (!window.requestAnimationFrame) {
        alert("RequestAnimationFrame mechanism is not supported by this browser.");
    }
}());

class VisageAR {
    constructor() {
        this.fpsOut = document.getElementById('boldStuff');
        this.canvas = document.getElementById('canvas');
        this.video = document.createElement('video');
        this.video.setAttribute("playsinline", true);
        this.startTracker = document.getElementById('startTracking');
        this.stopTracker = document.getElementById('stopTracking');
        this.statOutput = document.getElementById('myStat');
        this.modelContainer = document.getElementById('modelContainer');
        this.foundationControls = document.getElementById('foundationControls');
        this.btnReset = document.getElementById('btnReset');

        this.mWidth = 0;
        this.mHeight = 0;

        this.fps = 0;
        this.now = 0;
        this.lastUpdate = 0;
        this.fpsFilter = 50;
        this.fpsLimit = 100;
        this.then = Date.now();
        this.interval = 1000 / this.fpsLimit;
        this.showingWebCam = true;

        this.frameProcessor = null;

        this.canCon = canvas.getContext('2d');
        this.trackerStates = ["TRACK_STAT_OFF", "OK", "TRACK_STAT_RECOVERING", "Searching"];

        this.continueVideo = this.continueVideo.bind(this);
        this.stop = this.stop.bind(this);
        this.loadFrame = this.loadFrame.bind(this);
        this.getCoordinates = this.getCoordinates.bind(this);
        this.modelChosenHandler = this.modelChosenHandler.bind(this);
        this.skinToneChosenHandler = this.skinToneChosenHandler.bind(this);
        this.initListeners();
        this.initAR();

        setInterval(() => {
            this.fpsOut.innerHTML = this.showingWebCam ? this.fps.toFixed(1) + " fps" : '-';
        }, 10);
        this.includePoints = [
            13, 1,
            13, 3,
            13, 5,
            13, 7,
            13, 9,
            13, 11,
            13, 13,
            13, 15,
            13, 17,
            13, 16,
            13, 14,
            13, 12,
            13, 10,
            13, 8,
            13, 6,
            13, 4,
            13, 2
        ];
        this.excludePoints = [
            [
                3, 8,
                3, 10,
                3, 12,
                3, 14
            ],
            [
                3, 7,
                3, 9,
                3, 11,
                3, 13
            ],
            [
                4, 6,
                14, 4,
                4, 4,
                14, 2,
                4, 2
            ],
            [
                4, 1,
                14, 1,
                4, 3,
                14, 3,
                4, 5
            ],
            [
                9, 2,
                9, 3,
                9, 1,
                9, 5,
                9, 15,
                9, 4
            ],
            [
                8, 1,
                8, 10,
                8, 5,
                8, 3,
                8, 7,
                8, 2,
                8, 8,
                8, 4,
                8, 6,
                8, 9
            ]
        ]
    }

    initListeners() {
        this.startTracker.addEventListener('click', this.continueVideo);
        this.stopTracker.addEventListener('click', this.stop);
        this.modelContainer.addEventListener('click', this.modelChosenHandler);
        this.foundationControls.addEventListener('click', this.skinToneChosenHandler);
        const uploadFile = document.getElementById('uploadFile');
        const fileSource = document.getElementById('fileInput');
        uploadFile.addEventListener('click', () => fileSource.click());

        fileSource.addEventListener('change', e => {
            const file = e.target.files[0];
            const img = new Image();
            img.onload = () => {
                this.modelImg = img;
                this.renderModelImg();
            };
            img.src = URL.createObjectURL(e.target.files[0]);
        });

        this.btnReset.addEventListener('click', () => {
            if (!this.chosenSkinToneID) return;
            this.chosenSkinToneID = null;
            const imgs = this.foundationControls.getElementsByClassName('control');
            for (let image of imgs) {
                image.classList.remove('selected')
            }
            this.renderModelImg();
        })
    }

    initAR() {
        function deniedStream() {
            alert("Camera access denied!");
        }

        function startStream(stream) {
            this.video.addEventListener('canplay', function DoStuff() {
                this.video.removeEventListener('canplay', DoStuff, true);
                setTimeout(() => {
                    this.video.play();

                    this.canvas.width = this.video.videoWidth;
                    this.canvas.height = this.video.videoHeight;

                    this.mWidth = this.video.videoWidth;
                    this.mHeight = this.video.videoHeight;

                    this.frameProcessor = new OpenCVProcessor(this.mWidth, this.mHeight);

                }, 1000);
            }.bind(this), true);

            this.video.srcObject = stream;
            this.video.play();
        }

        try {
            navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            })
                .then(startStream.bind(this))
                .catch(deniedStream);
        } catch (e) {
            try {
                navigator.mediaDevices.getUserMedia('video', startStream, deniedStream);
            } catch (e) {
                console.error(e);
            }
        }
        this.video.loop = this.video.muted = true;
        this.video.autoplay = true;
        this.video.load();
        this.Module = VisageModule({onRuntimeInitialized: this.onModuleInitialized.bind(this)});
    }

    onModuleInitialized() {
        if (this.mWidth === 0) {
            setTimeout(this.onModuleInitialized.bind(this), 100);
            return;
        }
        this.ppixels = this.Module._malloc(this.mWidth * this.mHeight * 4);
        this.pixels = new Uint8Array(this.Module.HEAPU8.buffer, this.ppixels, this.mWidth * this.mHeight * 4);
        this.Module.initializeLicenseManager("538-266-209-871-308-939-025-336-867-625-033.vlc");
        this.shadematcherTracker = new this.Module.VisageTracker("lib/Facial Features Tracker - High.cfg");
        this.maxFaces = 1;
        this.faceDataArray = new this.Module.FaceDataVector();
        for (let i = 0; i < this.maxFaces; ++i) {
            this.faceData = new this.Module.FaceData();
            this.faceDataArray.push_back(this.faceData);
        }
        this.trackerReturnState = new this.Module.VectorFloat();
        this.trackerReturnState = this.trackerStates[0];
        this.loadFrame();
    }

    loadFrame() {
        if (!this.showingWebCam) return;
        window.requestAnimationFrame(this.loadFrame);
        this.now = Date.now();
        this.delta = this.now - this.then;
        this.then = this.now - (this.delta % this.interval);

        this.canvas.width = this.mWidth;
        this.canvas.height = this.mHeight;
        this.canCon.drawImage(this.video, 0, 0, this.mWidth, this.mHeight);
        this.processFrame();
    }
	
	getOpacityMode() {
		let defaultOpacityMode = 1;
		let url_string = window.location.href;
		let url = new URL(url_string);
		let opacityMode = url.searchParams.get("mode");
		return parseInt((opacityMode == null)? defaultOpacityMode: opacityMode);
	}

    processFrame() {
        //Access pixel data
        this.imageData = this.canCon.getImageData(0, 0, this.mWidth, this.mHeight).data;

        //Save pixel data to preallocated buffer
        for (let i = 0; i < this.imageData.length; i += 1) {
            this.pixels[i] = this.imageData[i];
        }
        this.trackerReturnState = this.shadematcherTracker.track(
            this.mWidth,
            this.mHeight,
            this.ppixels,
            this.faceDataArray,
            this.Module.VisageTrackerImageFormat.VISAGE_FRAMEGRABBER_FMT_RGBA.value,
            this.Module.VisageTrackerOrigin.VISAGE_FRAMEGRABBER_ORIGIN_TL.value,
            0,
            -1,
            this.maxFaces);


        if (this.chosenSkinToneID && this.trackerReturnState.get(0) === 1 && !this.showingWebCam) {
            let coords = this.getCoordinates();

            var frame = new cv.Mat(this.mHeight, this.mWidth, cv.CV_8UC4);
            frame.data.set(this.imageData);
            if (coords[0].length > 0 && coords[1].length > 0) {
                // Returns processed in U8C3 BGR needed to be converted to BGRA
                // coords[0].push([[0, 0], [100, 100], [0, 100]]);
                var processed = this.frameProcessor.processMat(frame, coords[0], coords[1], rfColors[this.chosenSkinToneID - 1], this.getOpacityMode());
                this.canCon.clearRect(0, 0, this.canvas.width, this.canvas.height);
                cv.imshow(this.canvas, processed);
                processed.delete();
            }
            frame.delete();
        }

        this.statOutput.innerHTML = "[" + this.trackerStates[this.trackerReturnState.get(0)] + "]";

        this.thisFrameFPS = 1000 / ((this.now = new Date) - this.lastUpdate);
        this.fps += (this.thisFrameFPS - this.fps) / this.fpsFilter;
        this.lastUpdate = this.now;
    }

    getCoordinates() {
        const featurePoints = this.faceDataArray.get(0).getFeaturePoints2D();
        const includePointsCoords = [];
        const excludePointsCoords = [];
        const canvas = this.canvas;

        function addPoints(sourceArray, resultArray) {
            for (let i = 0; i < sourceArray.length; i += 2) {
                if (featurePoints.FPIsDefined(sourceArray[i], sourceArray[i + 1])) {
                    const x = parseInt(featurePoints.getFPPos(sourceArray[i], sourceArray[i + 1])[0] * canvas.width);
                    const y = parseInt((1 - featurePoints.getFPPos(sourceArray[i], sourceArray[i + 1])[1]) * canvas.height);
                    resultArray.push([x, y])
                }
            }
        }

        addPoints(this.includePoints, includePointsCoords);
        for (let i = 0; i < this.excludePoints.length; i++) {
            const excludeContour = [];
            addPoints(this.excludePoints[i], excludeContour);
            excludePointsCoords.push(excludeContour);
        }

        return [[includePointsCoords], excludePointsCoords]
    }

    start() {
    }

    stop() {
        if (!this.showingWebCam) return;
        this.showingWebCam = false;
        this.modelImg = new Image();
        this.modelImg.src = this.canvas.toDataURL();
        this.video.pause();
    }

    modelChosenHandler(e) {
        if (!e.target.src) return;
        const imgs = this.modelContainer.getElementsByTagName('img');
        for (let image of imgs) {
            image.classList.remove('selected')
        }
        e.target.classList.add('selected');
        this.modelImg = e.target;
        this.renderModelImg();
    }

    renderModelImg() {
        this.showingWebCam = false;
        const canvas = this.canvas;
        this.mWidth = canvas.width = this.modelImg.naturalWidth;
        this.mHeight = canvas.height = this.modelImg.naturalHeight;
        this.frameProcessor.changeSize(this.modelImg.naturalWidth, this.modelImg.naturalHeight);
        this.video.pause();
        this.canCon.drawImage(this.modelImg, 0, 0);
        this.processFrame();
    }

    skinToneChosenHandler(e) {
        const target = e.target;
        if (target.tagName !== 'LI' || this.showingWebCam) return;
        const imgs = this.foundationControls.getElementsByClassName('control');
        for (let image of imgs) {
            image.classList.remove('selected')
        }
        target.classList.add('selected');
        if (this.modelImg) this.canCon.drawImage(this.modelImg, 0, 0);
        switch (target.id) {
            case 'applyFoundation1':
                this.chosenSkinToneID = 1;
                break;
            case 'applyFoundation2':
                this.chosenSkinToneID = 2;
                break;
            case 'applyFoundation3':
                this.chosenSkinToneID = 3;
                break;
            case 'applyFoundation4':
                this.chosenSkinToneID = 4;
                break;
            case 'applyFoundation5':
                this.chosenSkinToneID = 5;
                break;
            case 'applyFoundation6':
                this.chosenSkinToneID = 6;
                break;
        }
        this.processFrame();
    }

    continueVideo() {
        this.modelImg = null;
        this.showingWebCam = true;
        this.canvas.width = this.mWidth = this.video.videoWidth;
        this.canvas.height = this.mHeight = this.video.videoHeight;
        this.frameProcessor.changeSize(this.video.videoWidth, this.video.videoHeight);
        this.loadFrame();
        this.video.play();
    }
}

const visage = new VisageAR();
window.callbackDownload = function () {

};