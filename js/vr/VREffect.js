/**
 * @author dmarcos / https://github.com/dmarcos
 * @author hawksley / https://github.com/hawksley (added phone VR support, and fixed full screen for all devices)
 *
 * It handles stereo rendering
 * If mozGetVRDevices and getVRDevices APIs are not available it gracefuly falls back to a
 * regular renderer
 *
 * The HMD supported is the Oculus DK1 and The Web API doesn't currently allow
 * to query for the display resolution (only the chrome API allows it).
 * The dimensions of the screen are temporarly hardcoded (1280 x 800).
 *
 * For VR mode to work it has to be used with the Oculus enabled builds of Firefox or Chrome:
 *
 * Firefox:
 *
 * OSX: http://people.mozilla.com/~vladimir/vr/firefox-33.0a1.en-US.mac.dmg
 * WIN: http://people.mozilla.com/~vladimir/vr/firefox-33.0a1.en-US.win64-x86_64.zip
 *
 * Chrome builds:
 *
 * https://drive.google.com/folderview?id=0BzudLt22BqGRbW9WTHMtOWMzNjQ&usp=sharing#list
 *
 */
THREE.VREffect = function ( renderer, done ) {
	// var frameData = new VRFrameData();

	this._renderer = renderer;

	this._init = function() {
		var self = this;

		self.getEyeRotation = function(translationDistance){
			var turningAngle = Math.PI/2.0 - Math.asin(1.0/Math.cosh(Math.abs(translationDistance)));
			var leftEyeRotation = new THREE.Quaternion();
			var rightEyeRotation = new THREE.Quaternion();
			if(guiInfo.rotateEyes){
				leftEyeRotation.setFromAxisAngle(new THREE.Vector3(0,1,0), turningAngle);
				rightEyeRotation.setFromAxisAngle(new THREE.Vector3(0,1,0), -turningAngle);
				g_leftCurrentBoost.multiply(new THREE.Matrix4().makeRotationFromQuaternion(leftEyeRotation));
				g_rightCurrentBoost.multiply(new THREE.Matrix4().makeRotationFromQuaternion(rightEyeRotation));
			}
		}

		// default some stuff for mobile VR
		self.phoneVR = new PhoneVR();
		self.leftEyeTranslation = { x: -0.03200000151991844, y: -0, z: -0, w: 0 };
		self.rightEyeTranslation = { x: 0.03200000151991844, y: -0, z: -0, w: 0 };
		g_leftCurrentBoost = translateByVector(g_geometry, self.leftEyeTranslation);
		g_rightCurrentBoost = translateByVector(g_geometry, self.rightEyeTranslation);
		self.getEyeRotation(self.leftEyeTranslation.x);

		if (!navigator.getVRDisplays && !navigator.mozGetVRDevices && !navigator.getVRDevices) {
			if(done) done("Your browser is not VR Ready");
			return;
		}

		if (navigator.getVRDisplays) navigator.getVRDisplays().then( gotVRDisplay );
		else if ( navigator.getVRDevices ) navigator.getVRDevices().then( gotVRDevices );
		else navigator.mozGetVRDevices( gotVRDevices );

		if(self.leftEyeTranslation.x == undefined){
			//we need these to be objects instead of arrays in order to process the information correctly
			self.leftEyeTranslation = {x: self.leftEyeTranslation[0], y:self.leftEyeTranslation[1], z:self.leftEyeTranslation[2], w:0 };
			self.rightEyeTranslation = {x: self.rightEyeTranslation[0], y:self.rightEyeTranslation[1], z:self.rightEyeTranslation[2], w:0}
			g_leftCurrentBoost = translateByVector(g_geometry, self.leftEyeTranslation);
			g_rightCurrentBoost = translateByVector(g_geometry, self.rightEyeTranslation);
			self.getEyeRotation(self.leftEyeTranslation.x);
		}

		function gotVRDisplay( devices ) {
			var vrHMD;
			var error;
			for ( var i = 0; i < devices.length; ++i ) {
				if ( devices[i] instanceof VRDisplay ) {
					vrHMD = devices[i];
					self._vrHMD = vrHMD;
					var parametersLeft = vrHMD.getEyeParameters( "left" );
					var parametersRight = vrHMD.getEyeParameters( "right" );
					self.leftEyeTranslation.x = parametersLeft.offset[0];
					self.rightEyeTranslation.x = parametersRight.offset[0];
					document.getElementById("crosshairLeft").style.visibility = 'visible';
        			document.getElementById("crosshairRight").style.visibility = 'visible';
        			document.getElementById("crosshair").style.visibility = 'hidden';
					guiInfo.toggleStereo = true;
					self.getEyeRotation(self.leftEyeTranslation.x);
					break; // We keep the first we encounter
				}
			}

			if ( done ) {
				if ( !vrHMD ) error = 'HMD not available';
				done( error );
			}
		}

		function gotVRDevices( devices ) {
			var vrHMD;
			var error;
			for ( var i = 0; i < devices.length; ++i ) {
				if ( devices[i] instanceof HMDVRDevice ) {
					vrHMD = devices[i];
					self._vrHMD = vrHMD;
					var parametersLeft = vrHMD.getEyeParameters( "left" );
					var parametersRight = vrHMD.getEyeParameters( "right" );
					self.leftEyeTranslation.x = parametersLeft.offset[0];
					self.rightEyeTranslation.x = parametersRight.offset[0];
					document.getElementById("crosshairLeft").style.visibility = 'visible';
        			document.getElementById("crosshairRight").style.visibility = 'visible';
        			document.getElementById("crosshair").style.visibility = 'hidden';
					guiInfo.toggleStereo = true;
					self.getEyeRotation(self.leftEyeTranslation.x);
					break; // We keep the first we encounter
				}
			}
			if ( done ) {
				if ( !vrHMD ) error = 'HMD not available';
				done( error );
			}
		}
	};

	this._init();

	var iconHidden = true;
	var fixLeaveStereo = false;

	this.render = function ( scene, camera, animate ) {
		var renderer = this._renderer;
		var vrHMD = this._vrHMD;
		renderer.setScissorTest( false );
		// VR render mode if HMD is available
		if ( vrHMD ) {
			vrHMD.requestAnimationFrame(animate);
			this.renderStereo.apply( this, [scene, camera] );
			if (vrHMD.submitFrame !== undefined && this._vrMode) {
				// vrHMD.getAnimationFrame(frameData);
				vrHMD.submitFrame();
			}
			return;
		}

		requestAnimationFrame(animate);
		if (iconHidden && this.phoneVR.orientationIsAvailable()) {
			iconHidden = false;
			document.getElementById("vr-icon").style.display = "block";
		}

		if ( this.phoneVR.isVRMode === true && this.phoneVR.orientationIsAvailable()) { //default to stereo render for devices with orientation sensor, like mobile
			this.renderStereo.apply( this, [scene, camera] );
			return;
		}

		if ( guiInfo.toggleStereo ) { //change this to true to debug stereo render
			fixLeaveStereo = true;
			this.renderStereo.apply( this, [scene, camera] );
			return;
		}

		if(fixLeaveStereo && !guiInfo.toggleStereo){
			fixLeaveStereo = false;
			var size = renderer.getSize();
			renderer.setScissorTest(false);
			renderer.clear();
			renderer.setViewport(0,0,size.width, size.height);
		}

		// Regular render mode if not HMD
		g_material.uniforms.isStereo.value = 0;
		renderer.render.apply( this._renderer, [scene, camera]  );
	};

	this.renderStereo = function( scene, camera, renderTarget, forceClear ) {
		var renderer = this._renderer;
		var size = renderer.getSize();
		var rendererWidth = size.width;
		var rendererHeight = size.height;
		var eyeDivisionLine = rendererWidth / 2;

		renderer.setScissorTest( true );
		renderer.clear();

		if ( camera.parent === null ) {
			camera.updateMatrixWorld();
		}

		// render left eye
		g_material.uniforms.isStereo.value = -1;
		renderer.setViewport( 0, 0, eyeDivisionLine, rendererHeight );
		renderer.setScissor( 0, 0, eyeDivisionLine, rendererHeight );
		renderer.render( scene, camera );

		//render right eye
		g_material.uniforms.isStereo.value = 1;
		renderer.setViewport( eyeDivisionLine, 0, eyeDivisionLine, rendererHeight );
		renderer.setScissor( eyeDivisionLine, 0, eyeDivisionLine, rendererHeight );
		renderer.render( scene, camera );

	};

	this.setSize = function( width, height ) {
		renderer.setSize( width, height );
	};

	var _vrMode = false;
	this.toggleVRMode = function () {
		var vrHMD = this._vrHMD;
		var canvas = renderer.domElement;

		if (!vrHMD) return;

 		this._vrMode = !this._vrMode
 		if (this._vrMode) vrHMD.requestPresent([{source: canvas, leftBounds: [0.0, 0.0, 0.5, 1.0], rightBounds: [0.5, 0.0, 0.5, 1.0]}]);
		else vrHMD.exitPresent();
	}
	
	this.setFullScreen = function( enable ) {
		var renderer = this._renderer;
		var vrHMD = this._vrHMD;

		var canvasOriginalSize = this._canvasOriginalSize;

		// If state doesn't change we do nothing
		if ( enable === this._fullScreen ) return;
		this._fullScreen = !!enable;

		if (!vrHMD) {
			var canvas = renderer.domElement;
			if (canvas.mozRequestFullScreen)  canvas.mozRequestFullScreen(); // Firefox
			else if (canvas.webkitRequestFullscreen)  canvas.webkitRequestFullscreen(); // Chrome and Safari
			else if (canvas.requestFullScreen) canvas.requestFullscreen();
			return;
		}

		// VR Mode disabled
		if ( !enable ) {
			// Restores canvas original size
			renderer.setSize( canvasOriginalSize.width, canvasOriginalSize.height );
			return;
		}

		// VR Mode enabled
		this._canvasOriginalSize = {
			width: renderer.domElement.width,
			height: renderer.domElement.height
		};

		// Hardcoded Rift display size
		renderer.setSize( 1280, 800, false );
		this.startFullscreen();
	};

	this.startFullscreen = function() {
		var self = this;
		var renderer = this._renderer;
		var vrHMD = this._vrHMD;
		var canvas = renderer.domElement;
		var fullScreenChange = canvas.mozRequestFullScreen? 'mozfullscreenchange' : 'webkitfullscreenchange';

		document.addEventListener( fullScreenChange, onFullScreenChanged, false );
		function onFullScreenChanged() {
			if ( !document.mozFullScreenElement && !document.webkitFullScreenElement ) self.setFullScreen( false );
		}
		if ( canvas.mozRequestFullScreen ) canvas.mozRequestFullScreen( { vrDisplay: vrHMD } );
		else canvas.webkitRequestFullscreen( { vrDisplay: vrHMD } );
	};
};
