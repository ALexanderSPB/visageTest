/**
* <br/>
* The VisageTrackerUnityPlugin is a native plugin (see <a href=https://docs.unity3d.com/Manual/NativePlugins.html>Native Plugins</a>)
* written in JavaScript for Unity. 
* The plugin exposes face tracking features of visage|SDK for use in Unity WebGL build.
* <br/>	<br/>
* The plugin code is placed in VisageTrackerUnityPlugin.jslib file and can be found in /lib folder.
* <br/>	<br/>
*
* <h3>&emsp;Dependencies </h3>
* The plugin depends on visageSDK.js file that loads visageSDK.data. Therefore, visageSDK.js has to be included in 
* WebGL build output file - index.html.
* Additional information on changing the location of the data file can be seen on the following link:
* <a href="VisageTracker.html#trackDep">VisageTracker Dependencies</a>
* <br/><br/>
*
* <h3>&emsp;Usage </h3>
* For the functions to be accessible from C#, a C# wrapper interface is used.
* The example can be seen in the following function:
* <pre class="prettyprint source"><code>
*  [DllImport("__Internal")]
*  public static extern void _openCamera(int width, int height, int mirrored, string onSucessCallbackCamera, string onErrorCallbackCamera);
*
* </code></pre>
* The usage is demonstrated in VisageTrackerUnityDemoWebGL sample, VisageTrackerNativ.HTML5.cs file. All C# scripts are located in Assets/Scripts folder of the project. 
* <br/>
* In order to use VisageTrackerUnity plugin in Unity projects visageSDK.js must be included in output index.html file (see <a href="trackerunity.html#BuildUnity">link</a>).
*<br/>
*<br/>
*
* <h3>&emsp;Callbacks</h3>
* Generally, it is common to use callback functions in JavaScript, due to its asynchronous nature. 
*
* <br/><br/>
* Within the plugin, some functions are implemented so they expect a <b>callback function name</b> as a parameter.
* Callback functions are defined in C# code, and they can be defined with input parameters.
* Any input data passed to the C# callback function from the JavaScript plugin is passed as a JSON formatted string.
* Examples can be seen in {@link module:VisageTrackerUnityPlugin._getCameraInfo|_getCameraInfo} and {@link module:VisageTrackerUnityPlugin._getTrackedData|_getTrackedData} functions.
* <br/><br/>
* 
* 
* 
* @exports VisageTrackerUnityPlugin
* <br/>
*/

