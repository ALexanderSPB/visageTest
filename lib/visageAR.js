/**
* VisageAR
* <br/><br/>
* @constructor
*/
function VisageAR() {

	var v_width;
	var v_height;
	var v_renderer;
	var v_scene, v_backgroundScene, v_maskScene, v_candideScene;
	var v_camera, v_backgroundCamera, v_maskCamera, v_candideCamera;
	var v_time;

	var V_ppixels;
	var v_pixels;
	
	var v_video;
	var v_videoCanvas;
	var v_videoContext;
	var v_videoTexture;
	var v_frameCanvas ;
	var v_frameContext ;

	var v_glasses;
	var v_mask, v_candideMask;
	
	var v_z_offset;
	var v_z_increment;
	var v_scale_factor;
	var v_scale_increment;

	this.v_tracker_pom = 0;
	var v_tracker;
	var v_faceData;
	var v_trackingStatus;
	var v_tracking = false;
	var v_faceDataArray;

	
	/** 
	*	Initializes Visage AR and sets up rendering and tracking. The video resolution is used for the canvas resolution.
	*	@param {element}container - The HTML element in which to put the rendering canvas.
	*	@param {element}video - The HTML video element required for camera access.
	*/
	this.initialize = function(container, video) {

		// get canvas size
		v_width = video.width;
		v_height = video.height;
		
		v_ppixels = Module._malloc(v_width*v_height*4);
		v_pixels = new Uint8Array(Module.HEAPU8.buffer, v_ppixels, v_width*v_height*4);

		// create webcam canvas
		v_video = video;
		v_videoCanvas = document.createElement('canvas');
		v_videoCanvas.width = v_width;
		v_videoCanvas.height = v_height;
		v_videoContext = v_videoCanvas.getContext('2d');
		v_videoCanvas.setAttribute('style', 'display: none');
		
		v_frameCanvas = document.createElement('canvas');
		v_frameCanvas.width = v_width;
		v_frameCanvas.height = v_height;
		v_frameContext = v_frameCanvas.getContext('2d');
		v_frameCanvas.setAttribute('style', 'display: none; z-index: 1');
		v_videoTexture = new THREE.Texture(v_frameCanvas);

		//Module.initializeLicenseManager("578-606-489-221-723-972-205-371-646-105-273.vlc");
		// init tracker
		this.v_tracker_pom = new Module.VisageTracker("../../lib/Head Tracker.cfg");
		//initialize licensing
		//example how to initialize license key
		v_faceDataArray = new Module.FaceDataVector();
		v_faceDataArray.push_back(new Module.FaceData());
		
		v_tracker = this.v_tracker_pom;

		// setup renderer
		v_renderer = new THREE.WebGLRenderer({antialias: true});
		v_renderer.setClearColor(0x0055FF, 1);
		v_renderer.autoClearDepth = false;
		v_renderer.autoClear = false;
		v_renderer.autoClearColor = false;
		v_renderer.setSize(v_width, v_height);
		v_renderer.sortObject = false;
		container.appendChild(v_renderer.domElement);

		// setup scenes
		v_scene = new THREE.Scene();
		v_backgroundScene = new THREE.Scene();
		v_maskScene = new THREE.Scene();
		v_candideScene = new THREE.Scene();
		v_time = new THREE.Clock(true);

		// setup video plane camera
		v_backgroundCamera = new THREE.OrthographicCamera(-v_width/2, v_width/2, v_height/2, -v_height/2, 0.1, 1000);
		v_backgroundCamera.lookAt(new THREE.Vector3(0, 0, -1));
		v_backgroundScene.add(v_backgroundCamera);

		// setup video plane
		var plane = new THREE.Mesh(new THREE.PlaneGeometry(v_width, v_height, 1, 1), new THREE.MeshBasicMaterial({color: 0xFFFFFF, map: v_videoTexture}));
		plane.position.set(0, 0, -500);
		v_backgroundScene.add(plane);

		// setup glasses camera
		v_camera = new THREE.PerspectiveCamera(36.869, v_width/v_height, 0.1, 1000);
		v_camera.lookAt(new THREE.Vector3(0, 0, 1));
		v_scene.add(v_camera);

		// setup mask camera
		v_maskCamera = new THREE.PerspectiveCamera(36.869, v_width/v_height, 0.1, 1000);
		v_maskCamera.lookAt(new THREE.Vector3(0, 0, 1));
		v_maskScene.add(v_maskCamera);
		v_candideCamera = new THREE.PerspectiveCamera(36.869, v_width/v_height, 0.1, 1000);
		v_candideCamera.lookAt(new THREE.Vector3(0, 0, 1));
		v_candideScene.add(v_candideCamera);

		// setup masking cube
		var geometry = new THREE.CubeGeometry(0.1, 1, 0.2);
		var geometry2 = new THREE.CubeGeometry(0.5, 1, 0.2);
		var material = new THREE.MeshBasicMaterial({color: 0x000000, opacity: 0, transparent: true});
		v_mask = new THREE.Object3D();
		var v_maskChild = new THREE.Mesh(geometry, material);
		v_maskChild.position.set(0, 0, -0.1);
		var v_maskChild2 = new THREE.Mesh(geometry2, material);
		v_maskChild2.position.set(0, 0, -0.18);
		//v_mask.add(v_maskChild);
		//v_mask.add(v_maskChild2);
		v_maskScene.add(v_mask);

		// setup ambient light
		var ambientLight = new THREE.AmbientLight(0x808080);
		v_scene.add(ambientLight);

		// setup point light
		var pointLight = new THREE.PointLight(0xA0A0A0, 0.1, 0.0, 2);
		pointLight.position.set(0, 0, 0);
		v_scene.add(pointLight);
	}
	
	function splitString(url)
	{
		var string = url;
		var rest = string.substring(0, string.lastIndexOf("/") + 1);
		var last = string.substring(string.lastIndexOf("/") + 1, string.length); 
		return [rest, last];     
	}
	
	
	/**
	*	Loads the occlusion mask in OBJ format and its material in MTL format. 
	*	<br><br
	*	@param {string} url - The URL from which to load occlusion mask, without the extension.
	*/
	this.loadOccluder = function(urlOccluder) {
		
		var maskLoader = new THREE.OBJLoader();
		var mtlLoader = new THREE.MTLLoader();

		var temp = splitString(urlOccluder);
		var pathMtl = temp[0];
		var model = temp[1];
		
		mtlLoader.setPath(pathMtl);
		mtlLoader.load( model + ".mtl", function( materials ) {

			materials.preload();

			maskLoader.setMaterials( materials );
	
			maskLoader.load(urlOccluder + ".obj", function ( object ) 
			{
				if (v_candideMask)
					v_mask.remove(v_candideMask);
				
				if (typeof object.children === 'undefined' || object.children.length != 1)
				{
					console.log ("Error - occluder object invalid");
				}
		
				object.children[0].material.transparent = true;
				object.children[0].material.opacity = 0;
				
				v_candideMask = new THREE.Object3D();
				v_candideMask.add(object.children[0]);						
				v_mask.add(v_candideMask);

				//remove the occluder object from original glasses
				object.remove(object.children[0]);
			});
		});
	}
	
	/**
	*	Clear the current active occlusion mask and removes it from the occlusion scene. 
	*/
	this.clearOccluder = function()
	{
		if (v_mask && v_candideMask)
			v_mask.remove(v_candideMask);
	}

	/** 
	*	Loads the 3D object and adds it to the main scene to be rendered from the given URL and makes it active. The object should be in OBJ format and the material should be in MTL format. The MTL file should have the same name as the OBJ file.
	*	See the <a href="eyewear_model_guide.html">modeling guide</a> on how to prepare models for use with VisageAR.
	*	@param {string} urlObject - The URL from which to load the model, without the extension.
	*/
	this.loadObject = function(urlObject) {
		//Show "Glasses Loading" text
		var glass_text = document.getElementById("glass_text");
		if (glass_text)
			glass_text.hidden = false;
		
		//Remove old glasses
		v_scene.remove(v_glasses);
		
		v_glasses = new THREE.Object3D();
		
		var glassesLoader = new THREE.OBJLoader();
		var mtlLoader = new THREE.MTLLoader();

		var temp = splitString(urlObject);
		var pathMtl = temp[0];
		var model = temp[1];
	
		mtlLoader.setPath(pathMtl);
		mtlLoader.load( model + ".mtl", function( materials ) {

			materials.preload();

			glassesLoader.setMaterials( materials );
			v_glasses.position.set(0, 1, -5);
			v_scene.add(v_glasses);
			glassesLoader.setPath(pathMtl);
			glassesLoader.load(model + ".obj", function ( object ) {
			
				v_glasses.children.length = 0;
				v_glasses.add(object);
			
				//Hide "Glasses Loading" text
				if (glass_text)
					glass_text.hidden = true;
			});
		});	
	}

	/**
	*	Starts tracking the face and displaying (rendering) any 3D objects loaded using loadObject(). Object is 
	*   overlayed on the face.
	*/
	this.startTracking = function() {
		v_tracking = true;
	}

	/**
	*	Stops tracking.
	*/
	this.stopTracking = function() {
		v_tracking = false;
	}
	
	this.setIPD = function(ipd) {
		if (v_tracking = true && v_tracker)
		{
			  //convert to meters
			  v_tracker.setIPD(ipd/1000);
		}
	}
	/*
	*	Updates the tracker with a new video image.
	*/
	var updateTracker = function() {

		// update video texture
		if (v_video.readyState === v_video.HAVE_ENOUGH_DATA) {
			v_videoContext.drawImage(v_video, 0, 0, v_width, v_height);
			v_videoTexture.needsUpdate = true;
		}

		if (!v_tracking)
			return;
		
		// fetch image data from canvas
		var dataBuffer = v_videoContext.getImageData(0, 0, v_width, v_height);
		var imageData = dataBuffer.data;
		
		// 
		v_pixels.set(imageData);
		
		v_frameContext.putImageData(dataBuffer,0 ,0);
		// 
		v_trackingStatus = v_tracker.track(
			v_width, 
			v_height, 
			v_ppixels, 
			v_faceDataArray,
			Module.VisageTrackerImageFormat.VISAGE_FRAMEGRABBER_FMT_RGBA.value,
			Module.VisageTrackerOrigin.VISAGE_FRAMEGRABBER_ORIGIN_TL.value, 
			0,
			-1
		);
		// fetch faceData of the first face
		v_faceData = v_faceDataArray.get(0);
	}

	/*
	*	Updates the glasses model position and the face mask position.
	*/
	var update = function() {

		if (v_tracking && v_trackingStatus.get(0) === Module.VisageTrackerStatus.TRACK_STAT_OK.value) 
		{
			// move mask
			v_mask.position.set(v_faceData.getFaceTranslation()[0], v_faceData.getFaceTranslation()[1], v_faceData.getFaceTranslation()[2]);
			v_mask.rotation.set(-v_faceData.getFaceRotation()[0], v_faceData.getFaceRotation()[1] + 3.14, v_faceData.getFaceRotation()[2]);

			// move glasses
			v_glasses.position.set(v_faceData.getFaceTranslation()[0], v_faceData.getFaceTranslation()[1], v_faceData.getFaceTranslation()[2]);
			v_glasses.rotation.set(-v_faceData.getFaceRotation()[0], v_faceData.getFaceRotation()[1] + 3.14, v_faceData.getFaceRotation()[2]);
		} else {

			v_mask.position.set(0, 0, -5);
			v_glasses.position.set(0, 0, -5);
		}

	}

	/*
	*	Renders the scene.
	*/
	var render = function() {
		v_renderer.clear(1, 1, 1);
		v_renderer.render(v_backgroundScene, v_backgroundCamera);
		v_renderer.clear(0, 1, 1);
		v_renderer.render(v_maskScene, v_maskCamera);
		v_renderer.render(v_scene, v_camera);
	}

	/*
	*	Main loop.
	*/
	var loop = function() {
		var requestAnimationFrame = window.requestAnimationFrame || window.mozRequestAnimationFrame ||
								  window.webkitRequestAnimationFrame || window.msRequestAnimationFrame;
		requestAnimationFrame(loop);
		
			if (!v_video)
				return;

			updateTracker();
			update();
			render();
	};
	/**
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*<br/><br/>
	*/
	loop();
}