var VisageTrackerUnityPlugin = 
{
	/*
	* Indicator whether the VisageModule is loaded.
	* <br/>
	* @type {Boolean}
	*/
	mInitVis: false,
	
	/*
	* True if initialization of VisageModule was initiated, false otherwise.
	* <br/>
	* @type {Boolean}
	*/
	mInInit: false,
	
	/*
	* Indicator whether the stream from camera is accessed.
	* <br/>
	* @type {Boolean}
	*/
	mIsStreaming: false,
	
	/*
	* Possible states of the tracker:
	* <br>
	* OFF = 0,
    * OK = 1,
    * RECOVERING = 2,
    * INIT = 3
	* <br/>
	* @type {Array}
	*/
	status: ["OFF","OK","RECOVERING","INIT"],
	trackerStatus: -1,
	
	/*
	* Pointer to image pixel data.
	* <br/>
	* @type {Number}
	*/
	ppixels: -1,
	
	/*
	* View to the memory.
	* <br/>
	* @type {Array}
	*/
	pixels: -1,
	
	/*
	* Represents the underlying pixel data for the area of the canvas denoted by the rectangle which starts at 
	* (sx, sy) and has an sw width and sh height.
	*/
	imageData: -1,
	
	/*
	* Declares {@link module:VisageTrackerUnityPlugin.mInitVisage|mInitVisage} dependency on {@link module:VisageTrackerUnityPlugin.mInInit|mInInit} variable.
	*/
	mInitVisage__deps: ['mInInit'],
	
	/*
	* Loads VisageModule. 
	* <br/>
	* If VisageModule is loaded successfully OnRuntimeInitialized is called and {@link module:VisageTrackerUnityPlugin.mInitVis|mInitVis} is set to true, otherwise UnboundTypeError is called and {@link module:VisageTrackerUnityPlugin.mInitVis|mInitVis} is set to false.
	*/
    mInitVisage: function()
    {
		if (_mInInit)
			return;
		
		_mInInit = true;
		
		VisageModule = VisageModule({onRuntimeInitialized: function(){_mInitVis = true;}, UnboundTypeError: function(){_mInitVis = false;}});
	},
	
	/*
	* Declares {@link module:VisageTrackerUnityPlugin._initTracker|_initTracker} dependency on {@link module:VisageTrackerUnityPlugin.mInitVis|mInitVis} variable.
	*/
	_initTracker__deps: ['mInitVis'],
	
	/**
	* Initializes VisageTracker.
	* <br/>
	* To change the configuration file, _initTracker function should be called again.
	* Callback function is called once the tracker is initialized.
	* <br>
	* Parameters <i>config</i> and <i>license</i> are strings that represent the path to the tracker configuration file
	* and path to the license file.
	* <br>
	* Example, if the license and configuration files are located in StreamingAssets/Visage Tracker folder:
	* <pre class="prettyprint source"><code>
	*   configFilePath = "StreamingAssets/Visage Tracker/Head Tracker.cfg";
    *   licenseFilePath = "StreamingAssets/Visage Tracker/471-308-776-250-553-231-598-221-624-198-522.vlc";
	*   
	* </code></pre>
	* <br/>
	* @param {string} config - the name and path to the tracker configuration file (.cfg; default configuration file is provided in lib folder; 
	* for further details see <a href="doc/VisageTracker Configuration Manual.pdf">VisageTracker Configuration Manual</a>). 
	* @param {string} license - the name and path to the license file (.vlc).
	* @param {string} callback - <b>the name</b> of the callback function.
	*/
	_initTracker: function(config, license, callback)
	{
		if(typeof mConfig === 'undefined' && typeof mLicense === 'undefined' && typeof mCallback === 'undefined')
		{
			mConfig = Pointer_stringify(config);
			mLicense = Pointer_stringify(license);
			mCallback = Pointer_stringify(callback);
		}
		
		if(!_mInitVis)
		{
			_mInitVisage();
			setTimeout(__initTracker, 2, config, license, callback);
			return;
		}
		
		if(typeof tracker !== 'undefined')
		{
			tracker.delete();
			faceDataArray.delete();
		}
		
		VisageModule.initializeLicenseManager(mLicense);
		tracker = new VisageModule.VisageTracker(mConfig);
		faceDataArray = new VisageModule.FaceDataVector();
		faceDataArray.push_back(new VisageModule.FaceData());
	
		SendMessage('Tracker', mCallback);
		
		delete mConfig;
		delete mLicense;
		delete mCallback;
		
	},
	
	/*
	* Allocates memory for image data.
	*/
	mAllocateMemory: function()
	{
		if (!_mInitVis)
		{
			setTimeout(_mAllocateMemory, 10);
			return;
		}
		
		_ppixels = VisageModule._malloc(w*h*4);

		_pixels = new Uint8ClampedArray(VisageModule.HEAPU8.buffer, _ppixels, w*h*4);
		
	},
	
	/*
	* Declares {@link module:VisageTrackerUnityPlugin._openCamera|_openCamera} dependency on {@link module:VisageTrackerUnityPlugin.mAllocateMemory|mAllocateMemory} 
	* and {@link module:VisageTrackerUnityPlugin.mInitVisage|mInitVisage} functions and {@link module:VisageTrackerUnityPlugin.mIsStreaming|mIsStreaming} parameter.
	*/
	_openCamera__deps: ['mAllocateMemory', 'mInitVisage', 'mIsStreaming'],
	
	/**
	* Closes camera if it is already opened.
	* If the camera is initialized successfully onSuccessCallbackCamera callback function is called, otherwise onErrorCallbackCamera callback function is called.
	* Mirrors the frame if isMirrored parameter is set to 1.
	* <br/>
	* @param {number} camWidth - camera frame width.
	* @param {number} camHeight - camera frame height.
	* @param {number} isMirrored - 1 or 0; if set to 1 frames will be mirrored.
	* @param {string} onSuccessCallbackCamera - the name of the callback function that is called if camera is successfully initalized.
	* @param {string} onErrorCallbackCamera - the name of the callback function that is called if initialization camera fails.
	*/
	_openCamera: function(camWidth, camHeight, isMirrored, onSuccessCallbackCamera, onErrorCallbackCamera)
	{	
		if(!_mInitVis)
			_mInitVisage();
		
		if(_mIsStreaming)
			__closeCamera();
		
		var success =  Pointer_stringify(onSuccessCallbackCamera);
		var error =  Pointer_stringify(onErrorCallbackCamera);
		
		canvas = document.createElement('canvas');
		canvas.id = 'c';
		document.body.appendChild(canvas);
		c = document.getElementById('c');
		c.style.display = "none";
		
		video = document.createElement('video');
		//Mobile safari requirement
		video.setAttribute("playsinline", true);
		video.id = 'v';
		document.body.appendChild(video);
		v = document.getElementById('v');
		v.style.display = "none";
		
		con = c.getContext('2d');
		w = camWidth;
		h = camHeight;
		
		_mIsStreaming = false;

			
		// Request access to video only
		navigator.mediaDevices.getUserMedia(
		{
			video: { width: w, height: h },
			audio:false
		}).then(function(stream) {
			v.srcObject = stream;
			v.play();
			window.localStream = stream;
		}).catch(function(error) {
				SendMessage('Tracker', error);
		});
	
		
		// Wait until the video stream can play
		v.addEventListener('canplay', function(e) {
			if (!_mIsStreaming) {
				c.setAttribute('width', w);
				c.setAttribute('height', h);
				
				if(isMirrored == 1)
				{
					// Reverse the canvas image
					con.translate(w, 0);
					con.scale(-1, 1);
				}
				_mIsStreaming = true;
				SendMessage('Tracker', success);
				_mAllocateMemory();
			}
		}, false);
	},
	
	/**
	* Stops camera streaming.
	* If camera is already closed returns false, otherwise returns true.
	* <br/>
	* @returns {Boolean}
	*/
	_closeCamera:function()
	{
		if(_mIsStreaming)
		{
			localStream.getVideoTracks()[0].stop();
			document.body.removeChild(canvas);
			document.body.removeChild(video);
			
			if(_ppixels !== -1 &&  _pixels !== -1)
			{
				VisageModule._free(_ppixels);
			}
			_mIsStreaming = false;
			return true;
		}
		else
			return false;
	},
	
	/**
	* Captures current frame to be used for face tracking and binding on given texture. Needs to be called before {@link module:VisageTrackerUnityPlugin._track|_track} 
	* and {@link module:VisageTrackerUnityPlugin._bindTexture|_bindTexture} functions.
	* <br/>
	* 
	*/
	_grabFrame: function()
	{
		if(_mIsStreaming)
		{
			con.fillRect(0, 0, w, h);
			con.drawImage(v, 0, 0, w, h);
			
			//Access pixel data	
			_imageData =  con.getImageData(0, 0, w, h);
		}
	},
	
	/*
	* Declares {@link module:VisageTrackerUnityPlugin._track|_track} dependency on {@link module:VisageTrackerUnityPlugin.imageData|imageData}
	*/
	_track__deps: ['imageData'],
	
	/**
	* Performs face tracking on the captured frame (see {@link module:VisageTrackerUnityPlugin._grabFrame|_grabFrame}) and returns tracking status.
	* {@link module:VisageTrackerUnityPlugin._openCamera|_openCamera} and {@link module:VisageTrackerUnityPlugin._initTracker|_initTracker} functions
	* need to succeed before calling {@link module:VisageTrackerUnityPlugin._track|_track}. Otherwise function returns -1.
	* <br/>
	* @returns {number} tracking status (see <a href="FaceData.html#tstatus">Tracker status</a>)
	*/
	_track: function()
	{	
		if (_imageData === -1)
			return -1;
		
		//Save pixel data to preallocated buffer
		for(i=0; i<_imageData.data.length; i+=1)
		{
			_pixels[i] = _imageData.data[i];
		}
		
		_trackerStatus = tracker.track(w, h, _ppixels, faceDataArray,
										VisageModule.VisageTrackerImageFormat.VISAGE_FRAMEGRABBER_FMT_RGBA.value,
										VisageModule.VisageTrackerOrigin.VISAGE_FRAMEGRABBER_ORIGIN_TL.value);
		
		return _trackerStatus.get(0);
	},
	
	/*
	* Declares {@link module:VisageTrackerUnityPlugin._bindTexture|_bindTexture} dependency on {@link module:VisageTrackerUnityPlugin.imageData|imageData}
	*/
	_bindTexture__deps: ['imageData'],
	
	/**
	* Update the passed texture with the current captured frame image data (see {@link module:VisageTrackerUnityPlugin._grabFrame|_grabFrame}).
	* The function expects the texture ID of the created texture to be passed.
	* <br>
	* Example:
	* <pre class="prettyprint source"><code>
	*   private Texture2D texture = null;
	*   texture = new Texture2D(TexWidth, TexHeight, TextureFormat.RGBA32, false);
	*   VisageTrackerNative._bindTexture(texture.GetNativeTextureID());
	*
	* </code></pre>
	*
	* <br/>
	* @param {number} texture - texture ID
	*/
	_bindTexture: function(texture)
	{
		if(_imageData === -1)
			return;
		
		GLctx.bindTexture(GLctx.TEXTURE_2D, GL.textures[texture]);
		
		var texW = w;
		var texH = h;
		
		var xoffset = 0;
		var yoffset = 0;
	
		GLctx.texSubImage2D(GLctx.TEXTURE_2D, 0, xoffset, yoffset, texW, texH, GLctx.RGBA, GLctx.UNSIGNED_BYTE, _imageData);
	},
	
	/*
	* Rounding value to nearest power of two
	* <br/>
	*/
	mGetNearestPow2: function(v)
	{
		v--;
		v|=v>>1;
		v|=v>>2;
		v|=v>>4;
		v|=v>>8;
		v|=v>>16;
		++v;
		return v;
	},
	
	/*
	* Declares {@link module:VisageTrackerUnityPlugin._getCameraInfo|_getCameraInfo} dependency on {@link module:VisageTrackerUnityPlugin.status|status} 
	* and {@link module:VisageTrackerUnityPlugin.trackerStatus|trackerStatus} parameters.
	* <br/>
	*/
	_getCameraInfo__deps: ['status', 'trackerStatus'],
	
	/**
	* Receives camera focus, image width and height in a JSON formatted string via a callback function.
	* <br/><br/>
	* Example of callback function in C#:
	* 
	* <pre class="prettyprint source"><code>
	*  void CallbackCameraInfo(string cameraInfoJSON);
	* </code></pre>
	*
	* Example of sent JSON string from JavaScript:
	* <pre class="prettyprint source"><code>
	*  cameraInfoJSON:
	*  {
	*    Focus: (float), 
	*    ImageWidth: (int), 
	*    ImageHeight: (int)	
	*  }
	* </code></pre>
	* 
	* <a href=http://wiki.unity3d.com/index.php/SimpleJSON>SimpleJSON</a> library is used to parse JSON formatted string.
	* <br/>
	* The usage of SimpleJSON is shown below:
	* <pre class="prettyprint source"><code>
	*  using SimpleJSON;
	*
	*  void CallbackCameraInfo(string cameraInfoJSON)
	*  {
	*    JSONNode cameraInfo = JSON.Parse(cameraInfoJSON);
	*
	*    ImageWidth = (int)cameraInfo["ImageWidth"];
	*    ImageHeight = (int)cameraInfo["ImageHeight"];
	*    Focus = (float)cameraInfo["Focus"];
	*    ...
	*  }
	* </code></pre>
	*
	*
	* @param {string} callbackCameraInfo - name of the callback function 
	*/
	_getCameraInfo: function(callbackCameraInfo)
	{
		if(_trackerStatus === -1 || _trackerStatus.get(0)!= 1 || typeof tracker === 'undefined')
			return;
		
		var methodName = Pointer_stringify(callbackCameraInfo);
		
		cameraInfoJSON = JSON.stringify({Focus: faceDataArray.get(0).cameraFocus, 
										ImageWidth: w, 
										ImageHeight: h});
									  
		SendMessage("Tracker", methodName, cameraInfoJSON);
	},
	
	/*
	* Declares {@link module:VisageTrackerUnityPlugin._getTrackedData|_getTrackedData} dependency on
	* {@link module:VisageTrackerUnityPlugin.trackerStatus|trackerStatus} parameter.
	* <br/>
	*/
	_getTrackedData__deps: ['trackerStatus'],
	
	/**
	* Receives gloabl 3D feature point positions  
	* in a JSON formatted string via a callback function: 
	* <ul>
	*   <li>see <a href="FaceData.html#getFaceTranslation">faceTranslation</a></li>
	*   <li>see <a href="FaceData.html#getFaceRotation">faceRotation</a></li>
	* </ul>
	*<br/>
	* Example of callback function in C#:
	* 
	* <pre class="prettyprint source"><code>
	*   void CallbackTrackedData(string trackedDataJSON)
	* </code></pre>
	*
	* Example of sent JSON string from JavaScript:
	* <pre class="prettyprint source"><code>
	*  trackedDataJSON:
	*  {
	*    trackerStatus: (int), 
	*    translationX: (float), 
	*    translationY: (float), 
	*    translationZ: (float), 
	*    rotationX: (float),
	*    rotationY: (float),
	*    rotationZ: (float)
	*  }
	* </code></pre>
	* 
	* <a href=http://wiki.unity3d.com/index.php/SimpleJSON>SimpleJSON</a> library is used to parse JSON formatted string.
	*<br/>
	* The usage of SimpleJSON is shown below:
	* <pre class="prettyprint source"><code>
	*  using SimpleJSON;
	*   
	*  void CallbackTrackedData(string trackedDataJSON)
	*  {
	*    JSONNode trackedData = JSON.Parse(trackedDataJSON);
	*
    *    Translation.x = (float)trackedData["translationX"];
    *    Translation.y = (float)trackedData["translationY"];
    *    Translation.z = (float)trackedData["translationZ"];
	*
    *    Rotation.x = (float)trackedData["rotationX"];
    *    Rotation.y = (float)trackedData["rotationY"];
    *    Rotation.z = (float)trackedData["rotationZ"];
	*
	*	 ...
	*  }
	* </code></pre>
	* <br/>
	* @param {string} callbackTrackedData - name of the callback function 
	*/
	_getTrackedData: function(callbackTrackedData)
	{
		var methodName = Pointer_stringify(callbackTrackedData);
		if(_trackerStatus === -1 || typeof tracker === 'undefined')
			return;
		
		if(_trackerStatus.get(0)!=1)
		{
			translationData = [-10000, -10000, 0]; 
		}
		else
		{
			translationData = faceDataArray.get(0).getFaceTranslation();
			translationData[0] *= (-1);
		}
		rotationData = faceDataArray.get(0).getFaceRotation();
		rotationData[1] += 3.14159265;
		rotationData[1] *= (-1);
		rotationData[2] *= (-1);
		rotationDataDeg = rotationData.map(function(x){ return x * 180 / 3.14159265});
			
		tstatus = status[_trackerStatus.get(0)];
	
		faceDataJSON = JSON.stringify({_trackerStatus: tstatus, 
										translationX: translationData[0], 
										translationY: translationData[1],
										translationZ: translationData[2],
										rotationX: rotationDataDeg[0],
										rotationY: rotationDataDeg[1],
										rotationZ: rotationDataDeg[2]});

		SendMessage("Tracker", methodName, faceDataJSON);
		
		faceModelJSON = "";
	},
	
	/*
	* Declares {@link module:VisageTrackerUnityPlugin._getMeshData|_getMeshData} dependency on {@link module:VisageTrackerUnityPlugin.mGetNearestPow2|mGetNearestPow2} function
	* and {@link module:VisageTrackerUnityPlugin.trackerStatus|trackerStatus} parameter.
	* <br/>
	*/
	_getMeshData__deps: ['mGetNearestPow2', 'trackerStatus'],
	
	/**
	* Receives data needed to draw 3D face model in a JSON formatted string via a callback function:
	* <ul>
	* 	<li>see <a href="FaceData.html#faceModelVertexCount">faceModelVertexCount</a></li>
	*   <li>see <a href="FaceData.html#getFaceModelVertices">faceModelVertices</a></li>
	*   <li>see <a href="FaceData.html#faceModelTriangleCount">faceModelTriangleCount</a></li>
	*   <li>see <a href="FaceData.html#getFaceModelTriangles">faceModelTriangles</a></li>
	*   <li>see <a href="FaceData.html#getFaceModelTextureCoords">faceModelTextureCoords</a></li>
	* </ul>
	*
	* <br/>
	* Example of callback function in C#:
	* 
	* <pre class="prettyprint source"><code>
	*   void CallbackMeshData(string meshDataJSON)
	* </code></pre>
	*
	*
	* <br>
	* Example of sent JSON string from JavaScript:
	* <pre class="prettyprint source"><code>
	*  meshDataJSON:
	*  {
	*	 vertexNumber: (int),
	*	 vertices: (float), 
	*	 triangleNumber: (int), 
	*	 triangles: (int), 
	*	 texCoord: (float)
	*  }
	* </code></pre>
	* 
	* <a href=http://wiki.unity3d.com/index.php/SimpleJSON>SimpleJSON</a> library is used to parse JSON formatted string.
	*<br/>
	* The usage of SimpleJSON is shown below:
	* <pre class="prettyprint source"><code>
	*  using SimpleJSON;
	*   
	*  void CallbackMeshData(string meshDataJSON)
	*  {
	*	 JSONNode meshData = JSON.Parse(meshDataJSON);
    *   
    *	 VertexNumber = meshData["vertexNumber"];
    *	 TriangleNumber = meshData["triangleNumber"];
	*
    *	 for (int i = 0; i < VertexNumber * 3; ++i)
    *	 {
    *	   vertices[i] = (float)meshData["vertices"][i];
    *	 }
	*
    *	 for (int i = 0; i < TriangleNumber * 3; ++i)
    *	 {
    *	   triangles[i] = (int)meshData["triangles"][i];
    *	 }
	*
    *	 for (int i = 0; i < VertexNumber * 2; ++i)
    *	 {
    *	   texCoords[i] = (float)meshData["texCoord"][i];
    *	 }
	*
	*	 ...
	*  }
	* </code></pre>
	* <br/>
	* @param {string} callbackMeshData - name of the callback function 
	* 
	*/
	_getMeshData: function(callbackMeshData)
	{
		var methodName = Pointer_stringify(callbackMeshData);
		if(_trackerStatus === -1 || _trackerStatus.get(0) === 0 || typeof tracker === 'undefined')
			return;
		
		var vertices = [];
		var triangles = [];
		var temp =[];
		var faceData = faceDataArray.get(0);
		var faceModelVertices = faceData.getFaceModelVertices();
		var faceModelTriangles = faceData.getFaceModelTriangles();
		
		var mWidth = w;
		var mHeight = h;
		var texCoord = new VisageModule.VectorInt;
		
		//get vertex number
		vertexNumber = faceData.faceModelVertexCount;
	
		//get vertices
		for (var i = 0; i < vertexNumber*3; ++i)
		{
			vertices.push(faceModelVertices.get(i));
		}
		
		//get triangle number
		triangleNumber = faceData.faceModelTriangleCount;
		
		//get triangles in reverse order
		for(var i = 0; i < triangleNumber * 3; i++)
		{
			triangles[i] = faceModelTriangles.get(triangleNumber * 3 - 1 - i);
		}
	
		xTexScale = mWidth / _mGetNearestPow2(mWidth);
		yTexScale = mHeight / _mGetNearestPow2(mHeight);
		
		for (var i = 0; i < vertexNumber*2; i+=2) 
		{
			texCoord.push_back((1.0 - faceData.getFaceModelTextureCoords[i+0]) * xTexScale);
			texCoord.push_back(faceData.getFaceModelTextureCoords[i+1] * yTexScale);
		}
		
		meshDataJSON = JSON.stringify({vertexNumber: vertexNumber, 
										vertices: vertices, 
										triangleNumber: triangleNumber, 
										triangles: triangles, 
										texCoord: texCoord});

		SendMessage("Tracker", methodName, meshDataJSON);
		
		faceModelVertices.delete();
		faceModelTriangles.delete();
		texCoord.delete();
	}
	
};

mergeInto(LibraryManager.library, VisageTrackerUnityPlugin);

	
